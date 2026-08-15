/**
 * Mengisi aktivitas contoh selama delapan minggu terakhir.
 *
 * Kejadian ditandatangani dan dirantai memakai fungsi yang sama persis
 * dengan yang dipakai /api/ingest, jadi bukti yang dihasilkan sungguhan
 * dan lolos verifikasi. Yang dilewati hanya lompatan HTTP-nya: 490
 * kejadian lewat HTTP berarti sekitar tiga ribu kueri melintasi
 * Indonesia ke Ohio, dan itu terlalu rapuh untuk dijalankan berulang.
 *
 * Jalur HTTP-nya tetap diuji terpisah oleh scripts/uji-ingest.ts.
 *
 * Jalankan:  npx tsx scripts/isi-demo.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  AMBANG_GPS_M,
  Amplop,
  hitungHash,
  jarakMeter,
  pesanTertandatangan,
  tandatangani,
} from "../src/lib/bukti";
import type { AlasanTanpaKode } from "../src/lib/alasan";

const db = new PrismaClient();
const kunci: Array<{ deviceId: string; privateKey: string }> = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "perangkat-simulasi.json"), "utf8"),
);

const acak = (a: number, b: number) => a + Math.random() * (b - a);
const bulat = (a: number, b: number) => Math.round(acak(a, b));
const kunciTrip = (petugasId: number, d: Date) =>
  `${petugasId}|${d.toISOString().slice(0, 10)}`;

async function main() {
  console.log("Mengosongkan transaksi dan bukti lama…");
  await db.lotTrip.deleteMany();
  await db.lot.deleteMany();
  await db.penjemputan.deleteMany();
  await db.kunjungan.deleteMany();
  await db.trip.deleteMany();
  await db.kejadianAlat.deleteMany();
  await db.perangkat.updateMany({ data: { lastSeq: 0, lastHash: null } });
  await db.warung.updateMany({ data: { statusVerifikasi: "BELUM" } });

  const [warung, petugas, perangkat, harga, titikKumpul] = await Promise.all([
    db.warung.findMany({
      where: { kecamatanId: { not: null } },
      select: { id: true, lat: true, lon: true, estimasiLMinggu: true },
    }),
    db.pengguna.findMany({ where: { peran: "PETUGAS" }, select: { id: true } }),
    db.perangkat.findMany({ select: { id: true, deviceId: true } }),
    db.harga.findFirst({ orderBy: { berlakuDari: "desc" } }),
    db.titikKumpul.findMany({ select: { id: true } }),
  ]);
  const rpPerKg = harga?.rpPerKg ?? 6000;
  const idPerangkat = new Map(perangkat.map((p) => [p.deviceId, p.id]));

  const ikut = warung.filter(() => Math.random() < 0.55);
  console.log(`Warung ${warung.length} · ikut program ${ikut.length} · petugas ${petugas.length}`);

  interface Baris {
    kejadian: Prisma.KejadianAlatCreateManyInput;
    warungId: number;
    petugasId: number;
    bersihG: number;
    lat: number;
    lon: number;
    gpsAkurasi: number;
    jarakM: number;
    waktu: Date;
    /** Ikut `confirm_code` di muatan yang ditandatangani atau tidak. */
    dikonfirmasi: boolean;
    /** Terisi hanya ketika `dikonfirmasi` bernilai salah. */
    alasan: AlasanTanpaKode | null;
  }

  const baris: Baris[] = [];
  const seq = new Map(kunci.map((k) => [k.deviceId, 0]));
  const rantai = new Map<string, string | null>(kunci.map((k) => [k.deviceId, null]));

  for (let minggu = 7; minggu >= 0; minggu--) {
    const porsi = 0.35 + (7 - minggu) * 0.055;
    for (const w of ikut.filter(() => Math.random() < porsi)) {
      const k = kunci[bulat(0, kunci.length - 1)];
      const pet = petugas[bulat(0, petugas.length - 1)];
      const s = (seq.get(k.deviceId) ?? 0) + 1;
      seq.set(k.deviceId, s);

      const waktu = new Date(
        Date.now() - minggu * 7 * 86_400_000 - bulat(0, 6) * 86_400_000 - bulat(1, 9) * 3_600_000,
      );
      const liter = Math.max(1, w.estimasiLMinggu * acak(0.45, 1.15));
      const bersihG = Math.round(liter * 0.91 * 1000);
      const wadahG = bulat(900, 1600);
      const lat = w.lat + acak(-0.0004, 0.0004);
      const lon = w.lon + acak(-0.0004, 0.0004);
      const gpsAkurasi = bulat(6, 22);

      /*
       * Tidak semua penjemputan disetujui pemiliknya, dan itu memang
       * begitu di lapangan: pemilik sedang ke pasar, ponselnya di laci,
       * atau warungnya dijaga karyawan. Sebelumnya seluruh 490 baris
       * diberi `confirm_code`, sehingga statistiknya keluar 100% —
       * angka yang bukan hanya tidak nyata, tapi juga melemahkan
       * halamannya sendiri: lencana yang selalu hijau tidak memberi
       * tahu apa-apa.
       *
       * Yang menentukan tetap MUATAN yang ditandatangani, bukan kolom
       * turunannya. Kalau pemilik tidak di tempat, `confirm_code`
       * benar-benar tidak ikut ditandatangani — persis seperti yang
       * dikirim layar timbang ketika petugas menekan "pemilik tidak di
       * tempat". Dengan begitu kolom `caraKonfirmasi` tetap sah
       * diturunkan dari bukti, bukan ditempelkan begitu saja.
       */
      const dikonfirmasi = Math.random() < 0.87;

      /*
       * Sebaran alasannya bukan rata-rata acak.
       *
       * "Tidak punya ponsel" dibuat paling sering karena sasaran program
       * ini warteg dan rumah makan kecil, dan itu memang kendala yang
       * paling nyata di sana. "Kartu hilang" dibuat paling jarang sebab
       * kartunya baru saja dibagikan.
       */
      const undi = Math.random();
      const alasan = !dikonfirmasi
        ? undi < 0.4
          ? "TIDAK_PUNYA_PONSEL"
          : undi < 0.7
            ? "PONSEL_TIDAK_SIAP"
            : undi < 0.92
              ? "DIWAKILKAN_KARYAWAN"
              : "KARTU_HILANG"
        : null;

      const a: Amplop = {
        device_id: k.deviceId,
        seq: s,
        event_id: `${k.deviceId}:${s}`,
        type: "PICKUP",
        recorded_at: waktu.toISOString(),
        prev_hash: rantai.get(k.deviceId) ?? null,
        payload: {
          warung_id: w.id,
          petugas_id: pet.id,
          gross_g: bersihG + wadahG,
          tare_g: wadahG,
          lat,
          lon,
          gps_accuracy_m: gpsAkurasi,
          stable_ms: bulat(1100, 2200),
          ...(dikonfirmasi
            ? { confirm_code: String(bulat(1000, 9999)) }
            : { no_confirm_reason: alasan }),
          qr_ok: true,
          battery_mv: bulat(3600, 4050),
          rssi_dbm: bulat(-95, -62),
        },
      };
      a.sig = tandatangani(a, k.privateKey);
      const pesan = pesanTertandatangan(a);
      const hash = hitungHash(a);
      rantai.set(k.deviceId, hash);

      baris.push({
        kejadian: {
          perangkatId: idPerangkat.get(k.deviceId)!,
          seq: s,
          eventId: a.event_id,
          type: "PICKUP",
          recordedAt: waktu,
          receivedAt: waktu,
          payload: a.payload as Prisma.InputJsonValue,
          pesanKanonik: pesan,
          prevHash: a.prev_hash,
          hash,
          sig: a.sig,
          terverifikasi: true,
        },
        warungId: w.id,
        petugasId: pet.id,
        bersihG,
        lat,
        lon,
        gpsAkurasi,
        jarakM: Math.round(jarakMeter(lat, lon, w.lat, w.lon)),
        waktu,
        dikonfirmasi,
        alasan,
      });
    }
  }
  console.log(`Kejadian dibangun & ditandatangani: ${baris.length}`);

  const POTONG = 250;
  for (let i = 0; i < baris.length; i += POTONG) {
    await db.kejadianAlat.createMany({ data: baris.slice(i, i + POTONG).map((b) => b.kejadian) });
    console.log(`  kejadian tersimpan ${Math.min(i + POTONG, baris.length)}/${baris.length}`);
  }

  const idKejadian = new Map(
    (
      await db.kejadianAlat.findMany({
        where: { eventId: { in: baris.map((b) => b.kejadian.eventId) } },
        select: { id: true, eventId: true },
      })
    ).map((k) => [k.eventId, k.id]),
  );

  /* -------- trip: satu per petugas per hari -------- */
  const ringkasTrip = new Map<string, { petugasId: number; tanggal: Date; totalG: number }>();
  for (const b of baris) {
    const kk = kunciTrip(b.petugasId, b.waktu);
    const t = ringkasTrip.get(kk) ?? { petugasId: b.petugasId, tanggal: b.waktu, totalG: 0 };
    t.totalG += b.bersihG;
    ringkasTrip.set(kk, t);
  }

  await db.trip.createMany({
    data: [...ringkasTrip.values()].map((t) => {
      const tutup = Math.random() < 0.8;
      const susut = tutup ? Math.round(t.totalG * acak(0.001, 0.019)) : null;
      return {
        petugasId: t.petugasId,
        tanggal: t.tanggal,
        status: tutup ? ("DISETOR" as const) : ("BERJALAN" as const),
        totalGWarung: t.totalG,
        totalGTitikKumpul: tutup ? t.totalG - susut! : null,
        susutG: susut,
        susutPersen: tutup ? Number(((susut! / Math.max(t.totalG, 1)) * 100).toFixed(3)) : null,
        titikKumpulId: tutup
          ? titikKumpul[Math.floor(Math.random() * titikKumpul.length)]?.id
          : null,
      };
    }),
  });

  const idTrip = new Map(
    (await db.trip.findMany({ select: { id: true, petugasId: true, tanggal: true } })).map((t) => [
      kunciTrip(t.petugasId, t.tanggal),
      t.id,
    ]),
  );

  for (let i = 0; i < baris.length; i += POTONG) {
    await db.penjemputan.createMany({
      data: baris.slice(i, i + POTONG).map((b) => ({
        warungId: b.warungId,
        petugasId: b.petugasId,
        perangkatId: b.kejadian.perangkatId,
        kejadianAlatId: idKejadian.get(b.kejadian.eventId)!,
        tripId: idTrip.get(kunciTrip(b.petugasId, b.waktu)) ?? null,
        beratBersihG: b.bersihG,
        lat: b.lat,
        lon: b.lon,
        gpsAkurasiM: b.gpsAkurasi,
        jarakDariWarungM: b.jarakM,
        gpsOk: b.jarakM <= AMBANG_GPS_M,
        qrOk: true,
        // Diturunkan dari muatan yang ditandatangani, bukan ditetapkan
        // sendiri di sini. Lihat catatan pada `dikonfirmasi` di atas.
        caraKonfirmasi: b.dikonfirmasi ? ("KODE_PEMILIK" as const) : ("TANPA_KODE" as const),
        konfirmasiOk: b.dikonfirmasi, // USANG, lihat skema
        alasanTanpaKode: b.alasan,
        hargaPerKg: rpPerKg,
        nilaiRp: Math.round((b.bersihG / 1000) * rpPerKg),
        dibuatAt: b.waktu,
      })),
    });
    console.log(`  penjemputan tersimpan ${Math.min(i + POTONG, baris.length)}/${baris.length}`);
  }

  for (const [deviceId, hash] of rantai)
    await db.perangkat.update({
      where: { deviceId },
      data: { lastHash: hash, lastSeq: seq.get(deviceId) ?? 0, lastSeen: new Date() },
    });

  await db.warung.updateMany({
    where: { id: { in: [...new Set(baris.map((b) => b.warungId))] } },
    data: { statusVerifikasi: "DIKUNJUNGI" },
  });

  const rk = await db.penjemputan.aggregate({
    _sum: { beratBersihG: true, nilaiRp: true },
    _count: true,
  });
  const aktif = await db.penjemputan.groupBy({ by: ["warungId"] });
  const disetor = await db.trip.count({ where: { status: "DISETOR" } });

  console.log(`\nPenjemputan  : ${rk._count}`);
  console.log(`Trip         : ${ringkasTrip.size} (${disetor} disetor)`);
  console.log(`Warung aktif : ${aktif.length} dari ${warung.length}`);
  console.log(`Total bobot  : ${((rk._sum.beratBersihG ?? 0) / 1000).toFixed(1)} kg`);
  console.log(`Total nilai  : Rp ${(rk._sum.nilaiRp ?? 0).toLocaleString("id-ID")}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
