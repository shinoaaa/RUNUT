import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { sesiSekarang } from "@/lib/sesi";
import { keluar } from "@/app/masuk/aksi";

export default async function LayoutDasbor({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  // Petugas tidak memakai dasbor sama sekali — layar lapangan miliknya
  // sendiri, dan kerangkanya pun berbeda.
  if (sesi.peran === "PETUGAS") redirect("/petugas");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar pengguna={sesi} keluar={keluar} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
