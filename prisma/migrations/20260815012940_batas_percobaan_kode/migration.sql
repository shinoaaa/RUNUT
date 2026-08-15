-- Batas percobaan pada kode konfirmasi.
--
-- Empat angka hanya berarti kalau tebakannya dibatasi. Tanpa penghitung
-- ini, sepuluh ribu kemungkinan bisa dicoba habis oleh mesin, dan pihak
-- yang paling mudah melakukannya adalah petugas yang sedang diperiksa.

-- AlterTable
ALTER TABLE "sesi_konfirmasi" ADD COLUMN "percobaan" INTEGER NOT NULL DEFAULT 0;
