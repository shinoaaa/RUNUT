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
import { coba, db } from "@/lib/db";
import {
  AMBANG_GPS_M,
  Amplop,
  hitungHash,
  jarakMeter,
  pesanTertandatangan,
  verifikasiTandaTangan,
} from "@/lib/bukti";
import { kodeCocok, sesiHidup } from "@/lib/konfirmasi";
import { sahAlasan } from "@/lib/alasan";
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
  //
  // Hanya pembacaan SEBELUM transaksi yang boleh diulang. Isi transaksinya
  // sendiri sengaja tidak dibungkus: kalau sambungannya putus di tengah
  // jalan, transaksi itu sudah batal seluruhnya, dan mengulang satu
  // perintah di dalamnya hanya akan menghasilkan keadaan yang menyesatkan.
  const perangkat = await coba(() =>
    db.perangkat.findUnique({ where: { deviceId: a.device_id } }),
  );
  if (!perangkat) return tolak("Perangkat tidak terdaftar", 404);

  // 2. tanda tangan
  const tandaTanganSah = verifikasiTandaTangan(a, perangkat.publicKey);
  if (!tandaTanganSah)
    return tolak("Tanda tangan tidak sah", 401, { alasan: "TANDA_TANGAN_PALSU" });

  // 3. idempoten — pengiriman ulang tidak boleh dihitung dua kali
  const sudahAda = await coba(() =>
    db.kejadianAlat.findUnique({ where: { eventId: a.event_id } }),
  );
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

  /*
   * Pembacaan rujukan dikerjakan SEBELUM transaksi dibuka.
   *
   * Warung dan harga hanya dibaca, tidak diubah, sehingga tidak menuntut
   * isolasi transaksi. Menaruhnya di dalam justru berbahaya: tiap kueri ke
   * basis data menempuh jarak yang jauh, dan transaksi Prisma punya batas
   * waktu. Dengan sembilan kueri di dalamnya, satu penjemputan sempat
   * memakan 6,1 detik dan melewati batas bawaan 5 detik — transaksinya
   * mati di tengah, dan penjemputannya gagal tercatat.
   */
  const p0 = a.payload as Record<string, number | string | undefined>;
  const [warungAwal, hargaAwal] =
    a.type === "PICKUP"
      ? await coba(() =>
          Promise.all([
            db.warung.findUnique({ where: { id: Number(p0.warung_id) } }),
            db.harga.findFirst({
              where: { berlakuDari: { lte: new Date() } },
              orderBy: { berlakuDari: "desc" },
            }),
          ]),
        )
      : [null, null];

  if (a.type === "PICKUP" && !warungAwal)
    return tolak(`Warung ${p0.warung_id} tidak ditemukan`, 404);

  /*
   * Konfirmasi pemilik dicocokkan DI SINI.
   *
   * Layar petugas memang mencocokkannya lebih dulu lewat
   * /api/konfirmasi/periksa, tetapi itu semata supaya salah ketik
   * ketahuan selagi masih bisa diperbaiki. Yang menentukan isi kolom
   * `caraKonfirmasi` hanyalah pencocokan ini, sebab muatan yang masuk ke
   * sini berasal dari alat dan alat tidak berwenang menyatakan bahwa
   * pemiliknya hadir.
   *
   * Kiriman yang kodenya salah TIDAK ditolak. Penimbangannya sungguh
   * terjadi dan bukti bertanda tangannya tetap harus tersimpan — lapis
   * bukti bersifat hanya-tambah. Yang berubah cuma catatan tentang
   * bagaimana bobot itu disetujui.
   */
  const sesiKonfirmasi =
    a.type === "PICKUP" && p0.confirm_code
      ? await coba(() => sesiHidup(Number(p0.warung_id)))
      : null;

  const sesiKonfirmasiId =
    sesiKonfirmasi && kodeCocok(sesiKonfirmasi.kode, String(p0.confirm_code))
      ? sesiKonfirmasi.id
      : null;

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
        warungAwal!,
        hargaAwal?.rpPerKg ?? 6000,
        sesiKonfirmasiId,
      );
      return { kejadianId: kejadian.id, ...turunan };
    }

    if (a.type === "DROPOFF") {
      const turunan = await turunkanSetoran(tx, kejadian.id, p);
      return { kejadianId: kejadian.id, ...turunan };
    }

    return { kejadianId: kejadian.id };
  }, {
    // Jarak ke basis data membuat tiap kueri memakan ratusan milidetik.
    // Batas bawaan 5 detik terlalu sempit untuk itu, dan kegagalannya
    // tidak kentara: transaksi mati di tengah, badan balasan kosong.
    timeout: 20_000,
    maxWait: 15_000,
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
  /** Sudah dibaca sebelum transaksi dibuka, supaya isinya tetap ringkas. */
  warung: { id: number; lat: number; lon: number; statusVerifikasi: string },
  rpPerKg: number,
  /** Sesi yang kodenya benar-benar cocok, atau null. Sudah dicocokkan
   *  di luar; di sini tinggal dipakai dan ditutup. */
  sesiKonfirmasiId: number | null,
) {
  const warungId = warung.id;
  const petugasId = Number(p.petugas_id);
  const grossG = Number(p.gross_g ?? 0);
  const tareG = Number(p.tare_g ?? 0);
  const beratBersihG = Math.max(0, Math.round(grossG - tareG));

  const lat = Number(p.lat ?? warung.lat);
  const lon = Number(p.lon ?? warung.lon);
  const jarak = jarakMeter(lat, lon, warung.lat, warung.lon);

  const nilaiRp = Math.round((beratBersihG / 1000) * rpPerKg);

  // Satu trip per petugas per hari, memakai tanggal menurut ALAT.
  // Kalau memakai tanggal server, kiriman susulan dari area tanpa sinyal
  // akan salah masuk ke trip hari berikutnya.
  const awalHari = new Date(waktuKejadian);
  awalHari.setHours(0, 0, 0, 0);
  const akhirHari = new Date(awalHari);
  akhirHari.setDate(akhirHari.getDate() + 1);

  /*
   * Trip yang sudah masuk lot tertutup TIDAK boleh bertambah isinya.
   *
   * Tanpa syarat terakhir, penjemputan susulan menempel ke trip hari itu
   * tanpa peduli trip itu sudah dikunci di dalam lot yang bahkan sudah
   * diserahkan ke offtaker. Akibatnya satu lot menyebut dua angka
   * berbeda: `lot.beratG` beku sejak ditutup, sedangkan halaman telusur
   * menjumlah ulang dari penjemputan tiap kali dibuka. Lot yang sudah
   * diserahkan lalu diam-diam berubah isinya adalah persoalan
   * ketertelusuran, bukan sekadar angka yang tidak rapi.
   *
   * Datanya tidak dibuang: penjemputannya tetap tercatat, hanya masuk ke
   * trip baru yang belum terikat lot mana pun.
   */
  let trip = await tx.trip.findFirst({
    where: {
      petugasId,
      tanggal: { gte: awalHari, lt: akhirHari },
      status: { in: ["BERJALAN", "DISETOR"] },
      lotTrip: { none: { lot: { status: { in: ["TERTUTUP", "DISERAHKAN"] } } } },
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

      // Sebelumnya kolom ini berbunyi `Boolean(p.confirm_code)` — terisi
      // apa saja berarti terkonfirmasi, termasuk "0000". Sekarang yang
      // menentukannya adalah kode yang benar-benar cocok dengan sesi
      // yang diterbitkan server.
      caraKonfirmasi: sesiKonfirmasiId ? "KODE_PEMILIK" : "TANPA_KODE",
      konfirmasiOk: sesiKonfirmasiId !== null, // USANG, lihat skema

      // Alasan hanya berlaku bagi yang memang tanpa kode. Diambil dari
      // muatan yang ditandatangani alat, bukan dari kolom isian yang
      // bisa disunting belakangan — itulah yang membuatnya layak
      // ditampilkan kepada pemilik warung sebagai sesuatu yang bisa
      // dibantah.
      ...(sesiKonfirmasiId === null && sahAlasan(p.no_confirm_reason)
        ? {
            alasanTanpaKode: p.no_confirm_reason,
            catatanTanpaKode:
              typeof p.no_confirm_note === "string"
                ? p.no_confirm_note.slice(0, 140)
                : null,
          }
        : {}),
      hargaPerKg: rpPerKg,
      nilaiRp,
    },
  });

  // Sekali pakai. Kode yang sudah dipakai tidak boleh menyetujui
  // penimbangan berikutnya, sebab persetujuan itu berlaku atas satu
  // bobot tertentu yang pemiliknya lihat, bukan atas warungnya.
  if (sesiKonfirmasiId)
    await tx.sesiKonfirmasi.update({
      where: { id: sesiKonfirmasiId },
      data: { dipakaiAt: new Date() },
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
    // Dibalas apa adanya supaya layar petugas menampilkan hasil yang
    // sesungguhnya tercatat, bukan hasil yang diandaikannya sendiri.
    caraKonfirmasi: penjemputan.caraKonfirmasi,
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
