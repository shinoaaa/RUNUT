"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hapusLotTerbuka } from "@/app/operator/aksi";
import { Tombol } from "@/components/ui";

export function TombolHapusLot({ lotId, jumlahIsi }: { lotId: number; jumlahIsi: number }) {
  const [bukaModal, setBukaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleHapus = async () => {
    setLoading(true);
    await hapusLotTerbuka(lotId);
    router.push("/operator");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setBukaModal(true)}
        className="mt-3 w-full rounded py-2 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors"
      >
        Hapus lot ini
      </button>

      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-xl">
            <h3 className="text-[18px] font-bold text-danger">Hapus Lot?</h3>
            <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
              {jumlahIsi > 0
                ? `Lot ini berisi ${jumlahIsi} setoran. Jika dihapus, setoran tersebut akan kembali ke daftar "Belum masuk lot" di dasbor utama.`
                : `Anda yakin ingin menghapus lot kosong ini?`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBukaModal(false)}
                className="rounded px-4 py-2 text-[13px] font-medium hover:bg-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleHapus}
                className="rounded bg-danger px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Menghapus..." : "Ya, Hapus Lot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
