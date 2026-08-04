import { coba, db } from "@/lib/db";
import { KG_PER_LITER } from "@/lib/format";

/* ============================================================
   Asumsi yang dipakai dasbor.
   Semuanya dikumpulkan di satu tempat supaya bisa ditampilkan apa
   adanya kepada pengguna lewat panel "lihat asumsi". Angka yang
   bersumber dari pengukuran TIDAK ada di sini.
   ============================================================ */

export const ASUMSI = {
  minggu_per_bulan: 30 / 7,
  kg_per_liter: KG_PER_LITER,
  /** Berapa bagian UMKM kuliner sebenarnya yang berhasil dipetakan data
   *  terbuka. OpenStreetMap cenderung hanya memuat usaha besar dan
   *  berjejaring, sedangkan warung kecil dan pedagang gerobak jarang
   *  terpetakan. Angka ini yang paling lemah di seluruh dasbor dan
   *  akan diganti begitu data dinas tersedia. */
  cakupan_registri: 0.25,
  /** 5 liter jelantah menghasilkan 1 liter biodiesel (sumber nasional,
   *  konservatif dibanding literatur teknis). */
  liter_jelantah_per_biodiesel: 5,
  /** Pembakaran 1 liter solar, faktor emisi yang lazim dipakai. */
  kg_co2_per_liter_solar: 2.68,
  /** Penghematan emisi daur hidup biodiesel UCO dibanding solar fosil. */
  penghematan_daur_hidup: 0.83,
  /** Batas susut rantai yang masih dianggap wajar. */
  ambang_susut_persen: 2.0,
};

/** Satu liter jelantah tertangkap setara berapa kg CO2e yang tak jadi dilepas. */
export const KG_CO2_PER_LITER_JELANTAH =
  (ASUMSI.kg_co2_per_liter_solar * ASUMSI.penghematan_daur_hidup) /
  ASUMSI.liter_jelantah_per_biodiesel;

export interface RingkasWilayah {
  kecamatan: string;
  jumlahWarung: number;
  warungAktif: number;
  potensiLBulan: number;
  terjemputLBulan: number;
  /** null berarti belum ada warung terdata — bukan nol yang terukur. */
  tingkatTangkap: number | null;
}

export interface StatistikDasbor {
  terjemputKg: number;
  terjemputLiter: number;
  potensiTerdaftarLBulan: number;
  potensiWilayahLBulan: number;
  tingkatTangkap: number;
  warungAktif: number;
  warungTerdata: number;
  nilaiRpTahunIni: number;
  susutRantaiG: number;
  susutRantaiPersen: number;
  bocorTerdaftarLBulan: number;
  diLuarJangkauanLBulan: number;
  wilayah: RingkasWilayah[];
  tren: Array<{ label: string; terjemput: number; potensi: number }>;
  literTakMasukSaluran: number;
  literBiodiesel: number;
  tonCo2: number;
}

const gToLiter = (g: number) => g / 1000 / ASUMSI.kg_per_liter;

export async function statistikDasbor(): Promise<StatistikDasbor> {
  const sekarang = Date.now();
  const sebulanLalu = new Date(sekarang - 30 * 86_400_000);
  const awalTahun = new Date(new Date(sekarang).getFullYear(), 0, 1);
  const delapanMingguLalu = new Date(sekarang - 56 * 86_400_000);

  const [warung, penjemputanBulanIni, nilaiTahunIni, tripDisetor, penjemputanTren] =
    await coba(() => Promise.all([
      db.warung.findMany({
        where: { aktif: true },
        select: {
          id: true,
          estimasiLMinggu: true,
          kecamatan: { select: { nama: true } },
        },
      }),
      db.penjemputan.groupBy({
        by: ["warungId"],
        where: { dibuatAt: { gte: sebulanLalu } },
        _sum: { beratBersihG: true },
      }),
      db.penjemputan.aggregate({
        where: { dibuatAt: { gte: awalTahun } },
        _sum: { nilaiRp: true },
      }),
      db.trip.aggregate({
        where: { susutG: { not: null } },
        _sum: { susutG: true, totalGWarung: true },
      }),
      db.penjemputan.findMany({
        where: { dibuatAt: { gte: delapanMingguLalu } },
        select: { dibuatAt: true, beratBersihG: true },
      }),
    ]));

  const terjemputPerWarung = new Map(
    penjemputanBulanIni.map((p) => [p.warungId, p._sum.beratBersihG ?? 0]),
  );

  /* -------- agregasi per kecamatan -------- */
  const perKec = new Map<string, RingkasWilayah>();
  let potensiTerdaftar = 0;
  let terjemputG = 0;

  for (const w of warung) {
    const potensi = w.estimasiLMinggu * ASUMSI.minggu_per_bulan;
    const g = terjemputPerWarung.get(w.id) ?? 0;
    potensiTerdaftar += potensi;
    terjemputG += g;

    const nama = w.kecamatan?.nama;
    if (!nama) continue;
    const r =
      perKec.get(nama) ??
      ({
        kecamatan: nama,
        jumlahWarung: 0,
        warungAktif: 0,
        potensiLBulan: 0,
        terjemputLBulan: 0,
        tingkatTangkap: null,
      } satisfies RingkasWilayah);
    r.jumlahWarung += 1;
    if (g > 0) r.warungAktif += 1;
    r.potensiLBulan += potensi;
    r.terjemputLBulan += gToLiter(g);
    perKec.set(nama, r);
  }

  const semuaKec = await coba(() => db.kecamatan.findMany({ select: { nama: true } }));
  for (const k of semuaKec)
    if (!perKec.has(k.nama))
      perKec.set(k.nama, {
        kecamatan: k.nama,
        jumlahWarung: 0,
        warungAktif: 0,
        potensiLBulan: 0,
        terjemputLBulan: 0,
        tingkatTangkap: null, // belum ada data, bukan nol terukur
      });

  const wilayah = [...perKec.values()]
    .map((r) => ({
      ...r,
      potensiLBulan: Number(r.potensiLBulan.toFixed(1)),
      terjemputLBulan: Number(r.terjemputLBulan.toFixed(1)),
      tingkatTangkap:
        r.jumlahWarung === 0
          ? null
          : Number(((r.terjemputLBulan / Math.max(r.potensiLBulan, 1)) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.jumlahWarung - a.jumlahWarung);

  /* -------- tren delapan minggu -------- */
  const ember = new Map<string, number>();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(sekarang - i * 7 * 86_400_000);
    ember.set(`${d.getDate()}/${d.getMonth() + 1}`, 0);
  }
  const kunciMinggu = [...ember.keys()];
  for (const p of penjemputanTren) {
    const idx = Math.min(
      7,
      Math.floor((p.dibuatAt.getTime() - delapanMingguLalu.getTime()) / (7 * 86_400_000)),
    );
    const k = kunciMinggu[Math.max(0, idx)];
    ember.set(k, (ember.get(k) ?? 0) + gToLiter(p.beratBersihG));
  }
  const potensiMingguan = potensiTerdaftar / ASUMSI.minggu_per_bulan;
  const tren = kunciMinggu.map((label) => ({
    label,
    terjemput: Number((ember.get(label) ?? 0).toFixed(1)),
    potensi: Number(potensiMingguan.toFixed(1)),
  }));

  /* -------- angka utama -------- */
  const terjemputLiter = gToLiter(terjemputG);
  const potensiWilayah = potensiTerdaftar / ASUMSI.cakupan_registri;
  const susutG = tripDisetor._sum.susutG ?? 0;
  const totalMasukG = tripDisetor._sum.totalGWarung ?? 0;

  return {
    terjemputKg: terjemputG / 1000,
    terjemputLiter,
    potensiTerdaftarLBulan: potensiTerdaftar,
    potensiWilayahLBulan: potensiWilayah,
    tingkatTangkap: potensiWilayah > 0 ? (terjemputLiter / potensiWilayah) * 100 : 0,
    warungAktif: terjemputPerWarung.size,
    warungTerdata: warung.length,
    nilaiRpTahunIni: nilaiTahunIni._sum.nilaiRp ?? 0,
    susutRantaiG: susutG,
    susutRantaiPersen: totalMasukG > 0 ? (susutG / totalMasukG) * 100 : 0,
    bocorTerdaftarLBulan: Math.max(0, potensiTerdaftar - terjemputLiter),
    diLuarJangkauanLBulan: Math.max(0, potensiWilayah - potensiTerdaftar),
    wilayah,
    tren,
    literTakMasukSaluran: terjemputLiter,
    literBiodiesel: terjemputLiter / ASUMSI.liter_jelantah_per_biodiesel,
    tonCo2: (terjemputLiter * KG_CO2_PER_LITER_JELANTAH) / 1000,
  };
}
