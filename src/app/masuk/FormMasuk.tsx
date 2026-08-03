"use client";

import { useActionState } from "react";
import { Tombol } from "@/components/ui";

type Hasil = { galat?: string } | undefined;

export function FormMasuk({
  aksi,
}: {
  aksi: (sebelumnya: unknown, form: FormData) => Promise<Hasil>;
}) {
  const [hasil, kirim, menunggu] = useActionState<Hasil, FormData>(aksi, undefined);

  const kotak =
    "h-10 w-full rounded-input border border-line bg-surface px-3 text-sm";

  return (
    <form action={kirim} className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-[12px] font-medium text-ink-2">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="petugas@runut.id"
          className={kotak}
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-[12px] font-medium text-ink-2">Kata sandi</span>
        <input
          name="sandi"
          type="password"
          autoComplete="current-password"
          className={kotak}
        />
      </label>

      {hasil?.galat && (
        <p className="rounded-btn bg-danger-bg px-3 py-2 text-[13px] text-danger">
          {hasil.galat}
        </p>
      )}

      <Tombol besar type="submit" disabled={menunggu}>
        {menunggu ? "Memeriksa…" : "Masuk"}
      </Tombol>
    </form>
  );
}
