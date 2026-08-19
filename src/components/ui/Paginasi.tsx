import Link from "next/link";

export function Paginasi({
  page,
  total,
  paramName,
  baseUrl = "/operator",
}: {
  page: number;
  total: number;
  paramName: string;
  baseUrl?: string;
}) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
      <span className="text-ink-3">
        Hal {page} dari {total}
      </span>
      <div className="flex gap-1">
        <Link
          href={`${baseUrl}?${paramName}=1`}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-canvas text-ink-1"
          }`}
          aria-disabled={page <= 1}
        >
          &laquo;
        </Link>
        <Link
          href={`${baseUrl}?${paramName}=${page - 1}`}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-canvas text-ink-1"
          }`}
          aria-disabled={page <= 1}
        >
          &lsaquo;
        </Link>
        <Link
          href={`${baseUrl}?${paramName}=${page + 1}`}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            page >= total ? "pointer-events-none opacity-50" : "hover:bg-canvas text-ink-1"
          }`}
          aria-disabled={page >= total}
        >
          &rsaquo;
        </Link>
        <Link
          href={`${baseUrl}?${paramName}=${total}`}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            page >= total ? "pointer-events-none opacity-50" : "hover:bg-canvas text-ink-1"
          }`}
          aria-disabled={page >= total}
        >
          &raquo;
        </Link>
      </div>
    </div>
  );
}
