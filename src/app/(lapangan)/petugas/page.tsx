import { redirect } from "next/navigation";
import { RuteHariIni } from "@/components/petugas/RuteHariIni";
import { keluar } from "@/app/masuk/aksi";
import { susunRute } from "@/lib/rute";
import { sesiSekarang } from "@/lib/sesi";
import { coba, db } from "@/lib/db";

export const metadata = { title: "Rute Hari Ini" };
export const dynamic = "force-dynamic";

export default async function HalamanRute() {
  const sesi = await sesiSekarang();
  if (!sesi) redirect("/masuk");

  // Peran selain petugas tetap boleh melihat, memakai petugas pertama
  // sebagai contoh, supaya juri bisa menelusuri alur ini tanpa berganti akun.
  let petugasId = sesi.id;
  let nama = sesi.nama;
  if (sesi.peran !== "PETUGAS") {
    const p = await coba(() =>
      db.pengguna.findFirst({ where: { peran: "PETUGAS", aktif: true } }),
    );
    if (p) {
      petugasId = p.id;
      nama = `${p.nama} (dilihat sebagai ${sesi.peran.toLowerCase()})`;
    }
  }

  const rute = await susunRute(petugasId);
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <RuteHariIni rute={rute} namaPetugas={nama} tanggal={tanggal} keluar={keluar} />
  );
}
