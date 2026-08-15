/**
 * GET /dashboard/penjemputan/ekspor — penjemputan sebagai CSV.
 *
 * Menerima `dari` dan `sampai` berbentuk YYYY-MM-DD. Keduanya boleh
 * tidak disebut, dan artinya seluruh riwayat.
 *
 * Kolom bukti sengaja ikut: hash kejadian dan status verifikasinya. Satu
 * baris laporan yang tidak dapat ditelusuri kembali ke buktinya cuma
 * angka di dalam tabel, dan justru kemampuan menelusuri itulah yang
 * membedakan sistem ini dari pencatatan biasa. Pemda yang mengutip
 * angkanya di naskah kebijakan harus bisa menunjukkan asalnya.
 */

import { coba, db } from "@/lib/db";
import { pastikanAkses } from "@/lib/sesi";
import { angkaCsv, balasanCsv, type Sel } from "@/lib/csv";
import { KG_PER_LITER } from "@/lib/format";
import { KATA_ALASAN } from "@/lib/alasan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tanggal dari query, atau undefined kalau tidak sah. */
function tanggalDari(nilai: string | null, akhirHari = false): Date | undefined {
  if (!nilai || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return undefined;
  const d = new Date(`${nilai}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  // "sampai 31 Juli" berarti sampai penghabisan 31 Juli, bukan pukul 00.00
  // — kalau tidak, penjemputan sepanjang hari terakhir hilang dari laporan.
  if (akhirHari) d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: Request) {
  await pastikanAkses("/dashboard/penjemputan");

  const sp = new URL(req.url).searchParams;
  const dari = tanggalDari(sp.get("dari"));
  const sampai = tanggalDari(sp.get("sampai"), true);

  const daftar = await coba(() =>
    db.penjemputan.findMany({
      where:
        dari || sampai
          ? { dibuatAt: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lte: sampai } : {}) } }
          : undefined,
      orderBy: { dibuatAt: "desc" },
      select: {
        dibuatAt: true,
        beratBersihG: true,
        hargaPerKg: true,
        nilaiRp: true,
        gpsOk: true,
        jarakDariWarungM: true,
        caraKonfirmasi: true,
        alasanTanpaKode: true,
        catatanTanpaKode: true,
        warung: { select: { nama: true, desa: true, kecamatan: { select: { nama: true } } } },
        petugas: { select: { nama: true } },
        perangkat: { select: { deviceId: true } },
        kejadianAlat: { select: { hash: true, terverifikasi: true, catatan: true } },
      },
    }),
  );

  const baris: Sel[][] = daftar.map((p) => [
    p.dibuatAt,
    p.warung.nama,
    p.warung.desa,
    p.warung.kecamatan?.nama ?? null,
    p.petugas.nama,
    p.perangkat?.deviceId ?? null,
    angkaCsv(p.beratBersihG / 1000 / KG_PER_LITER, 2),
    angkaCsv(p.beratBersihG / 1000, 2),
    p.hargaPerKg,
    p.nilaiRp,
    p.gpsOk,
    p.jarakDariWarungM,
    p.caraKonfirmasi === "KODE_PEMILIK" ? "dikonfirmasi pemilik" : "tanpa konfirmasi",
    p.alasanTanpaKode ? KATA_ALASAN[p.alasanTanpaKode].petugas : null,
    p.catatanTanpaKode,
    p.kejadianAlat?.terverifikasi ?? false,
    p.kejadianAlat?.catatan ?? null,
    p.kejadianAlat?.hash ?? null,
  ]);

  return balasanCsv(
    "penjemputan",
    [
      "Waktu",
      "Warung",
      "Desa",
      "Kecamatan",
      "Petugas",
      "Perangkat",
      "Volume (L) [TERUKUR]",
      "Bobot (kg) [TERUKUR]",
      "Harga per kg (Rp)",
      "Nilai dibayarkan (Rp)",
      "GPS cocok",
      "Jarak dari titik warung (m)",
      "Konfirmasi pemilik",
      "Alasan tanpa konfirmasi",
      "Keterangan tambahan",
      "Bukti terverifikasi",
      "Catatan rantai bukti",
      "Hash kejadian alat",
    ],
    baris,
  );
}
