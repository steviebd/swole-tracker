import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Creates a unique ID using crypto.randomUUID
 * Used primarily in test factories for generating mock data
 */
export function createId(): string {
  return crypto.randomUUID();
}

/**
 * Utility function to combine class names and merge Tailwind CSS classes
 * Used throughout shadcn/ui components for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to "30th May 2025" style with ordinal suffixes and full month names
 */
export function formatDateWithOrdinal(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  const ordinal = getOrdinalSuffix(day);
  return `${day}${ordinal} ${month} ${year}`;
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
