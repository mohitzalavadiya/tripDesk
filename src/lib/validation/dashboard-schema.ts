import { z } from "zod";

export const DashboardPresetEnum = z.enum([
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "THIS_QUARTER",
  "THIS_YEAR",
  "CUSTOM_RANGE",
]);

export type DashboardPreset = z.infer<typeof DashboardPresetEnum>;

export const DashboardFilterSchema = z.object({
  preset: DashboardPresetEnum.default("THIS_MONTH"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  refresh: z.enum(["true", "false"]).optional(),
});

export type DashboardFilterInput = z.infer<typeof DashboardFilterSchema>;

/**
 * Deterministically parses a date preset and optional custom range into start & end Date objects.
 */
export function calculateDashboardDateRange(
  preset: DashboardPreset = "THIS_MONTH",
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; preset: DashboardPreset } {
  const now = new Date();

  // If custom range is provided and valid
  if (preset === "CUSTOM_RANGE" && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      return { start, end, preset };
    }
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "TODAY":
      break;

    case "THIS_WEEK": {
      const day = now.getDay(); // 0 = Sunday
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      break;
    }

    case "THIS_MONTH":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    case "LAST_MONTH": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      break;
    }

    case "THIS_QUARTER": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      break;
    }

    case "THIS_YEAR":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
  }

  return { start, end, preset };
}
