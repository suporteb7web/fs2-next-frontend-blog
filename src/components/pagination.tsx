import Link from "next/link";
import type { PaginationMeta } from "@/lib/api";

export function Pagination({ meta }: { meta: PaginationMeta }) {
  if (meta.totalPages <= 1) return null;

  const current = Math.min(Math.max(meta.page, 1), meta.totalPages);

  return (
    <nav aria-label="Paginação" className="flex justify-center">
      <div className="join flex-wrap justify-center">
        <PageLink page={current - 1} disabled={current <= 1}>
          Anterior
        </PageLink>
        {pageWindow(current, meta.totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="join-item btn btn-disabled" aria-hidden="true">
              …
            </span>
          ) : (
            <PageLink key={item} page={item} current={item === current}>
              {item}
            </PageLink>
          ),
        )}
        <PageLink page={current + 1} disabled={current >= meta.totalPages}>
          Próxima
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  page,
  current = false,
  disabled = false,
  children,
}: {
  page: number;
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="join-item btn btn-disabled" aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={page <= 1 ? "/" : `/?page=${page}`}
      className={current ? "join-item btn btn-active" : "join-item btn"}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function pageWindow(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = [1, total, current - 1, current, current + 1].filter(
    (page, index, all) => page >= 1 && page <= total && all.indexOf(page) === index,
  );
  pages.sort((a, b) => a - b);

  const items: Array<number | "gap"> = [];
  for (const page of pages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) {
      items.push("gap");
    }
    items.push(page);
  }
  return items;
}
