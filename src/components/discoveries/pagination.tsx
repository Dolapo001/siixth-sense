import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utilities/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
};

/** Previous/next with real links, so pages are bookmarkable and work without JavaScript. */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < totalPages ? hrefFor(page + 1) : null;
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-border pt-6">
      {prev ? (
        <Link href={prev} rel="prev" className={buttonStyles({ variant: "secondary" })}>
          <ChevronLeft aria-hidden />
          Previous
        </Link>
      ) : (
        <span aria-hidden className={cn(buttonStyles({ variant: "secondary" }), disabled)}>
          <ChevronLeft aria-hidden />
          Previous
        </span>
      )}
      <p className="meta text-muted">
        Page {page} of {totalPages}
      </p>
      {next ? (
        <Link href={next} rel="next" className={buttonStyles({ variant: "secondary" })}>
          Next
          <ChevronRight aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(buttonStyles({ variant: "secondary" }), disabled)}>
          Next
          <ChevronRight aria-hidden />
        </span>
      )}
    </nav>
  );
}
