"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Kosong, Pil, TautanTombol, Tombol, cn } from "@/components/ui";
import { angka, kg, liter } from "@/lib/format";

export interface RingkasTrip {
  id: number;
  jumlahWarung: number;
  totalGWarung: number;
  daftar: Array<{ nama: string; beratBersihG: number; jam: string }>;
}

export function Setor({
  trip,
  deviceId,
  titikKumpul,
  ambangSusutPersen,
}: {
  trip: RingkasTrip | null;
  deviceId: string;
  titikKumpul: { id: number; nama: string } | null;
  ambangSusutPersen: number;
}) {
  const router = useRouter();
  const [menimbang, setMenimbang] = useState(false);
  const [hasil, setHasil] = useState<{
    totalGWarung: number;
    totalGTitikKumpul: number;
    susutG: number;
    susutPersen: number;
  } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  if (!trip || trip.jumlahWarung === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Kepala judul="Setor ke titik kumpul" />
        <div className="flex-1">
          <Kosong
            judul="Belum ada muatan hari ini"
            keterangan="Lakukan penjemputan terlebih dahulu, lalu kembali ke halaman ini untuk menyetor."
            aksi={
              <TautanTombol href="/petugas">Kembali ke rute</TautanTombol>
            }
          />
        </div>
      </div>
    );
  }

  async function timbangDanSetor() {
    setMenimbang(true);
    setGalat(null);

    // Wadah pengangkut, dan susut yang muncul selama perjalanan.
    const wadahG = 5000;
    const susutAlami = Math.round(trip!.totalGWarung * (0.001 + Math.random() * 0.018));

    const r = await fetch("/api/simulator/kirim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        type: "DROPOFF",
        payload: {
          trip_id: trip!.id,
          titik_kumpul_id: titikKumpul?.id,
          gross_g: trip!.totalGWarung - susutAlami + wadahG,
          tare_g: wadahG,
        },
      }),
    });
    const j = await r.json();
    setMenimbang(false);
    if (j?.balasan?.ok) setHasil(j.balasan);
    else setGalat(j?.balasan?.pesan ?? "Gagal mengirim ke server");
  }

  const wajar = hasil ? Math.abs(hasil.susutPersen) <= ambangSusutPersen : true;

  return (
    <div className="flex min-h-dvh flex-col">
      <Kepala judul="Setor ke titik kumpul" sub={titikKumpul?.nama} />

      <div className="flex-1 p-4">
        {/* ringkasan muatan */}
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-2">Muatan hari ini</span>
            <span className="tabular text-[26px] font-bold">
              {liter(trip.totalGWarung)}{" "}
              <span className="text-base font-medium text-ink-2">liter</span>
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            {kg(trip.totalGWarung)} kg dari {trip.jumlahWarung} warung, dijumlahkan dari
            timbangan di tiap lokasi
          </p>
        </section>

        {/* daftar */}
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {trip.daftar.map((d, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{d.nama}</span>
              <span className="text-[12px] text-ink-3">{d.jam}</span>
              <span className="tabular w-20 text-right text-sm font-medium">
                {liter(d.beratBersihG)} L
              </span>
            </li>
          ))}
        </ul>

        {/* hasil rekonsiliasi */}
        {hasil && (
          <section className="mt-4 rounded-card border border-line bg-surface p-4">
            <p className="mb-3 text-[13px] font-medium">Rekonsiliasi</p>
            {[
              ["Total timbang di warung", hasil.totalGWarung],
              ["Timbang di titik kumpul", hasil.totalGTitikKumpul],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between py-1 text-sm">
                <span className="text-ink-2">{l}</span>
                <span className="tabular">{liter(v as number)} L</span>
              </div>
            ))}
            <div className="my-2 border-t border-line" />
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Susut rantai
              </span>
              <span
                className={cn(
                  "tabular text-[20px] font-bold",
                  wajar ? "text-ink" : "text-danger",
                )}
              >
                {liter(hasil.susutG)} L
                <span className="ml-1 text-sm font-medium">
                  ({angka(hasil.susutPersen, 2)}%)
                </span>
              </span>
            </div>
            <div className="mt-2">
              <Pil nada={wajar ? "ok" : "bahaya"} titik>
                {wajar
                  ? "Wajar"
                  : `Di atas ambang ${angka(ambangSusutPersen, 1)}% — masuk daftar tinjauan operator`}
              </Pil>
            </div>
            <p className="mt-3 text-[12px] text-ink-3">
              Selisih ini muncul dengan sendirinya dari dua penimbangan yang terpisah.
              Tidak ada yang perlu melaporkannya.
            </p>
          </section>
        )}

        {galat && (
          <p className="mt-3 rounded-btn bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {galat}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface p-4 sm:rounded-b-card">
        {hasil ? (
          <Tombol besar className="w-full" onClick={() => router.push("/petugas")}>
            Selesai
          </Tombol>
        ) : (
          <Tombol besar className="w-full" disabled={menimbang} onClick={timbangDanSetor}>
            {menimbang ? "Menimbang muatan…" : "Timbang muatan di titik kumpul"}
          </Tombol>
        )}
      </div>
    </div>
  );
}

function Kepala({ judul, sub }: { judul: string; sub?: string }) {
  return (
    <header className="flex items-center gap-3 bg-brand px-4 py-3.5 text-white sm:rounded-t-card">
      <Link href="/petugas" aria-label="Kembali" className="text-white/80 hover:text-white">
        ←
      </Link>
      <span className="font-medium">{judul}</span>
      {sub && <span className="ml-auto text-[12px] text-white/65">{sub}</span>}
    </header>
  );
}
