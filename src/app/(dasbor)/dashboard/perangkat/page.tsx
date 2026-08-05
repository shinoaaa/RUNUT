import { Perangkat } from "@/components/Perangkat";
import { coba, db } from "@/lib/db";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Perangkat" };
export const dynamic = "force-dynamic";

export default async function HalamanPerangkat() {
  await pastikanAkses("/dashboard/perangkat");
  const daftar = await coba(() => db.perangkat.findMany({
    orderBy: { deviceId: "asc" },
    select: {
      deviceId: true,
      batteryMv: true,
      rssiDbm: true,
      lastSeen: true,
      lastSeq: true,
      lastHash: true,
      petugas: { select: { nama: true } },
      _count: { select: { kejadian: true } },
    },
  }));

  return (
    <Perangkat
      daftar={daftar.map((d) => ({
        deviceId: d.deviceId,
        petugas: d.petugas?.nama ?? null,
        batteryMv: d.batteryMv,
        rssiDbm: d.rssiDbm,
        lastSeen: d.lastSeen?.toISOString() ?? null,
        lastSeq: d.lastSeq,
        lastHash: d.lastHash,
        jumlahKejadian: d._count.kejadian,
      }))}
    />
  );
}
