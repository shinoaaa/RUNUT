import { redirect } from "next/navigation";
import { sesiSekarang } from "@/lib/sesi";

/**
 * Kerangka layar lapangan.
 *
 * Dirancang untuk HP karena petugas memakainya sambil keliling. Di layar
 * lebar — misalnya proyektor saat presentasi — isinya dibingkai jadi kolom
 * selebar ponsel di tengah, supaya terbaca sebagai aplikasi lapangan dan
 * bukan halaman yang rusak tata letaknya.
 */
export default async function LayoutLapangan({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  return (
    <div className="min-h-dvh bg-[#eceeea] py-0 sm:py-6">
      <div className="bingkai-lapangan sm:rounded-card sm:border sm:shadow-pop">
        {children}
      </div>
    </div>
  );
}
