"use client";

import { useState } from "react";
import { cekPin } from "@/app/w/[token]/actions";
import { useRouter } from "next/navigation";

export function PinGate({ token }: { token: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const res = await cekPin(token, pin);
    if (res.success) {
      router.refresh(); // This will reload the page and now the cookie is set, bypassing the gate
    } else {
      setError(res.message || "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-5">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-center text-[20px] font-bold">Masukkan PIN</h2>
        <p className="mt-2 text-center text-[13px] text-ink-3">
          Halaman ini dilindungi PIN. Masukkan PIN 4 digit Anda untuk melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="rounded border border-line bg-canvas p-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-brand"
            placeholder="••••"
            required
          />
          {error && <p className="text-center text-[13px] text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="rounded bg-brand py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Memeriksa..." : "Buka"}
          </button>
        </form>
      </div>
    </div>
  );
}
