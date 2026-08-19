"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hapusLotKosong } from "@/app/operator/aksi";

export function TombolKembaliLot({ href, isKosong, lotId }: { href: string; isKosong: boolean; lotId: number }) {
  const [bukaModal, setBukaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isKosong) {
      setBukaModal(true);
    } else {
      router.push(href);
    }
  };

  const handleHapus = async () => {
    setLoading(true);
    await hapusLotKosong(lotId);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 12.5L5.5 8 10 3.5" />
        </svg>
        Titik Kumpul
      </button>

      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-xl">
            <h3 className="text-[18px] font-bold">Lot Belum Terisi</h3>
            <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
              Anda belum memasukkan setoran apa pun ke dalam lot ini. Apakah Anda ingin menghapusnya agar tidak menumpuk di daftar?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setBukaModal(false);
                  router.push(href);
                }}
                className="rounded px-4 py-2 text-[13px] font-medium hover:bg-canvas"
              >
                Biarkan Kosong
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleHapus}
                className="rounded bg-danger px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Menghapus..." : "Hapus Lot Ini"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
