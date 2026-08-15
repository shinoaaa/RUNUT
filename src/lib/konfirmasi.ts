/**
 * Kode konfirmasi pemilik warung.
 *
 * MENGAPA INI ADA
 *
 * Sebelumnya kode empat angka di layar timbang dibangkitkan di peramban
 * petugas sendiri, ditampilkan kepada petugas itu juga dengan tulisan
 * "Kode terkirim ke nomor pemilik" — padahal tidak dikirim ke mana pun —
 * lalu tidak pernah dicocokkan di satu titik pun. Server hanya memeriksa
 * apakah kolomnya terisi, sehingga `0000` pun lolos.
 *
 * Akibatnya lencana "dikonfirmasi pemilik" muncul di dasbor pemda dan di
 * halaman telusur publik tanpa ada pemilik yang pernah terlibat. Itu satu
 * klaim yang berlawanan dengan prinsip yang memayungi seluruh rancangan
 * ini: pengukuran diletakkan pada jalur fisik material, bukan pada
 * laporan orang.
 *
 * Sekarang kodenya dibuat, disimpan, dan dicocokkan di server. Ia terbaca
 * di halaman warung yang hanya bisa dibuka lewat kartu QR milik pemilik,
 * sehingga menyebutkannya benar-benar menunjukkan pemiliknya hadir.
 *
 * YANG SENGAJA TIDAK DILAKUKAN
 *
 * Penjemputan tanpa kode tidak ditolak. Pemilik bisa sedang ke pasar,
 * bisa tidak berponsel, dan jelantahnya tetap nyata. Menolak hanya akan
 * memindahkan akal-akalan ke tempat yang tidak terlihat. Yang dilakukan
 * adalah mencatat CARANYA, lalu menampilkan bedanya.
 */

import { randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/** Selang hidup satu kode. Cukup panjang untuk menimbang, cukup pendek
 *  untuk tidak menganggur di meja sesudah petugas pergi. */
export const UMUR_MENIT = 15;

/** Empat angka hanya berarti kalau tebakannya dibatasi. */
export const MAKS_PERCOBAAN = 5;

/** Perbandingan yang tidak membocorkan lewat lama waktunya. */
function samaPersis(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Terbitkan kode baru untuk satu warung.
 *
 * Sesi lama warung yang sama ditutup lebih dulu, supaya tidak ada dua
 * kode hidup berbarengan dan pemilik tidak bingung mana yang berlaku.
 *
 * `randomInt` dipakai, bukan `Math.random`. Yang terakhir dapat ditebak
 * dari keluaran sebelumnya, dan yang paling diuntungkan oleh itu justru
 * pihak yang sedang diperiksa.
 */
export async function terbitkanKode(
  warungId: number,
  petugasId: number,
  beratBersihG: number,
) {
  await db.sesiKonfirmasi.updateMany({
    where: { warungId, dipakaiAt: null },
    data: { dipakaiAt: new Date() },
  });

  const kode = String(randomInt(1000, 10000));
  const kedaluwarsaAt = new Date(Date.now() + UMUR_MENIT * 60_000);

  return db.sesiKonfirmasi.create({
    data: { warungId, petugasId, kode, beratBersihG, kedaluwarsaAt },
  });
}

/** Sesi yang masih hidup untuk satu warung, atau null. */
export function sesiHidup(warungId: number) {
  return db.sesiKonfirmasi.findFirst({
    where: {
      warungId,
      dipakaiAt: null,
      kedaluwarsaAt: { gt: new Date() },
      percobaan: { lt: MAKS_PERCOBAAN },
    },
    orderBy: { dibuatAt: "desc" },
  });
}

export type HasilPeriksa =
  | { hasil: "COCOK"; sesiId: number }
  | { hasil: "SALAH"; sisaPercobaan: number }
  | { hasil: "HABIS" }
  | { hasil: "TIDAK_ADA" };

/**
 * Cocokkan kode TANPA memakainya.
 *
 * Dipakai layar petugas supaya salah ketik ketahuan sebelum apa pun
 * ditandatangani alat. Pemakaian sesungguhnya terjadi di /api/ingest,
 * yang mencocokkan ulang sendiri — layar tidak pernah jadi sumber
 * kebenaran atas dirinya sendiri.
 */
export async function periksaKode(warungId: number, kode: string): Promise<HasilPeriksa> {
  const sesi = await sesiHidup(warungId);
  if (!sesi) {
    // Bedakan "belum pernah ada" dari "sudah dihabiskan percobaannya",
    // supaya petugas tahu harus menimbang ulang, bukan menebak lagi.
    const pernah = await db.sesiKonfirmasi.findFirst({
      where: { warungId, dipakaiAt: null, kedaluwarsaAt: { gt: new Date() } },
    });
    return pernah ? { hasil: "HABIS" } : { hasil: "TIDAK_ADA" };
  }

  if (samaPersis(sesi.kode, kode)) return { hasil: "COCOK", sesiId: sesi.id };

  const { percobaan } = await db.sesiKonfirmasi.update({
    where: { id: sesi.id },
    data: { percobaan: { increment: 1 } },
    select: { percobaan: true },
  });

  return percobaan >= MAKS_PERCOBAAN
    ? { hasil: "HABIS" }
    : { hasil: "SALAH", sisaPercobaan: MAKS_PERCOBAAN - percobaan };
}

/** Perbandingan tanpa efek samping, dipakai /api/ingest di dalam alurnya. */
export function kodeCocok(sesiKode: string, dikirim: unknown): boolean {
  return typeof dikirim === "string" && samaPersis(sesiKode, dikirim);
}
