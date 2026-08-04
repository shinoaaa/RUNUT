import { PrismaClient } from "@prisma/client";

const buat = () => new PrismaClient();

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db = globalThis.__prisma ?? buat();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;

/**
 * Mengulang kueri yang gagal karena sambungan, bukan karena datanya.
 *
 * Neon paket gratis menidurkan database setelah nganggur, dan permintaan
 * pertama setelah itu bisa gagal sebelum sempat bangun. Tanpa ini, juri
 * yang membuka tautan setelah aplikasi lama tidak dipakai akan melihat
 * halaman galat, padahal cukup dicoba ulang sekali.
 */
export async function coba<T>(jalankan: () => Promise<T>, kali = 4): Promise<T> {
  let terakhir: unknown;
  for (let i = 0; i < kali; i++) {
    try {
      return await jalankan();
    } catch (e) {
      terakhir = e;
      const pesan = String((e as Error)?.message ?? "");
      const sambungan =
        /reach database|Timed out|connection|ECONNRESET|ETIMEDOUT|starting up/i.test(pesan);
      if (!sambungan) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw terakhir;
}
