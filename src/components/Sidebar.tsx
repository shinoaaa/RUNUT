"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/ui";
import { KETERANGAN_PERAN, MENU_PERAN } from "@/lib/menu";
import type { Peran } from "@/lib/sesi";

export function Sidebar({
  pengguna,
  keluar,
}: {
  pengguna: { nama: string; peran: Peran };
  keluar: () => Promise<void>;
}) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const menu = MENU_PERAN[pengguna.peran] ?? [];

  // Yang menyala hanya SATU: tautan dengan kecocokan terpanjang.
  // Tanpa ini, membuka /dashboard/warung membuat "Dashboard" ikut
  // menyala karena alamatnya memang diawali "/dashboard/".
  const terpilih = menu
    .flatMap((k) => k.isi.map((m) => m.href))
    .filter((h) => path === h || path.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const isi = (
    <nav className="flex h-full flex-col gap-6 px-3 py-5">
      <Link href={menu[0]?.isi[0]?.href ?? "/dashboard"} className="flex items-center gap-2.5 px-2">
        <Image
          src="/brand/logomark.svg"
          alt=""
          width={28}
          height={28}
          className="text-white"
        />
        <span className="text-[19px] font-extrabold tracking-wide text-white">RUNUT</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {menu.map((k) => (
          <div key={k.kelompok}>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {k.kelompok}
            </p>
            <ul className="flex flex-col gap-0.5">
              {k.isi.map((m) => {
                const aktif = m.href === terpilih;
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={() => setBuka(false)}
                      className={cn(
                        "block rounded-btn px-2.5 py-2 text-sm transition-colors",
                        aktif
                          ? "bg-white/12 font-medium text-white"
                          : "text-white/70 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {m.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/12 px-2 pt-3">
        <p className="truncate text-sm text-white/85">{pengguna.nama}</p>
        <p className="text-[11px] text-white/45">
          {KETERANGAN_PERAN[pengguna.peran]}
        </p>
        <form action={keluar}>
          <button
            type="submit"
            className="mt-2 text-[12px] text-white/60 underline underline-offset-4 hover:text-white"
          >
            Keluar
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* bilah atas khusus layar sempit */}
      <div className="flex items-center gap-3 bg-brand px-4 py-3 lg:hidden">
        <button
          onClick={() => setBuka(true)}
          aria-label="Buka menu"
          className="grid size-8 place-items-center rounded-btn text-white hover:bg-white/10"
        >
          <span className="block h-px w-4 bg-current shadow-[0_-5px_0_currentColor,0_5px_0_currentColor]" />
        </button>
        <span className="text-[17px] font-extrabold tracking-wide text-white">RUNUT</span>
      </div>

      {/* laci geser di layar sempit */}
      {buka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setBuka(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-60 bg-brand">{isi}</div>
        </div>
      )}

      {/* sidebar tetap di layar lebar */}
      <aside className="hidden w-60 shrink-0 bg-brand lg:block">
        <div className="sticky top-0 h-dvh">{isi}</div>
      </aside>
    </>
  );
}
