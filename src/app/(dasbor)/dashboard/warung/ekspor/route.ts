/**
 * GET /dashboard/warung/ekspor — registri warung sebagai CSV.
 *
 * Mengikuti saringan yang sedang aktif di registri, persis seperti
 * tombol cetak stiker. Itu disengaja: pemda menyaring dulu di layar
 * sampai yang tersisa memang yang hendak dibahas, baru mengunduhnya —
 * jadi berkasnya harus berisi hal yang sama dengan yang barusan dilihat.
 *
 * Angka estimasi ikut ditandai kolomnya sendiri sebagai ESTIMASI, dan
 * volume terjemput sebagai TERUKUR. Keduanya tidak boleh dijumlahkan
 * begitu saja oleh pembacanya, dan satu-satunya cara memberi tahu itu di
 * dalam berkas tabel adalah menamai kolomnya dengan jujur.
 */

import { coba, db } from "@/lib/db";
import { pastikanAkses } from "@/lib/sesi";
import { angkaCsv, balasanCsv, type Sel } from "@/lib/csv";
import { apakahJejaring } from "@/lib/jejaring";
import { statusWarung } from "@/lib/format";
import {
  MINGGU_PER_BULAN,
  bacaSaringan,
  lolosSaringan,
  petaTerjemputLBulan,
  whereRegistri,
} from "@/lib/registri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Rute ini mengeluarkan seluruh registri, jadi penjaganya sama dengan
  // halaman yang menampilkannya.
  await pastikanAkses("/dashboard/warung");

  const saring = bacaSaringan(new URL(req.url).searchParams);
  const sebulanLalu = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [warung, terjemput] = await coba(() =>
    Promise.all([
      db.warung.findMany({
        where: whereRegistri(saring),
        select: {
          id: true,
          nama: true,
          kategori: true,
          alamat: true,
          desa: true,
          lat: true,
          lon: true,
          kelasSkala: true,
          estimasiLMinggu: true,
          statusVerifikasi: true,
          sumberData: true,
          kecamatan: { select: { nama: true } },
          _count: { select: { penjemputan: true } },
        },
        orderBy: { nama: "asc" },
      }),
      db.penjemputan.groupBy({
        by: ["warungId"],
        where: { dibuatAt: { gte: sebulanLalu } },
        _sum: { beratBersihG: true },
      }),
    ]),
  );

  const peta = petaTerjemputLBulan(terjemput);

  const baris: Sel[][] = warung
    .filter((w) => lolosSaringan(w, saring, peta.get(w.id) ?? 0))
    .map((w) => {
      const terjemputLBulan = peta.get(w.id) ?? 0;
      const estimasiLBulan = w.estimasiLMinggu * MINGGU_PER_BULAN;
      return [
        w.nama,
        w.kategori,
        apakahJejaring(w.nama) ? "gerai berjejaring" : "calon UMKM",
        w.kecamatan?.nama ?? null,
        w.desa,
        w.alamat,
        angkaCsv(w.lat, 6),
        angkaCsv(w.lon, 6),
        w.kelasSkala,
        angkaCsv(estimasiLBulan, 1),
        angkaCsv(terjemputLBulan, 1),
        statusWarung(estimasiLBulan, terjemputLBulan),
        w._count.penjemputan,
        w.statusVerifikasi,
        w.sumberData,
      ];
    });

  return balasanCsv(
    "registri-warung",
    [
      "Nama warung",
      "Kategori",
      "Jenis usaha",
      "Kecamatan",
      "Desa",
      "Alamat",
      "Lintang",
      "Bujur",
      "Kelas skala",
      "Estimasi produksi (L/bulan) [ESTIMASI]",
      "Terjemput 30 hari (L) [TERUKUR]",
      "Status setoran",
      "Jumlah penjemputan (seluruhnya)",
      "Status verifikasi",
      "Sumber data",
    ],
    baris,
  );
}
