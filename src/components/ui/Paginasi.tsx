import Link from "next/link";

const generatePagination = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};

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

  const pages = generatePagination(page, total);

  return (
    <div className="flex items-center justify-center gap-1.5 border-t border-line px-5 py-4 text-[14px] font-medium">
      <Link
        href={`${baseUrl}?${paramName}=${page - 1}`}
        className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${
          page <= 1
            ? "pointer-events-none bg-canvas text-ink-4 opacity-50"
            : "text-ink-2 hover:bg-canvas hover:text-ink-1"
        }`}
        aria-disabled={page <= 1}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </Link>

      {pages.map((p, i) => {
        if (p === "...") {
          return (
            <span key={i} className="flex h-9 w-9 items-center justify-center text-ink-3 tracking-widest">
              ...
            </span>
          );
        }

        const isCurrent = p === page;

        return (
          <Link
            key={i}
            href={`${baseUrl}?${paramName}=${p}`}
            className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${
              isCurrent
                ? "bg-brand text-white"
                : "text-ink-2 hover:bg-canvas hover:text-ink-1"
            }`}
          >
            {p}
          </Link>
        );
      })}

      <Link
        href={`${baseUrl}?${paramName}=${page + 1}`}
        className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${
          page >= total
            ? "pointer-events-none bg-canvas text-ink-4 opacity-50"
            : "text-ink-2 hover:bg-canvas hover:text-ink-1"
        }`}
        aria-disabled={page >= total}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </Link>
    </div>
  );
}
