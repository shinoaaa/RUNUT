-- Token pemilik dipisahkan dari token stiker tembok.
--
-- Sebelum ini keduanya satu benda. Petugas memindai stiker tembok tiap
-- kali menjemput, jadi ia otomatis memegang token setiap warung yang
-- pernah ia datangi — dan token itu juga kunci halaman pemilik. Artinya
-- petugas dapat membuka halaman pemilik di ponselnya sendiri, membaca
-- kode konfirmasinya, lalu mengetiknya tanpa pemiliknya terlibat sama
-- sekali. Seluruh gunanya kode itu hilang.
--
-- Nilai awal dibangkitkan di sini supaya kolomnya bisa langsung NOT NULL
-- tanpa perlu skrip pengisi terpisah. `gen_random_uuid()` ada di inti
-- PostgreSQL 13+, jadi tidak menuntut ekstensi tambahan.

-- AlterTable
ALTER TABLE "warung" ADD COLUMN "tokenPemilik" TEXT;

UPDATE "warung"
SET "tokenPemilik" = 'p_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

ALTER TABLE "warung" ALTER COLUMN "tokenPemilik" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "warung_tokenPemilik_key" ON "warung"("tokenPemilik");
