import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseDBTimestamp } from "~/lib/timestamp-utils"

/**
 * Utility function to combine class names and merge Tailwind CSS classes
 * Used throughout shadcn/ui components for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely format a date value that could be a Date object or ISO string from database
 * This handles the common case where D1/SQLite returns dates as ISO strings but
 * TypeScript types expect Date objects
 * 
 * @param dateValue - Date object or ISO string from database
 * @param options - Intl.DateTimeFormatOptions for toLocaleDateString
 * @returns Formatted date string
 */
export function formatSafeDate(
  dateValue: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateValue) {
    return "Unknown date";
  }

  try {
    const date = dateValue instanceof Date ? dateValue : parseDBTimestamp(dateValue);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date value:", dateValue);
      return "Invalid date";
    }
    
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.warn("Failed to parse date value:", dateValue, error);
    return "Invalid date";
  }
}