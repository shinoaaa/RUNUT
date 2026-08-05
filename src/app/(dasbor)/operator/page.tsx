import Link from "next/link";
import {
  KartuAngka,
  Kosong,
  Panel,
  Pil,
  Tabel,
  Td,
  Th,
  Tombol,
} from "@/components/ui";
import { coba, db } from "@/lib/db";
import { ASUMSI } from "@/lib/statistik";
import { angka, liter, tanggal } from "@/lib/format";
import { buatLot } from "@/app/operator/aksi";
import { pastikanAkses } from "@/lib/sesi";

export const metadata = { title: "Titik Kumpul" };
export const dynamic = "force-dynamic";

const NADA_LOT = {
  TERBUKA: "info",
  TERTUTUP: "warn",
  DISERAHKAN: "ok",
} as const;

export default async function HalamanOperator() {
  await pastikanAkses("/operator");
  const [trip, lot, titikKumpul] = await coba(() => Promise.all([
    db.trip.findMany({
      where: { status: "DISETOR" },
      orderBy: { tanggal: "desc" },
      take: 40,
      select: {
        id: true,
        tanggal: true,
        totalGWarung: true,
        totalGTitikKumpul: true,
        susutPersen: true,
        petugas: { select: { nama: true } },
        lotTrip: { select: { lotId: true } },
        _count: { select: { penjemputan: true } },
      },
    }),
    db.lot.findMany({
      orderBy: { id: "desc" },
      take: 15,
      select: {
        id: true,
        kode: true,
        beratG: true,
        status: true,
        dibuatAt: true,
        offtaker: true,
        _count: { select: { trip: true } },
      },
    }),
    db.titikKumpul.findFirst({ select: { id: true, nama: true } }),
  ]));

  const belumMasukLot = trip.filter((t) => t.lotTrip.length === 0);
  const stokG = belumMasukLot.reduce(
    (a, t) => a + (t.totalGTitikKumpul ?? t.totalGWarung),
    0,
  );
  const perluTinjau = trip.filter(
    (t) => (t.susutPersen ?? 0) > ASUMSI.ambang_susut_persen,
  );

  return (
    <div className="px-5 py-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight">Titik Kumpul</h1>
          <p className="mt-1 text-sm text-ink-2">
            {titikKumpul?.nama ?? "Belum ada titik kumpul"} · Kabupaten Bekasi
          </p>
        </div>
        {titikKumpul && (
          <form
            action={async () => {
              "use server";
              await buatLot(titikKumpul.id);
            }}
          >
            <Tombol type="submit">Buat lot baru</Tombol>
          </form>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KartuAngka
          label="Stok Belum Masuk Lot"
          angka={liter(stokG, 0)}
          satuan="L"
          catatan={`dari ${belumMasukLot.length} setoran`}
        />
        <KartuAngka
          label="Setoran Diterima"
          angka={angka(trip.length)}
          catatan="40 terakhir"
        />
        <KartuAngka
          label="Perlu Ditinjau"
          angka={angka(perluTinjau.length)}
          catatan={`susut di atas ${angka(ASUMSI.ambang_susut_persen, 1)}%`}
          arah={perluTinjau.length > 0 ? "turun" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel judul="Setoran Masuk" padat>
          {trip.length === 0 ? (
            <Kosong
              judul="Belum ada setoran"
              keterangan="Setoran muncul di sini setelah petugas menimbang muatannya di titik kumpul."
            />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Petugas</Th>
                  <Th>Tanggal</Th>
                  <Th num>Warung</Th>
                  <Th num>Diterima</Th>
                  <Th num>Susut</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {trip.slice(0, 20).map((t) => {
                  const susut = t.susutPersen ?? 0;
                  const anomali = susut > ASUMSI.ambang_susut_persen;
                  return (
                    <tr key={t.id}>
                      <Td>{t.petugas.nama}</Td>
                      <Td>{tanggal(t.tanggal)}</Td>
                      <Td num>{t._count.penjemputan}</Td>
                      <Td num>
                        {liter(t.totalGTitikKumpul ?? t.totalGWarung)} L
                      </Td>
                      <Td num>
                        <span className={anomali ? "font-medium text-danger" : undefined}>
                          {angka(susut, 2)}%
                        </span>
                      </Td>
                      <Td>
                        {t.lotTrip.length > 0 ? (
                          <Pil nada="ok">Masuk lot</Pil>
                        ) : anomali ? (
                          <Pil nada="bahaya" titik>
                            Perlu ditinjau
                          </Pil>
                        ) : (
                          <Pil nada="netral">Belum masuk lot</Pil>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabel>
          )}
        </Panel>

        <Panel judul="Lot Terakhir" padat>
          {lot.length === 0 ? (
            <Kosong
              judul="Belum ada lot"
              keterangan="Buat lot untuk menggabungkan beberapa setoran sebelum diserahkan ke pengolah."
            />
          ) : (
            <ul className="divide-y divide-line">
              {lot.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/operator/lot/${l.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13px] font-medium">{l.kode}</span>
                      <span className="block text-[12px] text-ink-3">
                        {l._count.trip} setoran · {tanggal(l.dibuatAt)}
                        {l.offtaker && ` · ${l.offtaker}`}
                      </span>
                    </span>
                    <span className="tabular text-sm font-medium">
                      {liter(l.beratG, 0)} L
                    </span>
                    <Pil nada={NADA_LOT[l.status]}>{l.status.toLowerCase()}</Pil>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
