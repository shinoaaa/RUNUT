import { Dasbor } from "@/components/Dasbor";
import { ASUMSI, KG_CO2_PER_LITER_JELANTAH, statistikDasbor } from "@/lib/statistik";
import { angka } from "@/lib/format";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function HalamanDasbor() {
  const s = await statistikDasbor();

  const asumsi = [
    {
      langkah: "1. Bobot jelantah terkumpul",
      nilai: "Hasil timbangan perangkat",
      sifat: "terukur",
    },
    {
      langkah: "2. Bobot ke volume",
      nilai: `Densitas ${ASUMSI.kg_per_liter} kg per liter`,
      sifat: "asumsi",
    },
    {
      langkah: "3. Jelantah ke biodiesel",
      nilai: `${ASUMSI.liter_jelantah_per_biodiesel} liter jelantah menghasilkan 1 liter biodiesel — mengikuti sumber nasional, konservatif dibanding literatur teknis`,
      sifat: "asumsi",
    },
    {
      langkah: "4. Substitusi terhadap solar",
      nilai: "1 liter biodiesel menggantikan 1 liter solar",
      sifat: "asumsi",
    },
    {
      langkah: "5. Faktor emisi solar",
      nilai: `${ASUMSI.kg_co2_per_liter_solar} kg CO₂ per liter`,
      sifat: "asumsi",
    },
    {
      langkah: "6. Penghematan emisi daur hidup",
      nilai: `${angka(ASUMSI.penghematan_daur_hidup * 100)}% dibanding solar fosil`,
      sifat: "asumsi",
    },
    {
      langkah: "Hasil rantai",
      nilai: `${angka(KG_CO2_PER_LITER_JELANTAH, 2)} kg CO₂e per liter jelantah tertangkap`,
      sifat: "asumsi",
    },
    {
      langkah: "Potensi wilayah di luar registri",
      nilai: `Data terbuka diperkirakan hanya memuat ${angka(ASUMSI.cakupan_registri * 100)}% UMKM kuliner sebenarnya. Ini asumsi paling lemah di dasbor dan akan diganti begitu data dinas tersedia.`,
      sifat: "asumsi",
    },
  ];

  return <Dasbor s={s} asumsi={asumsi} />;
}
