import QRCode from "qrcode";
import { headers } from "next/headers";
import { TautanKembali } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { KG_PER_LITER, statusWarung } from "@/lib/format";
import { apakahJejaring } from "@/lib/jejaring";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Stiker QR Warung" };
export const dynamic = "force-dynamic";

const MINGGU_PER_BULAN = 30 / 7;

/**
 * Alamat aplikasi menurut permintaan yang sedang berjalan.
 *
 * Dibaca dari header, bukan ditulis tetap, supaya QR pada kartu pemilik
 * menunjuk ke tempat yang benar baik saat dicetak dari laptop
 * pengembangan maupun dari tayangan Vercel. Kartu yang tercetak dengan
 * alamat localhost tidak akan terbuka di ponsel siapa pun.
 */
async function asalAplikasi() {
  const h = await headers();
  const inang = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protokol = h.get("x-forwarded-proto") ?? (inang.startsWith("localhost") ? "http" : "https");
  return `${protokol}://${inang}`;
}

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
  searchParams: Promise<{ kec?: string; status?: string; cari?: string; jenis?: string }>;
}) {
  await pastikanAkses("/dashboard/warung");
  const { kec, status, cari, jenis } = await searchParams;

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
          tokenPemilik: true,
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

  // Saringan status dan jenis usaha dihitung di sini karena keduanya
  // turunan, bukan kolom di basis data.
  const tersaring = warung.filter((w) => {
    if (jenis === "umkm" && apakahJejaring(w.nama)) return false;
    if (jenis === "jejaring" && !apakahJejaring(w.nama)) return false;
    if (!status) return true;
    const estimasiLBulan = w.estimasiLMinggu * MINGGU_PER_BULAN;
    return statusWarung(estimasiLBulan, petaTerjemput.get(w.id) ?? 0) === status;
  });

  /*
   * Tiap warung menghasilkan DUA benda ber-QR, dan bedanya disengaja.
   *
   * Stiker tembok memuat token TELANJANG, tanpa alamat. Ia ditempel di
   * tempat terbuka, jadi orang lewat yang memindainya hanya melihat
   * tulisan acak dan tidak membuka apa pun. Hanya layar timbang petugas
   * yang tahu artinya.
   *
   * Kartu pemilik memuat ALAMAT halaman /w/<token>. Halaman itu memajang
   * riwayat dan pendapatan warung, sehingga alamatnya tidak boleh
   * tertempel di dinding. Kartunya diserahkan kepada pemilik untuk
   * disimpan — dan karena ia benda fisik yang ada di warung, ponsel
   * boleh ganti atau hilang tanpa menutup jalan masuk.
   */
  const asal = await asalAplikasi();

  const stiker = await Promise.all(
    tersaring.map(async (w) => ({
      ...w,
      kodeSingkat: w.qrToken.slice(-6).toUpperCase(),
      qr: await QRCode.toDataURL(w.qrToken, {
        margin: 0,
        width: 320,
        color: { dark: "#16211c", light: "#ffffff" },
      }),
      qrPemilik: await QRCode.toDataURL(`${asal}/w/${w.tokenPemilik}`, {
        margin: 0,
        width: 320,
        color: { dark: "#0e4f3f", light: "#ffffff" },
      }),
    })),
  );

  const keterangan = [
    kec ?? null,
    jenis === "umkm" ? "calon UMKM saja" : jenis === "jejaring" ? "gerai berjejaring saja" : null,
    status ? `status ${status}` : null,
    cari ? `pencarian "${cari}"` : null,
  ].filter(Boolean);

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="tanpa-cetak mb-5">
        <TautanKembali href="/dashboard/warung">Registri Warung</TautanKembali>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">Stiker &amp; Kartu QR Warung</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Tiap warung mendapat <b>dua</b> benda ber-QR, dan keduanya tidak boleh
          tertukar
          {keterangan.length > 0 && ` · ${keterangan.join(" · ")}`}.
        </p>

        {/* Tanpa keterangan ini, bagian kartu pemilik terkubur di bawah
            ratusan stiker dan tidak pernah ketemu. */}
        <div className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-surface p-3">
            <p className="text-[13px] font-semibold">1 · Stiker tembok — {stiker.length} lembar</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2">
              Ditempel dekat dapur. Isinya token polos tanpa alamat, jadi orang lewat
              yang memindainya tidak membuka apa pun. Hanya layar timbang petugas yang
              tahu artinya.
            </p>
          </div>
          <div className="rounded-card border-2 border-brand bg-surface p-3">
            <p className="text-[13px] font-semibold text-brand">
              2 · Kartu pemilik — {stiker.length} lembar
            </p>
            <p className="mt-1 text-[12px] leading-snug text-ink-2">
              Diserahkan ke pemilik, <b>jangan ditempel</b>. Membuka halaman warungnya:
              riwayat, pendapatan, dan kode konfirmasi saat petugas menimbang.
            </p>
            <a
              href="#kartu-pemilik"
              className="mt-2 inline-block text-[12px] font-medium text-accent underline underline-offset-2"
            >
              Lompat ke bagian kartu pemilik ↓
            </a>
          </div>
        </div>

        <p className="mt-3 text-[13px] text-ink-3">
          Tekan Ctrl+P lalu pilih kertas A4. Bagian ini tidak ikut tercetak, dan kartu
          pemilik selalu dimulai di halaman kertas baru supaya tidak tercampur dengan
          lembar tempel.
        </p>
      </header>

      {stiker.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-2">
          Tidak ada warung yang cocok dengan saringan.
        </p>
      ) : (
        <>
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

          <div className="lembar-kartu" id="kartu-pemilik">
            <header className="tanpa-cetak mb-4 mt-10 border-t border-line pt-6">
              <h2 className="text-[19px] font-semibold">Kartu pemilik warung</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-2">
                Diserahkan kepada pemilik, <b>bukan ditempel</b>. Kartu ini membuka
                halaman warungnya sendiri: riwayat setoran, total pendapatan, tombol
                minta dijemput, dan kode konfirmasi yang muncul saat petugas menimbang.
                Stiker tembok di atas tidak bisa dipakai untuk itu — isinya sengaja
                token telanjang, supaya orang lewat yang memindainya tidak membuka apa pun.
              </p>
              <p className="mt-2 text-[13px] text-ink-3">
                Bagian ini dimulai di halaman kertas baru, jadi lembar tempel dan
                lembar kartu tidak pernah tercampur.
              </p>
            </header>

            <div className="lembar-stiker">
              {stiker.map((w) => (
                <div key={w.id} className="kartu-pemilik">
                  <p className="kartu-pemilik-judul">Kartu pemilik</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.qrPemilik} alt="" className="stiker-qr mt-2" />
                  <p className="stiker-nama">{w.nama}</p>
                  <p className="stiker-kec">{w.kecamatan?.nama ?? "Kabupaten Bekasi"}</p>
                  <p className="kartu-pemilik-peringatan">
                    Simpan, jangan ditempel. Pindai untuk melihat setoran dan
                    pendapatan warung Anda.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
