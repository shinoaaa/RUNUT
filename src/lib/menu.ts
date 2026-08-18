import type { Peran } from "@/lib/sesi";

/**
 * Menu per peran.
 *
 * Tiap peran hanya melihat yang memang jadi pekerjaannya. Operator tidak
 * perlu kalkulator kebijakan, pemda tidak perlu menyusun lot, dan petugas
 * tidak memakai dasbor sama sekali — dia punya layar lapangannya sendiri.
 */

export interface Kelompok {
  kelompok: string;
  isi: Array<{ href: string; label: string }>;
}

const DASHBOARD = { href: "/dashboard", label: "Dashboard" };
const REGISTRI = { href: "/dashboard/warung", label: "Registri Warung" };
const PENJEMPUTAN = { href: "/dashboard/penjemputan", label: "Penjemputan" };
const LOT = { href: "/operator", label: "Lot & Penyerahan" };
const PERANGKAT = { href: "/dashboard/perangkat", label: "Perangkat" };
const SKENARIO = { href: "/dashboard/skenario", label: "Kalkulator Skenario" };
const LAPANGAN = { href: "/petugas", label: "Alur Petugas" };
const SIMULATOR = { href: "/simulator", label: "Simulator Timbangan" };

export const MENU_PERAN: Record<Peran, Kelompok[]> = {
  PETUGAS: [{ kelompok: "Lapangan", isi: [LAPANGAN] }],

  OPERATOR: [
    { kelompok: "Titik kumpul", isi: [LOT, PENJEMPUTAN] },
    { kelompok: "Rujukan", isi: [REGISTRI] },
  ],

  PEMDA: [
    { kelompok: "Pantau", isi: [DASHBOARD, REGISTRI, PENJEMPUTAN] },
    { kelompok: "Analisis", isi: [SKENARIO] },
  ],

  ADMIN: [
    { kelompok: "Pantau", isi: [DASHBOARD, REGISTRI, PENJEMPUTAN] },
    { kelompok: "Kelola", isi: [LOT, PERANGKAT] },
    { kelompok: "Alat bantu", isi: [SKENARIO, LAPANGAN, SIMULATOR] },
  ],
};

/** Keterangan singkat di bawah nama pengguna, supaya perannya terasa. */
export const KETERANGAN_PERAN: Record<Peran, string> = {
  PETUGAS: "Penjemputan lapangan",
  OPERATOR: "Titik kumpul & lot",
  PEMDA: "Dinas Lingkungan Hidup",
  ADMIN: "Akses penuh",
};

/**
 * Halaman yang boleh dibuka tiap peran, diturunkan dari menunya.
 *
 * Kecocokannya harus PERSIS. Kalau dilonggarkan jadi awalan, izin
 * "/dashboard" akan ikut membuka "/dashboard/perangkat" yang justru
 * sengaja disembunyikan. Tiap halaman menyebut sendiri rute mana yang
 * mewakilinya, jadi halaman anak seperti /operator/lot/[id] cukup
 * menyebut "/operator".
 */
export function bolehAkses(peran: Peran, path: string): boolean {
  if (peran === "ADMIN") return true;
  if (path === "/dashboard") return true;
  return MENU_PERAN[peran].some((k) => k.isi.some((m) => m.href === path));
}

/* ============================================================
   Kemampuan menulis
   ============================================================ */

/**
 * Izin MENGUBAH data, didaftarkan terpisah dari izin melihatnya.
 *
 * Sebelumnya keduanya satu: penambahan warung memakai `bolehAkses`
 * atas "/dashboard/warung", yaitu izin MEMBACA registri. Akibatnya
 * Pemda — yang perannya mengawasi — ikut boleh membuat data warung
 * hanya karena ia boleh melihatnya.
 *
 * Membaca dan menulis adalah dua pertanyaan berbeda, jadi didaftarkan
 * sebagai dua daftar berbeda. Peran yang tidak disebut di sini tidak
 * bisa mengubah apa pun, sebanyak apa pun halaman yang boleh dibukanya.
 */
export type Kemampuan = "warung:tambah" | "lot:kelola";

const KEMAMPUAN_PERAN: Record<Peran, Kemampuan[]> = {
  // Petugas bekerja lewat alat, bukan lewat papan ketik. Semua
  // perubahan datanya masuk sebagai kejadian alat yang bertanda tangan.
  PETUGAS: [],
  OPERATOR: ["warung:tambah", "lot:kelola"],
  // Pengawas. Melihat semuanya, mengubah tidak satu pun.
  PEMDA: [],
  ADMIN: ["warung:tambah", "lot:kelola"],
};

export function bolehMenulis(peran: Peran, k: Kemampuan): boolean {
  return KEMAMPUAN_PERAN[peran].includes(k);
}
