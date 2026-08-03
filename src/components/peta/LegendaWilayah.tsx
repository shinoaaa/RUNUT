import { SKALA_WILAYAH, WARNA_TANPA_DATA } from "@/lib/format";

/** Legenda peta wilayah. Tanpa impor Leaflet, jadi aman dirender di server. */
export function LegendaWilayah() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px] text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-ink-3">Tingkat tangkap</span>
        <span className="flex overflow-hidden rounded-sm border border-line">
          {SKALA_WILAYAH.map((w) => (
            <span key={w} className="h-3 w-6" style={{ background: w }} />
          ))}
        </span>
        <span className="text-ink-3">rendah → tinggi</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3 w-6 rounded-sm border border-line"
          style={{ background: WARNA_TANPA_DATA }}
        />
        Belum ada data
      </span>
    </div>
  );
}
