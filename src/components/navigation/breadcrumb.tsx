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
const ChevronRightIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    
    // Special handling for dynamic segments that look like IDs
    if (/^\d+$/.test(segment)) {
      // Skip numeric IDs in breadcrumbs for cleaner UX
      return;
    }
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast,
    });
  });

  return breadcrumbs;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Use provided items or generate from current path
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);
  
  // Don't render breadcrumbs for home page or if only home exists
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("breadcrumb", className)}
    >
      <ol className="flex items-center gap-1" role="list">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={`${item.href || item.label}-${index}`} className="flex items-center gap-1.5">
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
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-md opacity-0 transition-opacity duration-300 hover:opacity-100 -z-10" />
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast || item.current 
                      ? "breadcrumb-current relative font-medium bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
                      : "breadcrumb-item"
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.label}
                  {/* Active page indicator */}
                  {(isLast || item.current) && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-full" />
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