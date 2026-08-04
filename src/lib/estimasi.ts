/**
 * Penaksir volume jelantah sebuah warung.
 *
 * ============================================================
 * DASAR ANGKANYA
 * ============================================================
 * Rentang produksi per jenis usaha diambil dari data sekunder yang
 * beredar di literatur pengelolaan jelantah Indonesia:
 *
 *   Warteg dan warung kecil      20 – 50    liter/bulan
 *   Restoran dan rumah makan     50 – 200   liter/bulan
 *   Katering, hotel, food court  100 – 500  liter/bulan
 *
 * Angka itu cocok dengan pembanding yang dipakai di seluruh proposal:
 * satu rumah makan menengah menghasilkan sekitar 130 liter per bulan —
 * tepat di tengah rentang restoran. Dua sumber yang saling bebas
 * memberi titik yang sama, jadi rentangnya dipakai sebagai dasar.
 *
 * ============================================================
 * KENAPA SKALA SAJA TIDAK CUKUP
 * ============================================================
 * Warung bakso dan warung ayam goreng bisa sama-sama berukuran kecil
 * dan sama-sama ramai, tetapi jelantahnya berbeda jauh: bakso, mi ayam,
 * dan soto dimasak dengan cara direbus. Karena itu rentang di atas
 * diperlakukan sebagai patokan warung campuran, lalu dikalikan faktor
 * jenis masakan.
 *
 *   estimasi liter/bulan = titik tengah skala x faktor kategori
 *
 * Faktor kategori berporos pada 1,0 untuk warteg atau nasi campur,
 * yaitu jenis usaha yang menjadi dasar penyusunan rentang tersebut.
 *
 * ============================================================
 * SIFAT ANGKANYA
 * ============================================================
 * Ini ESTIMASI AWAL, bukan pengukuran. Begitu warung mulai dijemput,
 * hasil timbangan yang menggantikannya, dan faktor kategori dikoreksi
 * memakai rata-rata bergerak dari realisasi. Tabel di bawah adalah
 * titik berangkat, bukan kesimpulan.
 */

export type KelasSkala = "KECIL" | "SEDANG" | "BESAR";

export interface RentangSkala {
  label: string;
  keterangan: string;
  minLBulan: number;
  maxLBulan: number;
  tengahLBulan: number;
}

export const SKALA: Record<KelasSkala, RentangSkala> = {
  KECIL: {
    label: "Kecil",
    keterangan: "Warteg, warung tenda, gerobak, kaki lima",
    minLBulan: 20,
    maxLBulan: 50,
    tengahLBulan: 35,
  },
  SEDANG: {
    label: "Menengah",
    keterangan: "Rumah makan, restoran, kafe dengan dapur",
    minLBulan: 50,
    maxLBulan: 200,
    tengahLBulan: 125,
  },
  BESAR: {
    label: "Besar",
    keterangan: "Katering, hotel, food court, gerai berjejaring",
    minLBulan: 100,
    maxLBulan: 500,
    tengahLBulan: 300,
  },
};

export interface Kategori {
  nilai: string;
  label: string;
  faktor: number;
  keterangan: string;
}

/** Faktor jenis masakan. Berporos pada warteg atau nasi campur = 1,0. */
export const KATEGORI: Kategori[] = [
  {
    nilai: "gorengan",
    label: "Gorengan & jajanan goreng",
    faktor: 1.6,
    keterangan: "Menggoreng sepanjang jam buka, minyak cepat jenuh",
  },
  {
    nilai: "ayam_goreng",
    label: "Ayam goreng, geprek, penyet",
    faktor: 1.6,
    keterangan: "Wajan besar dan penggantian minyak sering",
  },
  {
    nilai: "cepat_saji",
    label: "Cepat saji & gerai berjejaring",
    faktor: 1.4,
    keterangan: "Penggorengan dalam volume tetap dengan jadwal ganti rutin",
  },
  {
    nilai: "seafood",
    label: "Seafood, pecel lele, ikan bakar",
    faktor: 1.1,
    keterangan: "Sebagian menu digoreng, sebagian dibakar",
  },
  {
    nilai: "padang",
    label: "Masakan Padang",
    faktor: 1.1,
    keterangan: "Banyak lauk digoreng, sebagian bersantan",
  },
  {
    nilai: "warteg",
    label: "Warteg, nasi campur, prasmanan",
    faktor: 1.0,
    keterangan: "Patokan dasar penyusunan rentang",
  },
  {
    nilai: "lainnya",
    label: "Lainnya atau belum diketahui",
    faktor: 0.8,
    keterangan: "Dipakai sementara sampai petugas memastikan di lapangan",
  },
  {
    nilai: "rebusan",
    label: "Bakso, mi ayam, soto, bubur",
    faktor: 0.15,
    keterangan: "Menu utama direbus; menggoreng hanya untuk pelengkap",
  },
  {
    nilai: "minuman",
    label: "Kopi, minuman, jus",
    faktor: 0.05,
    keterangan: "Nyaris tidak menggoreng",
  },
];

export const petaKategori = new Map(KATEGORI.map((k) => [k.nilai, k]));

export interface HasilEstimasi {
  literPerBulan: number;
  literPerMinggu: number;
  rentangMin: number;
  rentangMax: number;
  faktor: number;
  labelKategori: string;
  labelSkala: string;
  /** Uraian singkat yang ditampilkan apa adanya kepada pengguna. */
  uraian: string;
}

export function hitungEstimasi(kategori: string, skala: KelasSkala): HasilEstimasi {
  const k = petaKategori.get(kategori) ?? petaKategori.get("lainnya")!;
  const s = SKALA[skala];
  const perBulan = s.tengahLBulan * k.faktor;

  return {
    literPerBulan: Number(perBulan.toFixed(1)),
    literPerMinggu: Number((perBulan / (30 / 7)).toFixed(2)),
    rentangMin: Number((s.minLBulan * k.faktor).toFixed(1)),
    rentangMax: Number((s.maxLBulan * k.faktor).toFixed(1)),
    faktor: k.faktor,
    labelKategori: k.label,
    labelSkala: s.label,
    uraian:
      `Skala ${s.label.toLowerCase()} berkisar ${s.minLBulan}–${s.maxLBulan} liter per bulan ` +
      `dengan titik tengah ${s.tengahLBulan}. Dikalikan faktor ${k.faktor.toLocaleString("id-ID")} ` +
      `untuk ${k.label.toLowerCase()}, hasilnya ${perBulan.toFixed(1)} liter per bulan.`,
  };
}
