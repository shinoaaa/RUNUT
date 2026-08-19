"use server";

import { randomBytes, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pastikanKemampuan } from "@/lib/sesi";

/** Kode lot: BKS-2026-0001, urut per tahun. */
async function kodeLotBerikutnya() {
  const tahun = new Date().getFullYear();
  const jumlah = await db.lot.count({ where: { kode: { startsWith: `BKS-${tahun}-` } } });
  return `BKS-${tahun}-${String(jumlah + 1).padStart(4, "0")}`;
}

/*
 * Keempat aksi di bawah memeriksa KEMAMPUAN, bukan sekadar "sudah login".
 * Sebelumnya semuanya hanya memastikan ada sesi, sehingga petugas pun bisa
 * menutup dan menyerahkan lot dengan memanggil aksinya langsung —
 * halamannya dijaga, tapi aksinya adalah alamat HTTP tersendiri.
 */

export async function buatLot(titikKumpulId: number) {
  await pastikanKemampuan("lot:kelola");

  // Cari setoran (trip) yang belum masuk lot manapun di titik kumpul ini
  const tripMenunggu = await db.trip.findMany({
    where: { 
      status: "DISETOR",
      titikKumpulId,
      lotTrip: { none: {} }
    },
    select: { id: true, totalGTitikKumpul: true, totalGWarung: true }
  });

  const beratG = tripMenunggu.reduce((a, b) => a + (b.totalGTitikKumpul ?? b.totalGWarung), 0);

  const lot = await db.lot.create({
    data: {
      kode: await kodeLotBerikutnya(),
      titikKumpulId,
      beratG,
      qrToken: randomBytes(9).toString("base64url"),
      trip: {
        create: tripMenunggu.map(t => ({ tripId: t.id }))
      }
    },
  });
  redirect(`/operator/lot/${lot.id}`);
}

export async function ubahIsiLot(lotId: number, tripId: number, masuk: boolean) {
  await pastikanKemampuan("lot:kelola");

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
  await pastikanKemampuan("lot:kelola");

  await hitungUlangBerat(lotId);
  await db.lot.update({
    where: { id: lotId },
    data: { status: "TERTUTUP", ditutupAt: new Date() },
  });
  revalidatePath(`/operator/lot/${lotId}`);
}

export async function serahkanLot(lotId: number, form: FormData) {
  await pastikanKemampuan("lot:kelola");

  const offtaker = String(form.get("offtaker") ?? "").trim();
  const hargaJual = Number(form.get("hargaJual") ?? 0);

  await db.lot.update({
    where: { id: lotId },
    data: {
      status: "DISERAHKAN",
      diserahkanAt: new Date(),
      offtaker: offtaker || null,
      hargaJual: hargaJual || null,
      // Kode serah terima diterbitkan di sini, bukan saat lot ditutup,
      // sebab yang perlu dibuktikan penerimaannya — dan penerimaan baru
      // ada setelah muatannya benar-benar diserahkan.
      kodeSerahTerima: kodeSerahTerimaBaru(),
      percobaanTerima: 0,
      diterimaAt: null,
    },
  });
  revalidatePath(`/operator/lot/${lotId}`);
}

/**
 * Enam huruf dari abjad yang sudah dibuang huruf-huruf bermakna ganda.
 *
 * Kode ini dibacakan orang dari selembar surat, sering di gudang yang
 * penerangannya seadanya. Huruf I, O, dan angka 1 serta 0 dibuang karena
 * paling sering tertukar saat dibaca ulang, dan satu huruf salah berarti
 * penerimaan yang sah ditolak sistem.
 */
function kodeSerahTerimaBaru() {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let kode = "";
  for (let i = 0; i < 6; i++) kode += abjad[randomInt(abjad.length)];
  return kode;
}
