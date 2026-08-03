/**
 * Menyusun ulang trip dari penjemputan yang sudah ada.
 *
 * Dipakai sekali setelah data contoh dimundurkan waktunya: satu trip
 * untuk tiap pasangan petugas dan tanggal, lalu sebagian ditutup dengan
 * setoran supaya susut rantai punya nilai terukur.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const acak = (a: number, b: number) => a + Math.random() * (b - a);

async function main() {
  await db.lotTrip.deleteMany();
  await db.lot.deleteMany();
  await db.penjemputan.updateMany({ data: { tripId: null } });
  await db.trip.deleteMany();

  const semua = await db.penjemputan.findMany({
    select: { id: true, petugasId: true, dibuatAt: true, beratBersihG: true },
    orderBy: { dibuatAt: "asc" },
  });

  const kelompok = new Map<
    string,
    { petugasId: number; tanggal: Date; ids: number[]; totalG: number }
  >();
  for (const p of semua) {
    const hari = p.dibuatAt.toISOString().slice(0, 10);
    const k = `${p.petugasId}|${hari}`;
    const g = kelompok.get(k) ?? {
      petugasId: p.petugasId,
      tanggal: p.dibuatAt,
      ids: [],
      totalG: 0,
    };
    g.ids.push(p.id);
    g.totalG += p.beratBersihG;
    kelompok.set(k, g);
  }

  const titikKumpul = await db.titikKumpul.findMany({ select: { id: true } });
  let dibuat = 0;
  let disetor = 0;

  for (const g of kelompok.values()) {
    const tutup = Math.random() < 0.8; // sebagian trip masih berjalan
    const susut = tutup ? Math.round(g.totalG * acak(0.001, 0.019)) : null;

    const trip = await db.trip.create({
      data: {
        petugasId: g.petugasId,
        tanggal: g.tanggal,
        status: tutup ? "DISETOR" : "BERJALAN",
        totalGWarung: g.totalG,
        totalGTitikKumpul: tutup ? g.totalG - susut! : null,
        susutG: susut,
        susutPersen: tutup
          ? Number(((susut! / Math.max(g.totalG, 1)) * 100).toFixed(3))
          : null,
        titikKumpulId: tutup
          ? titikKumpul[Math.floor(Math.random() * titikKumpul.length)]?.id
          : null,
      },
    });
    await db.penjemputan.updateMany({
      where: { id: { in: g.ids } },
      data: { tripId: trip.id },
    });
    dibuat++;
    if (tutup) disetor++;
  }

  const rk = await db.trip.aggregate({
    _sum: { susutG: true, totalGWarung: true },
    where: { susutG: { not: null } },
  });
  const susutPersen =
    ((rk._sum.susutG ?? 0) / Math.max(rk._sum.totalGWarung ?? 1, 1)) * 100;

  console.log(`Trip dibuat  : ${dibuat} (${disetor} sudah disetor)`);
  console.log(`Rata-rata isi: ${(semua.length / dibuat).toFixed(1)} penjemputan per trip`);
  console.log(
    `Susut rantai : ${((rk._sum.susutG ?? 0) / 1000).toFixed(2)} kg (${susutPersen.toFixed(2)}%)`,
  );
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
