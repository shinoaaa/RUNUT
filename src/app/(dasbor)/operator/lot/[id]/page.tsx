import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { KartuAngka, Panel, Pil, Tabel, Td, Th, TautanKembali, Tombol } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { ASUMSI } from "@/lib/statistik";
import { angka, rupiah, tanggal, tanggalJam } from "@/lib/format";
import { serahkanLot, tutupLot, ubahIsiLot } from "@/app/operator/aksi";
import { pastikanAkses } from "@/lib/sesi";

import { TombolKembaliLot } from "@/components/operator/TombolKembaliLot";
import { TombolHapusLot } from "@/components/operator/TombolHapusLot";

export const dynamic = "force-dynamic";

export default async function HalamanLot({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await pastikanAkses("/operator");
  const { id } = await params;
  const lotId = Number(id);

  const lot = await coba(() => db.lot.findUnique({
    where: { id: lotId },
    select: {
      id: true,
      kode: true,
      beratG: true,
      status: true,
      qrToken: true,
      offtaker: true,
      hargaJual: true,
      dibuatAt: true,
      ditutupAt: true,
      diserahkanAt: true,
      kodeSerahTerima: true,
      diterimaAt: true,
      titikKumpul: { select: { nama: true } },
      trip: {
        select: {
          trip: {
            select: {
              id: true,
              tanggal: true,
              totalGWarung: true,
              totalGTitikKumpul: true,
              susutPersen: true,
              petugas: { select: { nama: true } },
              penjemputan: {
                select: { warung: { select: { kecamatan: { select: { nama: true } } } } },
              },
            },
          },
        },
      },
    },
  }));
  if (!lot) notFound();

  const terbuka = lot.status === "TERBUKA";
  const tripDipakai = lot.trip.map((t) => t.trip);
  const isKosong = terbuka && tripDipakai.length === 0;
  const idDipakai = new Set(tripDipakai.map((t) => t.id));

  const tersedia = terbuka
    ? await coba(() => db.trip.findMany({
        where: { status: "DISETOR", lotTrip: { none: {} } },
        orderBy: { tanggal: "desc" },
        take: 25,
        select: {
          id: true,
          tanggal: true,
          totalGWarung: true,
          totalGTitikKumpul: true,
          susutPersen: true,
          petugas: { select: { nama: true } },
          _count: { select: { penjemputan: true } },
        },
      }))
    : [];

  const jumlahWarung = tripDipakai.reduce((a, t) => a + t.penjemputan.length, 0);
  const kecamatan = [
    ...new Set(
      tripDipakai.flatMap((t) =>
        t.penjemputan.map((p) => p.warung.kecamatan?.nama).filter(Boolean),
      ),
    ),
  ] as string[];
  const susutG = tripDipakai.reduce(
    (a, t) => a + (t.totalGWarung - (t.totalGTitikKumpul ?? t.totalGWarung)),
    0,
  );

  const tautanTelusur = `/telusur/${lot.qrToken}`;
  const qr = await QRCode.toDataURL(tautanTelusur, {
    margin: 1,
    width: 320,
    color: { dark: "#0e4f3f", light: "#ffffff" },
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <TombolKembaliLot href="/operator" isKosong={isKosong} lotId={lotId} />
          <h1 className="mt-1 font-mono text-[26px] font-bold leading-tight">{lot.kode}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {lot.titikKumpul.nama} · dibuat {tanggal(lot.dibuatAt)}
          </p>
        </div>
        <Pil nada={lot.status === "DISERAHKAN" ? "ok" : terbuka ? "info" : "warn"}>
          {lot.status.toLowerCase()}
        </Pil>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuAngka
          label="Isi Lot"
          angka={angka(lot.beratG / 1000 / ASUMSI.kg_per_liter, 0)}
          satuan="L"
          catatan={`${angka(lot.beratG / 1000, 1)} kg terukur`}
        />
        <KartuAngka label="Warung Penyumbang" angka={angka(jumlahWarung)} />
        <KartuAngka
          label="Susut Rantai"
          angka={angka(susutG / 1000 / ASUMSI.kg_per_liter, 1)}
          satuan="L"
          keyakinan="terukur"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel judul={`Setoran dalam lot (${tripDipakai.length})`} padat>
            {tripDipakai.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-3">
                Belum ada setoran. Pilih dari daftar di bawah.
              </p>
            ) : (
              <Tabel>
                <thead>
                  <tr>
                    <Th>Petugas</Th>
                    <Th>Tanggal</Th>
                    <Th num>Warung</Th>
                    <Th num>Volume</Th>
                    {terbuka && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {tripDipakai.map((t) => (
                    <tr key={t.id}>
                      <Td>{t.petugas.nama}</Td>
                      <Td>{tanggal(t.tanggal)}</Td>
                      <Td num>{t.penjemputan.length}</Td>
                      <Td num>
                        {angka((t.totalGTitikKumpul ?? t.totalGWarung) / 1000 / ASUMSI.kg_per_liter, 1)} L
                      </Td>
                      {terbuka && (
                        <Td>
                          <form
                            action={async () => {
                              "use server";
                              await ubahIsiLot(lotId, t.id, false);
                            }}
                          >
                            <button className="text-[13px] text-danger underline underline-offset-4">
                              keluarkan
                            </button>
                          </form>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            )}
          </Panel>

          {terbuka && (
            <Panel judul="Setoran yang bisa ditambahkan" padat>
              {tersedia.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-3">
                  Semua setoran sudah masuk lot.
                </p>
              ) : (
                <Tabel>
                  <thead>
                    <tr>
                      <Th>Petugas</Th>
                      <Th>Tanggal</Th>
                      <Th num>Warung</Th>
                      <Th num>Volume</Th>
                      <Th num>Susut</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {tersedia.filter((t) => !idDipakai.has(t.id)).map((t) => (
                      <tr key={t.id}>
                        <Td>{t.petugas.nama}</Td>
                        <Td>{tanggal(t.tanggal)}</Td>
                        <Td num>{t._count.penjemputan}</Td>
                        <Td num>
                          {angka((t.totalGTitikKumpul ?? t.totalGWarung) / 1000 / ASUMSI.kg_per_liter, 1)} L
                        </Td>
                        <Td num>{angka(t.susutPersen ?? 0, 2)}%</Td>
                        <Td>
                          <form
                            action={async () => {
                              "use server";
                              await ubahIsiLot(lotId, t.id, true);
                            }}
                          >
                            <button className="text-[13px] text-accent underline underline-offset-4">
                              tambahkan
                            </button>
                          </form>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabel>
              )}
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel judul="Asal-usul">
            <p className="text-sm text-ink-2">
              {angka(jumlahWarung)} warung dari{" "}
              {kecamatan.length > 0 ? kecamatan.join(", ") : "belum ada kecamatan"}
            </p>
            {lot.status !== "TERBUKA" && (
              <div className="mt-4">
                <Image
                  src={qr}
                  alt={`QR telusur ${lot.kode}`}
                  width={200}
                  height={200}
                  className="mx-auto rounded-card border border-line"
                  unoptimized
                />
                <p className="mt-3 text-center text-[12px] text-ink-3">
                  Pindai untuk membuka asal-usul lot ini tanpa akun
                </p>
                <Link
                  href={tautanTelusur}
                  className="mt-1 block text-center text-[13px] text-accent underline underline-offset-4"
                >
                  Buka halaman telusur
                </Link>
              </div>
            )}
          </Panel>

          {terbuka && (
            <Panel judul="Tutup lot">
              <p className="mb-3 text-[13px] text-ink-2">
                Setelah ditutup, isi lot tidak bisa diubah dan kode QR asal-usulnya terbit.
              </p>
              <form
                action={async () => {
                  "use server";
                  await tutupLot(lotId);
                }}
              >
                <Tombol besar className="w-full" disabled={tripDipakai.length === 0}>
                  Tutup lot
                </Tombol>
              </form>
              <TombolHapusLot lotId={lotId} jumlahIsi={tripDipakai.length} />
            </Panel>
          )}

          {lot.status === "TERTUTUP" && (
            <Panel judul="Serahkan ke pengolah">
              <form
                action={serahkanLot.bind(null, lotId)}
                className="grid gap-3"
              >
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-medium text-ink-2">Nama pengolah</span>
                  <input
                    name="offtaker"
                    placeholder="Pengolah terdaftar"
                    className="h-9 rounded-input border border-line bg-surface px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-medium text-ink-2">Harga jual per kg</span>
                  <input
                    name="hargaJual"
                    type="number"
                    defaultValue={7500}
                    className="tabular h-9 rounded-input border border-line bg-surface px-3 text-sm"
                  />
                </label>
                <Tombol besar type="submit" className="w-full">
                  Catat penyerahan
                </Tombol>
              </form>
            </Panel>
          )}

          {lot.status === "DISERAHKAN" && (
            <Panel judul="Penyerahan">
              <dl className="grid gap-2 text-sm">
                {[
                  ["Pengolah", lot.offtaker ?? "—"],
                  ["Harga jual", lot.hargaJual ? `${rupiah(lot.hargaJual)}/kg` : "—"],
                  [
                    "Nilai lot",
                    lot.hargaJual
                      ? rupiah(Math.round((lot.beratG / 1000) * lot.hargaJual))
                      : "—",
                  ],
                  ["Diserahkan", lot.diserahkanAt ? tanggal(lot.diserahkanAt) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="tabular font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              {/*
                Kode serah terima ditulis pada surat yang dibawa bersama
                muatannya. Penerima memindai QR di surat itu, memasukkan
                kodenya, dan penerimaannya tercatat dari sisi penerima —
                bukan cuma dari catatan sepihak operator.
              */}
              {lot.diterimaAt ? (
                <div className="mt-3 rounded-btn bg-ok-bg px-3 py-2.5 text-[13px] text-ok">
                  Penerimaan dikonfirmasi pengolah pada {tanggalJam(lot.diterimaAt)}.
                </div>
              ) : (
                <div className="mt-3 rounded-card border border-dashed border-line-strong p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
                    Kode serah terima
                  </p>
                  <p className="tabular mt-1 font-mono text-[22px] font-bold tracking-[0.2em] text-brand">
                    {lot.kodeSerahTerima ?? "——————"}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
                    Tulis kode ini pada surat serah terima. Pengolah memindai QR di
                    surat, memasukkan kodenya, lalu penerimaannya tercatat di sini.
                  </p>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
