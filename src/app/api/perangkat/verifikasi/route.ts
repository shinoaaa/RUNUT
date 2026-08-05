/**
 * POST /api/perangkat/verifikasi — memeriksa ulang seluruh rantai bukti.
 *
 * Tiap kejadian dihitung ulang hash-nya, diperiksa tanda tangannya
 * terhadap kunci publik alat, lalu dicocokkan sambungannya ke kejadian
 * sebelumnya. Kalau satu baris di basis data diubah atau dihapus,
 * pemeriksaan ini yang menangkapnya.
 *
 * Inilah pengganti blockchain: sifat tahan-manipulasi yang setara,
 * tanpa infrastruktur tambahan.
 */

import { NextResponse } from "next/server";
import { coba, db } from "@/lib/db";
import { hitungHashDariPesan, verifikasiPesan } from "@/lib/bukti";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface HasilPeriksa {
  deviceId: string;
  jumlah: number;
  utuh: boolean;
  tandaTanganSah: number;
  hashCocok: number;
  masalah: Array<{ seq: number; sebab: string }>;
}

export async function POST() {
  const perangkat = await coba(() =>
    db.perangkat.findMany({
      select: { id: true, deviceId: true, publicKey: true },
      orderBy: { deviceId: "asc" },
    }),
  );

  const hasil: HasilPeriksa[] = [];

  for (const p of perangkat) {
    const kejadian = await coba(() => db.kejadianAlat.findMany({
      where: { perangkatId: p.id },
      orderBy: { seq: "asc" },
      select: {
        seq: true,
        pesanKanonik: true,
        prevHash: true,
        hash: true,
        sig: true,
      },
    }));

    const masalah: HasilPeriksa["masalah"] = [];
    let tandaTanganSah = 0;
    let hashCocok = 0;
    let hashSebelumnya: string | null = null;

    for (const k of kejadian) {
      // Diperiksa terhadap PESAN yang tersimpan apa adanya, bukan hasil
      // menyusun ulang dari kolom JSON — JSONB memotong angka pecahan
      // di 16 digit penting sehingga koordinat kehilangan presisi.
      if (!k.pesanKanonik) {
        masalah.push({ seq: k.seq, sebab: "Pesan asli tidak tersimpan" });
        continue;
      }

      if (verifikasiPesan(k.pesanKanonik, k.sig, p.publicKey)) tandaTanganSah++;
      else masalah.push({ seq: k.seq, sebab: "Tanda tangan tidak sah" });

      if (hitungHashDariPesan(k.pesanKanonik, k.prevHash) === k.hash) hashCocok++;
      else masalah.push({ seq: k.seq, sebab: "Hash tidak cocok dengan isinya" });

      if (hashSebelumnya !== null && k.prevHash !== hashSebelumnya)
        masalah.push({ seq: k.seq, sebab: "Sambungan ke kejadian sebelumnya putus" });

      hashSebelumnya = k.hash;
    }

    hasil.push({
      deviceId: p.deviceId,
      jumlah: kejadian.length,
      utuh: masalah.length === 0,
      tandaTanganSah,
      hashCocok,
      masalah: masalah.slice(0, 8),
    });
  }

  return NextResponse.json({ ok: true, diperiksaPada: new Date().toISOString(), hasil });
}
