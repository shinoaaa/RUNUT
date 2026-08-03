"use client";

import { useState } from "react";
import { Panel, Pil, Tabel, Td, Th, Tombol } from "@/components/ui";
import { angka, tanggalJam } from "@/lib/format";

export interface BarisPerangkat {
  deviceId: string;
  petugas: string | null;
  batteryMv: number | null;
  rssiDbm: number | null;
  lastSeen: string | null;
  lastSeq: number;
  lastHash: string | null;
  jumlahKejadian: number;
}

interface HasilPeriksa {
  deviceId: string;
  jumlah: number;
  utuh: boolean;
  tandaTanganSah: number;
  hashCocok: number;
  masalah: Array<{ seq: number; sebab: string }>;
}

export function Perangkat({ daftar }: { daftar: BarisPerangkat[] }) {
  const [periksa, setPeriksa] = useState<HasilPeriksa[] | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [waktu, setWaktu] = useState<string | null>(null);

  async function jalankan() {
    setSibuk(true);
    const r = await fetch("/api/perangkat/verifikasi", { method: "POST" });
    const j = await r.json();
    setPeriksa(j.hasil);
    setWaktu(j.diperiksaPada);
    setSibuk(false);
  }

  const semuaUtuh = periksa?.every((h) => h.utuh) ?? null;

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight">Perangkat</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Kesehatan timbangan di lapangan, dan keutuhan rantai bukti yang mereka
          hasilkan.
        </p>
      </header>

      <Panel judul="Timbangan terdaftar" padat>
        <Tabel>
          <thead>
            <tr>
              <Th>Alat</Th>
              <Th>Pemegang</Th>
              <Th num>Baterai</Th>
              <Th num>Sinyal</Th>
              <Th>Terakhir terlihat</Th>
              <Th num>Kejadian</Th>
              <Th>Ujung rantai</Th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((d) => (
              <tr key={d.deviceId}>
                <Td>
                  <span className="font-mono text-[13px] font-medium">{d.deviceId}</span>
                </Td>
                <Td>{d.petugas ?? <span className="text-ink-3">belum ditugaskan</span>}</Td>
                <Td num>
                  {d.batteryMv ? (
                    <span className={d.batteryMv < 3650 ? "text-warn" : undefined}>
                      {(d.batteryMv / 1000).toFixed(2)} V
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td num>{d.rssiDbm ? `${d.rssiDbm} dBm` : "—"}</Td>
                <Td>
                  {d.lastSeen ? (
                    tanggalJam(d.lastSeen)
                  ) : (
                    <span className="text-ink-3">belum pernah</span>
                  )}
                </Td>
                <Td num>{angka(d.jumlahKejadian)}</Td>
                <Td>
                  <span className="font-mono text-[12px] text-ink-3">
                    {d.lastHash ? `${d.lastHash.slice(0, 10)}…` : "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Panel>

      <Panel
        judul="Keutuhan rantai bukti"
        className="mt-4"
        aksi={
          <Tombol nada="kedua" disabled={sibuk} onClick={jalankan}>
            {sibuk ? "Memeriksa…" : "Verifikasi rantai"}
          </Tombol>
        }
      >
        <p className="text-[13px] text-ink-2">
          Pemeriksaan menghitung ulang hash tiap kejadian, memverifikasi tanda
          tangannya terhadap kunci publik alat, lalu mencocokkan sambungannya ke
          kejadian sebelumnya. Kalau satu baris di basis data diubah atau dihapus,
          langkah inilah yang menangkapnya.
        </p>

        {periksa === null ? (
          <p className="mt-4 rounded-card border border-line bg-canvas px-4 py-6 text-center text-sm text-ink-3">
            Belum diperiksa. Tekan tombol di atas.
          </p>
        ) : (
          <>
            <div
              className={
                semuaUtuh
                  ? "mt-4 rounded-card border border-line bg-accent-soft px-4 py-3"
                  : "mt-4 rounded-card border border-line bg-danger-bg px-4 py-3"
              }
            >
              <p className={semuaUtuh ? "font-medium text-accent" : "font-medium text-danger"}>
                {semuaUtuh
                  ? "Seluruh rantai utuh"
                  : "Ditemukan sambungan yang bermasalah"}
              </p>
              {waktu && (
                <p className="mt-0.5 text-[12px] text-ink-3">
                  Diperiksa {tanggalJam(waktu)}
                </p>
              )}
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {periksa.map((h) => (
                <li
                  key={h.deviceId}
                  className="rounded-card border border-line px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[13px] font-medium">{h.deviceId}</span>
                    <span className="tabular text-[13px] text-ink-2">
                      {angka(h.jumlah)} kejadian
                    </span>
                    <span className="tabular text-[13px] text-ink-2">
                      tanda tangan sah {angka(h.tandaTanganSah)}/{angka(h.jumlah)}
                    </span>
                    <span className="tabular text-[13px] text-ink-2">
                      hash cocok {angka(h.hashCocok)}/{angka(h.jumlah)}
                    </span>
                    <span className="ml-auto">
                      <Pil nada={h.utuh ? "ok" : "bahaya"} titik>
                        {h.utuh ? "Rantai utuh" : "Rantai bermasalah"}
                      </Pil>
                    </span>
                  </div>
                  {h.masalah.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {h.masalah.map((m, i) => (
                        <li key={i} className="text-[12px] text-danger">
                          seq {m.seq}: {m.sebab}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel judul="Kenapa bukan blockchain" className="mt-4">
        <p className="text-sm leading-relaxed text-ink-2">
          Blockchain menjaga data agar tidak berubah <i>setelah</i> ditulis, tetapi
          tidak menjamin data benar <i>pada saat</i> ditulis — sedangkan risiko
          terbesar pada sistem ini justru berada di titik pencatatan.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Yang dipakai di sini adalah log berantai hash dengan dua penguatan: tiap
          kejadian ditandatangani perangkat memakai kunci privatnya sendiri, dan
          rantainya dimulai di perangkat, bukan di server. Untuk memalsukan data,
          seseorang harus membongkar alatnya — bukan mengubah basis data.
        </p>
      </Panel>
    </div>
  );
}
