"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pastikanKemampuan } from "@/lib/sesi";
import { hitungEstimasi, petaKategori, type KelasSkala } from "@/lib/estimasi";

export interface HasilTambah {
  galat?: string;
}

const BATAS = { latMin: -6.55, latMax: -5.85, lonMin: 106.9, lonMax: 107.4 };

export async function tambahWarung(
  _sebelumnya: unknown,
  form: FormData,
): Promise<HasilTambah> {
  // Izin MENAMBAH, bukan izin melihat registri. Kalau memakai yang
  // kedua, Pemda ikut bisa membuat warung hanya karena boleh melihatnya.
  await pastikanKemampuan("warung:tambah");

  const nama = String(form.get("nama") ?? "").trim();
  const kategori = String(form.get("kategori") ?? "lainnya");
  const skala = String(form.get("skala") ?? "KECIL") as KelasSkala;
  const alamat = String(form.get("alamat") ?? "").trim();
  const desa = String(form.get("desa") ?? "").trim();
  const kecamatanId = Number(form.get("kecamatanId") ?? 0);
  const lat = Number(form.get("lat"));
  const lon = Number(form.get("lon"));

  if (nama.length < 3) return { galat: "Nama warung minimal tiga huruf." };
  if (!petaKategori.has(kategori)) return { galat: "Kategori tidak dikenal." };
  if (!["KECIL", "SEDANG", "BESAR"].includes(skala))
    return { galat: "Kelas skala tidak dikenal." };
  if (!Number.isFinite(lat) || !Number.isFinite(lon))
    return { galat: "Titik lokasi belum ditentukan. Klik pada peta." };
  if (lat < BATAS.latMin || lat > BATAS.latMax || lon < BATAS.lonMin || lon > BATAS.lonMax)
    return { galat: "Titik berada di luar wilayah Kabupaten Bekasi." };
  if (!kecamatanId) return { galat: "Kecamatan harus dipilih." };

  const kembar = await db.warung.findFirst({
    where: { nama: { equals: nama, mode: "insensitive" }, kecamatanId },
    select: { id: true },
  });
  if (kembar) return { galat: `"${nama}" sudah terdaftar di kecamatan yang sama.` };

  const e = hitungEstimasi(kategori, skala);

  const warung = await db.warung.create({
    data: {
      nama,
      kategori,
      alamat: alamat || null,
      desa: desa || null,
      lat,
      lon,
      kecamatanId,
      kelasSkala: skala,
      estimasiLMinggu: e.literPerMinggu,
      // Ditambahkan orang, bukan hasil tarikan data terbuka. Karena
      // penambahnya melihat langsung warungnya, statusnya sudah dianggap
      // terverifikasi — inilah bedanya dengan baris hasil impor.
      sumberData: "PETUGAS",
      statusVerifikasi: "DIKUNJUNGI",
      qrToken: `w_${randomBytes(9).toString("base64url")}`,
      // Dibangkitkan terpisah, bukan diturunkan dari qrToken: token
      // pemilik yang kartunya hilang harus dapat diganti tanpa memaksa
      // stiker temboknya ikut dicetak dan ditempel ulang.
      tokenPemilik: `p_${randomBytes(9).toString("base64url")}`,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/warung");
  redirect(`/dashboard/warung?baru=${warung.id}`);
}
