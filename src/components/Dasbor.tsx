"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as GrafikTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BilahDalamBaris,
  KartuAngka,
  Panel,
  Tabel,
  TagKeyakinan,
  Td,
  Th,
} from "@/components/ui";
import { LegendaWilayah } from "@/components/peta/LegendaWilayah";
import { angka, rupiah } from "@/lib/format";
import type { StatistikDasbor } from "@/lib/statistik";

const PetaWilayah = dynamic(
  () => import("@/components/peta/PetaWilayah").then((m) => m.PetaWilayah),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-ink-3">Memuat peta…</div>
    ),
  },
);

export function Dasbor({
  s,
  asumsi,
}: {
  s: StatistikDasbor;
  asumsi: Array<{ langkah: string; nilai: string; sifat: string }>;
}) {
  const [bukaAsumsi, setBukaAsumsi] = useState(false);
  const teratas = s.wilayah.filter((w) => w.jumlahWarung > 0).slice(0, 6);
  const tanpaData = s.wilayah.filter((w) => w.jumlahWarung === 0).length;

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-2">
          Kabupaten Bekasi · 30 hari terakhir
        </p>
      </header>

      {/* angka utama */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuAngka
          label="Tingkat Tangkap"
          angka={angka(s.tingkatTangkap, 1)}
          satuan="%"
          catatan="dari potensi wilayah"
        />
        <KartuAngka
          label="Terjemput"
          angka={angka(s.terjemputKg, 1)}
          satuan="kg"
          catatan={`≈ ${angka(s.terjemputLiter, 0)} liter`}
        />
        <KartuAngka
          label="Warung Aktif"
          angka={angka(s.warungAktif)}
          satuan={`/ ${angka(s.warungTerdata)}`}
          catatan={`${angka((s.warungAktif / Math.max(s.warungTerdata, 1)) * 100, 1)}% dari terdata`}
        />
        <KartuAngka
          label="Nilai"
          angka={rupiah(s.nilaiRpTahunIni, true).replace("Rp ", "")}
          satuan="Rp"
          catatan="tahun berjalan"
        />
      </div>

      {/* tiga kebocoran, dipisah menurut tingkat keyakinan */}
      <p className="mt-8 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Kebocoran
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <KartuAngka
          label="Susut Rantai"
          angka={angka(s.susutRantaiG / 1000, 1)}
          satuan={`kg · ${angka(s.susutRantaiPersen, 2)}%`}
          catatan="selisih timbang warung terhadap titik kumpul"
          keyakinan="terukur"
        />
        <KartuAngka
          label="Bocor di Warung Terdaftar"
          angka={`± ${angka(s.bocorTerdaftarLBulan, 0)}`}
          satuan="L/bln"
          catatan="estimasi produksi dikurangi yang dijemput"
          keyakinan="estimasi"
        />
        <KartuAngka
          label="Di Luar Jangkauan"
          angka={`± ${angka(s.diLuarJangkauanLBulan, 0)}`}
          satuan="L/bln"
          catatan="warung yang belum masuk registri sama sekali"
          keyakinan="model"
        />
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        Ketiganya sengaja tidak dijumlahkan. Hanya yang pertama berasal dari
        pengukuran; dua sisanya taksiran dengan tingkat keyakinan berbeda.
      </p>

      {/* peta wilayah + tren */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          judul="Cakupan per Kecamatan"
          aksi={
            <span className="text-[12px] text-ink-3">
              {angka(tanpaData)} dari {angka(s.wilayah.length)} kecamatan belum ada data
            </span>
          }
          padat
        >
          <div className="h-[380px] px-2 pt-2">
            <PetaWilayah nilai={s.wilayah} />
          </div>
          <div className="border-t border-line px-5 py-3">
            <LegendaWilayah />
          </div>
        </Panel>

        <Panel judul="Tren Mingguan" padat>
          <div className="h-[300px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.tren} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#e3e6e2" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8a968f" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e3e6e2" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8a968f" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <GrafikTooltip
                  contentStyle={{
                    border: "1px solid #e3e6e2",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(v) => [`${angka(Number(v ?? 0), 1)} L`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="terjemput"
                  name="Terjemput"
                  stroke="#0e4f3f"
                  strokeWidth={2}
                  fill="#e6f4ee"
                />
                <Line
                  type="monotone"
                  dataKey="potensi"
                  name="Potensi"
                  stroke="#93cbb2"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-line px-5 py-2.5 text-[12px] text-ink-3">
            Garis penuh: terjemput. Garis putus: potensi warung terdaftar.
          </p>
        </Panel>
      </div>

      {/* kecamatan teratas + dampak */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel judul="Kecamatan Teratas" padat>
          <Tabel>
            <thead>
              <tr>
                <Th>Kecamatan</Th>
                <Th num>Warung</Th>
                <Th num>Terjemput</Th>
                <Th>Cakupan</Th>
              </tr>
            </thead>
            <tbody>
              {teratas.map((w) => (
                <tr key={w.kecamatan}>
                  <Td>{w.kecamatan}</Td>
                  <Td num>{angka(w.jumlahWarung)}</Td>
                  <Td num>{angka(w.terjemputLBulan, 1)} L</Td>
                  <Td>
                    <BilahDalamBaris persen={Math.min(100, w.tingkatTangkap ?? 0)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Panel>

        <Panel judul="Dampak Lingkungan">
          <ul className="flex flex-col gap-3">
            {[
              ["Liter tidak masuk saluran air", `${angka(s.literTakMasukSaluran, 0)} L`],
              ["Setara biodiesel", `${angka(s.literBiodiesel, 0)} L`],
              ["CO₂ tergantikan", `${angka(s.tonCo2, 2)} ton`],
              ["Warung terlayani", angka(s.warungAktif)],
            ].map(([k, v]) => (
              <li key={k} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-2">{k}</span>
                <span className="tabular font-semibold">{v}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setBukaAsumsi((v) => !v)}
            className="mt-4 text-[13px] text-accent underline underline-offset-4"
          >
            {bukaAsumsi ? "Tutup asumsi" : "Lihat asumsi perhitungan"}
          </button>

          {bukaAsumsi && (
            <div className="mt-3 rounded-card border border-line bg-canvas p-3">
              <p className="mb-2 text-[12px] text-ink-2">
                Angka dampak di atas adalah <b>estimasi</b>. Rantai asumsinya dibuka
                penuh agar dapat diperiksa dan dikoreksi.
              </p>
              <ul className="flex flex-col gap-2">
                {asumsi.map((a) => (
                  <li key={a.langkah} className="text-[12px]">
                    <span className="block font-medium">{a.langkah}</span>
                    <span className="text-ink-2">{a.nilai}</span>{" "}
                    <TagKeyakinan nilai={a.sifat === "terukur" ? "terukur" : "estimasi"} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
