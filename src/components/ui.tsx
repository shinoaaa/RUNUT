import * as React from "react";
import Link from "next/link";

/** Penggabung kelas sederhana — tanpa dependensi tambahan. */
export function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/* ============================================================
   Tautan kembali
   ============================================================ */

/**
 * Tautan naik satu tingkat, ditaruh di atas judul halaman.
 *
 * Sengaja menyebut TUJUANNYA, bukan sekadar "Kembali". Tombol kembali
 * peramban mengingat riwayat, sedangkan halaman tidak — juri yang membuka
 * alamat langsung atau memindai QR tidak punya riwayat sama sekali, jadi
 * tiap halaman harus menyatakan sendiri ke mana ia bermuara.
 */
export function TautanKembali({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-[13px] text-ink-3",
        "transition-colors hover:text-ink",
        className,
      )}
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

/* ============================================================
   Tombol
   ============================================================ */

type NadaTombol = "utama" | "kedua" | "bahaya" | "teks";

const gayaTombol: Record<NadaTombol, string> = {
  utama: "bg-brand text-white hover:bg-brand-hover border border-transparent",
  kedua: "bg-surface text-ink border border-line hover:bg-canvas",
  bahaya: "bg-danger text-white hover:brightness-95 border border-transparent",
  teks: "bg-transparent text-accent underline underline-offset-4 border-0 px-0 hover:text-brand",
};

/** Kelas bersama, supaya tombol dan tautan-bergaya-tombol tidak pernah berbeda rupa. */
export function kelasTombol(
  nada: NadaTombol = "utama",
  besar = false,
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-btn font-medium",
    "transition-colors disabled:opacity-45 disabled:pointer-events-none",
    nada !== "teks" && (besar ? "h-12 px-5 text-[15px]" : "h-9 px-3.5 text-sm"),
    gayaTombol[nada],
    className,
  );
}

export function Tombol({
  nada = "utama",
  besar = false,
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  nada?: NadaTombol;
  besar?: boolean;
}) {
  return <button {...p} className={kelasTombol(nada, besar, className)} />;
}

/**
 * Tautan yang berpenampilan tombol.
 *
 * Dipakai menggantikan pola `<Link><Tombol/></Link>`. Pola itu menaruh
 * <button> di dalam <a> — susunan yang tidak sah — dan pada tombol yang
 * dinonaktifkan justru berbahaya: `disabled` membuat tombolnya mengabaikan
 * klik, lalu kliknya jatuh ke tautan induknya sehingga halaman tetap
 * berpindah. Tombolnya tampak mati padahal tetap bekerja.
 */
export function TautanTombol({
  href,
  nada = "utama",
  besar = false,
  className,
  children,
  ...p
}: Omit<React.ComponentProps<typeof Link>, "className"> & {
  nada?: NadaTombol;
  besar?: boolean;
  className?: string;
}) {
  return (
    <Link {...p} href={href} className={kelasTombol(nada, besar, className)}>
      {children}
    </Link>
  );
}

/* ============================================================
   Pil status
   ============================================================ */

export type NadaPil = "ok" | "warn" | "bahaya" | "netral" | "info";

const gayaPil: Record<NadaPil, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bahaya: "bg-danger-bg text-danger",
  netral: "bg-mute-bg text-mute",
  info: "bg-info-bg text-info",
};

const titikPil: Record<NadaPil, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bahaya: "bg-danger",
  netral: "bg-mute",
  info: "bg-info",
};

export function Pil({
  nada = "netral",
  titik = false,
  children,
  className,
}: {
  nada?: NadaPil;
  titik?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5",
        "text-[12px] font-medium whitespace-nowrap",
        gayaPil[nada],
        className,
      )}
    >
      {titik && <span className={cn("size-1.5 rounded-full", titikPil[nada])} />}
      {children}
    </span>
  );
}

/* ============================================================
   Tag keyakinan — menandai apakah sebuah angka terukur atau ditaksir.
   Dipakai berdampingan dengan angka kebocoran di dasbor.
   ============================================================ */

export type Keyakinan = "terukur" | "estimasi" | "model";

const labelKeyakinan: Record<Keyakinan, string> = {
  terukur: "TERUKUR",
  estimasi: "ESTIMASI",
  model: "ESTIMASI MODEL",
};

export function TagKeyakinan({ nilai }: { nilai: Keyakinan }) {
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em]",
        nilai === "terukur"
          ? "bg-accent-soft text-accent"
          : "bg-mute-bg text-ink-3",
      )}
    >
      {labelKeyakinan[nilai]}
    </span>
  );
}

/* ============================================================
   Panel — kartu berpembatas garis, tanpa bayangan
   ============================================================ */

export function Panel({
  judul,
  aksi,
  padat = false,
  className,
  children,
}: {
  judul?: React.ReactNode;
  aksi?: React.ReactNode;
  padat?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        // `min-w-0` supaya panel ini sanggup menyusut ketika jadi butir
        // grid atau flex. Tanpa itu, tabel lebar di dalamnya memaksa
        // seluruh halaman melebar alih-alih menggulir di dalam wadahnya.
        "min-w-0 rounded-card border border-line bg-surface",
        className,
      )}
    >
      {(judul || aksi) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {typeof judul === "string" ? (
            <h2 className="text-[17px] font-semibold">{judul}</h2>
          ) : (
            judul
          )}
          {aksi}
        </header>
      )}
      <div className={padat ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/* ============================================================
   Kartu angka
   ============================================================ */

export function KartuAngka({
  label,
  angka,
  satuan,
  catatan,
  arah,
  keyakinan,
}: {
  label: string;
  angka: string;
  satuan?: string;
  catatan?: string;
  arah?: "naik" | "turun";
  keyakinan?: Keyakinan;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {label}
        </span>
        {keyakinan && <TagKeyakinan nilai={keyakinan} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[30px] font-bold leading-none">{angka}</span>
        {satuan && <span className="text-sm text-ink-2">{satuan}</span>}
      </div>
      {catatan && (
        <p
          className={cn(
            "mt-1.5 text-[13px]",
            arah === "naik"
              ? "text-accent"
              : arah === "turun"
                ? "text-danger"
                : "text-ink-3",
          )}
        >
          {arah === "naik" ? "▲ " : arah === "turun" ? "▼ " : ""}
          {catatan}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   Tabel
   ============================================================ */

export function Tabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="gulir-x">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  num = false,
  className,
  children,
}: {
  num?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      data-num={num || undefined}
      className={cn(
        "border-b border-line bg-canvas px-4 py-2.5",
        "text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3",
        num ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  num = false,
  className,
  children,
}: {
  num?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <td
      data-num={num || undefined}
      className={cn(
        "border-b border-line px-4 py-3 align-middle",
        num && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Bilah tipis di dalam baris tabel — dipakai untuk kolom cakupan. */
export function BilahDalamBaris({ persen }: { persen: number }) {
  const p = Math.max(0, Math.min(100, persen));
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-pill bg-mute-bg">
        <span
          className="block h-full rounded-pill bg-accent"
          style={{ width: `${p}%` }}
        />
      </span>
      <span className="tabular text-[13px] text-ink-2">{p.toFixed(1)}%</span>
    </span>
  );
}

/* ============================================================
   Keadaan kosong
   ============================================================ */

export function Kosong({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="font-medium">{judul}</p>
      {keterangan && (
        <p className="max-w-sm text-sm text-ink-2">{keterangan}</p>
      )}
      {aksi}
    </div>
  );
}
export { Paginasi } from './ui/Paginasi';
