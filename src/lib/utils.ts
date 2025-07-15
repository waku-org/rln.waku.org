import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string, using clsx for conditional classes
 * and twMerge to handle Tailwind CSS class conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts HSL color values to CSS variables
 */
export function hslToVar(hsl: string): string {
  return `hsl(var(${hsl}))`;
}