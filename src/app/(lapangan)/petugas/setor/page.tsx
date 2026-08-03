import { redirect } from "next/navigation";
import { Setor } from "@/components/petugas/Setor";
import { db } from "@/lib/db";
import { sesiSekarang } from "@/lib/sesi";
import { ASUMSI } from "@/lib/statistik";
import { jam } from "@/lib/format";

export const metadata = { title: "Setor ke Titik Kumpul" };
export const dynamic = "force-dynamic";

export default async function HalamanSetor() {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  let petugasId = sesi.id;
  if (sesi.peran !== "PETUGAS") {
    const p = await db.pengguna.findFirst({ where: { peran: "PETUGAS", aktif: true } });
    if (p) petugasId = p.id;
  }

  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);

  const [trip, perangkat, titikKumpul] = await Promise.all([
    db.trip.findFirst({
      where: { petugasId, status: "BERJALAN", tanggal: { gte: awalHari } },
      orderBy: { id: "desc" },
      select: {
        id: true,
        totalGWarung: true,
        penjemputan: {
          select: {
            beratBersihG: true,
            dibuatAt: true,
            warung: { select: { nama: true } },
          },
          orderBy: { dibuatAt: "asc" },
        },
      },
    }),
    db.perangkat.findFirst({
      where: { aktif: true, OR: [{ petugasId }, { petugasId: null }] },
      orderBy: { petugasId: "desc" },
      select: { deviceId: true },
    }),
    db.titikKumpul.findFirst({ select: { id: true, nama: true } }),
  ]);

  return (
    <Setor
      trip={
        trip
          ? {
              id: trip.id,
              jumlahWarung: trip.penjemputan.length,
              totalGWarung: trip.totalGWarung,
              daftar: trip.penjemputan.map((p) => ({
                nama: p.warung.nama,
                beratBersihG: p.beratBersihG,
                jam: jam(p.dibuatAt),
              })),
            }
          : null
      }
      deviceId={perangkat?.deviceId ?? "SCL-BKS-001"}
      titikKumpul={titikKumpul}
      ambangSusutPersen={ASUMSI.ambang_susut_persen}
    />
  );
}
