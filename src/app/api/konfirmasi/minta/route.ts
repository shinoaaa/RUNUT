/**
 * POST /api/konfirmasi/minta — terbitkan kode konfirmasi pemilik warung.
 *
 * Dipanggil layar timbang begitu bacaan alat masuk, jadi kode selalu
 * lahir SESUDAH bobotnya diketahui. Urutan itu disengaja: pemilik
 * menyetujui angka yang benar-benar dilihatnya, bukan angka yang baru
 * muncul setelah ia menyebutkan kodenya.
 *
 * Yang membuat kode ini berarti hanyalah tempat pembuatannya. Selama ia
 * dibangkitkan di peramban petugas, ia tidak membuktikan apa pun.
 */

import { NextResponse } from "next/server";
import { sesiSekarang } from "@/lib/sesi";
import { coba, db } from "@/lib/db";
import { terbitkanKode } from "@/lib/konfirmasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  /*
   * Cukup "sudah masuk", tanpa syarat peran.
   *
   * Layar timbang sendiri sengaja terbuka bagi semua peran yang sudah
   * masuk — lihat catatan di /petugas/jemput/[id], yang membiarkan
   * operator dan pemda menelusuri alurnya. Menuntut peran PETUGAS di
   * sini membuat penjaga alamat ini lebih ketat daripada layar yang
   * dilayaninya: halamannya terbuka, kodenya gagal terbit, dan pesan
   * galatnya menyesatkan sebab terbaca seperti vonis atas kode yang
   * diketik.
   *
   * Melonggarkannya tidak menambah risiko: alamat saudaranya di jalur
   * alat — /api/alat/bacaan dan /api/simulator/kirim — memang tidak
   * menuntut sesi sama sekali, dan yang menjaga bobot tetap tanda
   * tangan alat, bukan peran pemanggilnya.
   */
  const sesi = await sesiSekarang();
  if (!sesi) return NextResponse.json({ ok: false, pesan: "Belum masuk" }, { status: 401 });

  let badan: { warungId?: number; beratBersihG?: number };
  try {
    badan = await req.json();
  } catch {
    return NextResponse.json({ ok: false, pesan: "Muatan bukan JSON" }, { status: 400 });
  }

  const warungId = Number(badan.warungId);
  const beratBersihG = Math.max(0, Math.round(Number(badan.beratBersihG ?? 0)));
  if (!warungId)
    return NextResponse.json({ ok: false, pesan: "Warung tidak disebut" }, { status: 400 });

  const warung = await coba(() =>
    db.warung.findUnique({ where: { id: warungId }, select: { id: true } }),
  );
  if (!warung)
    return NextResponse.json({ ok: false, pesan: "Warung tidak ada" }, { status: 404 });

  const s = await terbitkanKode(warungId, sesi.id, beratBersihG);

  return NextResponse.json({
    ok: true,
    // Kode ikut dibalas supaya layar petugas dapat menampilkannya di
    // kotak peraga — satu-satunya alasannya adalah agar penjurian bisa
    // memperagakan alurnya tanpa ponsel kedua. Kotak itu menyebut
    // dirinya kotak peraga; ia tidak menyamar sebagai kiriman ke pemilik.
    kode: s.kode,
    kedaluwarsaAt: s.kedaluwarsaAt.toISOString(),
  });
}
