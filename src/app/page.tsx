import Image from "next/image";
import {
  BilahDalamBaris,
  KartuAngka,
  Kosong,
  Panel,
  Pil,
  Tabel,
  TagKeyakinan,
  Td,
  Th,
  Tombol,
} from "@/components/ui";

/**
 * Halaman sementara: etalase sistem desain.
 * Dipakai untuk memastikan token dan komponen dasar sudah benar
 * sebelum halaman sebenarnya dibangun. Akan diganti oleh Beranda.
 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center gap-3">
        <Image src="/brand/logomark.svg" alt="" width={40} height={40} className="text-brand" />
        <div>
          <h1 className="text-[26px] font-bold leading-none">RUNUT</h1>
          <p className="mt-1 text-sm text-ink-2">
            Etalase sistem desain — bukan halaman akhir
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KartuAngka label="Tingkat Tangkap" angka="31,4" satuan="%" catatan="4,2% vs bulan lalu" arah="naik" />
        <KartuAngka label="Terjemput" angka="12.847" satuan="kg" catatan="bulan ini" />
        <KartuAngka label="Warung Aktif" angka="284" satuan="/ 906" catatan="31% dari terdata" />
        <KartuAngka label="Nilai" angka="77,1" satuan="jt" catatan="tahun berjalan" />
      </div>

      <p className="mt-8 mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        Kebocoran
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <KartuAngka label="Susut Rantai" angka="63" satuan="kg" catatan="selisih timbang warung vs titik kumpul" keyakinan="terukur" />
        <KartuAngka label="Bocor di Warung" angka="± 4.100" satuan="kg" catatan="estimasi dikurangi yang dijemput" keyakinan="estimasi" />
        <KartuAngka label="Di Luar Jangkauan" angka="± 21.500" satuan="kg" catatan="warung belum masuk program" keyakinan="model" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel judul="Pil status & tombol">
          <div className="flex flex-wrap gap-2">
            <Pil nada="ok" titik>Rutin</Pil>
            <Pil nada="warn" titik>Jarang</Pil>
            <Pil nada="bahaya" titik>Berisiko</Pil>
            <Pil nada="netral" titik>Belum pernah</Pil>
            <Pil nada="info">Diminta warung</Pil>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tombol>Susun rute hari ini</Tombol>
            <Tombol nada="kedua">Impor CSV</Tombol>
            <Tombol nada="bahaya">Hapus</Tombol>
            <Tombol nada="teks">Lihat asumsi</Tombol>
            <Tombol disabled>Terkunci</Tombol>
          </div>
          <div className="mt-4 flex gap-2">
            <TagKeyakinan nilai="terukur" />
            <TagKeyakinan nilai="estimasi" />
            <TagKeyakinan nilai="model" />
          </div>
        </Panel>

        <Panel judul="Kecamatan teratas" padat>
          <Tabel>
            <thead>
              <tr>
                <Th>Kecamatan</Th>
                <Th num>Warung</Th>
                <Th>Cakupan</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Cikarang Pusat", 79, 61.2],
                ["Cikarang Selatan", 40, 44.8],
                ["Tambun Selatan", 35, 38.1],
                ["Babelan", 14, 12.4],
                ["Tambun Utara", 14, 11.9],
              ].map(([nama, jml, cak]) => (
                <tr key={nama as string}>
                  <Td>{nama}</Td>
                  <Td num>{jml}</Td>
                  <Td><BilahDalamBaris persen={cak as number} /></Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel judul="Keadaan kosong" padat>
          <Kosong
            judul="Rute hari ini belum disusun"
            keterangan="Sistem akan memilih warung yang sudah jatuh tempo lalu mengurutkannya berdasarkan jarak."
            aksi={<Tombol>Susun rute hari ini</Tombol>}
          />
        </Panel>
      </div>
    </main>
  );
}
