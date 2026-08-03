/**
 * POST /api/ingest — pintu masuk satu-satunya bagi data dari perangkat.
 *
 * Urutan pemeriksaan:
 *   1. Cari perangkat, ambil kunci publiknya
 *   2. Verifikasi tanda tangan atas muatan kanonik   -> gagal: tolak 401
 *   3. Periksa event_id belum pernah diterima        -> sudah ada: balas 200
 *   4. Periksa seq == seq terakhir + 1               -> melompat: tandai
 *   5. Periksa prev_hash == hash terakhir            -> beda: rantai putus
 *   6. Hitung hash baru
 *   7. Simpan kejadian, perbarui status perangkat
 *   8. Turunkan menjadi baris transaksi
 *
 * Langkah 3 sampai 5 itulah yang membuat pengiriman ulang, tanda tangan
 * palsu, dan nomor urut yang dilewati semuanya ketahuan.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  AMBANG_GPS_M,
  Amplop,
  hitungHash,
  jarakMeter,
  pesanTertandatangan,
  verifikasiTandaTangan,
} from "@/lib/bukti";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tolak(pesan: string, kode: number, tambahan?: object) {
  return NextResponse.json({ ok: false, pesan, ...tambahan }, { status: kode });
}

export async function POST(req: Request) {
  let a: Amplop;
  try {
    a = (await req.json()) as Amplop;
  } catch {
    return tolak("Muatan bukan JSON yang sah", 400);
  }

  if (!a?.device_id || !a?.event_id || !a?.type || typeof a.seq !== "number")
    return tolak("Amplop tidak lengkap", 400);

  // 1. perangkat
  const perangkat = await db.perangkat.findUnique({
    where: { deviceId: a.device_id },
  });
  if (!perangkat) return tolak("Perangkat tidak terdaftar", 404);

  // 2. tanda tangan
  const tandaTanganSah = verifikasiTandaTangan(a, perangkat.publicKey);
  if (!tandaTanganSah)
    return tolak("Tanda tangan tidak sah", 401, { alasan: "TANDA_TANGAN_PALSU" });

  // 3. idempoten — pengiriman ulang tidak boleh dihitung dua kali
  const sudahAda = await db.kejadianAlat.findUnique({
    where: { eventId: a.event_id },
  });
  if (sudahAda)
    return NextResponse.json({
      ok: true,
      duplikat: true,
      pesan: "Kejadian sudah pernah diterima, diabaikan",
      id: sudahAda.id,
    });

  // 4 & 5. keutuhan rantai
  const catatan: string[] = [];
  if (a.seq !== perangkat.lastSeq + 1)
    catatan.push(
      `NOMOR_URUT_MELOMPAT: diterima ${a.seq}, diharapkan ${perangkat.lastSeq + 1}`,
    );
  if ((a.prev_hash ?? null) !== (perangkat.lastHash ?? null))
    catatan.push("RANTAI_PUTUS: prev_hash tidak cocok dengan hash terakhir");

  // 6. hash, dihitung dari pesan yang ditandatangani
  const pesan = pesanTertandatangan(a);
  const hash = hitungHash(a);

  // 7 & 8. simpan lalu turunkan
  const hasil = await db.$transaction(async (tx) => {
    const kejadian = await tx.kejadianAlat.create({
      data: {
        perangkatId: perangkat.id,
        seq: a.seq,
        eventId: a.event_id,
        type: a.type,
        recordedAt: new Date(a.recorded_at),
        payload: a.payload as Prisma.InputJsonValue,
        pesanKanonik: pesan,
        prevHash: a.prev_hash ?? null,
        hash,
        sig: a.sig ?? "",
        terverifikasi: tandaTanganSah && catatan.length === 0,
        catatan: catatan.length ? catatan.join(" | ") : null,
      },
    });

    const p = a.payload as Record<string, number | string | undefined>;

    await tx.perangkat.update({
      where: { id: perangkat.id },
      data: {
        lastHash: hash,
        lastSeq: Math.max(perangkat.lastSeq, a.seq),
        lastSeen: new Date(),
        ...(typeof p.battery_mv === "number" ? { batteryMv: p.battery_mv } : {}),
        ...(typeof p.rssi_dbm === "number" ? { rssiDbm: p.rssi_dbm } : {}),
      },
    });

    if (a.type === "PICKUP") {
      const turunan = await turunkanPenjemputan(
        tx,
        kejadian.id,
        perangkat.id,
        p,
        kejadian.recordedAt,
      );
      return { kejadianId: kejadian.id, ...turunan };
    }

    if (a.type === "DROPOFF") {
      const turunan = await turunkanSetoran(tx, kejadian.id, p);
      return { kejadianId: kejadian.id, ...turunan };
    }

    return { kejadianId: kejadian.id };
  });

  return NextResponse.json({
    ok: true,
    hash,
    catatan: catatan.length ? catatan : undefined,
    ...hasil,
  });
}

/* ------------------------------------------------------------
   Penurunan transaksi dari bukti
   ------------------------------------------------------------ */

type Tx = Prisma.TransactionClient;

async function turunkanPenjemputan(
  tx: Tx,
  kejadianAlatId: number,
  perangkatId: number,
  p: Record<string, number | string | undefined>,
  waktuKejadian: Date,
) {
  const warungId = Number(p.warung_id);
  const petugasId = Number(p.petugas_id);
  const grossG = Number(p.gross_g ?? 0);
  const tareG = Number(p.tare_g ?? 0);
  const beratBersihG = Math.max(0, Math.round(grossG - tareG));

  const warung = await tx.warung.findUnique({ where: { id: warungId } });
  if (!warung) throw new Error(`Warung ${warungId} tidak ditemukan`);

  const lat = Number(p.lat ?? warung.lat);
  const lon = Number(p.lon ?? warung.lon);
  const jarak = jarakMeter(lat, lon, warung.lat, warung.lon);

  const harga = await tx.harga.findFirst({
    where: { berlakuDari: { lte: new Date() } },
    orderBy: { berlakuDari: "desc" },
  });
  const rpPerKg = harga?.rpPerKg ?? 6000;
  const nilaiRp = Math.round((beratBersihG / 1000) * rpPerKg);

  // Satu trip per petugas per hari, memakai tanggal menurut ALAT.
  // Kalau memakai tanggal server, kiriman susulan dari area tanpa sinyal
  // akan salah masuk ke trip hari berikutnya.
  const awalHari = new Date(waktuKejadian);
  awalHari.setHours(0, 0, 0, 0);
  const akhirHari = new Date(awalHari);
  akhirHari.setDate(akhirHari.getDate() + 1);

  let trip = await tx.trip.findFirst({
    where: {
      petugasId,
      tanggal: { gte: awalHari, lt: akhirHari },
      status: { in: ["BERJALAN", "DISETOR"] },
    },
  });
  trip ??= await tx.trip.create({
    data: { petugasId, tanggal: waktuKejadian, status: "BERJALAN" },
  });

  const penjemputan = await tx.penjemputan.create({
    data: {
      warungId,
      petugasId,
      perangkatId,
      kejadianAlatId,
      tripId: trip.id,
      beratBersihG,
      lat,
      lon,
      gpsAkurasiM: p.gps_accuracy_m ? Number(p.gps_accuracy_m) : null,
      jarakDariWarungM: Math.round(jarak),
      gpsOk: jarak <= AMBANG_GPS_M,
      qrOk: Boolean(p.qr_ok ?? true),
      konfirmasiOk: Boolean(p.confirm_code),
      hargaPerKg: rpPerKg,
      nilaiRp,
    },
  });

  await tx.trip.update({
    where: { id: trip.id },
    data: { totalGWarung: { increment: beratBersihG } },
  });

  // kunjungan pertama sekaligus menandai warung sudah diverifikasi
  if (warung.statusVerifikasi === "BELUM")
    await tx.warung.update({
      where: { id: warungId },
      data: { statusVerifikasi: "DIKUNJUNGI" },
    });

  return {
    penjemputanId: penjemputan.id,
    tripId: trip.id,
    beratBersihG,
    nilaiRp,
    gpsOk: penjemputan.gpsOk,
    jarakM: Math.round(jarak),
  };
}

async function turunkanSetoran(
  tx: Tx,
  kejadianAlatId: number,
  p: Record<string, number | string | undefined>,
) {
  const tripId = Number(p.trip_id);
  const grossG = Number(p.gross_g ?? 0);
  const tareG = Number(p.tare_g ?? 0);
  const totalG = Math.max(0, Math.round(grossG - tareG));

  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error(`Trip ${tripId} tidak ditemukan`);

  const susutG = trip.totalGWarung - totalG;
  const susutPersen = trip.totalGWarung > 0 ? (susutG / trip.totalGWarung) * 100 : 0;

  await tx.trip.update({
    where: { id: tripId },
    data: {
      status: "DISETOR",
      totalGTitikKumpul: totalG,
      susutG,
      susutPersen: Number(susutPersen.toFixed(3)),
      dropoffEventId: kejadianAlatId,
      titikKumpulId: p.titik_kumpul_id ? Number(p.titik_kumpul_id) : null,
    },
  });

  return { tripId, totalGWarung: trip.totalGWarung, totalGTitikKumpul: totalG, susutG, susutPersen };
}
