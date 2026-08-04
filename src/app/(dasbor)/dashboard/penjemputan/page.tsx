import { KartuAngka, Kosong, Panel, Pil, Tabel, Td, Th } from "@/components/ui";
import { db } from "@/lib/db";
import { angka, rupiah, tanggalJam } from "@/lib/format";

export const metadata = { title: "Penjemputan" };
export const dynamic = "force-dynamic";

export default async function HalamanPenjemputan() {
  const [daftar, ringkas, tanpaGps, tanpaKonfirmasi] = await Promise.all([
    db.penjemputan.findMany({
      orderBy: { dibuatAt: "desc" },
      take: 60,
      select: {
        id: true,
        beratBersihG: true,
        nilaiRp: true,
        gpsOk: true,
        qrOk: true,
        konfirmasiOk: true,
        jarakDariWarungM: true,
        dibuatAt: true,
        warung: { select: { nama: true, kecamatan: { select: { nama: true } } } },
        petugas: { select: { nama: true } },
        perangkat: { select: { deviceId: true } },
        kejadianAlat: { select: { terverifikasi: true, catatan: true } },
      },
    }),
    db.penjemputan.aggregate({ _sum: { beratBersihG: true, nilaiRp: true }, _count: true }),
    db.penjemputan.count({ where: { gpsOk: false } }),
    db.penjemputan.count({ where: { konfirmasiOk: false } }),
  ]);

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight">Penjemputan</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Setiap baris di sini diturunkan dari satu kejadian alat yang bertanda
          tangan. Bobotnya tidak pernah diketik siapa pun.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuAngka label="Total Penjemputan" angka={angka(ringkas._count)} />
        <KartuAngka
          label="Bobot Terkumpul"
          angka={angka((ringkas._sum.beratBersihG ?? 0) / 1000, 1)}
          satuan="kg"
          keyakinan="terukur"
        />
        <KartuAngka
          label="Dibayarkan ke Warung"
          angka={rupiah(ringkas._sum.nilaiRp ?? 0, true).replace("Rp ", "")}
          satuan="Rp"
        />
        <KartuAngka
          label="Perlu Ditinjau"
          angka={angka(tanpaGps + tanpaKonfirmasi)}
          catatan={`${angka(tanpaGps)} GPS meleset · ${angka(tanpaKonfirmasi)} tanpa konfirmasi`}
          arah={tanpaGps + tanpaKonfirmasi > 0 ? "turun" : undefined}
        />
      </div>

      <Panel judul="60 penjemputan terakhir" className="mt-6" padat>
        {daftar.length === 0 ? (
          <Kosong
            judul="Belum ada penjemputan"
            keterangan="Baris akan muncul begitu petugas menimbang jelantah di warung."
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Warung</Th>
                <Th>Kecamatan</Th>
                <Th num>Bobot</Th>
                <Th num>Nilai</Th>
                <Th>Petugas</Th>
                <Th>Alat</Th>
                <Th>Waktu</Th>
                <Th>Pemeriksaan</Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => {
                const rantaiPutus = p.kejadianAlat?.catatan?.includes("RANTAI_PUTUS");
                return (
                  <tr key={p.id}>
                    <Td>{p.warung.nama}</Td>
                    <Td>{p.warung.kecamatan?.nama ?? <span className="text-ink-3">—</span>}</Td>
                    <Td num>{angka(p.beratBersihG / 1000, 2)} kg</Td>
                    <Td num>{rupiah(p.nilaiRp)}</Td>
                    <Td>{p.petugas.nama}</Td>
                    <Td>
                      <span className="font-mono text-[12px] text-ink-3">
                        {p.perangkat?.deviceId ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-ink-2">{tanggalJam(p.dibuatAt)}</span>
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {p.gpsOk ? (
                          <Pil nada="ok">GPS cocok</Pil>
                        ) : (
                          <Pil nada="warn" titik>
                            GPS {angka(p.jarakDariWarungM ?? 0)} m
                          </Pil>
                        )}
                        {p.konfirmasiOk ? (
                          <Pil nada="ok">Dikonfirmasi</Pil>
                        ) : (
                          <Pil nada="netral">Tanpa konfirmasi</Pil>
                        )}
                        {rantaiPutus && (
                          <Pil nada="bahaya" titik>
                            Rantai putus
                          </Pil>
                        )}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabel>
        )}
      </Panel>
    </div>
  );
}
