/**
 * Uji jalur penerimaan data alat, termasuk skenario yang HARUS ditolak.
 * Jalankan dengan dev server hidup:  npx tsx scripts/uji-ingest.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Amplop, hitungHash, tandatangani } from "../src/lib/bukti";

const URL = process.env.URL_INGEST ?? "http://localhost:3000/api/ingest";
const db = new PrismaClient();

const kunci: Array<{ deviceId: string; privateKey: string }> = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "perangkat-simulasi.json"), "utf8"),
);

async function kirim(a: Amplop) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(a),
  });
  return { status: r.status, body: await r.json() };
}

function buatAmplop(
  deviceId: string,
  seq: number,
  prevHash: string | null,
  type: Amplop["type"],
  payload: Record<string, unknown>,
): Amplop {
  const a: Amplop = {
    device_id: deviceId,
    seq,
    event_id: `${deviceId}:${seq}`,
    type,
    recorded_at: new Date().toISOString(),
    prev_hash: prevHash,
    payload,
  };
  a.sig = tandatangani(a, kunci.find((k) => k.deviceId === deviceId)!.privateKey);
  return a;
}

const cek = (label: string, lulus: boolean, ket = "") =>
  console.log(`${lulus ? "  LULUS " : "  GAGAL "} ${label}${ket ? " — " + ket : ""}`);

async function main() {
  const dev = kunci[0].deviceId;
  const perangkat = await db.perangkat.findUnique({ where: { deviceId: dev } });
  const warung = await db.warung.findFirst({ where: { kecamatan: { isNot: null } } });
  const petugas = await db.pengguna.findFirst({ where: { peran: "PETUGAS" } });
  if (!perangkat || !warung || !petugas) throw new Error("Data awal belum lengkap");

  let seq = perangkat.lastSeq;
  let prev = perangkat.lastHash;

  console.log(`\nAlat ${dev} · warung "${warung.nama}" · petugas ${petugas.nama}\n`);

  // --- 1. penjemputan yang sah ---
  const a1 = buatAmplop(dev, ++seq, prev, "PICKUP", {
    warung_id: warung.id,
    petugas_id: petugas.id,
    gross_g: 9240,
    tare_g: 1180,
    lat: warung.lat,
    lon: warung.lon,
    gps_accuracy_m: 12,
    stable_ms: 1400,
    confirm_code: "4821",
    battery_mv: 3870,
    rssi_dbm: -84,
  });
  const r1 = await kirim(a1);
  cek(
    "penjemputan sah diterima",
    r1.status === 200 && r1.body.ok && r1.body.beratBersihG === 8060,
    `berat ${r1.body.beratBersihG} g · Rp ${r1.body.nilaiRp} · gpsOk ${r1.body.gpsOk}`,
  );
  prev = hitungHash(a1);

  // --- 2. kirim ulang kejadian yang sama ---
  const r2 = await kirim(a1);
  cek("pengiriman ulang ditolak sebagai duplikat", r2.body.duplikat === true);

  // --- 3. tanda tangan dipalsukan ---
  const a3 = buatAmplop(dev, seq + 1, prev, "PICKUP", {
    warung_id: warung.id,
    petugas_id: petugas.id,
    gross_g: 5000,
    tare_g: 1000,
  });
  a3.sig = Buffer.from("tanda-tangan-palsu-yang-panjangnya-cukup-64-bytes-xxxxxxxxxxxxxxxx").toString("base64");
  const r3 = await kirim(a3);
  cek("tanda tangan palsu ditolak", r3.status === 401, r3.body.alasan ?? "");

  // --- 4. nomor urut dilewati ---
  const a4 = buatAmplop(dev, seq + 5, prev, "PICKUP", {
    warung_id: warung.id,
    petugas_id: petugas.id,
    gross_g: 7000,
    tare_g: 1000,
    lat: warung.lat,
    lon: warung.lon,
    confirm_code: "1111",
  });
  const r4 = await kirim(a4);
  cek(
    "nomor urut melompat ditandai",
    Array.isArray(r4.body.catatan) && r4.body.catatan.some((c: string) => c.includes("MELOMPAT")),
    r4.body.catatan?.[0] ?? "",
  );
  seq = seq + 5;
  prev = hitungHash(a4);

  // --- 5. rantai putus (prev_hash keliru) ---
  const a5 = buatAmplop(dev, ++seq, "0".repeat(64), "PICKUP", {
    warung_id: warung.id,
    petugas_id: petugas.id,
    gross_g: 6000,
    tare_g: 1000,
    lat: warung.lat,
    lon: warung.lon,
    confirm_code: "2222",
  });
  const r5 = await kirim(a5);
  cek(
    "rantai putus ditandai",
    Array.isArray(r5.body.catatan) && r5.body.catatan.some((c: string) => c.includes("RANTAI_PUTUS")),
  );
  prev = hitungHash(a5);

  // --- 6. GPS meleset jauh ---
  const a6 = buatAmplop(dev, ++seq, prev, "PICKUP", {
    warung_id: warung.id,
    petugas_id: petugas.id,
    gross_g: 8000,
    tare_g: 1000,
    lat: warung.lat + 0.01, // ~1,1 km
    lon: warung.lon,
    confirm_code: "3333",
  });
  const r6 = await kirim(a6);
  cek("GPS meleset ditandai", r6.body.gpsOk === false, `jarak ${r6.body.jarakM} m`);
  prev = hitungHash(a6);

  // --- 7. setoran ke titik kumpul, susut dihitung ---
  const trip = await db.trip.findFirst({ where: { status: "BERJALAN" }, orderBy: { id: "desc" } });
  const tkumpul = await db.titikKumpul.findFirst();
  const a7 = buatAmplop(dev, ++seq, prev, "DROPOFF", {
    trip_id: trip!.id,
    titik_kumpul_id: tkumpul!.id,
    gross_g: trip!.totalGWarung + 5000 - 300, // wadah 5 kg, susut 300 g
    tare_g: 5000,
  });
  const r7 = await kirim(a7);
  cek(
    "susut rantai dihitung otomatis",
    r7.body.susutG === 300,
    `masuk ${r7.body.totalGWarung} g · setor ${r7.body.totalGTitikKumpul} g · susut ${r7.body.susutG} g (${r7.body.susutPersen?.toFixed?.(2)}%)`,
  );

  // --- ringkas ---
  const total = await db.kejadianAlat.count();
  const sah = await db.kejadianAlat.count({ where: { terverifikasi: true } });
  console.log(`\nKejadian tersimpan: ${total} · terverifikasi penuh: ${sah}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
