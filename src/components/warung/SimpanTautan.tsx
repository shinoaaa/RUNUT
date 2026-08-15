"use client";

import { useState } from "react";

/**
 * Jalan masuk kedua ke halaman pemilik warung.
 *
 * Kartu QR adalah pintu masuk PERTAMA, bukan satu-satunya. Kartunya
 * benda fisik yang biasanya tertinggal di warung, sedangkan pemiliknya
 * belum tentu di sana — bisa sedang di pasar, di cabang lain, atau
 * sedang tidak bisa pulang. Kalau satu-satunya cara masuk adalah
 * memindai kartu itu, konfirmasi pemilik jadi mustahil justru pada saat
 * ia paling dibutuhkan.
 *
 * Maka alamat halaman ini ditampilkan terang-terangan supaya dapat
 * disimpan. Sekali tersimpan, pemilik membukanya dari mana saja, dan
 * bobot yang ia setujui tetap datang langsung dari timbangan — bukan
 * dari ucapan petugas.
 */
export function SimpanTautan({ alamat }: { alamat: string }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(alamat);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      // Papan tempel ditolak sebagian peramban lama. Alamatnya tetap
      // tampil utuh di atas tombol, jadi masih bisa disalin manual.
      setTersalin(false);
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <p className="text-[13px] font-medium">Buka halaman ini dari mana saja</p>
      <p className="mt-1 text-[12px] leading-snug text-ink-3">
        Kartu QR cuma pintu masuk pertama. Simpan alamatnya sekali, lalu Anda
        tidak perlu memindai kartu lagi — termasuk saat sedang tidak di warung.
      </p>

      <p className="gulir-x mt-3 rounded-btn border border-line bg-canvas px-3 py-2 font-mono text-[11px] text-ink-2">
        {alamat}
      </p>

      <button
        type="button"
        onClick={salin}
        className="mt-2 h-10 w-full rounded-btn bg-brand text-[13px] font-medium text-white hover:opacity-90"
      >
        {tersalin ? "Tersalin ✓" : "Salin tautan"}
      </button>

      <p className="mt-2.5 text-[12px] leading-snug text-ink-3">
        Agar tinggal sekali ketuk, simpan sebagai pintasan: di Chrome tekan ⋮ lalu{" "}
        <b>Tambahkan ke layar Utama</b>, di Safari tekan tombol Bagikan lalu{" "}
        <b>Add to Home Screen</b>. Ikonnya muncul di layar depan seperti aplikasi,
        tanpa memasang apa pun.
      </p>

      {/*
        Peringatan ini bukan basa-basi hukum. Tautan ini SATU-SATUNYA
        kunci halaman: tidak ada sandi di belakangnya, jadi siapa pun
        yang memegangnya melihat seluruh riwayat dan pendapatan warung —
        dan dapat membaca kode konfirmasi yang sedang berjalan.
      */}
      <p className="mt-3 rounded-btn bg-warn-bg px-3 py-2 text-[12px] leading-snug text-warn">
        Tautan ini adalah kuncinya. Tidak ada sandi di belakangnya, jadi siapa pun
        yang memegangnya bisa melihat pendapatan warung Anda dan membaca kode
        konfirmasi saat penjemputan berlangsung. Kirim ke nomor Anda sendiri,
        jangan disebar.
      </p>
    </section>
  );
}
