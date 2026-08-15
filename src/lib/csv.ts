/**
 * Penyusun CSV untuk dibuka di Excel berlokal Indonesia.
 *
 * Ditulis sendiri, tanpa pustaka, sebab yang dibutuhkan cuma empat
 * keputusan — dan justru keempatnya yang biasanya salah ketika orang
 * memakai pustaka bawaan berlokal Inggris:
 *
 * 1. PEMISAH TITIK KOMA, bukan koma. Excel pada Windows berlokal
 *    Indonesia membaca koma sebagai pemisah DESIMAL, sehingga berkas
 *    berpemisah koma tertumpuk seluruhnya di kolom A. Pemda membuka
 *    laporan ini di Excel, bukan di penyunting teks.
 *
 * 2. DESIMAL KOMA, mengikuti cara angka ditulis di Indonesia — dan itu
 *    baru mungkin justru karena pemisah kolomnya titik koma.
 *
 * 3. BOM UTF-8 di awal berkas. Tanpa itu Excel menebak lokal ANSI dan
 *    nama warung berhuruf beraksen berantakan.
 *
 * 4. AKHIR BARIS CRLF, sesuai RFC 4180 dan yang diharapkan Excel.
 */

/** Nilai yang boleh masuk sel. `null` dan `undefined` jadi sel kosong. */
export type Sel = string | number | boolean | Date | null | undefined;

const PEMISAH = ";";
const BARIS_BARU = "\r\n";

const nfDesimal = (desimal: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
    useGrouping: false, // pemisah ribuan akan dibaca Excel sebagai teks
  });

/** Angka bergaya Indonesia, siap ditaruh di sel. */
export const angkaCsv = (n: number, desimal = 2) => nfDesimal(desimal).format(n);

function selKe(nilai: Sel): string {
  if (nilai === null || nilai === undefined) return "";
  if (nilai instanceof Date) {
    // Bentuk yang dikenali Excel sekaligus terbaca manusia.
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(nilai.getDate())}/${p(nilai.getMonth() + 1)}/${nilai.getFullYear()} ${p(nilai.getHours())}:${p(nilai.getMinutes())}`;
  }
  if (typeof nilai === "boolean") return nilai ? "ya" : "tidak";

  const teks = String(nilai);
  // Dikutip bila memuat pemisah, tanda kutip, atau ganti baris. Tanda
  // kutip di dalamnya digandakan, sesuai RFC 4180.
  return /[";\r\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

/**
 * Susun seluruh berkas CSV dari judul kolom dan baris isinya.
 */
export function susunCsv(judul: string[], baris: Sel[][]): string {
  const isi = [judul, ...baris].map((b) => b.map(selKe).join(PEMISAH)).join(BARIS_BARU);
  // Ditulis sebagai lolosan, bukan karakter harfiah: BOM tidak kelihatan
  // di penyunting mana pun, jadi sekali terhapus tanpa sengaja tidak ada
  // yang menyadarinya sampai ada yang membuka berkasnya di Excel dan
  // menemukan nama warung berantakan.
  return `﻿${isi}${BARIS_BARU}`;
}

/**
 * Balasan HTTP yang membuat peramban mengunduh berkasnya, bukan
 * menampilkannya sebagai teks.
 *
 * Nama berkas diberi tanggal supaya unduhan berulang tidak saling
 * menimpa di folder Unduhan — pemda mengekspor laporan yang sama
 * berkali-kali dengan saringan berbeda.
 */
export function balasanCsv(namaDasar: string, judul: string[], baris: Sel[][]): Response {
  const kini = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const cap = `${kini.getFullYear()}${p(kini.getMonth() + 1)}${p(kini.getDate())}-${p(kini.getHours())}${p(kini.getMinutes())}`;

  return new Response(susunCsv(judul, baris), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${namaDasar}-${cap}.csv"`,
      "cache-control": "no-store",
    },
  });
}
