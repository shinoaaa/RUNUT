"use client";

import { useState } from "react";
import { ubahPin } from "@/app/w/[token]/actions";

export function SetPinPanel({ token, hasPin }: { token: string; hasPin: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    
    const res = await ubahPin(token, pin);
    if (res.success) {
      setSuccess(true);
      setPin("");
    } else {
      setError(res.message || "Terjadi kesalahan");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4 mt-4">
      <h3 className="text-[14px] font-medium text-ink-1">
        {hasPin ? "Ubah PIN Keamanan" : "Buat PIN Keamanan"}
      </h3>
      <p className="mt-1 text-[12px] text-ink-3">
        {hasPin 
          ? "Ubah PIN 4 digit untuk mengunci dasbor warung Anda." 
          : "Buat PIN 4 digit untuk melindungi halaman ini agar tidak bisa dibuka oleh orang lain yang memindai QR Anda."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 max-w-xs">
        <input
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="rounded border border-line bg-canvas p-2 text-center text-xl tracking-[0.5em] outline-none focus:border-brand"
          placeholder="••••"
          required
        />
        {error && <p className="text-[12px] text-red-500">{error}</p>}
        {success && <p className="text-[12px] text-green-600">PIN berhasil disimpan!</p>}
        
        <button
          type="submit"
          disabled={loading || pin.length !== 4}
          className="rounded bg-brand py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan PIN"}
        </button>
      </form>
    </div>
  );
}
