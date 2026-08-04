/**
 * Sesi RUNUT — cookie bertanda tangan, tanpa pustaka tambahan.
 *
 * Isinya bukan rahasia, cuma id dan peran. Yang dijaga adalah keutuhannya:
 * cookie ditandatangani HMAC-SHA256 dengan AUTH_SECRET, jadi tidak bisa
 * diubah sendiri oleh peramban.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bolehAkses } from "@/lib/menu";

export type Peran = "PETUGAS" | "OPERATOR" | "PEMDA" | "ADMIN";

export interface Sesi {
  id: number;
  nama: string;
  peran: Peran;
}

const NAMA_COOKIE = "runut_sesi";
const UMUR_DETIK = 60 * 60 * 24 * 7;

function rahasia() {
  return process.env.AUTH_SECRET ?? "rahasia-pengembangan-yang-tidak-dipakai-di-produksi";
}

function tandatangani(muatan: string) {
  return createHmac("sha256", rahasia()).update(muatan).digest("base64url");
}

export function bungkus(s: Sesi): string {
  const muatan = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${muatan}.${tandatangani(muatan)}`;
}

export function bukaBungkus(nilai: string | undefined): Sesi | null {
  if (!nilai) return null;
  const [muatan, tanda] = nilai.split(".");
  if (!muatan || !tanda) return null;
  const harusnya = tandatangani(muatan);
  const a = Buffer.from(tanda);
  const b = Buffer.from(harusnya);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(muatan, "base64url").toString()) as Sesi;
  } catch {
    return null;
  }
}

export async function sesiSekarang(): Promise<Sesi | null> {
  const jar = await cookies();
  return bukaBungkus(jar.get(NAMA_COOKIE)?.value);
}

export async function pasangSesi(s: Sesi) {
  const jar = await cookies();
  jar.set(NAMA_COOKIE, bungkus(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UMUR_DETIK,
  });
}

export async function hapusSesi() {
  const jar = await cookies();
  jar.delete(NAMA_COOKIE);
}

/** Halaman yang dituju tiap peran setelah masuk. */
export const BERANDA_PERAN: Record<Peran, string> = {
  PETUGAS: "/petugas",
  OPERATOR: "/operator",
  PEMDA: "/dashboard",
  ADMIN: "/dashboard",
};

export async function penggunaDemo(peran: Peran) {
  return db.pengguna.findFirst({ where: { peran, aktif: true } });
}

/**
 * Penjaga halaman. Menyembunyikan menu saja tidak cukup — alamatnya
 * masih bisa diketik langsung. Peran yang tidak berhak dikembalikan ke
 * halaman awalnya sendiri, bukan diberi halaman galat.
 */
export async function pastikanAkses(path: string): Promise<Sesi> {
  const s = await sesiSekarang();
  if (!s) redirect("/masuk");
  if (!bolehAkses(s.peran, path)) redirect(BERANDA_PERAN[s.peran]);
  return s;
}
