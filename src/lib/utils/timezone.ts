/**
 * Canonical Timezone & Date Boundary Helper for Your Travel Desk
 * Default product timezone: Asia/Kolkata (IST: UTC+05:30)
 */

export const DEFAULT_APP_TIMEZONE = "Asia/Kolkata";

/**
 * Calculates deterministic start-of-day and end-of-day Date objects
 * for a specific timezone (defaulting to Asia/Kolkata).
 * 
 * In Asia/Kolkata (fixed UTC+05:30 with no DST):
 * - Start of day: YYYY-MM-DDT00:00:00.000+05:30
 * - End of day:   YYYY-MM-DDT23:59:59.999+05:30
 */
export function getTodayBoundaries(
  timezone: string = DEFAULT_APP_TIMEZONE,
  baseDate: Date = new Date()
): { start: Date; end: Date; dateStr: string; startOfDay: Date; endOfDay: Date } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(baseDate);
  const year = parts.find((p) => p.type === "year")?.value || String(baseDate.getFullYear());
  const month = parts.find((p) => p.type === "month")?.value || String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = parts.find((p) => p.type === "day")?.value || String(baseDate.getDate()).padStart(2, "0");

  const dateStr = `${year}-${month}-${day}`;

  // Asia/Kolkata is fixed UTC+05:30
  const offset = timezone === "Asia/Kolkata" ? "+05:30" : "+05:30";
  const start = new Date(`${dateStr}T00:00:00.000${offset}`);
  const end = new Date(`${dateStr}T23:59:59.999${offset}`);

  return { start, end, dateStr, startOfDay: start, endOfDay: end };
}
