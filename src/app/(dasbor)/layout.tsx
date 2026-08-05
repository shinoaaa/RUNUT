import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { sesiSekarang } from "@/lib/sesi";
import { keluar } from "@/app/masuk/aksi";

/**
 * Kerangka dasbor.
 *
 * Layout ini TIDAK lagi menolak pengunjung tanpa akun, karena /dashboard
 * kini punya mode publik baca-saja. Yang menjaga tiap halaman adalah
 * `pastikanAkses` di halamannya masing-masing — semuanya sudah memanggil
 * sendiri, jadi melonggarkan lapis ini tidak membuka halaman mana pun.
 * Halaman yang tidak punya mode publik tetap mengalihkan ke /masuk.
 */
export default async function LayoutDasbor({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesi = await sesiSekarang();

  // Petugas tidak memakai dasbor sama sekali — layar lapangan miliknya
  // sendiri, dan kerangkanya pun berbeda.
  if (sesi?.peran === "PETUGAS") redirect("/petugas");

  if (!sesi)
    return (
      <div className="min-h-dvh">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-5 py-3.5">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-75">
              <Image
                src="/brand/logomark.svg"
                alt=""
                width={26}
                height={26}
                className="text-brand"
              />
              <span className="text-[17px] font-extrabold tracking-wide">RUNUT</span>
            </Link>
            <span className="ml-3 hidden text-[13px] text-ink-3 sm:inline">
              Tampilan publik
            </span>
            <nav className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                className="rounded-btn border border-line px-3 py-1.5 text-sm hover:bg-canvas"
              >
                Beranda
              </Link>
              <Link
                href="/masuk"
                className="rounded-btn bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                Masuk
              </Link>
            </nav>
          </div>
        </div>
        <main className="mx-auto max-w-7xl">{children}</main>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar pengguna={sesi} keluar={keluar} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
