/**
 * Alasan penjemputan tanpa kode pemilik, beserta kata-katanya.
 *
 * Berkas ini sengaja tidak menyentuh basis data maupun node:crypto, sebab
 * daftarnya dipakai bersama oleh layar petugas di peramban dan halaman
 * pemilik di server. Menaruhnya di `konfirmasi.ts` akan menyeret Prisma
 * ikut terbawa ke bundel peramban.
 *
 * Dua kata-kata untuk tiap alasan, dan itu disengaja:
 *
 *   `petugas` — sudut pandang orang yang sedang berdiri di warung dan
 *   harus memilih cepat sambil memegang jeriken.
 *
 *   `pemilik` — sudut pandang orang yang nanti membacanya di halaman
 *   warungnya sendiri, mungkin berhari-hari kemudian, dan perlu menilai
 *   apakah alasan itu benar. Kalimatnya karena itu ditulis sebagai
 *   pernyataan tentang dirinya, bukan sebagai istilah sistem.
 */

export const ALASAN_TANPA_KODE = [
  "TIDAK_PUNYA_PONSEL",
  "PONSEL_TIDAK_SIAP",
  "KARTU_HILANG",
  "DIWAKILKAN_KARYAWAN",
  "LAINNYA",
] as const;

export type AlasanTanpaKode = (typeof ALASAN_TANPA_KODE)[number];

export const KATA_ALASAN: Record<
  AlasanTanpaKode,
  { petugas: string; pemilik: string }
> = {
  TIDAK_PUNYA_PONSEL: {
    petugas: "Pemilik tidak punya ponsel untuk memindai",
    pemilik: "Petugas mencatat Anda tidak punya ponsel untuk membuka halaman ini",
  },
  PONSEL_TIDAK_SIAP: {
    petugas: "Ponsel pemilik mati atau tanpa sinyal",
    pemilik: "Petugas mencatat ponsel Anda mati atau tanpa sinyal",
  },
  KARTU_HILANG: {
    petugas: "Kartu QR pemilik hilang atau tertinggal",
    pemilik: "Petugas mencatat kartu QR Anda hilang atau tertinggal",
  },
  DIWAKILKAN_KARYAWAN: {
    petugas: "Diserahkan karyawan, pemilik di tempat lain",
    pemilik: "Petugas mencatat jelantah diserahkan karyawan dan Anda sedang di tempat lain",
  },
  LAINNYA: {
    petugas: "Sebab lain",
    pemilik: "Petugas menuliskan sebab lain",
  },
};

export function sahAlasan(nilai: unknown): nilai is AlasanTanpaKode {
  return typeof nilai === "string" && (ALASAN_TANPA_KODE as readonly string[]).includes(nilai);
}
