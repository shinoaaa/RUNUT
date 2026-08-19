/**
 * Membuat satu lot contoh yang sudah tertutup dan diserahkan,
 * supaya halaman telusur punya isi untuk diperagakan.
 */

import { randomBytes, randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Sama dengan yang dipakai serahkanLot: tanpa huruf yang bermakna ganda. */
function kodeSerahTerima() {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let kode = "";
  for (let i = 0; i < 6; i++) kode += abjad[randomInt(abjad.length)];
  return kode;
}

async function main() {
  const titikKumpul = await db.titikKumpul.findFirst();
  if (!titikKumpul) throw new Error("Belum ada titik kumpul");

  const trip = await db.trip.findMany({
    where: { status: "DISETOR", lotTrip: { none: {} } },
    orderBy: { tanggal: "desc" },
    take: 6,
    select: { id: true, totalGWarung: true, totalGTitikKumpul: true },
  });
  if (trip.length === 0) throw new Error("Tidak ada setoran yang bebas");

  const tahun = new Date().getFullYear();
  const jumlah = await db.lot.count({ where: { kode: { startsWith: `BKS-${tahun}-` } } });
  const beratG = trip.reduce((a, t) => a + (t.totalGTitikKumpul ?? t.totalGWarung), 0);

  const lot = await db.lot.create({
    data: {
      kode: `BKS-${tahun}-${String(jumlah + 1).padStart(4, "0")}`,
      titikKumpulId: titikKumpul.id,
      qrToken: randomBytes(9).toString("base64url"),
      beratG,
      status: "DISERAHKAN",
      ditutupAt: new Date(Date.now() - 3600_000),
      diserahkanAt: new Date(),
      offtaker: "Pengolah Terdaftar",
      hargaJual: 7500,
      // Lot contoh sengaja DIBIARKAN belum dikonfirmasi penerimaannya,
      // supaya kotak konfirmasi di halaman telusur bisa diperagakan
      // langsung di depan juri. Kodenya dicetak di keluaran skrip ini.
      kodeSerahTerima: kodeSerahTerima(),
      trip: { create: trip.map((t) => ({ tripId: t.id })) },
    },
  });

  const jumlahWarung = await db.penjemputan.count({
    where: { tripId: { in: trip.map((t) => t.id) } },
  });

  console.log(`Lot ${lot.kode} dibuat`);
  console.log(`  setoran      : ${trip.length}`);
  console.log(`  warung       : ${jumlahWarung}`);
  console.log(`  berat        : ${(beratG / 1000).toFixed(1)} kg`);
  console.log(`  token telusur: ${lot.qrToken}`);
  console.log(`  tautan       : /telusur/${lot.qrToken}`);
  console.log(`  KODE SERAH TERIMA: ${lot.kodeSerahTerima}   <- buat memperagakan konfirmasi penerimaan`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
