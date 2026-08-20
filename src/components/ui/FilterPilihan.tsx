"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function FilterPilihan({
  paramKey,
  options,
  value,
}: {
  paramKey: string;
  options: { label: string; value: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) {
          params.set(paramKey, e.target.value);
          // reset pagination for the specific table when filter changes
          if (paramKey === "ft") params.delete("pt");
          if (paramKey === "fl") params.delete("pl");
        } else {
          params.delete(paramKey);
        }
        router.push(pathname + "?" + params.toString());
      }}
      className="rounded border border-line bg-surface px-2 py-1 text-[13px] font-medium text-ink-2 outline-none hover:border-brand focus:border-brand focus:ring-1 focus:ring-brand"
    >
      <option value="">Semua</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
