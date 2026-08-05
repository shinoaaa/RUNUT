# RUNUT

Sistem penjemputan dan ketertelusuran minyak jelantah UMKM kuliner.

Karya Tim **Nyawit Softskill** — Politeknik Astra, D4 Teknologi Rekayasa Perangkat Lunak — untuk Software Development Competition, IT Festival 2026, subtema Green Economy. Wilayah studi kasus: Kabupaten Bekasi.

## Gagasannya

Indonesia menghasilkan sekitar tiga juta ton jelantah per tahun dan hanya seperlimanya termanfaatkan. Program yang ada menuntut warung **membawa** jelantahnya ke titik setor, dan segmen UMKM kuliner praktis tidak terlayani. RUNUT membalik arahnya: warung dipetakan, sistem menaksir volumenya, menyusun rute harian, lalu petugas **menjemput** dan menimbang di tempat memakai timbangan ber-sensor.

Seluruh rancangan bertumpu pada satu prinsip:

> Pengukuran diletakkan pada jalur fisik material, bukan pada laporan orang.

Turunannya: layar penimbangan **tidak punya kolom isian bobot** — angka hanya bisa datang dari alat. GPS membuktikan petugas ada di lokasi, QR memastikan tercatat ke warung yang benar, dan selisih timbang warung terhadap titik kumpul dihitung otomatis.

## Mencoba tanpa memasang apa pun

Buka tautan hosting, lalu tekan salah satu dari empat tombol masuk cepat di `/masuk`. Tidak perlu mengetik.

| Akun | Kata sandi | Melihat |
|---|---|---|
| `petugas@runut.id` | `demo1234` | Rute harian, layar timbang, setor |
| `operator@runut.id` | `demo1234` | Stok titik kumpul, penyusunan lot |
| `pemda@runut.id` | `demo1234` | Dasbor wilayah, registri, skenario |
| `admin@runut.id` | `demo1234` | Semuanya, termasuk simulator |

Halaman `/dashboard` juga terbuka **tanpa akun** dalam mode baca-saja berisi angka tingkat wilayah. Halaman telusur lot `/telusur/[token]` terbuka untuk siapa pun tanpa akun — itu memang rancangannya.

> **Catatan penjurian.** Basis datanya memakai Neon paket gratis yang tertidur setelah nganggur. Permintaan pertama bisa terasa lambat beberapa detik. Aplikasinya sudah mengulang sendiri kueri yang gagal karena hal ini, tapi membuka berandanya sekali sebelum penilaian tetap membuat semuanya terasa lebih cepat.

## Menjalankan sendiri

Butuh **Node 20.9 atau lebih baru** dan satu basis data PostgreSQL.

```bash
npm install
cp .env.example .env.local   # lalu isi DATABASE_URL dan AUTH_SECRET
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

`npm install` otomatis menjalankan `prisma generate`.

Data awalnya berisi 226 warung dan 23 kecamatan Kabupaten Bekasi yang diambil dari OpenStreetMap dan batas wilayah BIG. Untuk mengisi riwayat penjemputan contoh (butuh dev server hidup, sekitar sepuluh menit):

```bash
npx tsx scripts/isi-demo.ts
```

### Variabel lingkungan

| Nama | Keterangan |
|---|---|
| `DATABASE_URL` | Sambungan PostgreSQL. Contoh Neon ada di `.env.example` |
| `AUTH_SECRET` | Kunci penanda tangan cookie sesi. **Wajib diisi di produksi** — tanpa itu dipakai nilai cadangan yang tidak rahasia |

### Skrip lain

```
npx tsx scripts/uji-ingest.ts             7 uji rantai bukti
npx tsx scripts/rapikan-trip.ts           susun ulang trip per petugas per hari
npx tsx scripts/buat-lot-demo.ts          buat satu lot contoh
npx tsx scripts/hitung-ulang-estimasi.ts  selaraskan estimasi dengan model terbaru
```

## Peta halaman

```
PUBLIK
  /                        Beranda: angka hidup, masalah, cara kerja
  /masuk                   Login + empat tombol masuk cepat
  /dashboard               Angka wilayah — baca-saja bila tanpa akun
  /telusur/[token]         Asal-usul lot, tanpa akun

PETUGAS
  /petugas                 Rute hari ini
  /petugas/jemput/[id]     Layar timbang
  /petugas/setor           Setor + susut otomatis

OPERATOR
  /operator                Stok, setoran masuk, daftar lot
  /operator/lot/[id]       Susun & tutup lot, terbitkan QR

PEMDA / ADMIN
  /dashboard/warung        Registri: peta + tabel bersisian
  /dashboard/warung/tambah Tambah warung + hitung estimasi
  /dashboard/penjemputan   Daftar penjemputan + hasil pemeriksaan
  /dashboard/skenario      Kalkulator penggeser
  /dashboard/perangkat     Kesehatan alat + verifikasi rantai
  /simulator               Pengganti perangkat keras

API
  /api/ingest                  pintu masuk data alat, 7 langkah pemeriksaan
  /api/simulator/kirim         berperan sebagai alat: menandatangani lalu meneruskan
  /api/alat/bacaan             bacaan timbangan tiruan
  /api/perangkat/verifikasi    periksa ulang seluruh rantai bukti
```

## Yang perlu diketahui tentang rancangannya

**Model data empat lapis.** Master, referensi berversi waktu, transaksi, dan bukti. Lapis bukti bersifat hanya-tambah. Arahnya terbalik dari kebiasaan: baris `penjemputan` **diturunkan** dari `kejadian_alat`, sehingga kalibrasi timbangan yang meleset cukup diperbaiki di tabel kalibrasi lalu transaksinya dihitung ulang — buktinya tetap utuh.

**Rantai bukti, bukan blockchain.** Tiap kejadian ditandatangani Ed25519 **oleh alat**, dan menggandeng hash kejadian sebelumnya. Rantainya dimulai di alat, bukan di server, jadi menghapus satu baris di basis data memutus rantai dan langsung ketahuan. Blockchain menjamin data tak berubah *sesudah* ditulis; risiko terbesar sistem ini ada pada saat *penulisannya*.

Kolom `pesanKanonik` menyimpan bita yang benar-benar ditandatangani. Jangan pernah menyusun ulang pesan dari kolom `payload` untuk verifikasi — PostgreSQL JSONB memotong angka pecahan di 16 digit penting, dan koordinat GPS kehilangan presisinya.

**Membaca dan menulis dipisah.** `bolehAkses()` menjawab "boleh buka halaman ini?", `bolehMenulis()` menjawab "boleh ubah data ini?". Keduanya daftar terpisah di `src/lib/menu.ts`. Penjaga operasi tulis dipasang di dalam server action-nya, bukan hanya di halaman yang memuat tombolnya.

**Batas yang dinyatakan terbuka.** Angka taksiran ditandai `ESTIMASI` dan yang terukur ditandai `TERUKUR`. Ketiga jenis kebocoran sengaja **tidak dijumlahkan** karena tingkat keyakinannya berbeda.

## Tumpukan teknologi

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Prisma 6 · PostgreSQL (Neon) · Leaflet + OpenStreetMap · Recharts · Ed25519 dan SHA-256 dari pustaka bawaan Node.

Seluruh kode, komentar, dan antarmuka memakai bahasa Indonesia.
