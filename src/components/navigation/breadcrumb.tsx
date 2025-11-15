"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  pathname?: string; // For testing purposes
}

// Default route mappings for automatic breadcrumb generation
const routeLabels: Record<string, string> = {
  "/": "Home",
  "/workout": "Workout",
  "/workout/start": "Start Workout",
  "/workout/session": "Workout Session",
  "/templates": "Templates",
  "/templates/new": "Create Template",
  "/templates/[id]/edit": "Edit Template",
  "/workouts": "Workouts & Progress",
  "/progress": "Progress",
  "/exercises": "Exercises",
  "/connect-whoop": "Connect WHOOP",
};

// ChevronRight icon component
const ChevronRightIcon = ({
  className = "w-4 h-4",
}: {
  className?: string;
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always include home
  breadcrumbs.push({
    label: "Home",
    href: "/",
  });

  // Build breadcrumbs from path segments
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Try to get a friendly label, fallback to segment
    let label = routeLabels[currentPath];

    if (!label) {
      // Try to match dynamic routes like [id]
      const pathPattern = currentPath.replace(/\/[^/]+$/, "/[id]");
      label = routeLabels[pathPattern];
    }

    if (!label) {
      // Convert segment to readable label (capitalize and replace hyphens)
      label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    // Special handling for dynamic segments that look like IDs
    if (/^\d+$/.test(segment)) {
      // Skip numeric IDs in breadcrumbs for cleaner UX
      return;
    }

    breadcrumbs.push({
      label,
      ...(isLast ? {} : { href: currentPath }),
      current: isLast,
    });
  });

  return breadcrumbs;
}

export function Breadcrumb({
  items,
  className,
  pathname: propPathname,
}: BreadcrumbProps) {
  const pathname = usePathname();
  const effectivePathname = propPathname ?? pathname;

  // Use provided items or generate from current path
  const breadcrumbItems =
    items || generateBreadcrumbsFromPath(effectivePathname || "");

  // Don't render breadcrumbs for home page or if only home exists
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("breadcrumb", className)}>
      <ol className="flex items-center gap-1" role="list">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li
              key={`${item.href || item.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRightIcon className="breadcrumb-separator opacity-50" />
              )}

              {item.href && !item.current ? (
                <Link
                  href={item.href}
                  className="breadcrumb-item relative transition-all duration-300 hover:scale-105"
                  aria-current={item.current ? "page" : undefined}
                >
                  <span className="relative z-10">{item.label}</span>
                  {/* Gradient hover effect */}
                  <span className="from-primary/10 absolute inset-0 -z-10 rounded-md bg-gradient-to-r to-purple-600/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast || item.current
                      ? "breadcrumb-current from-primary relative bg-gradient-to-r to-purple-600 bg-clip-text font-medium text-transparent"
                      : "breadcrumb-item",
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.label}
                  {/* Active page indicator */}
                  {(isLast || item.current) && (
                    <span className="from-primary absolute right-0 -bottom-1 left-0 h-0.5 rounded-full bg-gradient-to-r to-purple-600" />
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Pre-defined breadcrumb configurations for specific pages
export const pageBreadcrumbs = {
  workoutStart: [
    { label: "Home", href: "/" },
    { label: "Workout", href: "/workout" },
    { label: "Start Workout", current: true },
  ],
  templatesNew: [
    { label: "Home", href: "/" },
    { label: "Templates", href: "/templates" },
    { label: "Create Template", current: true },
  ],
  workoutsHistory: [
    { label: "Home", href: "/" },
    { label: "Workouts & Progress", current: true },
  ],
  exerciseManagement: [
    { label: "Home", href: "/" },
    { label: "Exercises", current: true },
  ],
} as const;
