import { Tabel, TautanKembali, Td, Th } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { angka, kg, liter, persen, rupiah, tanggal, tanggalJam } from "@/lib/format";
import { KATA_ALASAN } from "@/lib/alasan";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Laporan Penjemputan" };
export const dynamic = "force-dynamic";

/**
 * Laporan penjemputan siap cetak — sekaligus jalur PDF-nya.
 *
 * Tidak ada pustaka PDF di proyek ini, dan sengaja tidak ditambahkan.
 * Peramban sudah bisa mencetak ke PDF, dan pola itu sudah terbukti
 * dipakai lembar stiker. Menambah pustaka pembuat PDF berarti menambah
 * beban unduhan dan satu lagi tempat yang bisa rusak menjelang
 * penjurian, demi hal yang sudah bisa dikerjakan Ctrl+P.
 *
 * Yang membedakannya dari halaman penjemputan biasa: seluruh baris ikut
 * (bukan 60 terakhir), ada kepala surat berisi rentang tanggal dan
 * ringkasan, dan kerangka aplikasinya tidak ikut tercetak.
 */
export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  await pastikanAkses("/dashboard/penjemputan");
  const { dari, sampai } = await searchParams;

  const sah = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : undefined);
  const awal = sah(dari);
  const akhir = sah(sampai);
  akhir?.setHours(23, 59, 59, 999);

  const where =
    awal || akhir
      ? { dibuatAt: { ...(awal ? { gte: awal } : {}), ...(akhir ? { lte: akhir } : {}) } }
      : undefined;

  const [daftar, ringkas, dikonfirmasi] = await coba(() =>
    Promise.all([
      db.penjemputan.findMany({
        where,
        orderBy: { dibuatAt: "desc" },
        select: {
          id: true,
          dibuatAt: true,
          beratBersihG: true,
          nilaiRp: true,
          gpsOk: true,
          caraKonfirmasi: true,
          alasanTanpaKode: true,
          warung: { select: { nama: true, kecamatan: { select: { nama: true } } } },
          petugas: { select: { nama: true } },
        },
      }),
      db.penjemputan.aggregate({
        where,
        _sum: { beratBersihG: true, nilaiRp: true },
        _count: { _all: true },
      }),
      db.penjemputan.count({ where: { ...where, caraKonfirmasi: "KODE_PEMILIK" } }),
    ]),
  );

  const totalG = ringkas._sum.beratBersihG ?? 0;
  const jumlah = ringkas._count._all;
  const warungUnik = new Set(daftar.map((p) => p.warung.nama)).size;
  const kecamatanUnik = new Set(
    daftar.map((p) => p.warung.kecamatan?.nama).filter(Boolean),
  ).size;
  const waktu = daftar.map((p) => p.dibuatAt.getTime());

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="tanpa-cetak mb-5">
        <TautanKembali href="/dashboard/penjemputan">Penjemputan</TautanKembali>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">Laporan Penjemputan</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          {angka(jumlah)} penjemputan siap cetak. Tekan Ctrl+P, lalu pilih{" "}
          <b>Simpan sebagai PDF</b> pada tujuan pencetak. Bagian ini tidak ikut tercetak.
        </p>
        <p className="mt-2 text-[13px] text-ink-3">
          Rentang tanggal dapat dipersempit lewat alamat, misalnya{" "}
          <code className="text-[12px]">?dari=2026-07-01&amp;sampai=2026-07-31</code>.
        </p>
      </header>

      {/* kepala surat — hanya bagian ini dan tabelnya yang tercetak */}
      <div className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              RUNUT · Ketertelusuran Minyak Jelantah UMKM
            </p>
            <h2 className="mt-1 text-[21px] font-bold leading-tight">Laporan Penjemputan</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              {waktu.length
                ? `${tanggal(new Date(Math.min(...waktu)))} – ${tanggal(new Date(Math.max(...waktu)))}`
                : "Belum ada penjemputan pada rentang ini"}
              {" · Kabupaten Bekasi"}
            </p>
          </div>
          <p className="text-right text-[11px] leading-relaxed text-ink-3">
            Dicetak {tanggalJam(new Date())}
            <br />
            Seluruh bobot berasal dari timbangan bersensor
            <br />
            dan bertanda tangan digital
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-line py-4 sm:grid-cols-5">
          {[
            ["Penjemputan", angka(jumlah)],
            ["Warung", angka(warungUnik)],
            ["Kecamatan", angka(kecamatanUnik)],
            ["Volume terkumpul", `${liter(totalG, 0)} L`],
            ["Dibayarkan", rupiah(ringkas._sum.nilaiRp ?? 0, true)],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-[11px] text-ink-3">{l}</p>
              <p className="tabular mt-0.5 text-[17px] font-semibold leading-tight">{v}</p>
            </div>
          ))}
        </div>

        <p className="py-3 text-[12px] text-ink-2">
          {/* Angka ini disebut di muka laporan, bukan disembunyikan di
              kolom terakhir. Pengawas yang membacanya berhak tahu berapa
              bagian yang benar-benar disetujui pemilik warung. */}
          <b>{angka(dikonfirmasi)}</b> dari {angka(jumlah)} penjemputan (
          {persen(jumlah ? (dikonfirmasi / jumlah) * 100 : 0)}) disetujui langsung oleh
          pemilik warung lewat kode konfirmasi. Sisanya tercatat berikut alasannya.
        </p>

        <div className="gulir-x">
          <Tabel>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Warung</Th>
                <Th>Kecamatan</Th>
                <Th>Petugas</Th>
                <Th num>Volume</Th>
                <Th num>Nilai</Th>
                <Th>Konfirmasi</Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id}>
                  <Td>{tanggalJam(p.dibuatAt)}</Td>
                  <Td>{p.warung.nama}</Td>
                  <Td>{p.warung.kecamatan?.nama ?? "—"}</Td>
                  <Td>{p.petugas.nama}</Td>
                  <Td num>
                    {liter(p.beratBersihG)} L
                    <span className="block text-[11px] text-ink-3">{kg(p.beratBersihG)} kg</span>
                  </Td>
                  <Td num>{rupiah(p.nilaiRp)}</Td>
                  <Td>
                    {p.caraKonfirmasi === "KODE_PEMILIK" ? (
                      "Pemilik"
                    ) : (
                      <span className="text-[11px] leading-snug text-ink-2">
                        {p.alasanTanpaKode
                          ? KATA_ALASAN[p.alasanTanpaKode].petugas
                          : "Tanpa konfirmasi"}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">TOTAL</Td>
                <Td />
                <Td />
                <Td />
                <Td num className="font-semibold">
                  {liter(totalG, 0)} L
                </Td>
                <Td num className="font-semibold">
                  {rupiah(ringkas._sum.nilaiRp ?? 0)}
                </Td>
                <Td />
              </tr>
            </tbody>
          </Tabel>
        </div>
      </div>
    </div>
  );
}
