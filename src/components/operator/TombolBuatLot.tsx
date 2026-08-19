"use client";

import { useState } from "react";
import { Tombol } from "@/components/ui";

export function TombolBuatLot({ jumlahKosong }: { jumlahKosong: number }) {
  const [bukaModal, setBukaModal] = useState(false);

  return (
    <>
      <Tombol
        type={jumlahKosong > 0 ? "submit" : "button"}
        onClick={(e) => {
          if (jumlahKosong === 0) {
            e.preventDefault();
            setBukaModal(true);
          }
        }}
      >
        Buat lot baru
      </Tombol>

      {bukaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-xl">
            <h3 className="text-[18px] font-bold">Stok Sedang Kosong</h3>
            <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
              Saat ini tidak ada setoran minyak yang menunggu. Apakah Anda yakin ingin membuat LOT yang kosong?
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
                type="submit"
                onClick={() => setBukaModal(false)}
                className="rounded bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Ya, Buat Kosong
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
