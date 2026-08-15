-- Alasan di balik penjemputan tanpa kode pemilik.
--
-- Sebelumnya "tanpa konfirmasi" adalah keadaan buntu: tercatat, tetapi
-- tidak ada yang bisa menilai apakah alasannya masuk akal. Alasan ini
-- ikut ditandatangani alat dan terbaca pemilik warung di halamannya
-- sendiri, sehingga alasan yang mengada-ada dapat ia bantah.
--
-- Hanya menambah. Kolomnya nullable, jadi 443 penjemputan lama tetap sah
-- tanpa perlu diisi mundur.

-- CreateEnum
CREATE TYPE "AlasanTanpaKode" AS ENUM (
  'TIDAK_PUNYA_PONSEL',
  'PONSEL_TIDAK_SIAP',
  'KARTU_HILANG',
  'DIWAKILKAN_KARYAWAN',
  'LAINNYA'
);

-- AlterTable
ALTER TABLE "penjemputan" ADD COLUMN "alasanTanpaKode" "AlasanTanpaKode";
ALTER TABLE "penjemputan" ADD COLUMN "catatanTanpaKode" TEXT;
