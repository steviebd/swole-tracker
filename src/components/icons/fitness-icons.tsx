/**
 * Custom SVG Icons for Swole Tracker
 * Consistent iconography system with brand-aligned icons
 */

import { cn } from "~/lib/utils";

export interface IconProps {
  className?: string;
  size?: number;
  "aria-label"?: string;
  role?: string;
}

export const StrengthIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Strength", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M20.57 14.86L22 13.43 20.57 12 17 8.43 15.57 7 12 10.57 8.43 7 7 8.43 3.43 12 2 13.43 3.43 14.86 7 18.43 8.43 19.86 12 16.29 15.57 19.86 17 18.43 20.57 14.86Z"
      fill="currentColor"
    />
    <path
      d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2Z"
      fill="currentColor"
    />
    <path
      d="M21 9H15L13.5 7.5C13.1 7.1 12.6 6.9 12 6.9S10.9 7.1 10.5 7.5L9 9H3C2.4 9 2 9.4 2 10C2 10.6 2.4 11 3 11H9L10.5 12.5C10.9 12.9 11.4 13.1 12 13.1S13.1 12.9 13.5 12.5L15 11H21C21.6 11 22 10.6 22 10C22 9.4 21.6 9 21 9Z"
      fill="currentColor"
    />
  </svg>
);

export const FireIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Fire", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M13.5 0.67s0.74 2.65 0.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l0.03-0.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29 0.59 2.65 0.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
      fill="currentColor"
    />
  </svg>
);

export const TrophyIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Trophy", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V7C19 8.1 18.1 9 17 9H16V10C16 12.21 14.21 14 12 14S8 12.21 8 10V9H7C5.9 9 5 8.1 5 7V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V7H15V3H9ZM12 16C13.1 16 14 16.9 14 18V19H16C16.55 19 17 19.45 17 20S16.55 21 16 21H8C7.45 21 7 20.55 7 20S7.45 19 8 19H10V18C10 16.9 10.9 16 12 16Z"
      fill="currentColor"
    />
  </svg>
);

export const TargetIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Target", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20Z"
      fill="currentColor"
    />
    <path
      d="M12 6C8.69 6 6 8.69 6 12S8.69 18 12 18 18 15.31 18 12 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12S9.79 8 12 8 16 9.79 16 12 14.21 16 12 16Z"
      fill="currentColor"
    />
    <path
      d="M12 10C10.9 10 10 10.9 10 12S10.9 14 12 14 14 13.1 14 12 13.1 10 12 10Z"
      fill="currentColor"
    />
  </svg>
);

export const EnergyIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Energy", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M7 2V13H10V22L17 10H13L17 2H7Z"
      fill="currentColor"
    />
  </svg>
);

export const CheckIcon = ({ 
  className, 
  size = 24, 
  "aria-label": ariaLabel = "Check", 
  role = "img" 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-current", className)}
    role={role}
    aria-label={ariaLabel}
  >
    <path
      d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z"
      fill="currentColor"
    />
  </svg>
);