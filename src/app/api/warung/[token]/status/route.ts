/**
 * GET /api/warung/[token]/status — sumber isi halaman pemilik warung.
 *
 * Terbuka tanpa akun, sebab yang memegang tokennya adalah pemilik warung
 * itu sendiri: token hanya ada pada kartu QR yang dicetak untuknya, dan
 * kartu itu sengaja TIDAK ditempel di dinding. Stiker yang ditempel
 * memuat token telanjang tanpa alamat, sehingga orang lewat yang
 * memindainya tidak membuka apa pun.
 *
 * Halaman pemilik menanyai alamat ini beberapa detik sekali supaya kode
 * konfirmasi muncul sendiri ketika petugas mulai menimbang, tanpa
 * pemiliknya perlu memuat ulang apa pun.
 */

import { NextResponse } from "next/server";
import { coba, db } from "@/lib/db";
import { sesiHidup } from "@/lib/konfirmasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const warung = await coba(() =>
    db.warung.findUnique({
      // tokenPemilik, BUKAN qrToken — lihat catatan pada /w/[token].
      // Alamat ini membocorkan kode konfirmasi yang sedang berjalan,
      // jadi ia harus tertutup bagi siapa pun yang cuma memindai stiker
      // di tembok warung.
      where: { tokenPemilik: token },
      select: { id: true, nama: true },
    }),
  );
  if (!warung) return NextResponse.json({ ok: false, pesan: "Tidak ditemukan" }, { status: 404 });

  const sesi = await coba(() => sesiHidup(warung.id));

  return NextResponse.json({
    ok: true,
    nama: warung.nama,
    // null berarti tidak ada petugas yang sedang menimbang di sini.
    sesi: sesi
      ? {
          kode: sesi.kode,
          beratBersihG: sesi.beratBersihG,
          kedaluwarsaAt: sesi.kedaluwarsaAt.toISOString(),
        }
      : null,
  });
}
