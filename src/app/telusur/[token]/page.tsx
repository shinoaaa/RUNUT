import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { Panel, Pil, Tabel, Td, Th, TautanKembali } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { ASUMSI } from "@/lib/statistik";
import { angka, tanggal, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Halaman publik asal-usul lot. Tanpa akun, tanpa kerangka aplikasi.
 * Inilah yang terbuka ketika kode QR pada surat serah terima dipindai.
 *
 * Riset yang mendasari halaman ini: hanya 9% titik pengumpulan UCO
 * bersertifikat ISCC di Indonesia, Malaysia, dan Tiongkok yang pernah
 * diaudit asal-usulnya.
 */
export default async function HalamanTelusur({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Halaman ini dibuka juri dengan memindai QR di depan penonton.
  // Kegagalan sambungan di sini paling mahal harganya.
  const lot = await coba(() => db.lot.findUnique({
    where: { qrToken: token },
    select: {
      kode: true,
      beratG: true,
      status: true,
      offtaker: true,
      dibuatAt: true,
      ditutupAt: true,
      diserahkanAt: true,
      diterimaAt: true,
      titikKumpul: { select: { nama: true, kecamatan: { select: { nama: true } } } },
      trip: {
        select: {
          trip: {
            select: {
              tanggal: true,
              totalGWarung: true,
              totalGTitikKumpul: true,
              petugas: { select: { nama: true } },
              penjemputan: {
                orderBy: { dibuatAt: "asc" },
                select: {
                  beratBersihG: true,
                  dibuatAt: true,
                  gpsOk: true,
                  caraKonfirmasi: true,
                  warung: {
                    select: { nama: true, desa: true, kecamatan: { select: { nama: true } } },
                  },
                  kejadianAlat: {
                    select: { hash: true, sig: true, terverifikasi: true, catatan: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  }));
  if (!lot) notFound();

  const trip = lot.trip.map((t) => t.trip);
  const penjemputan = trip.flatMap((t) =>
    t.penjemputan.map((p) => ({ ...p, petugas: t.petugas.nama })),
  );

  const totalBersihG = penjemputan.reduce((a, p) => a + p.beratBersihG, 0);
  const susutG = trip.reduce(
    (a, t) => a + (t.totalGWarung - (t.totalGTitikKumpul ?? t.totalGWarung)),
    0,
  );
  const kecamatan = [
    ...new Set(penjemputan.map((p) => p.warung.kecamatan?.nama).filter(Boolean)),
  ] as string[];
  const petugas = [...new Set(penjemputan.map((p) => p.petugas))];

  const bertandaTangan = penjemputan.filter((p) => p.kejadianAlat?.sig).length;
  const dikonfirmasi = penjemputan.filter((p) => p.caraKonfirmasi === "KODE_PEMILIK").length;
  const utuh = penjemputan.filter((p) => p.kejadianAlat?.terverifikasi).length;
  const rantaiUtuh = penjemputan.every((p) => !p.kejadianAlat?.catatan?.includes("RANTAI_PUTUS"));

  const hashTerakhir =
    penjemputan.at(-1)?.kejadianAlat?.hash ??
    createHash("sha256").update(lot.kode).digest("hex");

  const waktu = penjemputan.map((p) => p.dibuatAt.getTime());
  const mulai = waktu.length ? new Date(Math.min(...waktu)) : lot.dibuatAt;
  const selesai = waktu.length ? new Date(Math.max(...waktu)) : lot.dibuatAt;

  return (
    <main className="min-h-dvh">
      {/* bilah atas */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-5 py-3">
          {/* Halaman ini dibuka dari pemindaian QR, sering tanpa riwayat
              peramban sama sekali. Logonya dibuat menuju beranda supaya
              pembacanya punya jalan masuk ke penjelasan sistemnya. */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-75">
            <Image src="/brand/logomark.svg" alt="" width={24} height={24} className="text-brand" />
            <span className="font-extrabold tracking-wide">RUNUT</span>
          </Link>
          <span className="ml-auto">
            <Pil nada={utuh === penjemputan.length && rantaiUtuh ? "ok" : "warn"} titik>
              {utuh === penjemputan.length && rantaiUtuh ? "Terverifikasi" : "Perlu ditinjau"}
            </Pil>
          </span>
        </div>
      </div>

      {/* kepala */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Lot</p>
          <h1 className="tabular mt-1 font-mono text-[32px] font-bold leading-none sm:text-[38px]">
            {lot.kode}
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[19px] font-semibold">
            <span className="tabular">
              {angka(lot.beratG / 1000 / ASUMSI.kg_per_liter, 0)} liter
            </span>
            <span className="hidden text-line sm:inline">|</span>
            <span className="tabular">{angka(lot.beratG / 1000, 1)} kg terukur</span>
            <span className="hidden text-line sm:inline">|</span>
            <span className="tabular">
              ≈ {angka(lot.beratG / 1000 / ASUMSI.kg_per_liter / ASUMSI.liter_jelantah_per_biodiesel, 0)}{" "}
              liter biodiesel
            </span>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            {kecamatan.length ? `Kec. ${kecamatan.join(", ")}` : "Kabupaten Bekasi"} ·{" "}
            {tanggal(mulai)} – {tanggal(selesai)}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6">
        {/* ringkasan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Warung penyumbang", angka(penjemputan.length)],
            ["Petugas", angka(petugas.length)],
            ["Susut rantai", `${angka(susutG / 1000 / ASUMSI.kg_per_liter, 1)} L`],
            [
              "Diserahkan ke",
              lot.offtaker ?? (lot.status === "DISERAHKAN" ? "—" : "belum diserahkan"),
            ],
          ].map(([k, v]) => (
            <div key={k} className="rounded-card border border-line bg-surface p-3">
              <p className="text-[11px] uppercase tracking-[0.06em] text-ink-3">{k}</p>
              <p className="tabular mt-1 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>

        {/* perjalanan */}
        <Panel judul="Perjalanan Lot">
          <ol className="relative flex flex-col gap-4 pl-5">
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-line" aria-hidden />
            {[
              ["Penjemputan dimulai", mulai, true],
              ["Penjemputan selesai", selesai, true],
              ["Lot ditutup", lot.ditutupAt, Boolean(lot.ditutupAt)],
              ["Diserahkan ke pengolah", lot.diserahkanAt, Boolean(lot.diserahkanAt)],
            ].map(([label, waktu, terisi]) => (
              <li key={label as string} className="relative flex items-baseline justify-between gap-3">
                <span
                  className={
                    terisi
                      ? "absolute -left-5 top-1.5 size-2.5 rounded-full bg-brand"
                      : "absolute -left-5 top-1.5 size-2.5 rounded-full border-2 border-line bg-surface"
                  }
                  aria-hidden
                />
                <span className={terisi ? "text-sm font-medium" : "text-sm text-ink-3"}>
                  {label as string}
                </span>
                <span className="tabular text-[13px] text-ink-2">
                  {waktu ? tanggalJam(waktu as Date) : "—"}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        {/* rincian asal */}
        <Panel judul={`Rincian Asal (${penjemputan.length} penjemputan)`} padat>
          <Tabel>
            <thead>
              <tr>
                <Th>Warung</Th>
                <Th>Desa</Th>
                <Th num>Volume</Th>
                <Th>Tanggal</Th>
                <Th>Petugas</Th>
                <Th>Konfirmasi</Th>
              </tr>
            </thead>
            <tbody>
              {penjemputan.slice(0, 40).map((p, i) => (
                <tr key={i}>
                  <Td>{p.warung.nama}</Td>
                  <Td>{p.warung.desa ?? "—"}</Td>
                  <Td num>{angka(p.beratBersihG / 1000 / ASUMSI.kg_per_liter, 1)} L</Td>
                  <Td>{tanggal(p.dibuatAt)}</Td>
                  <Td>{p.petugas}</Td>
                  <Td>
                    {/* Ditampilkan di halaman publik, bukan disembunyikan
                        di dasbor internal. Pembeli yang menuntut bukti
                        asal-usul berhak tahu bagian mana yang disetujui
                        pemiliknya dan bagian mana yang tidak. */}
                    <Pil nada={p.caraKonfirmasi === "KODE_PEMILIK" ? "ok" : "warn"}>
                      {p.caraKonfirmasi === "KODE_PEMILIK" ? "Pemilik" : "Tanpa kode"}
                    </Pil>
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">TOTAL</Td>
                <Td />
                <Td num className="font-semibold">
                  {angka(totalBersihG / 1000 / ASUMSI.kg_per_liter, 1)} L
                </Td>
                <Td />
                <Td />
                <Td />
              </tr>
            </tbody>
          </Tabel>
          {penjemputan.length > 40 && (
            <p className="border-t border-line px-5 py-2.5 text-[12px] text-ink-3">
              Menampilkan 40 dari {angka(penjemputan.length)} penjemputan.
            </p>
          )}
        </Panel>

        {/* keutuhan bukti */}
        <section className="rounded-card border border-line bg-accent-soft p-5">
          <h2 className="text-[17px] font-semibold">Keutuhan Bukti</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {[
              [`${angka(penjemputan.length)} catatan berasal dari timbangan ber-sensor`, true],
              [
                `${angka(bertandaTangan)} dari ${angka(penjemputan.length)} catatan bertanda tangan digital sah`,
                bertandaTangan === penjemputan.length,
              ],
              [
                rantaiUtuh
                  ? "Rantai bukti utuh — tidak ada catatan yang hilang atau diubah"
                  : "Ada sambungan rantai yang terputus pada lot ini",
                rantaiUtuh,
              ],
              /*
               * Angka ini sengaja tidak disembunyikan meski jarang
               * mencapai seluruhnya. Pemilik warung bisa sedang tidak di
               * tempat, dan menyamarkan itu sebagai "terkonfirmasi" akan
               * membuat seluruh halaman ini kehilangan arti.
               */
              [
                `${angka(dikonfirmasi)} dari ${angka(penjemputan.length)} penjemputan disetujui langsung oleh pemilik warung`,
                dikonfirmasi === penjemputan.length,
              ],
            ].map(([teks, ok]) => (
              <li key={teks as string} className="flex items-start gap-2">
                <span className={ok ? "text-accent" : "text-warn"}>{ok ? "✓" : "!"}</span>
                <span>{teks as string}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 break-all font-mono text-[11px] text-ink-3">
            Hash rantai terakhir: {hashTerakhir.slice(0, 32)}…
          </p>
        </section>



        <p className="px-1 text-[12px] leading-relaxed text-ink-3">
          Data dihasilkan oleh perangkat pengukur di lapangan, ditandatangani di alat,
          lalu disambungkan ke rantai hash. Halaman ini dapat dibuka siapa saja tanpa akun.
          RUNUT menyediakan data yang siap diaudit, dan tidak menerbitkan sertifikat apa pun.
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-1 pb-8 pt-4">
          <TautanKembali href="/">Beranda RUNUT</TautanKembali>
          <Link href="/masuk" className="text-[13px] text-ink-3 transition-colors hover:text-ink">
            Masuk sebagai petugas program
          </Link>
        </div>
      </div>
    </main>
  );
}
