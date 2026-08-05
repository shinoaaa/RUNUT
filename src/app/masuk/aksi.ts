"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { coba, db } from "@/lib/db";
import { BERANDA_PERAN, Peran, hapusSesi, pasangSesi, penggunaDemo } from "@/lib/sesi";

export async function masuk(_sebelumnya: unknown, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const sandi = String(form.get("sandi") ?? "");

  if (!email || !sandi) return { galat: "Email dan kata sandi harus diisi." };

  const p = await coba(() => db.pengguna.findUnique({ where: { email } }));
  if (!p || !p.aktif) return { galat: "Akun tidak ditemukan." };

  const cocok = await bcrypt.compare(sandi, p.sandiHash);
  if (!cocok) return { galat: "Kata sandi salah." };

  await pasangSesi({ id: p.id, nama: p.nama, peran: p.peran as Peran });
  redirect(BERANDA_PERAN[p.peran as Peran]);
}

/** Tombol masuk cepat — disediakan supaya juri tidak perlu mengetik. */
export async function masukCepat(peran: Peran) {
  const p = await penggunaDemo(peran);
  if (!p) return;
  await pasangSesi({ id: p.id, nama: p.nama, peran });
  redirect(BERANDA_PERAN[peran]);
}

export async function keluar() {
  await hapusSesi();
  redirect("/masuk");
}
