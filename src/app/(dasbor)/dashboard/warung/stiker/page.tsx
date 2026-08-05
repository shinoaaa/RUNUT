import QRCode from "qrcode";
import { TautanKembali } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { KG_PER_LITER, statusWarung } from "@/lib/format";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Stiker QR Warung" };
export const dynamic = "force-dynamic";

const MINGGU_PER_BULAN = 30 / 7;

/**
 * Lembar stiker QR untuk ditempel di warung.
 *
 * Stiker adalah mata rantai fisik yang menghubungkan warung dengan
 * catatannya: petugas memindainya sebelum menimbang, sehingga bobot
 * tidak mungkin tercatat ke warung yang salah.
 *
 * Halaman ini mengikuti saringan yang sedang aktif di registri, karena
 * stiker dicetak berkelompok — satu petugas mendapat satu wilayah, lalu
 * mencetak seluruh warung di wilayah itu sekaligus.
 *
 * Kode enam huruf ikut dicetak di bawah gambar QR. Itu bukan hiasan:
 * selama pemindaian kamera belum tersedia, kode itulah jalur yang
 * dipakai petugas di layar penimbangan.
 */
export default async function HalamanStiker({
  searchParams,
}: {
  searchParams: Promise<{ kec?: string; status?: string; cari?: string }>;
}) {
  await pastikanAkses("/dashboard/warung");
  const { kec, status, cari } = await searchParams;

  // Halaman ini force-dynamic dan dirender ulang tiap permintaan,
  // jadi membaca jam saat ini memang disengaja.
  // eslint-disable-next-line react-hooks/purity
  const sebulanLalu = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [warung, terjemput] = await coba(() =>
    Promise.all([
      db.warung.findMany({
        where: {
          aktif: true,
          ...(kec ? { kecamatan: { nama: kec } } : {}),
          ...(cari ? { nama: { contains: cari, mode: "insensitive" as const } } : {}),
        },
        select: {
          id: true,
          nama: true,
          kategori: true,
          qrToken: true,
          estimasiLMinggu: true,
          kecamatan: { select: { nama: true } },
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

  const petaTerjemput = new Map(
    terjemput.map((t) => [t.warungId, (t._sum.beratBersihG ?? 0) / 1000 / KG_PER_LITER]),
  );

  // Saringan status dihitung di sini karena statusnya turunan, bukan kolom.
  const tersaring = warung.filter((w) => {
    if (!status) return true;
    const estimasiLBulan = w.estimasiLMinggu * MINGGU_PER_BULAN;
    return statusWarung(estimasiLBulan, petaTerjemput.get(w.id) ?? 0) === status;
  });

  const stiker = await Promise.all(
    tersaring.map(async (w) => ({
      ...w,
      kodeSingkat: w.qrToken.slice(-6).toUpperCase(),
      qr: await QRCode.toDataURL(w.qrToken, {
        margin: 0,
        width: 320,
        color: { dark: "#16211c", light: "#ffffff" },
      }),
    })),
  );

  const keterangan = [
    kec ?? null,
    status ? `status ${status}` : null,
    cari ? `pencarian "${cari}"` : null,
  ].filter(Boolean);

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="tanpa-cetak mb-5">
        <TautanKembali href="/dashboard/warung">Registri Warung</TautanKembali>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">Stiker QR Warung</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          {stiker.length} stiker siap cetak
          {keterangan.length > 0 && ` · ${keterangan.join(" · ")}`}. Tempelkan di tempat
          yang terlihat dekat dapur. Petugas memindainya sebelum menimbang, sehingga
          bobot tidak mungkin tercatat ke warung yang salah.
        </p>
        <p className="mt-2 text-[13px] text-ink-3">
          Tekan Ctrl+P lalu pilih kertas A4. Bagian ini tidak ikut tercetak.
        </p>
      </header>

      {stiker.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-2">
          Tidak ada warung yang cocok dengan saringan.
        </p>
      ) : (
        <div className="lembar-stiker">
          {stiker.map((w) => (
            <div key={w.id} className="stiker">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.qr} alt="" className="stiker-qr" />
              <p className="stiker-nama">{w.nama}</p>
              <p className="stiker-kec">{w.kecamatan?.nama ?? "Kabupaten Bekasi"}</p>
              <p className="stiker-kode">{w.kodeSingkat}</p>
              <p className="stiker-jejak">RUNUT · jelantah tercatat</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
