import type { StatusWarung } from "@/lib/format";

/**
 * Bentuk data titik warung di peta.
 *
 * Sengaja ditaruh di berkas terpisah tanpa impor Leaflet, supaya komponen
 * server maupun klien bisa memakainya tanpa ikut menarik pustaka peta —
 * Leaflet menyentuh `window` saat modulnya dimuat, jadi dia hanya boleh
 * masuk lewat impor dinamis di sisi peramban.
 */
export interface TitikWarung {
  id: number;
  nama: string;
  lat: number;
  lon: number;
  kategori: string;
  kecamatan: string | null;
  estimasiLBulan: number;
  terjemputLBulan: number;
  status: StatusWarung;
  /** Dugaan awal bahwa titik ini gerai berjejaring, bukan pelaku UMKM. */
  jejaring: boolean;
}
