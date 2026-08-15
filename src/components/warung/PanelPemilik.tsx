"use client";

import { useEffect, useState, useTransition } from "react";
import { Tombol } from "@/components/ui";
import { kg, liter } from "@/lib/format";
import { mintaDijemput } from "@/app/w/[token]/aksi";

interface Sesi {
  kode: string;
  beratBersihG: number;
  kedaluwarsaAt: string;
}

/**
 * Bagian halaman pemilik warung yang harus hidup.
 *
 * Kode konfirmasi muncul dengan sendirinya ketika petugas mulai
 * menimbang. Pemilik tidak menekan apa pun dan tidak memuat ulang apa
 * pun — di lapangan ia sedang berdiri di samping petugas, bukan sedang
 * menunggui layar.
 *
 * Selang empat detik dipilih supaya kodenya terasa muncul seketika
 * tanpa membebani basis data yang tidur di paket gratis.
 */
export function PanelPemilik({
  token,
  adaPermintaan,
}: {
  token: string;
  adaPermintaan: boolean;
}) {
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const [sudahMinta, setSudahMinta] = useState(adaPermintaan);

  useEffect(() => {
    let hidup = true;

    async function periksa() {
      try {
        const r = await fetch(`/api/warung/${token}/status`, { cache: "no-store" });
        const j = await r.json();
        if (hidup) setSesi(j?.ok ? (j.sesi as Sesi | null) : null);
      } catch {
        // Sinyal di warung bisa naik-turun. Diamkan saja dan coba lagi
        // pada putaran berikutnya; menampilkan galat hanya membuat
        // pemiliknya cemas atas sesuatu yang pulih sendiri.
      }
    }

    void periksa();
    const jam = setInterval(periksa, 4000);
    return () => {
      hidup = false;
      clearInterval(jam);
    };
  }, [token]);

  return (
    <>
      {/* kode konfirmasi */}
      {sesi ? (
        <section className="rounded-card border-2 border-accent bg-accent-soft p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Petugas sedang menimbang
          </p>
          <p className="tabular mt-2 text-[17px] font-semibold text-ink">
            {liter(sesi.beratBersihG)} liter
            <span className="ml-2 text-[13px] font-normal text-ink-2">
              {kg(sesi.beratBersihG)} kg terukur alat
            </span>
          </p>
          <p className="tabular mt-4 text-[46px] font-bold leading-none tracking-[0.18em] text-brand">
            {sesi.kode}
          </p>
          <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-ink-2">
            Sebutkan kode ini kepada petugas bila Anda setuju dengan bobot di atas.
            Kode berlaku untuk penimbangan ini saja.
          </p>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-surface p-5 text-center">
          <p className="text-[13px] text-ink-2">Tidak ada penjemputan yang sedang berlangsung.</p>
          <p className="mt-1 text-[12px] text-ink-3">
            Kode konfirmasi akan muncul sendiri di halaman ini ketika petugas
            mulai menimbang di warung Anda.
          </p>
        </section>
      )}

      {/* minta dijemput */}
      <section className="rounded-card border border-line bg-surface p-4">
        <p className="text-[13px] font-medium">Jelantah sudah penuh?</p>
        <p className="mt-1 text-[12px] text-ink-3">
          Permintaan Anda menaikkan urutan warung ini pada rute petugas.
        </p>

        {sudahMinta ? (
          <p className="mt-3 rounded-btn bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
            Permintaan tercatat dan sedang menunggu dijadwalkan.
          </p>
        ) : (
          <Tombol
            className="mt-3 w-full"
            disabled={menunggu}
            onClick={() =>
              mulai(async () => {
                const h = await mintaDijemput(token);
                setPesan(h.pesan);
                if (h.ok) setSudahMinta(true);
              })
            }
          >
            {menunggu ? "Mengirim…" : "Minta dijemput"}
          </Tombol>
        )}

        {pesan && !sudahMinta && <p className="mt-2 text-[12px] text-ink-2">{pesan}</p>}
      </section>
    </>
  );
}
