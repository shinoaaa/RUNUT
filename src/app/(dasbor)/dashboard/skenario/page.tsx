import { Skenario } from "@/components/Skenario";
import { db } from "@/lib/db";
import { ASUMSI, KG_CO2_PER_LITER_JELANTAH, statistikDasbor } from "@/lib/statistik";

export const metadata = { title: "Kalkulator Skenario" };
export const dynamic = "force-dynamic";

export default async function HalamanSkenario() {
  const [s, petugas, harga] = await Promise.all([
    statistikDasbor(),
    db.pengguna.count({ where: { peran: "PETUGAS", aktif: true } }),
    db.harga.findFirst({
      where: { berlakuDari: { lte: new Date() } },
      orderBy: { berlakuDari: "desc" },
    }),
  ]);

  return (
    <Skenario
      dasar={{
        potensiWilayahLBulan: s.potensiWilayahLBulan,
        cakupanSekarang: s.tingkatTangkap,
        petugasSekarang: petugas,
        hargaSekarang: harga?.rpPerKg ?? 6000,
        kgPerLiter: ASUMSI.kg_per_liter,
        literPerBiodiesel: ASUMSI.liter_jelantah_per_biodiesel,
        kgCo2PerLiter: KG_CO2_PER_LITER_JELANTAH,
      }}
    />
  );
}
