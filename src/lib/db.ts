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
 *
 * ATURAN PEMAKAIAN
 *
 * Bungkus SEMUA pembacaan yang terjadi saat halaman dirender. Itulah yang
 * dilihat orang tanpa pernah menekan apa pun, dan kegagalannya muncul
 * sebagai halaman galat.
 *
 * JANGAN bungkus operasi tulis — create, update, upsert, delete — maupun
 * isi `$transaction`. Kalau sambungan terputus sesudah server sempat
 * menyimpan, pengulangannya menghasilkan baris kembar: lot dobel, warung
 * dobel. Operasi tulis selalu berasal dari tombol yang ditekan orang,
 * dan pada saat itu basis datanya sudah pasti bangun karena halamannya
 * baru saja termuat. Gagalnya cukup dilaporkan, biar ditekan ulang.
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
