import { db } from "@/lib/db";
import { RegistriWarung } from "@/components/RegistriWarung";
import { KG_PER_LITER, statusWarung } from "@/lib/format";
import type { TitikWarung } from "@/components/peta/tipe";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Registri Warung" };
export const dynamic = "force-dynamic";

const MINGGU_PER_BULAN = 30 / 7;

export default async function HalamanRegistri() {
  await pastikanAkses("/dashboard/warung");
  // Halaman ini force-dynamic dan dirender di server tiap permintaan,
  // jadi membaca jam saat ini memang disengaja.
  // eslint-disable-next-line react-hooks/purity
  const sebulanLalu = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [warung, terjemput, kecamatan] = await Promise.all([
    db.warung.findMany({
      where: { aktif: true },
      select: {
        id: true,
        nama: true,
        lat: true,
        lon: true,
        kategori: true,
        estimasiLMinggu: true,
        kecamatan: { select: { nama: true } },
      },
      orderBy: { nama: "asc" },
    }),
    db.penjemputan.groupBy({
      by: ["warungId"],
      where: { dibuatAt: { gte: sebulanLalu } },
      _sum: { beratBersihG: true },
    }),
    db.kecamatan.findMany({ select: { nama: true }, orderBy: { nama: "asc" } }),
  ]);

  const petaTerjemput = new Map(
    terjemput.map((t) => [t.warungId, (t._sum.beratBersihG ?? 0) / 1000 / KG_PER_LITER]),
  );

  const data: TitikWarung[] = warung.map((w) => {
    const estimasiLBulan = w.estimasiLMinggu * MINGGU_PER_BULAN;
    const terjemputLBulan = petaTerjemput.get(w.id) ?? 0;
    return {
      id: w.id,
      nama: w.nama,
      lat: w.lat,
      lon: w.lon,
      kategori: w.kategori.replace(/_/g, " "),
      kecamatan: w.kecamatan?.nama ?? null,
      estimasiLBulan: Number(estimasiLBulan.toFixed(1)),
      terjemputLBulan: Number(terjemputLBulan.toFixed(1)),
      status: statusWarung(estimasiLBulan, terjemputLBulan),
    };
  });

  return <RegistriWarung data={data} kecamatan={kecamatan.map((k) => k.nama)} />;
}
