/**
 * RUNUT — pengisian data awal.
 *
 * Sumber data nyata:
 *   data/kecamatan-kab-bekasi.json      23 kecamatan + kode pos + jumlah desa
 *   data/warung-kab-bekasi.geojson      226 warung dari OpenStreetMap
 *
 * Yang bersifat contoh dan ditandai demikian:
 *   akun demo, titik kumpul, perangkat simulasi, harga berlaku.
 */

import { PrismaClient, KelasSkala, Peran, SumberData } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const DATA = path.join(process.cwd(), "data");

/* ------------------------------------------------------------
   Penggolongan kategori.
   OSM hanya memberi `amenity`, dan `cuisine` cuma ada pada 97 dari
   226 titik. Sisanya ditebak dari kata pada nama warung, lalu
   dikoreksi petugas pada kunjungan pertama.
   ------------------------------------------------------------ */

type Kategori =
  | "gorengan"
  | "ayam_goreng"
  | "padang"
  | "warteg"
  | "seafood"
  | "cepat_saji"
  | "rebusan"
  | "minuman"
  | "lainnya";

/** Liter per minggu untuk warung berskala KECIL. Angka awal ilustratif;
 *  dikalibrasi ulang oleh timbangan sebenarnya seiring penjemputan. */
const INTENSITAS: Record<Kategori, number> = {
  gorengan: 12,
  ayam_goreng: 10,
  cepat_saji: 9,
  padang: 6,
  seafood: 5,
  warteg: 4,
  lainnya: 3,
  rebusan: 0.5,
  minuman: 0.2,
};

const PENGALI_SKALA: Record<KelasSkala, number> = {
  KECIL: 1,
  SEDANG: 2.5,
  BESAR: 6,
};

function tentukanKategori(nama: string, amenity?: string, cuisine?: string): Kategori {
  const n = (nama || "").toLowerCase();
  const c = (cuisine || "").toLowerCase();

  if (/coffee|kopi|juice|jus|boba|tea|teh|milk/.test(c + " " + n)) return "minuman";
  if (amenity === "cafe" && !/resto|rumah makan|warung/.test(n)) return "minuman";

  if (/bakso|baso|mie |mi ayam|soto|bubur|sop |rebus|noodle|ramen/.test(c + " " + n))
    return "rebusan";

  if (/gorengan|martabak|cireng|risol|pisang goreng|donat/.test(n)) return "gorengan";
  if (/ayam|chicken|fried|kfc|geprek|penyet/.test(c + " " + n)) return "ayam_goreng";
  if (/padang|minang|sederhana/.test(n)) return "padang";
  if (/seafood|ikan|udang|kepiting|pecel lele|lele/.test(c + " " + n)) return "seafood";
  if (/warteg|warung tegal|nasi uduk|nasi campur|prasmanan/.test(n)) return "warteg";

  if (amenity === "fast_food") return "cepat_saji";
  return "lainnya";
}

/** Warung berjejaring cenderung berskala menengah ke atas. */
function tebakSkala(nama: string, amenity?: string): KelasSkala {
  const n = (nama || "").toLowerCase();
  if (/kfc|mcd|mcdonald|pizza|starbucks|hokben|solaria|richeese|subway|dunkin|jco/.test(n))
    return KelasSkala.BESAR;
  if (amenity === "restaurant" || amenity === "food_court") return KelasSkala.SEDANG;
  return KelasSkala.KECIL;
}

const acak = (n: number) =>
  [...Array(n)].map(() => Math.random().toString(36)[2] ?? "x").join("");

async function main() {
  console.log("Mengosongkan tabel transaksi dan bukti…");
  await prisma.lotTrip.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.penjemputan.deleteMany();
  await prisma.kunjungan.deleteMany();
  await prisma.permintaanJemput.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.kejadianAlat.deleteMany();
  await prisma.perangkat.deleteMany();
  await prisma.warung.deleteMany();
  await prisma.titikKumpul.deleteMany();
  await prisma.kecamatan.deleteMany();
  await prisma.pengguna.deleteMany();
  await prisma.faktorKategori.deleteMany();
  await prisma.harga.deleteMany();

  /* ---------------- kecamatan ---------------- */
  const daftarKec: Array<{ kecamatan: string; jumlah_desa: number; warung_terdata: number }> =
    JSON.parse(readFileSync(path.join(DATA, "kecamatan-kab-bekasi.json"), "utf8"));

  const kecId = new Map<string, number>();
  for (const k of daftarKec) {
    const row = await prisma.kecamatan.create({
      data: { nama: k.kecamatan, jumlahDesa: k.jumlah_desa },
    });
    kecId.set(k.kecamatan, row.id);
  }
  console.log(`Kecamatan: ${kecId.size}`);

  /* ---------------- faktor kategori & harga ---------------- */
  await prisma.faktorKategori.createMany({
    data: (Object.keys(INTENSITAS) as Kategori[]).map((k) => ({
      kategori: k,
      intensitasLMinggu: INTENSITAS[k],
      nSampel: 0,
    })),
  });
  await prisma.harga.create({
    data: { berlakuDari: new Date("2026-01-01T00:00:00Z"), rpPerKg: 6000 },
  });

  /* ---------------- akun demo ---------------- */
  const sandi = await bcrypt.hash("demo1234", 10);
  const [petugas1, petugas2] = await Promise.all([
    prisma.pengguna.create({
      data: { nama: "Dedi Supriyadi", email: "petugas@runut.id", sandiHash: sandi, peran: Peran.PETUGAS },
    }),
    prisma.pengguna.create({
      data: { nama: "Rahmat Hidayat", email: "petugas2@runut.id", sandiHash: sandi, peran: Peran.PETUGAS },
    }),
  ]);
  await prisma.pengguna.createMany({
    data: [
      { nama: "Sri Wahyuni", email: "operator@runut.id", sandiHash: sandi, peran: Peran.OPERATOR },
      { nama: "Dinas Lingkungan Hidup", email: "pemda@runut.id", sandiHash: sandi, peran: Peran.PEMDA },
      { nama: "Admin RUNUT", email: "admin@runut.id", sandiHash: sandi, peran: Peran.ADMIN },
    ],
  });
  console.log("Akun demo: 5 (sandi semua = demo1234)");

  /* ---------------- titik kumpul ---------------- */
  const tk = [
    { nama: "TK Cikarang Selatan", lat: -6.3419, lon: 107.1543, kec: "Cikarang Selatan" },
    { nama: "TK Cikarang Pusat", lat: -6.32, lon: 107.172, kec: "Cikarang Pusat" },
    { nama: "TK Tambun Selatan", lat: -6.262, lon: 107.053, kec: "Tambun Selatan" },
  ];
  for (const t of tk) {
    await prisma.titikKumpul.create({
      data: { nama: t.nama, lat: t.lat, lon: t.lon, kecamatanId: kecId.get(t.kec) ?? null },
    });
  }
  console.log(`Titik kumpul: ${tk.length}`);

  /* ---------------- perangkat simulasi ----------------
     Sepasang kunci Ed25519 per alat. Kunci PUBLIK masuk basis data,
     kunci PRIVAT disimpan di berkas terpisah dan dipakai simulator.
     Ini alat tiruan, jadi kuncinya bukan rahasia sungguhan. */
  const berkasKunci = path.join(process.cwd(), "prisma", "perangkat-simulasi.json");
  let kunci: Array<{ deviceId: string; privateKey: string; publicKey: string }>;

  if (existsSync(berkasKunci)) {
    kunci = JSON.parse(readFileSync(berkasKunci, "utf8"));
  } else {
    kunci = ["SCL-BKS-001", "SCL-BKS-002", "SCL-BKS-003"].map((deviceId) => {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      return {
        deviceId,
        publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
        privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
      };
    });
    writeFileSync(berkasKunci, JSON.stringify(kunci, null, 2));
  }

  const petugasUntukAlat = [petugas1.id, petugas2.id, petugas1.id];
  for (const [i, k] of kunci.entries()) {
    await prisma.perangkat.create({
      data: {
        deviceId: k.deviceId,
        publicKey: k.publicKey,
        petugasId: petugasUntukAlat[i] ?? null,
        calibRefG: 2000,
        batteryMv: 3800 + i * 40,
        rssiDbm: -78 - i * 4,
        lastSeq: 0,
      },
    });
  }
  console.log(`Perangkat: ${kunci.length}`);

  /* ---------------- warung ---------------- */
  const gj = JSON.parse(readFileSync(path.join(DATA, "warung-kab-bekasi.geojson"), "utf8"));
  const hitungKategori: Record<string, number> = {};
  let tanpaKecamatan = 0;

  for (const f of gj.features) {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry.coordinates;
    const nama: string = p.name || "Warung tanpa nama";
    const kategori = tentukanKategori(nama, p.amenity, p.cuisine);
    const skala = tebakSkala(nama, p.amenity);
    const estimasi = INTENSITAS[kategori] * PENGALI_SKALA[skala];

    const idKec = p.kecamatan ? (kecId.get(p.kecamatan) ?? null) : null;
    if (!idKec) tanpaKecamatan++;
    hitungKategori[kategori] = (hitungKategori[kategori] ?? 0) + 1;

    await prisma.warung.create({
      data: {
        nama,
        kategori,
        cuisine: p.cuisine ?? null,
        alamat: p.jalan ?? null,
        desa: p.desa ?? null,
        lat,
        lon,
        kecamatanId: idKec,
        qrToken: `w_${acak(12)}`,
        kelasSkala: skala,
        estimasiLMinggu: Number(estimasi.toFixed(2)),
        sumberData: SumberData.OSM,
        osmType: p.osm_type ?? null,
        osmId: p.osm_id ? BigInt(p.osm_id) : null,
      },
    });
  }

  console.log(`Warung: ${gj.features.length} (tanpa kecamatan: ${tanpaKecamatan})`);
  console.log("Sebaran kategori:");
  for (const [k, v] of Object.entries(hitungKategori).sort((a, b) => b[1] - a[1]))
    console.log(`   ${k.padEnd(14)} ${v}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
