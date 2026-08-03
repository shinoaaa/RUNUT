/**
 * Rantai bukti RUNUT.
 *
 * Alat mengirim bacaan mentah yang ditandatangani kunci privatnya sendiri,
 * dan setiap kejadian menggandeng hash kejadian sebelumnya dari alat yang
 * sama. Rantainya dimulai DI ALAT, bukan di server — sehingga menghapus
 * satu baris di basis data akan memutus rantai dan langsung terdeteksi.
 *
 * Inilah yang membuat blockchain tidak diperlukan: sifat tahan-manipulasinya
 * setara, tanpa infrastruktur tambahan.
 */

import { createHash, createPublicKey, createPrivateKey, sign, verify } from "node:crypto";

export type JenisKejadian = "PICKUP" | "TARE" | "DROPOFF" | "STATUS" | "ATTEST";

export interface Amplop {
  device_id: string;
  seq: number;
  event_id: string;
  type: JenisKejadian;
  recorded_at: string;
  prev_hash: string | null;
  payload: Record<string, unknown>;
  sig?: string;
}

/**
 * Serialisasi kanonik: kunci diurutkan secara rekursif supaya dua pihak
 * yang menyusun objek dengan urutan berbeda tetap menghasilkan teks
 * yang sama persis. Tanpa ini, tanda tangan bisa gagal hanya karena
 * urutan kunci berubah.
 */
export function kanonik(nilai: unknown): string {
  if (nilai === null || typeof nilai !== "object") return JSON.stringify(nilai) ?? "null";
  if (Array.isArray(nilai)) return "[" + nilai.map(kanonik).join(",") + "]";
  const o = nilai as Record<string, unknown>;
  const isi = Object.keys(o)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + kanonik(o[k]));
  return "{" + isi.join(",") + "}";
}

/** Bagian amplop yang ditandatangani — semuanya kecuali tanda tangan itu sendiri. */
export function pesanTertandatangan(a: Amplop): string {
  return kanonik({
    device_id: a.device_id,
    seq: a.seq,
    event_id: a.event_id,
    type: a.type,
    recorded_at: a.recorded_at,
    prev_hash: a.prev_hash,
    payload: a.payload,
  });
}

/** Hash berantai: isi kejadian ini digandeng hash kejadian sebelumnya. */
export function hitungHash(a: Amplop): string {
  return createHash("sha256")
    .update(pesanTertandatangan(a) + (a.prev_hash ?? ""))
    .digest("hex");
}

export function verifikasiTandaTangan(a: Amplop, publicKeyB64: string): boolean {
  if (!a.sig) return false;
  try {
    const kunci = createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(pesanTertandatangan(a), "utf8"),
      kunci,
      Buffer.from(a.sig, "base64"),
    );
  } catch {
    return false;
  }
}

/** Dipakai simulator perangkat — di dunia nyata ini berjalan di dalam alat. */
export function tandatangani(a: Amplop, privateKeyB64: string): string {
  const kunci = createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return sign(null, Buffer.from(pesanTertandatangan(a), "utf8"), kunci).toString("base64");
}

/** Jarak dua koordinat dalam meter — rumus Haversine. */
export function jarakMeter(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ambang jarak GPS yang masih dianggap "di lokasi warung". */
export const AMBANG_GPS_M = 120;

/** Ambang susut rantai yang masih dianggap wajar. */
export const AMBANG_SUSUT_PERSEN = 2.0;

/** Densitas minyak jelantah untuk mengubah kilogram ke liter. */
export const KG_PER_LITER = 0.91;
