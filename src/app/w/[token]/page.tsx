import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pil, Tabel, Td, Th } from "@/components/ui";
import { PanelPemilik } from "@/components/warung/PanelPemilik";
import { SimpanTautan } from "@/components/warung/SimpanTautan";
import { PinGate } from "@/components/warung/PinGate";
import { SetPinPanel } from "@/components/warung/SetPinPanel";
import { coba, db } from "@/lib/db";
import { angka, liter, rupiah, tanggalJam } from "@/lib/format";
import { KATA_ALASAN } from "@/lib/alasan";
import { asalAplikasi } from "@/lib/asal";

export const dynamic = "force-dynamic";

export default async function HalamanPemilikWarung({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const warung = await coba(() =>
    db.warung.findUnique({
      where: { tokenPemilik: token },
      select: {
        id: true,
        nama: true,
        alamat: true,
        aktif: true,
        pin: true,
        kecamatan: { select: { nama: true } },
        permintaan: { where: { status: "BARU" }, select: { id: true }, take: 1 },
        penjemputan: {
          orderBy: { dibuatAt: "desc" },
          take: 12,
          select: {
            id: true,
            dibuatAt: true,
            beratBersihG: true,
            nilaiRp: true,
            caraKonfirmasi: true,
            alasanTanpaKode: true,
            catatanTanpaKode: true,
            petugas: { select: { nama: true } },
          },
        },
      },
    }),
  );
  if (!warung?.aktif) notFound();

  const isAuth = (await cookies()).get(`pinAuth_${token}`)?.value === "true";
  
  if (warung.pin && !isAuth) {
    return <PinGate token={token} />;
  }

  // Ringkasan dihitung atas SELURUH riwayat, bukan atas dua belas baris
  // yang kebetulan ditampilkan.
  const total = await coba(() =>
    db.penjemputan.aggregate({
      where: { warungId: warung.id },
      _sum: { beratBersihG: true, nilaiRp: true },
      _count: { _all: true },
    }),
  );

  const totalG = total._sum.beratBersihG ?? 0;
  const totalRp = total._sum.nilaiRp ?? 0;

  return (
    <main className="min-h-dvh bg-canvas">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-75">
            <Image src="/brand/logomark.svg" alt="" width={24} height={24} className="text-brand" />
            <span className="font-extrabold tracking-wide">RUNUT</span>
          </Link>
          <span className="ml-auto text-[12px] text-ink-3">Halaman pemilik warung</span>
        </div>
      </div>

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-2xl px-5 py-7">
          <h1 className="text-[24px] font-bold leading-tight">{warung.nama}</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {warung.alamat ?? "Alamat belum tercatat"}
            {warung.kecamatan && ` · Kec. ${warung.kecamatan.nama}`}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5">
        <PanelPemilik token={token} adaPermintaan={warung.permintaan.length > 0} />
        
        <SetPinPanel token={token} hasPin={!!warung.pin} />

        {/* ringkasan pendapatan */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Penjemputan", angka(total._count._all)],
            ["Total jelantah", `${liter(totalG)} L`],
            ["Total diterima", rupiah(totalRp, true)],
          ].map(([label, nilai]) => (
            <div key={label} className="rounded-card border border-line bg-surface p-3.5">
              <p className="text-[11px] text-ink-3">{label}</p>
              <p className="tabular mt-1 text-[17px] font-semibold leading-tight">{nilai}</p>
            </div>
          ))}
        </div>

        {/* riwayat */}
        <section className="rounded-card border border-line bg-surface">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-medium">Riwayat setoran</p>
          </div>
          {warung.penjemputan.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">
              Belum ada penjemputan tercatat di warung ini.
            </p>
          ) : (
            <div className="gulir-x">
              <Tabel>
                <thead>
                  <tr>
                    <Th>Waktu</Th>
                    <Th num>Jelantah</Th>
                    <Th num>Diterima</Th>
                    <Th>Konfirmasi</Th>
                  </tr>
                </thead>
                <tbody>
                  {warung.penjemputan.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        {tanggalJam(p.dibuatAt)}
                        <span className="block text-[11px] text-ink-3">{p.petugas.nama}</span>
                      </Td>
                      <Td num>{liter(p.beratBersihG)} L</Td>
                      <Td num>{rupiah(p.nilaiRp)}</Td>
                      <Td>
                        {/* Ditampilkan juga kepada pemiliknya sendiri,
                            bukan hanya kepada pengawas. Dialah satu-satunya
                            yang tahu pasti apakah alasannya benar, dan
                            karena alasan itu ikut ditandatangani alat, ia
                            membaca hal yang sama persis dengan yang dibaca
                            pemda. */}
                        <Pil nada={p.caraKonfirmasi === "KODE_PEMILIK" ? "ok" : "warn"} titik>
                          {p.caraKonfirmasi === "KODE_PEMILIK" ? "Anda setujui" : "Tanpa kode"}
                        </Pil>
                        {p.caraKonfirmasi === "TANPA_KODE" && (
                          <span className="mt-1 block max-w-[15rem] text-[11px] leading-snug text-ink-3">
                            {p.alasanTanpaKode
                              ? KATA_ALASAN[p.alasanTanpaKode].pemilik
                              : "Alasan tidak dicatat"}
                            {p.catatanTanpaKode && `: “${p.catatanTanpaKode}”`}
                          </span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </div>
          )}
        </section>

        <SimpanTautan alamat={`${await asalAplikasi()}/w/${token}`} />

        <p className="px-1 pb-2 text-[11px] leading-relaxed text-ink-3">
          Kartu QR warung Anda sebaiknya disimpan, bukan ditempel di tempat yang
          terlihat umum. Stiker yang menempel di dinding memakai kode berbeda dan
          tidak membuka halaman ini.
        </p>
      </div>
    </main>
  );
}
