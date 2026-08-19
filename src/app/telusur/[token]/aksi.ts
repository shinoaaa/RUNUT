"use server";

import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/** Enam huruf hanya berarti kalau tebakannya dibatasi. */
const MAKS_PERCOBAAN = 5;

function samaPersis(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Pengolah mengonfirmasi bahwa lot benar-benar diterimanya.
 *
 * Sampai sebelum ini, penyerahan lot dicatat sepihak: operator mengetik
 * nama penerima dan harga jualnya, lalu selesai. Tidak ada satu pun jejak
 * dari sisi penerima, sehingga lot dapat dinyatakan terserahkan kepada
 * pihak yang tidak pernah menyentuhnya.
 *
 * Kodenya ditulis pada surat serah terima yang dibawa bersama muatannya,
 * dan QR pada surat yang sama membuka halaman ini. Jadi yang dibuktikan
 * adalah **pemegang suratnya**, bukan identitas perusahaannya. Batas itu
 * sama dengan kartu pemilik warung, dan sebaiknya disebut apa adanya
 * ketika ditanya, bukan dibesar-besarkan jadi verifikasi identitas.
 *
 * Tanpa akun, tanpa peran baru, tanpa menu tambahan: pengolah berada di
 * luar batas sistem menurut proposal, dan konfirmasi ini tidak
 * memasukkannya ke dalam. Ia cuma menutup ujung penyerahannya.
 */
export async function konfirmasiTerima(token: string, form: FormData) {
  const kode = String(form.get("kode") ?? "").trim().toUpperCase();

  const lot = await db.lot.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      status: true,
      kodeSerahTerima: true,
      diterimaAt: true,
      percobaanTerima: true,
    },
  });

  if (!lot) return { ok: false as const, pesan: "Lot tidak ditemukan." };

  if (lot.diterimaAt)
    return { ok: true as const, pesan: "Penerimaan lot ini sudah dikonfirmasi sebelumnya." };

  if (lot.status !== "DISERAHKAN" || !lot.kodeSerahTerima)
    return {
      ok: false as const,
      pesan: "Lot ini belum diserahkan, jadi belum ada yang perlu dikonfirmasi.",
    };

  if (lot.percobaanTerima >= MAKS_PERCOBAAN)
    return {
      ok: false as const,
      pesan: "Percobaan sudah habis. Hubungi operator titik kumpul untuk menerbitkan kode baru.",
    };

  if (!/^[A-Z0-9]{6}$/.test(kode))
    return { ok: false as const, pesan: "Kode terdiri dari enam huruf atau angka." };

  if (!samaPersis(lot.kodeSerahTerima, kode)) {
    const { percobaanTerima } = await db.lot.update({
      where: { id: lot.id },
      data: { percobaanTerima: { increment: 1 } },
      select: { percobaanTerima: true },
    });
    const sisa = MAKS_PERCOBAAN - percobaanTerima;
    return {
      ok: false as const,
      pesan:
        sisa > 0
          ? `Kode tidak cocok. Sisa ${sisa} percobaan.`
          : "Kode tidak cocok, dan percobaan sudah habis.",
    };
  }

  await db.lot.update({
    where: { id: lot.id },
    data: { diterimaAt: new Date() },
  });
  revalidatePath(`/telusur/${token}`);

  return { ok: true as const, pesan: "Penerimaan tercatat. Terima kasih." };
}
