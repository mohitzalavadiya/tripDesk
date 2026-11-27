/**
 * Canonical Itinerary Date & Duration Helpers for Your Travel Desk
 * Enforces authoritative trip date boundaries, duration math, and derived day dates.
 */

/**
 * Calculates trip calendar duration in days inclusive of start and end dates.
 * Follows the canonical formula used across the application:
 * difference in days + 1.
 */
export function calculateTripDurationDays(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 1;
  }
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Derives the calendar date for an itinerary dayNumber (1-indexed) based on trip.startDate.
 * Day 1 = trip.startDate
 * Day 2 = trip.startDate + 1 day, etc.
 */
export function getDerivedItineraryDate(
  startDate: Date | string,
  dayNumber: number
): Date {
  const base = new Date(startDate);
  if (isNaN(base.getTime())) {
    return new Date();
  }
  const derived = new Date(base.getTime());
  derived.setDate(derived.getDate() + (Math.max(1, dayNumber) - 1));
  return derived;
}

/**
 * Validates whether a dayNumber falls strictly within the permitted trip duration.
 */
export function isDayWithinTripDuration(
  dayNumber: number,
  durationDays: number
): boolean {
  return dayNumber >= 1 && dayNumber <= durationDays;
}

/**
 * Formats a date for display in the itinerary builder (e.g., "1 Nov 2026").
 */
export function formatItineraryDateDisplay(
  date: Date | string | null | undefined
): string {
  if (!date) return "Unscheduled";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Unscheduled";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
