/** Pemformatan angka bergaya Indonesia — pemisah ribuan titik, desimal koma. */

const nf = (min = 0, max = 0) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max });

export const angka = (n: number, desimal = 0) => nf(desimal, desimal).format(n);

export function rupiah(n: number, ringkas = false) {
  if (ringkas) {
    if (n >= 1_000_000_000) return `Rp ${angka(n / 1_000_000_000, 1)} M`;
    if (n >= 1_000_000) return `Rp ${angka(n / 1_000_000, 1)} jt`;
    if (n >= 1_000) return `Rp ${angka(n / 1_000, 0)} rb`;
  }
  return `Rp ${angka(n)}`;
}

/* ------------------------------------------------------------
   Satuan

   LITER adalah satuan yang ditampilkan kepada pengguna di seluruh
   aplikasi — estimasi, potensi, kebocoran, stok, dan hasil jemput.
   Alasannya, seluruh pihak di lapangan berbicara dalam liter: jeriken
   berukuran liter, harga pengepul per liter, dan insentif program pun
   per liter.

   KILOGRAM tetap ditampilkan berdampingan pada layar yang memang
   menimbang, sebab itulah yang benar-benar diukur alat. Yang tersimpan
   di basis data selalu gram, dan liter adalah turunannya.
   ------------------------------------------------------------ */

/** gram -> kilogram */
export const kg = (gram: number, desimal = 2) => angka(gram / 1000, desimal);

/** gram -> liter, memakai densitas minyak jelantah */
export const KG_PER_LITER = 0.91;
export const liter = (gram: number, desimal = 1) =>
  angka(gram / 1000 / KG_PER_LITER, desimal);

/** Liter di depan, kilogram terukur di belakang. */
export const literKg = (gram: number) => `${liter(gram)} L · ${kg(gram)} kg`;

export const persen = (n: number, desimal = 1) => `${angka(n, desimal)}%`;

export const tanggal = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(d),
  );

export const jam = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export const tanggalJam = (d: Date | string) => `${tanggal(d)}, ${jam(d)}`;

/* ------------------------------------------------------------
   Status setoran warung — dipakai untuk warna penanda dan pil.
   ------------------------------------------------------------ */

export type StatusWarung = "rutin" | "jarang" | "berisiko" | "baru";

export const WARNA_STATUS: Record<StatusWarung, string> = {
  rutin: "#1f9d6e",
  jarang: "#e0a030",
  berisiko: "#b23a2e",
  baru: "#9aa5a0",
};

export const LABEL_STATUS: Record<StatusWarung, string> = {
  rutin: "Rutin",
  jarang: "Jarang",
  berisiko: "Berisiko",
  baru: "Belum pernah",
};

/**
 * Menentukan status dari perbandingan estimasi produksi terhadap
 * jumlah yang benar-benar dijemput selama sebulan terakhir.
 */
export function statusWarung(estimasiLBulan: number, terjemputLBulan: number): StatusWarung {
  if (terjemputLBulan <= 0) return "baru";
  if (estimasiLBulan <= 0) return "rutin";
  const rasio = terjemputLBulan / estimasiLBulan;
  if (rasio >= 0.6) return "rutin";
  if (rasio >= 0.25) return "jarang";
  return "berisiko";
}

/** Lima tingkat warna peta wilayah. Nol data sengaja abu, bukan hijau termuda. */
export const SKALA_WILAYAH = ["#edf5f0", "#c9e4d6", "#93cbb2", "#4fa588", "#0e7a5b"];
export const WARNA_TANPA_DATA = "#e8eae7";

export function warnaWilayah(persenTangkap: number | null): string {
  if (persenTangkap === null) return WARNA_TANPA_DATA;
  const i = Math.min(4, Math.floor(persenTangkap / 20));
  return SKALA_WILAYAH[i];
}
