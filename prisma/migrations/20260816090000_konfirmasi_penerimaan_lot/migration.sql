-- Konfirmasi penerimaan lot oleh pengolah.
--
-- Penyerahan lot selama ini dicatat sepihak oleh operator: nama penerima
-- dan harga jualnya diketik sendiri, tanpa pihak penerima pernah
-- menyentuh apa pun. Kode serah terima menutup ujung itu, sebagaimana
-- kode konfirmasi menutup ujung warung.
--
-- Hanya menambah. Ketiga kolomnya nullable atau berbawaan, jadi lot yang
-- sudah ada tetap sah tanpa perlu diisi mundur, dan versi yang sedang
-- tayang tidak rusak sebelum versi baru naik.

-- AlterTable
ALTER TABLE "lot" ADD COLUMN "kodeSerahTerima" TEXT;
ALTER TABLE "lot" ADD COLUMN "diterimaAt" TIMESTAMP(3);
ALTER TABLE "lot" ADD COLUMN "percobaanTerima" INTEGER NOT NULL DEFAULT 0;
