import { LABEL_STATUS, StatusWarung, WARNA_STATUS } from "@/lib/format";

/** Legenda peta. Tanpa impor Leaflet, jadi aman dirender di server. */
export function LegendaWarung() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-2">
      {(Object.keys(WARNA_STATUS) as StatusWarung[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: WARNA_STATUS[s] }} />
          {LABEL_STATUS[s]}
        </span>
      ))}
    </div>
  );
}
