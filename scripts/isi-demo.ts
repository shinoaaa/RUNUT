/**
 * Mengisi aktivitas contoh selama delapan minggu terakhir.
 *
 * Kejadian dibuat lewat /api/ingest yang sesungguhnya — ditandatangani,
 * dirantai, dan diverifikasi seperti kiriman alat sungguhan. Yang dibuat-buat
 * hanya WAKTUNYA: recorded_at disebar mundur supaya grafik tren punya isi.
 *
 * Jalankan dengan dev server hidup:  npx tsx scripts/isi-demo.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Amplop, tandatangani } from "../src/lib/bukti";

const URL = process.env.URL_APP ?? "http://localhost:3000";
const db = new PrismaClient();
const kunci: Array<{ deviceId: string; privateKey: string }> = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "perangkat-simulasi.json"), "utf8"),
);

const acak = (a: number, b: number) => a + Math.random() * (b - a);
const bulat = (a: number, b: number) => Math.round(acak(a, b));
const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dev server kadang membalas kosong saat sedang mengompilasi ulang. */
async function kirimUlangKalauPerlu(url: string, body: string, coba = 4) {
  for (let i = 1; i <= coba; i++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const teks = await r.text();
      if (!teks) throw new Error("balasan kosong");
      return JSON.parse(teks) as { ok?: boolean; hash?: string; pesan?: string };
    } catch (e) {
      if (i === coba) throw e;
      await jeda(400 * i);
    }
  }
  throw new Error("tidak tercapai");
}

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

  const warung = await db.warung.findMany({
    where: { kecamatanId: { not: null } },
    select: { id: true, lat: true, lon: true, estimasiLMinggu: true, kecamatan: { select: { nama: true } } },
  });
  const petugas = await db.pengguna.findMany({ where: { peran: "PETUGAS" } });
  console.log(`Warung tersedia: ${warung.length} · petugas: ${petugas.length}`);

  // Warung yang ikut program: 55% dari yang punya kecamatan.
  // Sisanya sengaja dibiarkan nol supaya "berisiko" dan "belum pernah" ada isinya.
  const ikut = warung.filter(() => Math.random() < 0.55);
  console.log(`Warung yang ikut program: ${ikut.length}`);

  const seq = new Map(kunci.map((k) => [k.deviceId, 0]));
  const hash = new Map<string, string | null>(kunci.map((k) => [k.deviceId, null]));
  let terkirim = 0;
  let ditolak = 0;

  for (let minggu = 7; minggu >= 0; minggu--) {
    // makin dekat ke sekarang, makin banyak warung yang terjangkau
    const porsi = 0.35 + (7 - minggu) * 0.055;
    const sasaran = ikut.filter(() => Math.random() < porsi);

    for (const w of sasaran) {
      const k = kunci[bulat(0, kunci.length - 1)];
      const pet = petugas[bulat(0, petugas.length - 1)];
      const s = (seq.get(k.deviceId) ?? 0) + 1;
      seq.set(k.deviceId, s);

      const waktu = new Date(
        Date.now() - minggu * 7 * 86_400_000 - bulat(0, 6) * 86_400_000 - bulat(0, 8) * 3_600_000,
      );

      // bobot mengikuti estimasi warung, dengan sebaran wajar
      const liter = Math.max(1, w.estimasiLMinggu * acak(0.45, 1.15));
      const bersih = Math.round(liter * 0.91 * 1000);
      const wadah = bulat(900, 1600);

      const a: Amplop = {
        device_id: k.deviceId,
        seq: s,
        event_id: `${k.deviceId}:${s}`,
        type: "PICKUP",
        recorded_at: waktu.toISOString(),
        prev_hash: hash.get(k.deviceId) ?? null,
        payload: {
          warung_id: w.id,
          petugas_id: pet.id,
          gross_g: bersih + wadah,
          tare_g: wadah,
          lat: w.lat + acak(-0.0004, 0.0004),
          lon: w.lon + acak(-0.0004, 0.0004),
          gps_accuracy_m: bulat(6, 22),
          stable_ms: bulat(1100, 2200),
          confirm_code: String(bulat(1000, 9999)),
          qr_ok: true,
          battery_mv: bulat(3600, 4050),
          rssi_dbm: bulat(-95, -62),
        },
      };
      a.sig = tandatangani(a, k.privateKey);

      const b = await kirimUlangKalauPerlu(`${URL}/api/ingest`, JSON.stringify(a));
      if (b.ok) {
        hash.set(k.deviceId, b.hash ?? null);
        terkirim++;
      } else ditolak++;
    }
    process.stdout.write(`  minggu -${minggu}: total ${terkirim} kejadian\n`);
  }

  // Samakan waktu transaksi dengan waktu yang dilaporkan alat,
  // supaya grafik tren memakai waktu kejadian bukan waktu penyimpanan.
  await db.$executeRaw`
    UPDATE penjemputan p
    SET "dibuatAt" = k."recordedAt"
    FROM kejadian_alat k
    WHERE p."kejadianAlatId" = k.id`;
  await db.$executeRaw`
    UPDATE trip t
    SET tanggal = sub.awal
    FROM (SELECT "tripId" AS id, MIN("dibuatAt") AS awal
          FROM penjemputan WHERE "tripId" IS NOT NULL GROUP BY "tripId") sub
    WHERE t.id = sub.id`;

  // Tutup sebagian trip dengan setoran supaya susut rantai punya nilai terukur.
  const trip = await db.trip.findMany({ where: { status: "BERJALAN" } });
  let ditutup = 0;
  for (const t of trip.slice(0, Math.floor(trip.length * 0.75))) {
    const susut = Math.round(t.totalGWarung * acak(0.001, 0.02));
    await db.trip.update({
      where: { id: t.id },
      data: {
        status: "DISETOR",
        totalGTitikKumpul: t.totalGWarung - susut,
        susutG: susut,
        susutPersen: Number(((susut / Math.max(t.totalGWarung, 1)) * 100).toFixed(3)),
      },
    });
    ditutup++;
  }

  const ringkas = await db.penjemputan.aggregate({
    _sum: { beratBersihG: true, nilaiRp: true },
    _count: true,
  });
  const aktif = await db.penjemputan.groupBy({ by: ["warungId"] });

  console.log(`\nKejadian terkirim ${terkirim} · ditolak ${ditolak}`);
  console.log(`Penjemputan  : ${ringkas._count}`);
  console.log(`Warung aktif : ${aktif.length} dari ${warung.length}`);
  console.log(`Total bobot  : ${((ringkas._sum.beratBersihG ?? 0) / 1000).toFixed(1)} kg`);
  console.log(`Total nilai  : Rp ${(ringkas._sum.nilaiRp ?? 0).toLocaleString("id-ID")}`);
  console.log(`Trip disetor : ${ditutup} dari ${trip.length}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
