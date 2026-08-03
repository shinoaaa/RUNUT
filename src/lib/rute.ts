import { db } from "@/lib/db";
import { jarakMeter } from "@/lib/bukti";
import { ASUMSI } from "@/lib/statistik";

/* ============================================================
   Penyusun rute penjemputan harian.

   Dua tahap. Pertama menghitung SKOR: seberapa mendesak sebuah warung
   dijemput. Kedua menyusun URUTAN: mulai dari titik kumpul lalu
   berpindah ke tetangga terdekat yang skornya paling tinggi, sampai
   kapasitas angkut atau batas kunjungan tercapai.

   Tidak memakai mesin optimasi rute. Untuk belasan kunjungan sehari,
   pendekatan tetangga terdekat sudah menghasilkan urutan yang masuk akal.
   ============================================================ */

/**
 * Kapasitas angkut satu petugas dalam sekali jalan.
 *
 * Diasumsikan memakai motor roda tiga, kendaraan yang lazim dipakai
 * bank sampah di Indonesia. Motor biasa hanya sanggup sekitar 60 kg —
 * dengan volume jelantah UMKM kuliner, itu habis hanya dalam tiga warung
 * besar dan membuat satu hari kerja jadi tidak masuk akal.
 */
export const KAPASITAS_ANGKUT_KG = 250;
export const BATAS_KUNJUNGAN = 15;

/** Wadah yang dititipkan di warung, disesuaikan dengan volume produksinya. */
export function kapasitasWadahL(estimasiLMinggu: number) {
  return Math.min(60, Math.max(20, estimasiLMinggu * 1.5));
}

export type Urgensi = "mendesak" | "normal" | "ditunda";

export interface Perhentian {
  warungId: number;
  nama: string;
  kategori: string;
  alamat: string | null;
  kecamatan: string | null;
  lat: number;
  lon: number;
  estimasiLMinggu: number;
  /** perkiraan isi wadah saat ini, dalam liter */
  perkiraanIsiL: number;
  hariSejakDijemput: number | null;
  diminta: boolean;
  urgensi: Urgensi;
  skor: number;
  jarakDariSebelumnyaM: number;
  sudahDijemput: boolean;
  beratBersihG: number | null;
}

export interface RuteHarian {
  petugasId: number;
  titikKumpul: { id: number; nama: string; lat: number; lon: number } | null;
  perhentian: Perhentian[];
  selesai: number;
  totalTerkumpulG: number;
}

function tentukanUrgensi(rasioIsi: number, diminta: boolean): Urgensi {
  if (diminta || rasioIsi >= 0.85) return "mendesak";
  if (rasioIsi >= 0.45) return "normal";
  return "ditunda";
}

export async function susunRute(petugasId: number): Promise<RuteHarian> {
  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);

  const [warung, terakhirDijemput, permintaan, titikKumpul, hariIni] = await Promise.all([
    db.warung.findMany({
      where: { aktif: true, kecamatanId: { not: null }, statusVerifikasi: { not: "TUTUP_PERMANEN" } },
      select: {
        id: true,
        nama: true,
        kategori: true,
        alamat: true,
        lat: true,
        lon: true,
        estimasiLMinggu: true,
        kecamatan: { select: { nama: true } },
      },
    }),
    db.penjemputan.groupBy({ by: ["warungId"], _max: { dibuatAt: true } }),
    db.permintaanJemput.findMany({ where: { status: "BARU" }, select: { warungId: true } }),
    db.titikKumpul.findFirst({ select: { id: true, nama: true, lat: true, lon: true } }),
    db.penjemputan.findMany({
      where: { petugasId, dibuatAt: { gte: awalHari } },
      select: { warungId: true, beratBersihG: true },
    }),
  ]);

  const kapanTerakhir = new Map(
    terakhirDijemput.map((t) => [t.warungId, t._max.dibuatAt?.getTime() ?? null]),
  );
  const diminta = new Set(permintaan.map((p) => p.warungId));
  const sudah = new Map(hariIni.map((h) => [h.warungId, h.beratBersihG]));

  const sekarang = Date.now();

  const kandidat = warung.map((w) => {
    const t = kapanTerakhir.get(w.id) ?? null;
    const hari = t === null ? null : Math.floor((sekarang - t) / 86_400_000);
    // Warung yang belum pernah dijemput dianggap sudah lama menumpuk,
    // tapi dibatasi supaya tidak mendominasi seluruh rute.
    const hariEfektif = hari ?? 21;
    const wadahL = kapasitasWadahL(w.estimasiLMinggu);
    const perLitHari = w.estimasiLMinggu / 7;
    const perkiraanIsiL = Math.min(wadahL, perLitHari * hariEfektif);
    const rasioIsi = perkiraanIsiL / wadahL;
    const isDiminta = diminta.has(w.id);

    return {
      warungId: w.id,
      nama: w.nama,
      kategori: w.kategori.replace(/_/g, " "),
      alamat: w.alamat,
      kecamatan: w.kecamatan?.nama ?? null,
      lat: w.lat,
      lon: w.lon,
      estimasiLMinggu: w.estimasiLMinggu,
      perkiraanIsiL: Number(perkiraanIsiL.toFixed(1)),
      hariSejakDijemput: hari,
      diminta: isDiminta,
      urgensi: tentukanUrgensi(rasioIsi, isDiminta),
      skor: rasioIsi * perkiraanIsiL * (isDiminta ? 2 : 1),
      jarakDariSebelumnyaM: 0,
      sudahDijemput: sudah.has(w.id),
      beratBersihG: sudah.get(w.id) ?? null,
    } satisfies Perhentian;
  });

  /* -------- penyusunan urutan: tetangga terdekat berbobot skor -------- */
  // Tanpa ambang mutlak: hari petugas tetap terisi, dan seberapa mendesak
  // tiap kunjungan dinyatakan lewat lencana urgensinya. Petugas boleh
  // melewati yang berlencana "bisa ditunda" kalau waktunya habis.
  const belum = kandidat
    .filter((k) => !k.sudahDijemput)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 60); // calon terkuat saja, supaya pencarian tetap ringan

  const urut: Perhentian[] = [];
  let lat = titikKumpul?.lat ?? belum[0]?.lat ?? 0;
  let lon = titikKumpul?.lon ?? belum[0]?.lon ?? 0;
  let muatanKg = 0;

  while (urut.length < BATAS_KUNJUNGAN && belum.length > 0) {
    let terbaik = 0;
    let nilaiTerbaik = -Infinity;

    for (let i = 0; i < belum.length; i++) {
      const d = jarakMeter(lat, lon, belum[i].lat, belum[i].lon);
      // Skor dibagi jarak: warung mendesak yang dekat menang atas
      // warung mendesak yang jauh.
      const nilai = belum[i].skor / Math.max(300, d);
      if (nilai > nilaiTerbaik) {
        nilaiTerbaik = nilai;
        terbaik = i;
      }
    }

    const p = belum.splice(terbaik, 1)[0];
    p.jarakDariSebelumnyaM = Math.round(jarakMeter(lat, lon, p.lat, p.lon));
    urut.push(p);
    lat = p.lat;
    lon = p.lon;
    muatanKg += p.perkiraanIsiL * ASUMSI.kg_per_liter;
    if (muatanKg >= KAPASITAS_ANGKUT_KG) break;
  }

  // Kunjungan yang sudah selesai hari ini ditaruh di bawah, sebagai riwayat.
  const selesai = kandidat.filter((k) => k.sudahDijemput);

  return {
    petugasId,
    titikKumpul,
    perhentian: [...urut, ...selesai],
    selesai: selesai.length,
    totalTerkumpulG: selesai.reduce((a, b) => a + (b.beratBersihG ?? 0), 0),
  };
}
