import { headers } from "next/headers";

/**
 * Alamat aplikasi menurut permintaan yang sedang berjalan.
 *
 * Dibaca dari header, bukan ditulis tetap, supaya alamat yang dicetak ke
 * kartu QR maupun yang ditawarkan untuk disalin menunjuk ke tempat yang
 * benar — baik saat dibuka dari laptop pengembangan maupun dari tayangan
 * Vercel. Kartu yang tercetak dengan alamat localhost tidak akan terbuka
 * di ponsel siapa pun.
 */
export async function asalAplikasi() {
  const h = await headers();
  const inang = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protokol = h.get("x-forwarded-proto") ?? (inang.startsWith("localhost") ? "http" : "https");
  return `${protokol}://${inang}`;
}
