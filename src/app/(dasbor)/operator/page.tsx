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
  Paginasi,
  FilterPilihan,
} from "@/components/ui";
import { coba, db } from "@/lib/db";
import { ASUMSI } from "@/lib/statistik";
import { angka, liter, tanggal } from "@/lib/format";
import { buatLot } from "@/app/operator/aksi";
import { pastikanAkses } from "@/lib/sesi";
import { TombolBuatLot } from "@/components/operator/TombolBuatLot";

export const metadata = { title: "Titik Kumpul" };
export const dynamic = "force-dynamic";

const NADA_LOT = {
  TERBUKA: "info",
  TERTUTUP: "warn",
  DISERAHKAN: "ok",
} as const;

export default async function HalamanOperator(props: {
  searchParams?: Promise<{ pt?: string; pl?: string; ft?: string; fl?: string }>;
}) {
  await pastikanAkses("/operator");
  const searchParams = await props.searchParams;
  const pageTrip = Number(searchParams?.pt) || 1;
  const pageLot = Number(searchParams?.pl) || 1;
  const filterTrip = searchParams?.ft || "";
  const filterLot = searchParams?.fl || "";
  const takeTrip = 10;
  const takeLot = 10;
  
  const skipTrip = (pageTrip - 1) * takeTrip;
  const skipLot = (pageLot - 1) * takeLot;

  const whereTrip: any = { status: "DISETOR" };
  if (filterTrip === "menunggu") whereTrip.lotTrip = { none: {} };
  else if (filterTrip === "masuk_lot") whereTrip.lotTrip = { some: {} };

  const whereLot: any = {};
  if (filterLot) whereLot.status = filterLot;

  const [belumMasukLot, pagedTrip, totalTrip, pagedLot, totalLot, titikKumpul] = await coba(() => Promise.all([
    // Untuk stats atas
    db.trip.findMany({
      where: { status: "DISETOR", lotTrip: { none: {} } },
      select: { totalGTitikKumpul: true, totalGWarung: true }
    }),
    // Tabel Setoran Masuk (paged)
    db.trip.findMany({
      where: whereTrip,
      orderBy: { tanggal: "desc" },
      skip: skipTrip,
      take: takeTrip,
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
    db.trip.count({ where: whereTrip }),
    // Tabel Lot (paged)
    db.lot.findMany({
      where: whereLot,
      orderBy: { id: "desc" },
      skip: skipLot,
      take: takeLot,
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
    db.lot.count({ where: whereLot }),
    db.titikKumpul.findFirst({ select: { id: true, nama: true } }),
  ]));

  const stokG = belumMasukLot.reduce(
    (a, t) => a + (t.totalGTitikKumpul ?? t.totalGWarung),
    0,
  );
  
  // Hitung trip dengan susut tinggi secara global
  const perluTinjauTotal = await db.trip.count({
    where: { 
      status: "DISETOR", 
      susutPersen: { gt: ASUMSI.ambang_susut_persen } 
    }
  });

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
            <TombolBuatLot jumlahKosong={belumMasukLot.length} />
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
          angka={angka(totalTrip)}
          catatan="Total setoran"
        />
        <KartuAngka
          label="Perlu Ditinjau"
          angka={angka(perluTinjauTotal)}
          catatan={`susut di atas ${angka(ASUMSI.ambang_susut_persen, 1)}%`}
          arah={perluTinjauTotal > 0 ? "turun" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          judul="Setoran Masuk"
          aksi={
            <FilterPilihan
              paramKey="ft"
              value={filterTrip}
              options={[
                { label: "Menunggu", value: "menunggu" },
                { label: "Masuk lot", value: "masuk_lot" },
              ]}
            />
          }
          padat
        >
          {pagedTrip.length === 0 ? (
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
                {pagedTrip.map((t) => {
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
          <Paginasi page={pageTrip} total={Math.ceil(totalTrip / takeTrip)} paramName="pt" />
        </Panel>

        <Panel
          judul="Lot Terakhir"
          aksi={
            <FilterPilihan
              paramKey="fl"
              value={filterLot}
              options={[
                { label: "Terbuka", value: "TERBUKA" },
                { label: "Tertutup", value: "TERTUTUP" },
                { label: "Diserahkan", value: "DISERAHKAN" },
              ]}
            />
          }
          padat
        >
          {pagedLot.length === 0 ? (
            <Kosong
              judul="Belum ada lot"
              keterangan="Buat lot untuk menggabungkan beberapa setoran sebelum diserahkan ke pengolah."
            />
          ) : (
            <ul className="divide-y divide-line">
              {pagedLot.map((l) => (
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
          <Paginasi page={pageLot} total={Math.ceil(totalLot / takeLot)} paramName="pl" />
        </Panel>
      </div>
    </div>
  );
}
