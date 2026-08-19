"use client";

import { Tombol } from "@/components/ui";

export function TombolBuatLot() {
  return (
    <Tombol
      type="submit"
      onClick={(e) => {
        if (!confirm("Apakah Anda yakin ingin membuat LOT baru? Tindakan ini akan mengumpulkan setoran yang belum masuk.")) {
          e.preventDefault();
        }
      }}
    >
      Buat lot baru
    </Tombol>
  );
}
