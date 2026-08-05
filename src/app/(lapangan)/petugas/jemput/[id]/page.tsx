import { notFound, redirect } from "next/navigation";
import { LayarTimbang } from "@/components/petugas/LayarTimbang";
import { coba, db } from "@/lib/db";
import { sesiSekarang } from "@/lib/sesi";

export const dynamic = "force-dynamic";

export default async function HalamanJemput({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  const { id } = await params;
  const warung = await coba(() => db.warung.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      nama: true,
      kategori: true,
      alamat: true,
      lat: true,
      lon: true,
      estimasiLMinggu: true,
      qrToken: true,
      kecamatan: { select: { nama: true } },
    },
  }));
  if (!warung) notFound();

  // Peran selain petugas tetap boleh menelusuri alur ini.
  let petugasId = sesi.id;
  if (sesi.peran !== "PETUGAS") {
    const p = await coba(() =>
      db.pengguna.findFirst({ where: { peran: "PETUGAS", aktif: true } }),
    );
    if (p) petugasId = p.id;
  }

  const [perangkat, harga] = await coba(() => Promise.all([
    db.perangkat.findFirst({
      where: { aktif: true, OR: [{ petugasId }, { petugasId: null }] },
      orderBy: { petugasId: "desc" },
      select: { deviceId: true },
    }),
    db.harga.findFirst({
      where: { berlakuDari: { lte: new Date() } },
      orderBy: { berlakuDari: "desc" },
    }),
  ]));

  return (
    <LayarTimbang
      warung={{
        id: warung.id,
        nama: warung.nama,
        kategori: warung.kategori.replace(/_/g, " "),
        alamat: warung.alamat,
        kecamatan: warung.kecamatan?.nama ?? null,
        lat: warung.lat,
        lon: warung.lon,
        estimasiLMinggu: warung.estimasiLMinggu,
        qrToken: warung.qrToken,
        // Enam huruf terakhir token dipakai sebagai kode cadangan,
        // untuk perangkat tanpa kamera.
        kodeSingkat: warung.qrToken.slice(-6).toUpperCase(),
      }}
      deviceId={perangkat?.deviceId ?? "SCL-BKS-001"}
      petugasId={petugasId}
      hargaPerKg={harga?.rpPerKg ?? 6000}
    />
  );
}
