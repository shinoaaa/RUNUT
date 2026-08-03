"use client";

import { useState } from "react";
import { KartuAngka, Panel, TagKeyakinan } from "@/components/ui";
import { angka, rupiah } from "@/lib/format";

export interface DasarSkenario {
  potensiWilayahLBulan: number;
  cakupanSekarang: number;
  petugasSekarang: number;
  hargaSekarang: number;
  kgPerLiter: number;
  literPerBiodiesel: number;
  kgCo2PerLiter: number;
}

/** Perkiraan biaya operasional satu petugas per bulan. Angka ilustratif. */
const BIAYA_PETUGAS_BULAN = 3_200_000;
/** Berapa liter yang sanggup dijemput satu petugas dalam sebulan. */
const KAPASITAS_PETUGAS_LBULAN = 4_500;

export function Skenario({ dasar }: { dasar: DasarSkenario }) {
  const [cakupan, setCakupan] = useState(Math.round(dasar.cakupanSekarang));
  const [petugas, setPetugas] = useState(Math.max(1, dasar.petugasSekarang));
  const [harga, setHarga] = useState(dasar.hargaSekarang);

  const literBulan = (dasar.potensiWilayahLBulan * cakupan) / 100;
  const literSanggup = petugas * KAPASITAS_PETUGAS_LBULAN;
  const literNyata = Math.min(literBulan, literSanggup);
  const kurangPetugas = literBulan > literSanggup;

  const kgBulan = literNyata * dasar.kgPerLiter;
  const biayaBeli = kgBulan * harga;
  const biayaOperasional = petugas * BIAYA_PETUGAS_BULAN;
  const nilaiJual = kgBulan * 7500; // harga jual ke pengolah, ilustratif
  const selisihBulan = nilaiJual - biayaBeli - biayaOperasional;

  const biodiesel = literNyata / dasar.literPerBiodiesel;
  const tonCo2 = (literNyata * dasar.kgCo2PerLiter) / 1000;

  const geser =
    "w-full accent-[var(--color-brand)] cursor-pointer";

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight">Kalkulator Skenario</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Memperkirakan dampak bila cakupan, jumlah petugas, atau harga berubah.
          Seluruh keluaran di halaman ini adalah <b>proyeksi</b>, bukan hasil
          pengukuran.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr]">
        <Panel judul="Pengandaian">
          <div className="flex flex-col gap-6">
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Cakupan warung</span>
                <span className="tabular text-[17px] font-bold">{cakupan}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={cakupan}
                onChange={(e) => setCakupan(Number(e.target.value))}
                className={geser}
              />
              <span className="text-[12px] text-ink-3">
                Saat ini {angka(dasar.cakupanSekarang, 1)}%
              </span>
            </label>

            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Jumlah petugas</span>
                <span className="tabular text-[17px] font-bold">{petugas}</span>
              </span>
              <input
                type="range"
                min={1}
                max={60}
                value={petugas}
                onChange={(e) => setPetugas(Number(e.target.value))}
                className={geser}
              />
              <span className="text-[12px] text-ink-3">
                Satu petugas diasumsikan sanggup {angka(KAPASITAS_PETUGAS_LBULAN)} L/bulan
              </span>
            </label>

            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Harga beli ke warung</span>
                <span className="tabular text-[17px] font-bold">{rupiah(harga)}/kg</span>
              </span>
              <input
                type="range"
                min={3000}
                max={9000}
                step={250}
                value={harga}
                onChange={(e) => setHarga(Number(e.target.value))}
                className={geser}
              />
              <span className="text-[12px] text-ink-3">
                Pengepul membayar Rp 2.500–4.700 · Pertamina Rp 6.000
              </span>
            </label>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          {kurangPetugas && (
            <p className="rounded-card border border-line bg-warn-bg px-4 py-3 text-[13px] text-warn">
              Dengan {petugas} petugas, hanya {angka(literSanggup)} L/bulan yang sanggup
              dijemput — di bawah {angka(literBulan)} L/bulan yang tersedia pada cakupan{" "}
              {cakupan}%. Tambah petugas agar cakupannya benar-benar tercapai.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KartuAngka
              label="Terjemput"
              angka={angka(literNyata, 0)}
              satuan="L/bln"
              catatan={`${angka(kgBulan / 1000, 1)} ton per bulan`}
            />
            <KartuAngka
              label="Setara Biodiesel"
              angka={angka(biodiesel, 0)}
              satuan="L/bln"
            />
            <KartuAngka
              label="CO₂ Tergantikan"
              angka={angka(tonCo2, 1)}
              satuan="ton/bln"
            />
            <KartuAngka
              label="Tak Masuk Saluran Air"
              angka={angka(literNyata, 0)}
              satuan="L/bln"
            />
          </div>

          <Panel judul="Perkiraan arus kas bulanan">
            <ul className="flex flex-col gap-2.5 text-sm">
              {[
                ["Nilai jual ke pengolah", nilaiJual, "+"],
                ["Dibayarkan ke warung", -biayaBeli, "−"],
                ["Biaya operasional petugas", -biayaOperasional, "−"],
              ].map(([label, nilai]) => (
                <li key={label as string} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-2">{label as string}</span>
                  <span className="tabular">{rupiah(Math.abs(nilai as number))}</span>
                </li>
              ))}
              <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
                <span className="font-medium">Selisih</span>
                <span
                  className={
                    selisihBulan >= 0
                      ? "tabular text-[19px] font-bold text-accent"
                      : "tabular text-[19px] font-bold text-danger"
                  }
                >
                  {selisihBulan >= 0 ? "" : "−"}
                  {rupiah(Math.abs(selisihBulan))}
                </span>
              </li>
            </ul>

            <div className="mt-4 rounded-card border border-line bg-canvas p-3">
              <p className="mb-2 text-[12px] font-medium">
                Angka yang dipakai <TagKeyakinan nilai="estimasi" />
              </p>
              <ul className="flex flex-col gap-1 text-[12px] text-ink-2">
                <li>Harga jual ke pengolah {rupiah(7500)}/kg</li>
                <li>Biaya satu petugas {rupiah(BIAYA_PETUGAS_BULAN)}/bulan</li>
                <li>Kapasitas satu petugas {angka(KAPASITAS_PETUGAS_LBULAN)} L/bulan</li>
                <li>
                  Potensi wilayah {angka(dasar.potensiWilayahLBulan, 0)} L/bulan — turunan
                  dari registri warung dan asumsi cakupan data terbuka
                </li>
              </ul>
              <p className="mt-2 text-[12px] text-ink-3">
                Selisih positif belum berarti masuk sebagai pendapatan asli daerah.
                Itu baru mungkin bila disalurkan lewat BUMD atau BLUD.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
