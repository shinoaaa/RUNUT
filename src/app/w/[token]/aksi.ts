"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Permintaan jemput dari pemilik warung.
 *
 * Tidak menuntut akun. Yang menggantikannya adalah token pada kartu QR:
 * kartu itu dicetak untuk satu warung, diserahkan kepada pemiliknya, dan
 * sengaja tidak ditempel di dinding — stiker yang ditempel memuat token
 * telanjang tanpa alamat, sehingga tidak membuka apa pun bila dipindai
 * orang lewat.
 *
 * Sampai sekarang tabel `permintaan_jemput` hanya pernah DIBACA. Penyusun
 * rute sudah menaikkan prioritas warung yang meminta dua kali lipat, dan
 * layar petugas sudah punya saringan "Diminta" — tetapi tidak ada satu
 * pun jalan untuk mengisinya, sehingga saringan itu selamanya nol.
 * Fungsi inilah jalan yang hilang itu.
 */
export async function mintaDijemput(token: string) {
  const warung = await db.warung.findUnique({
    where: { tokenPemilik: token },
    select: { id: true, aktif: true },
  });
  if (!warung?.aktif) return { ok: false as const, pesan: "Warung tidak ditemukan." };

  // Satu permintaan terbuka per warung. Menekan tombolnya sepuluh kali
  // tidak membuat warung ini dijemput sepuluh kali lebih dulu, dan
  // pemilik yang ragu tidak perlu takut merusak antrean.
  const sudahAda = await db.permintaanJemput.findFirst({
    where: { warungId: warung.id, status: "BARU" },
  });
  if (sudahAda)
    return { ok: true as const, pesan: "Permintaan Anda sudah tercatat dan sedang menunggu." };

  await db.permintaanJemput.create({ data: { warungId: warung.id } });
  revalidatePath(`/w/${token}`);
  return { ok: true as const, pesan: "Permintaan terkirim. Petugas akan menjadwalkan penjemputan." };
}
