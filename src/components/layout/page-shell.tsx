"use client";

import Link from "next/link";
import React, { type ReactNode } from "react";
import { motion } from "framer-motion";

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
    <motion.main
      className={cn("bg-surface-app min-h-screen", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          className="border-border/50 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex min-w-0 flex-col gap-3">
            {breadcrumb && (
              <div className="text-content-secondary/80 text-xs">
                {breadcrumb}
              </div>
            )}
            <div className="flex items-start gap-3">
              {backHref ? (
                <Link
                  href={backHref}
                  className="border-border/50 text-content-secondary hover:border-primary/50 hover:text-content-primary inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {backLabel}
                </Link>
              ) : null}
              <div className="min-w-0 space-y-1">
                <h1 className="text-content-primary truncate text-lg font-semibold sm:text-xl md:text-2xl">
                  {title}
                </h1>
                {description && (
                  <p className="text-content-secondary text-sm">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </motion.header>
        <motion.section
          className={cn("py-6", contentClassName)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {children}
        </motion.section>
      </div>
    </motion.main>
  );
}
