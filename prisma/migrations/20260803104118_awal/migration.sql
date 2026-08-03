-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('PETUGAS', 'OPERATOR', 'PEMDA', 'ADMIN');

-- CreateEnum
CREATE TYPE "SumberData" AS ENUM ('OSM', 'IMPOR_DINAS', 'PETUGAS');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('BELUM', 'DIKUNJUNGI', 'TUTUP_PERMANEN', 'MENOLAK');

-- CreateEnum
CREATE TYPE "KelasSkala" AS ENUM ('KECIL', 'SEDANG', 'BESAR');

-- CreateEnum
CREATE TYPE "JenisKejadian" AS ENUM ('PICKUP', 'TARE', 'DROPOFF', 'STATUS', 'ATTEST');

-- CreateEnum
CREATE TYPE "StatusTrip" AS ENUM ('BERJALAN', 'DISETOR', 'DITINJAU');

-- CreateEnum
CREATE TYPE "StatusLot" AS ENUM ('TERBUKA', 'TERTUTUP', 'DISERAHKAN');

-- CreateEnum
CREATE TYPE "HasilKunjungan" AS ENUM ('SELESAI', 'TUTUP', 'TIDAK_ADA_ORANG', 'MENOLAK');

-- CreateEnum
CREATE TYPE "StatusPermintaan" AS ENUM ('BARU', 'DIJADWALKAN', 'SELESAI', 'BATAL');

-- CreateTable
CREATE TABLE "kecamatan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kodePos" TEXT,
    "jumlahDesa" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warung" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "cuisine" TEXT,
    "alamat" TEXT,
    "desa" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "kecamatanId" INTEGER,
    "qrToken" TEXT NOT NULL,
    "kelasSkala" "KelasSkala" NOT NULL DEFAULT 'KECIL',
    "estimasiLMinggu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumberData" "SumberData" NOT NULL DEFAULT 'OSM',
    "statusVerifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'BELUM',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "osmType" TEXT,
    "osmId" BIGINT,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbaruiAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titik_kumpul" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "kecamatanId" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "titik_kumpul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengguna" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sandiHash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perangkat" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "petugasId" INTEGER,
    "calibRefG" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3),
    "batteryMv" INTEGER,
    "rssiDbm" INTEGER,
    "lastHash" TEXT,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perangkat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faktor_kategori" (
    "kategori" TEXT NOT NULL,
    "intensitasLMinggu" DOUBLE PRECISION NOT NULL,
    "nSampel" INTEGER NOT NULL DEFAULT 0,
    "diperbaruiAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faktor_kategori_pkey" PRIMARY KEY ("kategori")
);

-- CreateTable
CREATE TABLE "harga" (
    "id" SERIAL NOT NULL,
    "berlakuDari" TIMESTAMP(3) NOT NULL,
    "rpPerKg" INTEGER NOT NULL,

    CONSTRAINT "harga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kejadian_alat" (
    "id" SERIAL NOT NULL,
    "perangkatId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "JenisKejadian" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "sig" TEXT NOT NULL,
    "terverifikasi" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,

    CONSTRAINT "kejadian_alat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" SERIAL NOT NULL,
    "petugasId" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "status" "StatusTrip" NOT NULL DEFAULT 'BERJALAN',
    "titikKumpulId" INTEGER,
    "totalGWarung" INTEGER NOT NULL DEFAULT 0,
    "totalGTitikKumpul" INTEGER,
    "susutG" INTEGER,
    "susutPersen" DOUBLE PRECISION,
    "dropoffEventId" INTEGER,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penjemputan" (
    "id" SERIAL NOT NULL,
    "warungId" INTEGER NOT NULL,
    "petugasId" INTEGER NOT NULL,
    "perangkatId" INTEGER,
    "kejadianAlatId" INTEGER NOT NULL,
    "tripId" INTEGER,
    "beratBersihG" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "gpsAkurasiM" DOUBLE PRECISION,
    "jarakDariWarungM" DOUBLE PRECISION,
    "gpsOk" BOOLEAN NOT NULL DEFAULT false,
    "qrOk" BOOLEAN NOT NULL DEFAULT false,
    "konfirmasiOk" BOOLEAN NOT NULL DEFAULT false,
    "hargaPerKg" INTEGER NOT NULL,
    "nilaiRp" INTEGER NOT NULL,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "penjemputan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kunjungan" (
    "id" SERIAL NOT NULL,
    "warungId" INTEGER NOT NULL,
    "tripId" INTEGER,
    "petugasId" INTEGER NOT NULL,
    "hasil" "HasilKunjungan" NOT NULL,
    "catatan" TEXT,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kunjungan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "titikKumpulId" INTEGER NOT NULL,
    "beratG" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLot" NOT NULL DEFAULT 'TERBUKA',
    "qrToken" TEXT NOT NULL,
    "offtaker" TEXT,
    "hargaJual" INTEGER,
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ditutupAt" TIMESTAMP(3),
    "diserahkanAt" TIMESTAMP(3),

    CONSTRAINT "lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_trip" (
    "lotId" INTEGER NOT NULL,
    "tripId" INTEGER NOT NULL,

    CONSTRAINT "lot_trip_pkey" PRIMARY KEY ("lotId","tripId")
);

-- CreateTable
CREATE TABLE "permintaan_jemput" (
    "id" SERIAL NOT NULL,
    "warungId" INTEGER NOT NULL,
    "status" "StatusPermintaan" NOT NULL DEFAULT 'BARU',
    "dibuatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permintaan_jemput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kecamatan_nama_key" ON "kecamatan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "warung_qrToken_key" ON "warung"("qrToken");

-- CreateIndex
CREATE INDEX "warung_kecamatanId_idx" ON "warung"("kecamatanId");

-- CreateIndex
CREATE INDEX "warung_statusVerifikasi_idx" ON "warung"("statusVerifikasi");

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_email_key" ON "pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_deviceId_key" ON "perangkat"("deviceId");

-- CreateIndex
CREATE INDEX "harga_berlakuDari_idx" ON "harga"("berlakuDari");

-- CreateIndex
CREATE UNIQUE INDEX "kejadian_alat_eventId_key" ON "kejadian_alat"("eventId");

-- CreateIndex
CREATE INDEX "kejadian_alat_type_idx" ON "kejadian_alat"("type");

-- CreateIndex
CREATE INDEX "kejadian_alat_receivedAt_idx" ON "kejadian_alat"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "kejadian_alat_perangkatId_seq_key" ON "kejadian_alat"("perangkatId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "trip_dropoffEventId_key" ON "trip"("dropoffEventId");

-- CreateIndex
CREATE INDEX "trip_petugasId_tanggal_idx" ON "trip"("petugasId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "penjemputan_kejadianAlatId_key" ON "penjemputan"("kejadianAlatId");

-- CreateIndex
CREATE INDEX "penjemputan_warungId_idx" ON "penjemputan"("warungId");

-- CreateIndex
CREATE INDEX "penjemputan_tripId_idx" ON "penjemputan"("tripId");

-- CreateIndex
CREATE INDEX "penjemputan_dibuatAt_idx" ON "penjemputan"("dibuatAt");

-- CreateIndex
CREATE INDEX "kunjungan_warungId_idx" ON "kunjungan"("warungId");

-- CreateIndex
CREATE UNIQUE INDEX "lot_kode_key" ON "lot"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "lot_qrToken_key" ON "lot"("qrToken");

-- CreateIndex
CREATE INDEX "permintaan_jemput_status_idx" ON "permintaan_jemput"("status");

-- AddForeignKey
ALTER TABLE "warung" ADD CONSTRAINT "warung_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titik_kumpul" ADD CONSTRAINT "titik_kumpul_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kejadian_alat" ADD CONSTRAINT "kejadian_alat_perangkatId_fkey" FOREIGN KEY ("perangkatId") REFERENCES "perangkat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_titikKumpulId_fkey" FOREIGN KEY ("titikKumpulId") REFERENCES "titik_kumpul"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_dropoffEventId_fkey" FOREIGN KEY ("dropoffEventId") REFERENCES "kejadian_alat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjemputan" ADD CONSTRAINT "penjemputan_warungId_fkey" FOREIGN KEY ("warungId") REFERENCES "warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjemputan" ADD CONSTRAINT "penjemputan_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjemputan" ADD CONSTRAINT "penjemputan_perangkatId_fkey" FOREIGN KEY ("perangkatId") REFERENCES "perangkat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjemputan" ADD CONSTRAINT "penjemputan_kejadianAlatId_fkey" FOREIGN KEY ("kejadianAlatId") REFERENCES "kejadian_alat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjemputan" ADD CONSTRAINT "penjemputan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_warungId_fkey" FOREIGN KEY ("warungId") REFERENCES "warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kunjungan" ADD CONSTRAINT "kunjungan_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_titikKumpulId_fkey" FOREIGN KEY ("titikKumpulId") REFERENCES "titik_kumpul"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_trip" ADD CONSTRAINT "lot_trip_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_trip" ADD CONSTRAINT "lot_trip_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_jemput" ADD CONSTRAINT "permintaan_jemput_warungId_fkey" FOREIGN KEY ("warungId") REFERENCES "warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
