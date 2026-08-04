import { db } from "@/lib/db";
import { Simulator } from "@/components/Simulator";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Simulator Timbangan" };
export const dynamic = "force-dynamic";

export default async function HalamanSimulator() {
  await pastikanAkses("/simulator");
  const [alat, warung, trip, titikKumpul] = await Promise.all([
    db.perangkat.findMany({
      where: { aktif: true },
      select: { deviceId: true, lastSeq: true, petugasId: true, petugas: { select: { nama: true } } },
      orderBy: { deviceId: "asc" },
    }),
    db.warung.findMany({
      where: { aktif: true, kecamatanId: { not: null } },
      select: { id: true, nama: true, lat: true, lon: true, kecamatan: { select: { nama: true } } },
      orderBy: { nama: "asc" },
      take: 300,
    }),
    db.trip.findFirst({
      where: { status: "BERJALAN" },
      orderBy: { id: "desc" },
      select: { id: true, totalGWarung: true },
    }),
    db.titikKumpul.findFirst({ select: { id: true } }),
  ]);

  return (
    <Simulator
      alat={alat.map((a) => ({
        deviceId: a.deviceId,
        petugasId: a.petugasId,
        petugasNama: a.petugas?.nama ?? null,
        lastSeq: a.lastSeq,
      }))}
      warung={warung.map((w) => ({
        id: w.id,
        nama: w.nama,
        lat: w.lat,
        lon: w.lon,
        kecamatan: w.kecamatan?.nama ?? null,
      }))}
      tripBerjalan={trip}
      titikKumpulId={titikKumpul?.id ?? null}
    />
  );
}
