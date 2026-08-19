/**
 * Uji konfirmasi pemilik warung, termasuk skenario yang HARUS ditolak.
 * Jalankan dengan dev server hidup:  npx tsx scripts/uji-konfirmasi.ts
 *
 * Yang diperiksa bukan "apakah fiturnya ada", melainkan apakah kodenya
 * benar-benar menjaga sesuatu: tebakan salah ditolak, kode sekali pakai
 * tidak bisa dipakai dua kali, dan penjemputan tanpa kode tercatat
 * sebagai tanpa kode alih-alih menyamar jadi disetujui.
 */

import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const ASAL = process.env.URL_APLIKASI ?? "http://localhost:3000";
const db = new PrismaClient();

/* Sesi ditandatangani langsung di sini, bukan lewat src/lib/sesi.ts,
   sebab modul itu menyentuh next/headers dan tidak dapat dimuat di luar
   permintaan. Rumusnya sengaja disalin apa adanya. */
function kukiSesi(s: { id: number; nama: string; peran: string }) {
  const muatan = Buffer.from(JSON.stringify(s)).toString("base64url");
  const rahasia =
    process.env.AUTH_SECRET ?? "rahasia-pengembangan-yang-tidak-dipakai-di-produksi";
  const tanda = createHmac("sha256", rahasia).update(muatan).digest("base64url");
  return `runut_sesi=${muatan}.${tanda}`;
}

let lulus = 0;
let gagal = 0;
const cek = (label: string, ok: boolean, ket = "") => {
  if (ok) lulus++;
  else gagal++;
  console.log(`  ${ok ? "LULUS" : "GAGAL"}  ${label}${ket ? " — " + ket : ""}`);
};

async function main() {
  const warung = await db.warung.findFirst({ where: { kecamatan: { isNot: null } } });
  const petugas = await db.pengguna.findFirst({ where: { peran: "PETUGAS" } });
  const perangkat = await db.perangkat.findFirst();
  if (!warung || !petugas || !perangkat) throw new Error("Data awal belum lengkap");

  const kuki = kukiSesi({ id: petugas.id, nama: petugas.nama, peran: petugas.peran });
  const jsonPetugas = { "content-type": "application/json", cookie: kuki };

  console.log(`\nWarung "${warung.nama}" · petugas ${petugas.nama} · alat ${perangkat.deviceId}\n`);

  const minta = (beratBersihG: number) =>
    fetch(`${ASAL}/api/konfirmasi/minta`, {
      method: "POST",
      headers: jsonPetugas,
      body: JSON.stringify({ warungId: warung.id, beratBersihG }),
    }).then((r) => r.json());

  const periksa = (kode: string) =>
    fetch(`${ASAL}/api/konfirmasi/periksa`, {
      method: "POST",
      headers: jsonPetugas,
      body: JSON.stringify({ warungId: warung.id, kode }),
    }).then((r) => r.json());

  const jemput = (confirm_code?: string) =>
    fetch(`${ASAL}/api/simulator/kirim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        device_id: perangkat.deviceId,
        type: "PICKUP",
        payload: {
          warung_id: warung.id,
          petugas_id: petugas.id,
          gross_g: 9240,
          tare_g: 1180,
          lat: warung.lat,
          lon: warung.lon,
          gps_accuracy_m: 12,
          stable_ms: 1500,
          qr_ok: true,
          ...(confirm_code ? { confirm_code } : {}),
        },
      }),
    }).then((r) => r.json());

  /* --- 1. penerbitan kode --- */
  const k1 = await minta(8060);
  cek("kode terbit", k1?.ok === true && /^\d{4}$/.test(k1?.kode ?? ""), k1?.kode);

  /*
   * --- 1b. semua peran yang boleh membuka layar timbang harus bisa ---
   *
   * Layar /petugas/jemput/[id] sengaja terbuka bagi semua peran yang
   * sudah masuk, supaya operator dan pemda dapat menelusuri alurnya.
   * Endpoint ini sempat lebih ketat daripada layar itu, sehingga
   * halamannya terbuka tetapi kodenya gagal terbit — dan pesan
   * galatnya terbaca seolah kode pemiliknya yang salah.
   *
   * Uji ini lolos dulu karena semuanya dijalankan sebagai PETUGAS saja.
   */
  for (const p of ["PETUGAS", "OPERATOR", "PEMDA", "ADMIN"] as const) {
    const orang = await db.pengguna.findFirst({ where: { peran: p } });
    if (!orang) continue;
    const c = kukiSesi({ id: orang.id, nama: orang.nama, peran: orang.peran });
    const r = await fetch(`${ASAL}/api/konfirmasi/minta`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: c },
      body: JSON.stringify({ warungId: warung.id, beratBersihG: 8060 }),
    }).then((x) => x.json());
    cek(`${p} dapat menerbitkan kode`, r?.ok === true, r?.pesan ?? r?.kode);
  }

  const tanpaSesi = await fetch(`${ASAL}/api/konfirmasi/minta`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ warungId: warung.id, beratBersihG: 8060 }),
  }).then((x) => x.json());
  cek("tanpa sesi tetap DITOLAK", tanpaSesi?.ok !== true, tanpaSesi?.pesan);

  // Sesi di atas menutup sesi milik k1, jadi terbitkan ulang.
  const kBaru = await minta(8060);
  k1.kode = kBaru.kode;

  /* --- 2. kode terbaca pemilik lewat token KARTU --- */
  const st = await fetch(`${ASAL}/api/warung/${warung.tokenPemilik}/status`).then((r) => r.json());
  cek("kode terbaca lewat token kartu pemilik", st?.sesi?.kode === k1.kode);
  cek("bobot ikut terbaca pemilik", st?.sesi?.beratBersihG === 8060, `${st?.sesi?.beratBersihG} g`);

  /*
   * --- 2b. token stiker tembok TIDAK boleh membuka apa pun ---
   *
   * Ini uji terpenting di berkas ini. Petugas memindai stiker tembok tiap
   * kali menjemput, jadi ia otomatis memegang token itu untuk setiap
   * warung yang pernah ia datangi. Kalau token itu juga membuka halaman
   * pemilik, petugas tinggal membaca kodenya sendiri lalu mengetiknya,
   * dan seluruh konfirmasi ini kembali jadi hiasan.
   */
  const bocorApi = await fetch(`${ASAL}/api/warung/${warung.qrToken}/status`).then((r) => r.json());
  const bocorHal = await fetch(`${ASAL}/w/${warung.qrToken}`);
  cek("token stiker DITOLAK oleh API status", bocorApi?.ok !== true, bocorApi?.pesan);
  cek("token stiker DITOLAK oleh halaman /w", bocorHal.status === 404, `HTTP ${bocorHal.status}`);
  cek("kedua token memang berbeda", warung.qrToken !== warung.tokenPemilik);

  /* --- 3. tebakan salah ditolak dan dihitung --- */
  const salah = String((Number(k1.kode) + 1) % 10000).padStart(4, "0");
  const p1 = await periksa(salah);
  cek("kode salah ditolak", p1?.hasil === "SALAH", p1?.pesan);
  cek("percobaan dihitung", p1?.sisaPercobaan === 4, `sisa ${p1?.sisaPercobaan}`);

  /* --- 4. kode benar diterima --- */
  cek("kode benar diterima", (await periksa(k1.kode))?.hasil === "COCOK");

  /* --- 5. penjemputan dengan kode benar --- */
  const j1 = await jemput(k1.kode);
  cek(
    "penjemputan tercatat KODE_PEMILIK",
    j1?.balasan?.caraKonfirmasi === "KODE_PEMILIK",
    j1?.balasan?.caraKonfirmasi,
  );

  /* --- 6. sesi tertutup sesudah dipakai --- */
  const sesi1 = await db.sesiKonfirmasi.findFirst({
    where: { warungId: warung.id },
    orderBy: { dibuatAt: "desc" },
  });
  cek("sesi ditandai terpakai", sesi1?.dipakaiAt !== null);

  /* --- 7. kode yang sama tidak bisa dipakai lagi --- */
  const j2 = await jemput(k1.kode);
  cek(
    "kode bekas TIDAK diterima ulang",
    j2?.balasan?.caraKonfirmasi === "TANPA_KODE",
    j2?.balasan?.caraKonfirmasi,
  );

  /* --- 8. penjemputan tanpa kode tercatat apa adanya --- */
  const j3 = await jemput();
  cek(
    "tanpa kode tercatat TANPA_KODE",
    j3?.balasan?.caraKonfirmasi === "TANPA_KODE",
    j3?.balasan?.caraKonfirmasi,
  );

  /* --- 9. kode karangan tidak lolos --- */
  await minta(7000);
  const j4 = await jemput("0000");
  const asli = await db.sesiKonfirmasi.findFirst({
    where: { warungId: warung.id },
    orderBy: { dibuatAt: "desc" },
  });
  cek(
    "kode karangan ditolak server",
    j4?.balasan?.caraKonfirmasi === "TANPA_KODE" || asli?.kode === "0000",
    j4?.balasan?.caraKonfirmasi,
  );

  /* --- 10. batas percobaan menutup sesi --- */
  const k2 = await minta(6000);
  const bukanK2 = String((Number(k2.kode) + 7) % 10000).padStart(4, "0");
  let terakhir: { hasil?: string } = {};
  for (let i = 0; i < 5; i++) terakhir = await periksa(bukanK2);
  cek("percobaan habis menutup sesi", terakhir?.hasil === "HABIS", terakhir?.hasil);
  cek("kode benar pun tidak lagi diterima", (await periksa(k2.kode))?.hasil === "HABIS");

  /*
   * --- 11. kode serah terima tidak boleh bocor di halaman publik ---
   *
   * Halaman telusur terbuka bagi siapa saja yang memindai QR pada surat
   * serah terima. Kalau kodenya ikut tercetak di halaman itu, siapa pun
   * yang membuka halamannya bisa mengonfirmasi penerimaan tanpa pernah
   * menerima muatannya — dan konfirmasi itu kehilangan seluruh gunanya,
   * persis seperti kode konfirmasi warung sebelum diperbaiki.
   */
  const lotSiap = await db.lot.findFirst({
    where: { status: "DISERAHKAN", kodeSerahTerima: { not: null } },
    orderBy: { dibuatAt: "desc" },
    select: { qrToken: true, kodeSerahTerima: true, diterimaAt: true },
  });

  if (lotSiap) {
    const halaman = await fetch(`${ASAL}/telusur/${lotSiap.qrToken}`);
    const isi = await halaman.text();
    cek("halaman telusur merender", halaman.status === 200, `HTTP ${halaman.status}`);
    cek(
      "kode serah terima TIDAK bocor di halaman publik",
      !isi.includes(lotSiap.kodeSerahTerima!),
    );
    cek(
      lotSiap.diterimaAt ? "lot terkonfirmasi menampilkan penandanya" : "kotak konfirmasi tersedia",
      lotSiap.diterimaAt
        ? isi.includes("Penerimaan dikonfirmasi")
        : isi.includes("Konfirmasi penerimaan"),
    );
  } else {
    cek("ada lot diserahkan untuk diuji", false, "jalankan scripts/buat-lot-demo.ts dulu");
  }

  console.log(`\n  ${lulus} lulus · ${gagal} gagal\n`);
  await db.$disconnect();
  process.exit(gagal ? 1 : 0);
}

main();
