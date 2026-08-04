import Image from "next/image";
import Link from "next/link";
import { coba, db } from "@/lib/db";
import { statistikDasbor } from "@/lib/statistik";
import { angka } from "@/lib/format";

export const dynamic = "force-dynamic";

const MASALAH = [
  {
    judul: "Ke saluran air",
    isi: "Minyak membeku dan melekat pada dinding saluran. Saluran tersumbat dan genangan bertambah parah, dan biaya penanganannya berulang tiap tahun.",
  },
  {
    judul: "Ke minyak oplosan",
    isi: "Jelantah dijernihkan dengan bahan kimia lalu dijual kembali sebagai minyak curah murah. Bersifat karsinogenik dan merupakan tindak pidana.",
  },
  {
    judul: "Ke rantai ekspor tanpa bukti",
    isi: "Hanya 9% titik pengumpulan bersertifikat di Indonesia, Malaysia, dan Tiongkok yang pernah diaudit asal-usulnya.",
  },
];

const LANGKAH = [
  ["Didata", "Warung kuliner dipetakan per kecamatan"],
  ["Dijemput", "Petugas warga binaan pemda keliling menjemput"],
  ["Ditimbang alat", "Bobot dikirim langsung oleh timbangan ber-sensor"],
  ["Tertelusur", "Setiap lot punya asal-usul yang bisa dibuka siapa saja"],
];

export default async function Beranda() {
  // Dijalankan berurutan, bukan serentak: paket gratis Neon punya batas
  // sambungan yang mudah terlampaui kalau semua kueri dibuka sekaligus.
  const s = await statistikDasbor();
  const lot = await coba(() =>
    db.lot.findFirst({
      where: { status: { not: "TERBUKA" } },
      orderBy: { id: "desc" },
      select: { qrToken: true, kode: true },
    }),
  );

  return (
    <main>
      {/* bilah atas */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-5 py-3.5">
          <Image src="/brand/logomark.svg" alt="" width={26} height={26} className="text-brand" />
          <span className="text-[17px] font-extrabold tracking-wide">RUNUT</span>
          <nav className="ml-auto flex items-center gap-2">
            <Link
              href="/masuk"
              className="rounded-btn border border-line px-3 py-1.5 text-sm hover:bg-canvas"
            >
              Coba akun demo
            </Link>
            <Link
              href="/masuk"
              className="rounded-btn bg-brand px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </div>

      {/* hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Program pemerintah daerah · Kabupaten Bekasi
          </p>
          <h1 className="mt-3 max-w-2xl text-[32px] font-bold leading-[1.15] sm:text-[42px]">
            Memastikan minyak jelantah UMKM tidak jatuh ke tangan yang salah
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2">
            Kami menjemputnya, menimbangnya dengan alat, dan mencatat asal-usulnya
            sampai ke pembeli.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              href="/dashboard"
              className="rounded-btn bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-hover"
            >
              Lihat dashboard
            </Link>
            {lot && (
              <Link
                href={`/telusur/${lot.qrToken}`}
                className="rounded-btn border border-line bg-surface px-5 py-2.5 font-medium hover:bg-canvas"
              >
                Telusur lot {lot.kode}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* angka hidup */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-9 sm:grid-cols-3">
          {[
            [`${angka(s.terjemputKg, 0)} kg`, "Terjemput bulan ini"],
            [angka(s.warungAktif), "Warung aktif"],
            [`${angka(s.tingkatTangkap, 1)}%`, "Tingkat tangkap wilayah"],
          ].map(([nilai, label]) => (
            <div key={label}>
              <p className="tabular text-[34px] font-bold leading-none">{nilai}</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-5">
          <p className="text-[12px] text-ink-3">
            Angka diperbarui langsung dari basis data setiap halaman ini dibuka.
          </p>
        </div>
      </section>

      {/* masalah */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-[26px] font-bold leading-tight">
            Ke mana perginya 2,4 juta ton?
          </h2>
          <p className="mt-2 max-w-2xl text-ink-2">
            Indonesia menghasilkan sekitar tiga juta ton minyak jelantah setiap tahun,
            dan hanya seperlimanya yang termanfaatkan.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {MASALAH.map((m) => (
              <div key={m.judul} className="rounded-card border border-line bg-surface p-5">
                <h3 className="font-semibold">{m.judul}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{m.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cara kerja */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-[26px] font-bold leading-tight">Cara kerjanya</h2>
          <ol className="mt-7 grid gap-6 sm:grid-cols-4">
            {LANGKAH.map(([judul, isi], i) => (
              <li key={judul}>
                <span className="tabular grid size-8 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{judul}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{isi}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* dampak */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-[26px] font-bold leading-tight">Dampak yang terukur</h2>
            <p className="mt-3 leading-relaxed text-ink-2">
              Setiap liter yang dijemput adalah satu liter yang tidak masuk ke saluran
              air. Angka lingkungan lainnya merupakan estimasi, dan seluruh rantai
              asumsinya dibuka di dalam dashboard agar dapat diperiksa.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {[
              ["Liter tidak masuk saluran air", `${angka(s.literTakMasukSaluran, 0)} L`],
              ["Setara biodiesel", `${angka(s.literBiodiesel, 0)} L`],
              ["CO₂ tergantikan", `${angka(s.tonCo2, 2)} ton`],
              ["Warung terlayani", angka(s.warungAktif)],
            ].map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline justify-between gap-3 border-b border-line pb-3"
              >
                <span className="text-ink-2">{k}</span>
                <span className="tabular font-semibold">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ajakan */}
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-5xl px-5 py-14 text-center">
          <h2 className="text-[26px] font-bold">Coba sendiri</h2>
          <p className="mx-auto mt-2 max-w-md text-white/75">
            Empat peran tersedia sebagai akun demo. Masuk sekali klik, tanpa mengetik.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/masuk"
              className="rounded-btn bg-white px-5 py-2.5 font-medium text-brand hover:bg-white/90"
            >
              Masuk sebagai demo
            </Link>
            {lot && (
              <Link
                href={`/telusur/${lot.qrToken}`}
                className="rounded-btn border border-white/40 px-5 py-2.5 font-medium text-white hover:bg-white/10"
              >
                Telusur lot
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-6 text-[12px] text-ink-3">
          <Image src="/brand/logomark.svg" alt="" width={18} height={18} className="text-ink-3" />
          <span>
            RUNUT · Sistem penjemputan dan ketertelusuran minyak jelantah UMKM kuliner
          </span>
          <span className="ml-auto">Purwarupa untuk IT Festival 2026</span>
        </div>
      </footer>
    </main>
  );
}
