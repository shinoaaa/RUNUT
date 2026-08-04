/** Menyelaraskan estimasi seluruh warung dengan model bertingkat yang baru. */
import { PrismaClient } from "@prisma/client";
import { hitungEstimasi, type KelasSkala } from "../src/lib/estimasi";

const db = new PrismaClient();

async function main() {
  const warung = await db.warung.findMany({
    select: { id: true, kategori: true, kelasSkala: true, estimasiLMinggu: true },
  });

  let ubah = 0;
  let totalLama = 0;
  let totalBaru = 0;

  for (const w of warung) {
    const e = hitungEstimasi(w.kategori, w.kelasSkala as KelasSkala);
    totalLama += w.estimasiLMinggu;
    totalBaru += e.literPerMinggu;
    if (Math.abs(e.literPerMinggu - w.estimasiLMinggu) > 0.01) {
      await db.warung.update({
        where: { id: w.id },
        data: { estimasiLMinggu: e.literPerMinggu },
      });
      ubah++;
    }
  }

  console.log(`warung diperbarui : ${ubah} dari ${warung.length}`);
  console.log(`potensi lama      : ${(totalLama * 30 / 7).toFixed(0)} L/bulan`);
  console.log(`potensi baru      : ${(totalBaru * 30 / 7).toFixed(0)} L/bulan`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
