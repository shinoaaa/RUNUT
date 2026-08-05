/**
 * GET /api/alat/bacaan?warung=123 — meminta bacaan dari timbangan.
 *
 * Pada purwarupa ini nilainya dibangkitkan dari estimasi produksi warung
 * ditambah sebaran wajar, meniru alat yang baru selesai stabil. Yang
 * penting bagi rancangan: nilainya datang dari SINI, bukan dari kolom
 * isian di layar petugas — layar itu memang tidak punya kolom isian bobot.
 */

import { NextResponse } from "next/server";
import { coba, db } from "@/lib/db";
import { kapasitasWadahL } from "@/lib/rute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const acak = (a: number, b: number) => a + Math.random() * (b - a);

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("warung"));
  if (!id) return NextResponse.json({ ok: false, pesan: "warung tidak disebut" }, { status: 400 });

  const [warung, terakhir] = await coba(() => Promise.all([
    db.warung.findUnique({
      where: { id },
      select: { estimasiLMinggu: true },
    }),
    db.penjemputan.findFirst({
      where: { warungId: id },
      orderBy: { dibuatAt: "desc" },
      select: { dibuatAt: true },
    }),
  ]));
  if (!warung) return NextResponse.json({ ok: false, pesan: "warung tidak ada" }, { status: 404 });

  const hari = terakhir
    ? Math.max(1, Math.floor((Date.now() - terakhir.dibuatAt.getTime()) / 86_400_000))
    : 21;

  // Isi wadah tidak bisa melampaui kapasitasnya, sebesar apa pun
  // produksi warung. Tanpa batas ini, warung besar yang lama tidak
  // dijemput akan menghasilkan bacaan ratusan kilogram.
  const wadahL = kapasitasWadahL(warung.estimasiLMinggu);
  const liter = Math.min(
    wadahL,
    Math.max(0.8, (warung.estimasiLMinggu / 7) * hari * acak(0.7, 1.15)),
  );

  const wadahG = Math.round(acak(900, 1600));
  const bersihG = Math.round(liter * 0.91 * 1000);

  return NextResponse.json({
    ok: true,
    gross_g: bersihG + wadahG,
    tare_g: wadahG,
    stable_ms: Math.round(acak(1100, 2400)),
    suhu_c: Number(acak(28, 34).toFixed(1)),
    battery_mv: Math.round(acak(3600, 4050)),
    rssi_dbm: Math.round(acak(-95, -62)),
  });
}
