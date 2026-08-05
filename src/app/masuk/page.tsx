import Image from "next/image";
import { masuk, masukCepat } from "./aksi";
import { FormMasuk } from "./FormMasuk";
import { TautanKembali } from "@/components/ui";
import type { Peran } from "@/lib/sesi";

export const metadata = { title: "Masuk" };

const CEPAT: Array<{ peran: Peran; label: string; ket: string }> = [
  { peran: "PETUGAS", label: "Petugas", ket: "Rute & penimbangan di lapangan" },
  { peran: "OPERATOR", label: "Operator", ket: "Titik kumpul & lot" },
  { peran: "PEMDA", label: "Pemda", ket: "Dasbor wilayah" },
  { peran: "ADMIN", label: "Admin", ket: "Semua akses" },
];

export default function HalamanMasuk() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <TautanKembali href="/" className="mb-5">
          Beranda
        </TautanKembali>

        <div className="mb-7 flex items-center gap-2.5">
          <Image src="/brand/logomark.svg" alt="" width={34} height={34} className="text-brand" />
          <div>
            <p className="text-[22px] font-extrabold leading-none tracking-wide">RUNUT</p>
            <p className="mt-1 text-[13px] text-ink-2">
              Ketertelusuran minyak jelantah UMKM
            </p>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-5">
          <FormMasuk aksi={masuk} />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Akun demo — masuk tanpa mengetik
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CEPAT.map((c) => (
              <form
                key={c.peran}
                action={async () => {
                  "use server";
                  await masukCepat(c.peran);
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:bg-canvas"
                >
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                    {c.ket}
                  </span>
                </button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Semua akun demo memakai kata sandi <code>demo1234</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
