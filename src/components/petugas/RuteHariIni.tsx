"use client";

import Link from "next/link";
import { useState } from "react";
import { Kosong, Pil, TautanTombol, Tombol, cn } from "@/components/ui";
import { angka, liter } from "@/lib/format";
import type { Perhentian, RuteHarian } from "@/lib/rute";

const NADA: Record<Perhentian["urgensi"], "bahaya" | "netral" | "info"> = {
  mendesak: "bahaya",
  normal: "info",
  ditunda: "netral",
};
const LABEL: Record<Perhentian["urgensi"], string> = {
  mendesak: "Mendesak",
  normal: "Normal",
  ditunda: "Bisa ditunda",
};

export function RuteHariIni({
  rute,
  namaPetugas,
  tanggal,
  keluar,
}: {
  rute: RuteHarian;
  namaPetugas: string;
  tanggal: string;
  keluar: () => Promise<void>;
}) {
  const [saring, setSaring] = useState<"semua" | "mendesak" | "diminta">("semua");

  const belum = rute.perhentian.filter((p) => !p.sudahDijemput);
  const selesai = rute.perhentian.filter((p) => p.sudahDijemput);
  const jumlahMendesak = belum.filter((p) => p.urgensi === "mendesak").length;
  const jumlahDiminta = belum.filter((p) => p.diminta).length;

  const tampil = belum.filter((p) =>
    saring === "mendesak" ? p.urgensi === "mendesak" : saring === "diminta" ? p.diminta : true,
  );

  const total = belum.length + selesai.length;
  const persen = total > 0 ? (selesai.length / total) * 100 : 0;
  const adaMuatan = rute.totalTerkumpulG > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* kepala */}
      <header className="bg-brand px-4 pb-4 pt-5 text-white sm:rounded-t-card">
        {/* Ini pangkal alur lapangan, jadi tidak ada tempat untuk "kembali".
            Yang dibutuhkan petugas justru jalan KELUAR — tanpa ini dia
            terkunci di dalam aplikasi dan tidak bisa berganti akun. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-white/70">{tanggal}</p>
            <h1 className="mt-0.5 truncate text-[21px] font-bold leading-tight">
              {namaPetugas}
            </h1>
          </div>
          <form action={keluar}>
            <button
              type="submit"
              className="shrink-0 rounded-btn border border-white/25 px-2.5 py-1 text-[12px] text-white/85 transition-colors hover:bg-white/10"
            >
              Keluar
            </button>
          </form>
        </div>

        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span>
            <b className="tabular text-[17px]">{selesai.length}</b> dari {total} warung
          </span>
          <span className="tabular">{liter(rute.totalTerkumpulG)} liter terkumpul</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-pill bg-white/25">
          <div className="h-full rounded-pill bg-white" style={{ width: `${persen}%` }} />
        </div>
      </header>

      {/* saringan */}
      <div className="flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-3">
        {([
          ["semua", `Semua ${belum.length}`],
          ["mendesak", `Mendesak ${jumlahMendesak}`],
          ["diminta", `Diminta ${jumlahDiminta}`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSaring(k)}
            className={cn(
              "shrink-0 rounded-pill px-3 py-1.5 text-[13px] transition-colors",
              saring === k
                ? "bg-brand text-white"
                : "border border-line bg-surface text-ink-2",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* daftar kunjungan */}
      <div className="flex-1 px-4 py-4">
        {tampil.length === 0 ? (
          <Kosong
            judul={
              belum.length === 0
                ? "Semua kunjungan hari ini selesai"
                : "Tidak ada yang cocok dengan saringan"
            }
            keterangan={
              belum.length === 0
                ? "Setor muatan ke titik kumpul untuk menutup trip."
                : undefined
            }
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {tampil.map((p, i) => (
              <li key={p.warungId}>
                <Link
                  href={`/petugas/jemput/${p.warungId}`}
                  className="flex items-start gap-3 rounded-card border border-line bg-surface p-3 transition-colors active:bg-canvas"
                >
                  <span className="tabular mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.nama}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      {p.jarakDariSebelumnyaM >= 1000
                        ? `${angka(p.jarakDariSebelumnyaM / 1000, 1)} km`
                        : `${angka(p.jarakDariSebelumnyaM)} m`}{" "}
                      · perkiraan {angka(p.perkiraanIsiL, 1)} L
                      {p.hariSejakDijemput !== null && ` · ${p.hariSejakDijemput} hari lalu`}
                      {p.hariSejakDijemput === null && " · belum pernah"}
                    </span>
                    {p.diminta && (
                      <span className="mt-1.5 inline-block">
                        <Pil nada="info">Diminta warung</Pil>
                      </span>
                    )}
                  </span>
                  <Pil nada={NADA[p.urgensi]} titik>
                    {LABEL[p.urgensi]}
                  </Pil>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {selesai.length > 0 && (
          <>
            <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Selesai hari ini
            </p>
            <ul className="flex flex-col gap-2">
              {selesai.map((p) => (
                <li
                  key={p.warungId}
                  className="flex items-center gap-3 rounded-card border border-line bg-canvas p-3"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok-bg text-[13px] text-ok">
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{p.nama}</span>
                  <span className="tabular text-[13px] font-medium">
                    {liter(p.beratBersihG ?? 0)} L
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* bilah bawah */}
      <div className="sticky bottom-0 border-t border-line bg-surface p-4 sm:rounded-b-card">
        {adaMuatan ? (
          <TautanTombol href="/petugas/setor" besar className="w-full">
            Setor ke titik kumpul · {liter(rute.totalTerkumpulG)} liter
          </TautanTombol>
        ) : (
          <Tombol besar className="w-full" disabled>
            Belum ada muatan untuk disetor
          </Tombol>
        )}
        {rute.titikKumpul && (
          <p className="mt-2 text-center text-[12px] text-ink-3">
            {adaMuatan
              ? `Tujuan: ${rute.titikKumpul.nama}`
              : "Timbang di warung dulu, muatannya terkumpul di sini"}
          </p>
        )}
      </div>
    </div>
  );
}
