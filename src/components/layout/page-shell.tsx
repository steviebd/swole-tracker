import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  contentClassName?: string;
}

/**
 * PageShell standardises page headings, actions, and spacing for dashboard views.
 */
export function PageShell({
  title,
  description,
  actions,
  breadcrumb,
  backHref,
  backLabel = "Back",
  className,
  contentClassName,
  children,
}: PageShellProps) {
  return (
    <main className={cn("min-h-screen bg-transparent", className)}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            {breadcrumb && <div className="text-xs text-muted-foreground/80">{breadcrumb}</div>}
            <div className="flex items-start gap-3">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-border/50 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  {backLabel}
                </Link>
              ) : null}
              <div className="min-w-0 space-y-1">
                <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
                  {title}
                </h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </header>
        <section className={cn("py-6", contentClassName)}>{children}</section>
      </div>
    </main>
  );
}
