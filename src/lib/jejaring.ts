/**
 * Pengenal gerai berjejaring.
 *
 * ============================================================
 * KENAPA INI ADA
 * ============================================================
 * Registri awal ditarik dari OpenStreetMap, dan data terbuka memetakan
 * usaha yang bermerek, berada di jalan besar, atau menyewa gerai pusat
 * perbelanjaan jauh lebih rapat daripada warung tenda di gang permukiman.
 *
 * Akibatnya sekitar 29 persen titik yang terkumpul justru gerai
 * berjejaring nasional maupun multinasional — kelompok usaha yang
 * TIDAK menjadi sasaran program ini, sebab umumnya sudah terikat
 * pengelolaan limbah tingkat korporat dan bukan pelaku UMKM.
 *
 * Menandainya membuat registri jujur menyatakan isinya sendiri, dan
 * memungkinkan petugas mencetak stiker hanya untuk warung yang memang
 * menjadi sasaran.
 *
 * ============================================================
 * SIFAT ANGKANYA
 * ============================================================
 * Ini PENYARINGAN AWAL berdasarkan nama, bukan penetapan status usaha.
 * Namanya dicocokkan dengan daftar di bawah; usaha berjejaring yang
 * tidak terdaftar di sini akan lolos, dan warung bernama mirip bisa
 * tertandai keliru.
 *
 * Penetapan akhirnya tetap dilakukan petugas pada kunjungan pertama,
 * sama seperti kelas skala usaha. Kolom `statusVerifikasi` pada tabel
 * warung yang menyimpan hasilnya.
 */

/**
 * Merek berjejaring yang benar-benar ditemukan pada 226 titik hasil
 * penarikan OpenStreetMap untuk Kabupaten Bekasi. Ditulis apa adanya
 * supaya dapat diperiksa dan ditambah tanpa membongkar kode.
 *
 * Pencocokannya memakai potongan nama, sebab satu merek muncul dalam
 * beberapa ejaan — "Domino's" dan "Dominos Pizza", atau "HokBen" dan
 * "Hoka Hoka Bento".
 */
export const MEREK_JEJARING = [
  "a w",
  "burger king",
  "cfc",
  "domino",
  "dum dum",
  "dunkin",
  "excelso",
  "hokben",
  "hoka hoka",
  "imperial kitchen",
  "j co",
  "jco",
  "janji jiwa",
  "kfc",
  "kopi kenangan",
  "marugame",
  "mcdonald",
  "mie gacoan",
  "mixue",
  "pepper lunch",
  "pizza hut",
  "popeye",
  "richeese",
  "solaria",
  "starbucks",
  "subway",
  "ta wan",
  "yoshinoya",
] as const;

/**
 * Menyeragamkan penulisan nama sebelum dicocokkan.
 *
 * Satu merek ditulis bermacam-macam di OpenStreetMap: "Hoka-Hoka Bento"
 * bertanda hubung, "Hoka Hoka Bento" berspasi, "J.Co" bertitik, "A&W"
 * bersimbol. Seluruh tanda baca disamakan menjadi spasi supaya semuanya
 * cocok dengan satu pola yang sama.
 */
function rapikan(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Menebak apakah sebuah nama merupakan gerai berjejaring.
 *
 * Disebut "menebak" dengan sengaja: hasilnya dugaan yang menunggu
 * dipastikan petugas, bukan kesimpulan.
 */
export function apakahJejaring(nama: string): boolean {
  const n = rapikan(nama);
  return MEREK_JEJARING.some((m) => n.includes(m));
}

/** Pilihan saringan pada registri. */
export type SaringJenis = "" | "umkm" | "jejaring";

export const LABEL_JENIS: Record<Exclude<SaringJenis, "">, string> = {
  umkm: "Calon UMKM",
  jejaring: "Gerai berjejaring",
};
