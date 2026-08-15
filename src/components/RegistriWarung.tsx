"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  BilahDalamBaris,
  Kosong,
  Panel,
  Pil,
  Tabel,
  TautanTombol,
  Td,
  Th,
  cn,
  kelasTombol,
} from "@/components/ui";
import { LABEL_STATUS, StatusWarung, angka } from "@/lib/format";
import { LABEL_JENIS, type SaringJenis } from "@/lib/jejaring";
import type { TitikWarung } from "@/components/peta/tipe";
import { LegendaWarung } from "@/components/peta/LegendaWarung";

// Leaflet menyentuh window, jadi peta hanya dimuat di peramban.
const PetaWarung = dynamic(
  () => import("@/components/peta/PetaWarung").then((m) => m.PetaWarung),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-ink-3">Memuat peta…</div>
    ),
  },
);

const NADA_PIL: Record<StatusWarung, "ok" | "warn" | "bahaya" | "netral"> = {
  rutin: "ok",
  jarang: "warn",
  berisiko: "bahaya",
  baru: "netral",
};

export function RegistriWarung({
  data,
  kecamatan,
  bolehTambah,
}: {
  data: TitikWarung[];
  kecamatan: string[];
  /** Menyembunyikan tombolnya saja. Penjaga sebenarnya ada di aksinya. */
  bolehTambah: boolean;
}) {
  const [cari, setCari] = useState("");
  const [filterKec, setFilterKec] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJenis, setFilterJenis] = useState<SaringJenis>("");
  const [tab, setTab] = useState<"semua" | "berisiko">("semua");
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [tampilan, setTampilan] = useState<"peta" | "tabel">("peta");

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.filter((w) => {
      if (tab === "berisiko" && w.status !== "berisiko") return false;
      if (filterKec && w.kecamatan !== filterKec) return false;
      if (filterStatus && w.status !== filterStatus) return false;
      if (filterJenis === "umkm" && w.jejaring) return false;
      if (filterJenis === "jejaring" && !w.jejaring) return false;
      if (q && !w.nama.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, cari, filterKec, filterStatus, filterJenis, tab]);

  const jumlahBerisiko = useMemo(
    () => data.filter((w) => w.status === "berisiko").length,
    [data],
  );

  const jumlahJejaring = useMemo(() => data.filter((w) => w.jejaring).length, [data]);

  // Lembar stiker dan ekspor sama-sama mengikuti saringan yang sedang
  // aktif. Penyaring di halaman ini sekaligus menjadi alat pemilih baris
  // mana yang ikut, sehingga tidak perlu kotak centang per baris — dan
  // yang terunduh selalu sama dengan yang barusan terlihat di layar.
  const pertanyaan = (() => {
    const q = new URLSearchParams();
    if (filterKec) q.set("kec", filterKec);
    if (cari.trim()) q.set("cari", cari.trim());
    const st = tab === "berisiko" ? "berisiko" : filterStatus;
    if (st) q.set("status", st);
    if (filterJenis) q.set("jenis", filterJenis);
    const s = q.toString();
    return s ? `?${s}` : "";
  })();

  const tautanStiker = `/dashboard/warung/stiker${pertanyaan}`;
  const tautanEkspor = `/dashboard/warung/ekspor${pertanyaan}`;

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">Registri Warung</h1>
          <p className="mt-1 text-sm text-ink-2">
            {angka(data.length)} titik terdata ·{" "}
            <b className="font-semibold text-ink">
              {angka(data.length - jumlahJejaring)} calon UMKM
            </b>{" "}
            · {angka(jumlahJejaring)} gerai berjejaring ·{" "}
            {angka(jumlahBerisiko)} berisiko
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Unduhan berkas, bukan perpindahan halaman: dibiarkan sebagai
              <a> biasa dengan `download` supaya peramban tidak mencoba
              merender CSV-nya sebagai halaman. */}
          <a
            href={tautanEkspor}
            download
            className={kelasTombol("kedua")}
          >
            Ekspor CSV · {angka(tersaring.length)}
          </a>
          <TautanTombol href={tautanStiker} nada="kedua">
            Cetak stiker · {angka(tersaring.length)}
          </TautanTombol>
          {bolehTambah && (
            <TautanTombol href="/dashboard/warung/tambah">Tambah warung</TautanTombol>
          )}
        </div>
      </header>

      {/* saringan */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama warung"
          className="h-9 w-full rounded-input border border-line bg-surface px-3 text-sm sm:w-64"
        />
        <select
          value={filterKec}
          onChange={(e) => setFilterKec(e.target.value)}
          className="h-9 rounded-input border border-line bg-surface px-2.5 text-sm"
        >
          <option value="">Semua kecamatan</option>
          {kecamatan.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-input border border-line bg-surface px-2.5 text-sm"
        >
          <option value="">Semua status</option>
          {(Object.keys(LABEL_STATUS) as StatusWarung[]).map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS[s]}
            </option>
          ))}
        </select>
        <select
          value={filterJenis}
          onChange={(e) => setFilterJenis(e.target.value as SaringJenis)}
          className="h-9 rounded-input border border-line bg-surface px-2.5 text-sm"
        >
          <option value="">Semua jenis usaha</option>
          <option value="umkm">{LABEL_JENIS.umkm} saja</option>
          <option value="jejaring">{LABEL_JENIS.jejaring} saja</option>
        </select>

        <div className="ml-auto flex rounded-input border border-line bg-surface p-0.5 lg:hidden">
          {(["peta", "tabel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTampilan(t)}
              className={cn(
                "rounded-[6px] px-3 py-1 text-sm capitalize",
                tampilan === t ? "bg-brand text-white" : "text-ink-2",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* tab */}
      <div className="mb-3 flex gap-1 border-b border-line">
        {([
          ["semua", `Semua warung`],
          ["berisiko", `Berisiko`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab === k
                ? "border-brand font-medium text-ink"
                : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {label}
            {k === "berisiko" && jumlahBerisiko > 0 && (
              <span className="ml-1.5 rounded-pill bg-danger-bg px-1.5 py-0.5 text-[11px] font-medium text-danger">
                {jumlahBerisiko}
              </span>
            )}
          </button>
        ))}
      </div>

      <Panel padat className="overflow-hidden">
        <div className="grid lg:grid-cols-[45%_55%]">
          {/* peta */}
          <div
            className={cn(
              "border-line lg:border-r",
              tampilan === "tabel" && "hidden lg:block",
            )}
          >
            <div className="h-[320px] lg:h-[560px]">
              <PetaWarung titik={tersaring} terpilih={terpilih} onPilih={setTerpilih} />
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <LegendaWarung />
            </div>
          </div>

          {/* tabel */}
          <div
            className={cn(
              "min-w-0",
              tampilan === "peta" && "hidden lg:block",
            )}
          >
            <div className="max-h-[560px] overflow-y-auto">
              {tersaring.length === 0 ? (
                <Kosong
                  judul="Tidak ada warung yang cocok"
                  keterangan="Coba longgarkan saringan atau kosongkan kolom pencarian."
                />
              ) : (
                <Tabel>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <Th>Warung</Th>
                      <Th>Kecamatan</Th>
                      <Th num>Estimasi</Th>
                      <Th num>Terjemput</Th>
                      <Th>Cakupan</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {tersaring.slice(0, 200).map((w) => {
                      const rasio =
                        w.estimasiLBulan > 0
                          ? (w.terjemputLBulan / w.estimasiLBulan) * 100
                          : 0;
                      return (
                        <tr
                          key={w.id}
                          onClick={() => setTerpilih(w.id)}
                          className={cn(
                            "cursor-pointer hover:bg-canvas",
                            terpilih === w.id &&
                              "bg-accent-soft shadow-[inset_2px_0_0_var(--color-accent)]",
                          )}
                        >
                          <Td>
                            <span className="font-medium">{w.nama}</span>
                            {w.jejaring && (
                              <span
                                className="ml-1.5 rounded px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-[0.04em] bg-mute-bg text-mute"
                                title="Gerai berjejaring — di luar sasaran program, menunggu dipastikan petugas"
                              >
                                JEJARING
                              </span>
                            )}
                            <span className="block text-[12px] text-ink-3">{w.kategori}</span>
                          </Td>
                          <Td>{w.kecamatan ?? <span className="text-ink-3">—</span>}</Td>
                          <Td num>{angka(w.estimasiLBulan, 1)} L</Td>
                          <Td num>
                            <span className={w.terjemputLBulan === 0 ? "text-ink-3" : undefined}>
                              {angka(w.terjemputLBulan, 1)} L
                            </span>
                          </Td>
                          <Td>
                            <BilahDalamBaris persen={Math.min(100, rasio)} />
                          </Td>
                          <Td>
                            <Pil nada={NADA_PIL[w.status]} titik>
                              {LABEL_STATUS[w.status]}
                            </Pil>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabel>
              )}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
              Menampilkan {angka(Math.min(200, tersaring.length))} dari{" "}
              {angka(tersaring.length)} hasil saringan
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
