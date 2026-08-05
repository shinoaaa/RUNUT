"use client";

import dynamic from "next/dynamic";
import { useActionState, useMemo, useState } from "react";
import { Panel, TagKeyakinan, TautanTombol, Tombol, cn } from "@/components/ui";
import { KATEGORI, SKALA, hitungEstimasi, type KelasSkala } from "@/lib/estimasi";
import { angka } from "@/lib/format";
import type { HasilTambah } from "@/app/(dasbor)/dashboard/warung/tambah/aksi";

const PetaPilihTitik = dynamic(
  () => import("@/components/peta/PetaPilihTitik").then((m) => m.PetaPilihTitik),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-ink-3">Memuat peta…</div>
    ),
  },
);

const kotak = "h-9 w-full rounded-input border border-line bg-surface px-3 text-sm";

export function FormWarung({
  kecamatan,
  aksi,
}: {
  kecamatan: Array<{ id: number; nama: string }>;
  aksi: (sebelumnya: unknown, form: FormData) => Promise<HasilTambah>;
}) {
  const [hasil, kirim, menunggu] = useActionState<HasilTambah | undefined, FormData>(
    aksi,
    undefined,
  );
  const [kategori, setKategori] = useState("warteg");
  const [skala, setSkala] = useState<KelasSkala>("KECIL");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);

  const e = useMemo(() => hitungEstimasi(kategori, skala), [kategori, skala]);

  return (
    <form action={kirim} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lon" value={lon ?? ""} />

      <div className="flex flex-col gap-4">
        <Panel judul="Identitas warung">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-[12px] font-medium text-ink-2">Nama warung</span>
              <input name="nama" required placeholder="Ayam Goreng Bu Tini" className={kotak} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium text-ink-2">Kecamatan</span>
              <select name="kecamatanId" required defaultValue="" className={kotak}>
                <option value="" disabled>
                  Pilih kecamatan
                </option>
                {kecamatan.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium text-ink-2">Desa / kelurahan</span>
              <input name="desa" placeholder="opsional" className={kotak} />
            </label>
            <label className="grid gap-1.5 sm:col-span-2">
              <span className="text-[12px] font-medium text-ink-2">Alamat</span>
              <input name="alamat" placeholder="opsional" className={kotak} />
            </label>
          </div>
        </Panel>

        <Panel judul="Jenis masakan">
          <p className="mb-3 text-[13px] text-ink-2">
            Jenis masakan menentukan seberapa banyak menggoreng. Bakso dan soto
            hampir tidak menghasilkan jelantah meski warungnya ramai.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {KATEGORI.map((k) => (
              <label
                key={k.nilai}
                className={cn(
                  "cursor-pointer rounded-card border p-3 transition-colors",
                  kategori === k.nilai
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:bg-canvas",
                )}
              >
                <input
                  type="radio"
                  name="kategori"
                  value={k.nilai}
                  checked={kategori === k.nilai}
                  onChange={() => setKategori(k.nilai)}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{k.label}</span>
                  <span className="tabular text-[12px] text-ink-3">×{k.faktor}</span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                  {k.keterangan}
                </span>
              </label>
            ))}
          </div>
        </Panel>

        <Panel judul="Kelas skala usaha">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(SKALA) as KelasSkala[]).map((s) => (
              <label
                key={s}
                className={cn(
                  "cursor-pointer rounded-card border p-3 transition-colors",
                  skala === s
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:bg-canvas",
                )}
              >
                <input
                  type="radio"
                  name="skala"
                  value={s}
                  checked={skala === s}
                  onChange={() => setSkala(s)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">{SKALA[s].label}</span>
                <span className="tabular mt-0.5 block text-[12px] text-ink-2">
                  {SKALA[s].minLBulan}–{SKALA[s].maxLBulan} L/bln
                </span>
                <span className="mt-1 block text-[12px] leading-snug text-ink-3">
                  {SKALA[s].keterangan}
                </span>
              </label>
            ))}
          </div>
        </Panel>
      </div>

      {/* sisi kanan: lokasi dan hasil hitungan */}
      <div className="flex flex-col gap-4">
        <Panel judul="Titik lokasi" padat>
          <div className="h-[260px]">
            <PetaPilihTitik
              lat={lat}
              lon={lon}
              onPilih={(a, b) => {
                setLat(Number(a.toFixed(6)));
                setLon(Number(b.toFixed(6)));
              }}
            />
          </div>
          <div className="border-t border-line px-4 py-3">
            {lat === null ? (
              <p className="text-[13px] text-ink-3">Klik pada peta untuk menaruh titik.</p>
            ) : (
              <p className="tabular text-[13px] text-ink-2">
                {lat}, {lon}
              </p>
            )}
          </div>
        </Panel>

        <Panel judul="Estimasi awal">
          <div className="rounded-card border border-line bg-canvas p-4 text-center">
            <p className="tabular text-[32px] font-bold leading-none">
              {angka(e.literPerBulan, 1)}
              <span className="ml-1 text-base font-medium text-ink-2">L/bln</span>
            </p>
            <p className="tabular mt-1 text-[13px] text-ink-2">
              ≈ {angka(e.literPerMinggu, 1)} liter per minggu
            </p>
            <p className="tabular mt-2 text-[12px] text-ink-3">
              rentang wajar {angka(e.rentangMin, 0)}–{angka(e.rentangMax, 0)} L/bln
            </p>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{e.uraian}</p>

          <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-3">
            <TagKeyakinan nilai="estimasi" />
            Diganti hasil timbangan begitu warung ini mulai dijemput.
          </p>
        </Panel>

        {hasil?.galat && (
          <p className="rounded-card bg-danger-bg px-4 py-3 text-[13px] text-danger">
            {hasil.galat}
          </p>
        )}

        <div className="flex gap-2">
          <Tombol besar type="submit" disabled={menunggu} className="flex-1">
            {menunggu ? "Menyimpan…" : "Simpan warung"}
          </Tombol>
          <TautanTombol href="/dashboard/warung" besar nada="kedua">
            Batal
          </TautanTombol>
        </div>
      </div>
    </form>
  );
}
