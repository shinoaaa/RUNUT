-- Konfirmasi pemilik warung — TAHAP SATU (hanya menambah).
--
-- Tidak ada kolom yang dibuang di sini. Basis data ini dipakai bersama
-- versi yang sudah tayang di Vercel, dan versi itu masih membaca
-- "konfirmasiOk". Membuangnya sekarang akan merusak situs yang sedang
-- hidup sampai versi barunya naik. Pembuangannya dikerjakan migrasi
-- tahap dua, setelah deploy.

-- CreateEnum
CREATE TYPE "CaraKonfirmasi" AS ENUM ('KODE_PEMILIK', 'TANPA_KODE');

-- AlterTable
ALTER TABLE "penjemputan"
  ADD COLUMN "caraKonfirmasi" "CaraKonfirmasi" NOT NULL DEFAULT 'TANPA_KODE';

-- Pindahkan isi kolom lama supaya angka dasbor tidak bergeser.
-- Penjemputan lama yang tercatat terkonfirmasi tetap terhitung
-- terkonfirmasi; sisanya jatuh ke bawaan TANPA_KODE.
UPDATE "penjemputan" SET "caraKonfirmasi" = 'KODE_PEMILIK' WHERE "konfirmasiOk" = true;

-- CreateTable
CREATE TABLE "sesi_konfirmasi" (
    "id" SERIAL NOT NULL,
    "warungId" INTEGER NOT NULL,
    "petugasId" INTEGER NOT NULL,
    "kode" TEXT NOT NULL,
    "beratBersihG" INTEGER NOT NULL,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kedaluwarsaAt" TIMESTAMP(3) NOT NULL,
    "dipakaiAt" TIMESTAMP(3),

    CONSTRAINT "sesi_konfirmasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sesi_konfirmasi_warungId_dipakaiAt_idx" ON "sesi_konfirmasi"("warungId", "dipakaiAt");

-- AddForeignKey
ALTER TABLE "sesi_konfirmasi" ADD CONSTRAINT "sesi_konfirmasi_warungId_fkey"
  FOREIGN KEY ("warungId") REFERENCES "warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi_konfirmasi" ADD CONSTRAINT "sesi_konfirmasi_petugasId_fkey"
  FOREIGN KEY ("petugasId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
