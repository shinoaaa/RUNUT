/**
 * POST /api/simulator/kirim — berperan sebagai PERANGKAT KERAS.
 *
 * Di dunia nyata, penandatanganan terjadi di dalam timbangan memakai kunci
 * privat yang tersimpan di alat. Pada purwarupa ini alatnya disimulasikan,
 * jadi kunci privatnya ada di berkas prisma/perangkat-simulasi.json.
 *
 * Endpoint ini sengaja MENERUSKAN ke /api/ingest lewat jaringan, bukan
 * memanggil fungsinya langsung, supaya jalur yang diuji benar-benar sama
 * dengan jalur yang dipakai alat sungguhan.
 */

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { Amplop, JenisKejadian, tandatangani } from "@/lib/bukti";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kunci = { deviceId: string; privateKey: string; publicKey: string };

let cacheKunci: Kunci[] | null = null;
function kunciPerangkat(): Kunci[] {
  cacheKunci ??= JSON.parse(
    readFileSync(path.join(process.cwd(), "prisma", "perangkat-simulasi.json"), "utf8"),
  );
  return cacheKunci!;
}

interface Permintaan {
  device_id: string;
  type: JenisKejadian;
  payload: Record<string, unknown>;
  /** kenakalan yang sengaja dipicu untuk memperagakan penolakan sistem */
  nakal?: "ulang" | "tanda_tangan_palsu" | "lewati_urut" | "rantai_putus";
}

export async function POST(req: Request) {
  const p = (await req.json()) as Permintaan;

  const perangkat = await db.perangkat.findUnique({
    where: { deviceId: p.device_id },
  });
  if (!perangkat)
    return NextResponse.json({ ok: false, pesan: "Perangkat tidak dikenal" }, { status: 404 });

  const kunci = kunciPerangkat().find((k) => k.deviceId === p.device_id);
  if (!kunci)
    return NextResponse.json(
      { ok: false, pesan: "Kunci privat simulasi tidak ditemukan" },
      { status: 500 },
    );

  // Kejadian terakhir dipakai untuk meniru pengiriman ulang.
  const terakhir = await db.kejadianAlat.findFirst({
    where: { perangkatId: perangkat.id },
    orderBy: { seq: "desc" },
  });

  if (p.nakal === "ulang") {
    if (!terakhir)
      return NextResponse.json({ ok: false, pesan: "Belum ada kejadian untuk dikirim ulang" });
    const ulang = {
      device_id: p.device_id,
      seq: terakhir.seq,
      event_id: terakhir.eventId,
      type: terakhir.type,
      recorded_at: terakhir.recordedAt.toISOString(),
      prev_hash: terakhir.prevHash,
      payload: terakhir.payload as Record<string, unknown>,
      sig: terakhir.sig,
    } satisfies Amplop;
    return teruskan(req, ulang, "Kejadian sebelumnya dikirim ulang apa adanya");
  }

  let seq = perangkat.lastSeq + 1;
  if (p.nakal === "lewati_urut") seq += 4;

  const amplop: Amplop = {
    device_id: p.device_id,
    seq,
    event_id: `${p.device_id}:${seq}:${Date.now()}`,
    type: p.type,
    recorded_at: new Date().toISOString(),
    prev_hash: p.nakal === "rantai_putus" ? "0".repeat(64) : perangkat.lastHash,
    payload: p.payload,
  };

  amplop.sig =
    p.nakal === "tanda_tangan_palsu"
      ? Buffer.alloc(64, 7).toString("base64")
      : tandatangani(amplop, kunci.privateKey);

  const keterangan =
    p.nakal === "tanda_tangan_palsu"
      ? "Tanda tangan sengaja dipalsukan"
      : p.nakal === "lewati_urut"
        ? `Nomor urut sengaja dilompatkan ke ${seq}`
        : p.nakal === "rantai_putus"
          ? "prev_hash sengaja dirusak"
          : undefined;

  return teruskan(req, amplop, keterangan);
}

async function teruskan(req: Request, amplop: Amplop, keterangan?: string) {
  const asal = new URL(req.url).origin;
  const r = await fetch(`${asal}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(amplop),
  });
  const balasan = await r.json();
  return NextResponse.json({
    status: r.status,
    keterangan,
    dikirim: {
      device_id: amplop.device_id,
      seq: amplop.seq,
      type: amplop.type,
      prev_hash: amplop.prev_hash ? amplop.prev_hash.slice(0, 12) + "…" : null,
      sig: (amplop.sig ?? "").slice(0, 16) + "…",
      payload: amplop.payload,
    },
    balasan,
  });
}
