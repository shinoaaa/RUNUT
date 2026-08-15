import type { Prisma } from "@prisma/client";
import { KG_PER_LITER, statusWarung } from "@/lib/format";
import { apakahJejaring } from "@/lib/jejaring";

/**
 * Saringan registri warung, dipakai bersama.
 *
 * Halaman registri menyaring di peramban, lalu meneruskan pilihannya
 * sebagai query string ke halaman-halaman turunannya: lembar stiker dan
 * ekspor CSV. Kalau tiap halaman menyalin sendiri aturan penyaringnya,
 * ketiganya akan berbeda pelan-pelan — dan yang paling mahal adalah
 * ekspor yang isinya tidak sama dengan yang barusan dilihat di layar,
 * sebab itu berkas yang dibawa ke rapat dan dikutip di naskah kebijakan.
 *
 * Maka aturannya ditulis satu kali di sini.
 */

export const MINGGU_PER_BULAN = 30 / 7;

export interface SaringRegistri {
  kec?: string;
  status?: string;
  cari?: string;
  jenis?: string;
}

export function bacaSaringan(sp: URLSearchParams): SaringRegistri {
  return {
    kec: sp.get("kec") ?? undefined,
    status: sp.get("status") ?? undefined,
    cari: sp.get("cari") ?? undefined,
    jenis: sp.get("jenis") ?? undefined,
  };
}

/** Bagian saringan yang dapat dikerjakan basis data. */
export function whereRegistri(s: SaringRegistri): Prisma.WarungWhereInput {
  return {
    aktif: true,
    ...(s.kec ? { kecamatan: { nama: s.kec } } : {}),
    ...(s.cari ? { nama: { contains: s.cari, mode: "insensitive" as const } } : {}),
  };
}

/**
 * Bagian saringan yang TIDAK dapat dikerjakan basis data.
 *
 * "Jenis usaha" ditentukan pencocokan nama terhadap daftar merek
 * berjejaring, dan "status" diturunkan dari perbandingan estimasi dengan
 * volume terjemput sebulan terakhir. Keduanya bukan kolom, jadi harus
 * dihitung setelah baris terbaca.
 */
export function lolosSaringan(
  w: { id: number; nama: string; estimasiLMinggu: number },
  s: SaringRegistri,
  terjemputLBulan: number,
): boolean {
  if (s.jenis === "umkm" && apakahJejaring(w.nama)) return false;
  if (s.jenis === "jejaring" && !apakahJejaring(w.nama)) return false;
  if (!s.status) return true;
  return statusWarung(w.estimasiLMinggu * MINGGU_PER_BULAN, terjemputLBulan) === s.status;
}

/** Liter terjemput sebulan terakhir per warung, kunci bagi saringan status. */
export function petaTerjemputLBulan(
  kelompok: Array<{ warungId: number; _sum: { beratBersihG: number | null } }>,
): Map<number, number> {
  return new Map(
    kelompok.map((t) => [t.warungId, (t._sum.beratBersihG ?? 0) / 1000 / KG_PER_LITER]),
  );
}

/** Keterangan saringan aktif, untuk kepala halaman maupun nama berkas. */
export function keteranganSaringan(s: SaringRegistri): string[] {
  return [
    s.kec ?? null,
    s.jenis === "umkm" ? "calon UMKM saja" : s.jenis === "jejaring" ? "gerai berjejaring saja" : null,
    s.status ? `status ${s.status}` : null,
    s.cari ? `pencarian "${s.cari}"` : null,
  ].filter(Boolean) as string[];
}
