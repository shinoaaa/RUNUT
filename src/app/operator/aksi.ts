"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sesiSekarang } from "@/lib/sesi";

/** Kode lot: BKS-2026-0001, urut per tahun. */
async function kodeLotBerikutnya() {
  const tahun = new Date().getFullYear();
  const jumlah = await db.lot.count({ where: { kode: { startsWith: `BKS-${tahun}-` } } });
  return `BKS-${tahun}-${String(jumlah + 1).padStart(4, "0")}`;
}

export async function buatLot(titikKumpulId: number) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  const lot = await db.lot.create({
    data: {
      kode: await kodeLotBerikutnya(),
      titikKumpulId,
      qrToken: randomBytes(9).toString("base64url"),
    },
  });
  redirect(`/operator/lot/${lot.id}`);
}

export async function ubahIsiLot(lotId: number, tripId: number, masuk: boolean) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  if (masuk)
    await db.lotTrip.upsert({
      where: { lotId_tripId: { lotId, tripId } },
      create: { lotId, tripId },
      update: {},
    });
  else await db.lotTrip.deleteMany({ where: { lotId, tripId } });

  await hitungUlangBerat(lotId);
  revalidatePath(`/operator/lot/${lotId}`);
}

async function hitungUlangBerat(lotId: number) {
  const isi = await db.lotTrip.findMany({
    where: { lotId },
    select: { trip: { select: { totalGTitikKumpul: true, totalGWarung: true } } },
  });
  const beratG = isi.reduce(
    (a, b) => a + (b.trip.totalGTitikKumpul ?? b.trip.totalGWarung),
    0,
  );
  await db.lot.update({ where: { id: lotId }, data: { beratG } });
}

export async function tutupLot(lotId: number) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  await hitungUlangBerat(lotId);
  await db.lot.update({
    where: { id: lotId },
    data: { status: "TERTUTUP", ditutupAt: new Date() },
  });
  revalidatePath(`/operator/lot/${lotId}`);
}

export async function serahkanLot(lotId: number, form: FormData) {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  const offtaker = String(form.get("offtaker") ?? "").trim();
  const hargaJual = Number(form.get("hargaJual") ?? 0);

  await db.lot.update({
    where: { id: lotId },
    data: {
      status: "DISERAHKAN",
      diserahkanAt: new Date(),
      offtaker: offtaker || null,
      hargaJual: hargaJual || null,
    },
  });
  revalidatePath(`/operator/lot/${lotId}`);
}
