/**
 * POST /api/konfirmasi/periksa — cocokkan kode sebelum alat menandatangani.
 *
 * Gunanya semata memberi tahu petugas bahwa ketikannya salah selagi
 * masih bisa diperbaiki. Pemakaian yang sesungguhnya terjadi di
 * /api/ingest, yang mencocokkan ulang sendiri dari basis data — layar
 * petugas tidak pernah menjadi sumber kebenaran atas dirinya sendiri.
 *
 * Tiap tebakan yang meleset dihitung. Tanpa itu, empat angka bukan
 * pengaman melainkan tunda waktu.
 */

import { NextResponse } from "next/server";
import { sesiSekarang } from "@/lib/sesi";
import { periksaKode } from "@/lib/konfirmasi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sesi = await sesiSekarang();
  if (!sesi) return NextResponse.json({ ok: false, pesan: "Belum masuk" }, { status: 401 });
  if (sesi.peran !== "PETUGAS" && sesi.peran !== "ADMIN")
    return NextResponse.json({ ok: false, pesan: "Bukan petugas lapangan" }, { status: 403 });

  let badan: { warungId?: number; kode?: string };
  try {
    badan = await req.json();
  } catch {
    return NextResponse.json({ ok: false, pesan: "Muatan bukan JSON" }, { status: 400 });
  }

  const warungId = Number(badan.warungId);
  const kode = String(badan.kode ?? "");
  if (!warungId || !/^\d{4}$/.test(kode))
    return NextResponse.json({ ok: false, pesan: "Permintaan tidak lengkap" }, { status: 400 });

  const hasil = await periksaKode(warungId, kode);

  const pesan =
    hasil.hasil === "COCOK"
      ? null
      : hasil.hasil === "SALAH"
        ? `Kode tidak cocok. Sisa ${hasil.sisaPercobaan} percobaan.`
        : hasil.hasil === "HABIS"
          ? "Percobaan habis. Ambil bacaan ulang untuk menerbitkan kode baru."
          : "Belum ada kode yang berlaku. Ambil bacaan dari alat lebih dulu.";

  return NextResponse.json({ ok: true, ...hasil, pesan });
}
