"use client";

import { useState, useTransition } from "react";
import { Tombol } from "@/components/ui";
import { konfirmasiTerima } from "@/app/telusur/[token]/aksi";
import { tanggalJam } from "@/lib/format";

/**
 * Kotak konfirmasi penerimaan lot di halaman telusur publik.
 *
 * Ditaruh di halaman yang memang sudah dibuka pengolah untuk memeriksa
 * asal-usul muatannya, sehingga tidak ada langkah tambahan: ia sudah di
 * sana, tinggal mengetik kode dari suratnya.
 */
export function KonfirmasiTerima({
  token,
  diterimaAt,
  bisaDikonfirmasi,
}: {
  token: string;
  diterimaAt: Date | null;
  bisaDikonfirmasi: boolean;
}) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(Boolean(diterimaAt));
  const [menunggu, mulai] = useTransition();

  if (selesai)
    return (
      <section className="rounded-card border border-accent bg-accent-soft p-5">
        <p className="text-[13px] font-semibold text-brand">Penerimaan dikonfirmasi</p>
        <p className="mt-1 text-[13px] text-ink-2">
          {diterimaAt
            ? `Pengolah mengonfirmasi penerimaan lot ini pada ${tanggalJam(diterimaAt)}.`
            : "Penerimaan lot ini sudah tercatat."}
        </p>
      </section>
    );

  if (!bisaDikonfirmasi) return null;

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <p className="text-[15px] font-semibold">Konfirmasi penerimaan</p>
      <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-ink-2">
        Untuk pengolah yang menerima muatan ini. Masukkan kode enam huruf yang
        tertulis pada surat serah terima, dan penerimaannya tercatat pada berkas
        asal-usul lot ini.
      </p>

      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        action={(fd) =>
          mulai(async () => {
            const h = await konfirmasiTerima(token, fd);
            setPesan(h.pesan);
            if (h.ok) setSelesai(true);
          })
        }
      >
        <input
          name="kode"
          maxLength={6}
          autoComplete="off"
          placeholder="ABC123"
          aria-label="Kode serah terima"
          className="tabular h-11 w-40 rounded-input border border-line bg-surface text-center font-mono text-[18px] uppercase tracking-[0.25em]"
        />
        <Tombol type="submit" disabled={menunggu}>
          {menunggu ? "Memeriksa…" : "Konfirmasi"}
        </Tombol>
      </form>

      {pesan && <p className="mt-2 text-[13px] text-ink-2">{pesan}</p>}

      <p className="mt-3 text-[11px] leading-snug text-ink-3">
        Kode ini membuktikan pemegang surat serah terima, bukan identitas
        perusahaan penerimanya.
      </p>
    </section>
  );
}
