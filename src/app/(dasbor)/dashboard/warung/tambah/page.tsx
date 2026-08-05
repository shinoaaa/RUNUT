import { FormWarung } from "@/components/FormWarung";
import { TautanKembali } from "@/components/ui";
import { coba, db } from "@/lib/db";
import { pastikanKemampuan } from "@/lib/sesi";
import { tambahWarung } from "./aksi";

export const metadata = { title: "Tambah Warung" };
export const dynamic = "force-dynamic";

export default async function HalamanTambahWarung() {
  await pastikanKemampuan("warung:tambah");

  const kecamatan = await coba(() => db.kecamatan.findMany({
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  }));

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <TautanKembali href="/dashboard/warung">Registri Warung</TautanKembali>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">Tambah Warung</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Registri tidak menunggu data terbuka. Warung yang ditemukan petugas di
          lapangan bisa langsung dimasukkan, dan estimasi volumenya dihitung dari
          jenis masakan serta kelas skalanya.
        </p>
      </header>

      <FormWarung kecamatan={kecamatan} aksi={tambahWarung} />
    </div>
  );
}
