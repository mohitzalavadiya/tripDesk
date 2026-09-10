import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extracts user-friendly error message from API errors or thrown objects,
 * suppressing raw SQL, Prisma, or runtime trace leaks.
 */
function isInternalDatabaseError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("foreign key constraint") ||
    lower.includes("unique constraint") ||
    lower.includes("prisma") ||
    lower.includes("p2002") ||
    lower.includes("p2003") ||
    lower.includes("p2025") ||
    lower.includes("syntax error") ||
    lower.includes("column \"") ||
    lower.includes("relation \"")
  );
}

export function getErrorMessage(error: unknown, fallback: string = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (typeof error === "string") {
    if (isInternalDatabaseError(error)) {
      return fallback;
    }
    return error;
  }
  if (typeof error === "object") {
    const err = error as any;
    const msg = err.response?.data?.error?.message || err.error?.message || err.message;
    if (typeof msg === "string" && msg.trim().length > 0) {
      if (isInternalDatabaseError(msg)) {
        return fallback;
      }
      return msg;
    }
  }
  return fallback;
}
