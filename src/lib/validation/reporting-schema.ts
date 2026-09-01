import { z } from "zod";

export const ReportPresetEnum = z.enum([
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "THIS_QUARTER",
  "THIS_YEAR",
  "ALL_TIME",
  "CUSTOM_RANGE",
]);

export type ReportPreset = z.infer<typeof ReportPresetEnum>;

export const ReportTypeEnum = z.enum([
  "OVERVIEW",
  "REVENUE",
  "BOOKINGS",
  "CRM",
  "DESTINATIONS",
  "PROFITABILITY",
  "RECEIVABLES",
  "PAYABLES",
  "CUSTOMERS",
]);

export type ReportType = z.infer<typeof ReportTypeEnum>;

export const reportFilterSchema = z.object({
  preset: ReportPresetEnum.default("THIS_MONTH"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: ReportTypeEnum.optional().default("OVERVIEW"),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional().default(100),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

/**
 * Calculates start and end Date objects in UTC for a given preset.
 */
export function calculateReportDateRange(
  preset: ReportPreset,
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date } {
  const now = new Date();

  switch (preset) {
    case "TODAY": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "THIS_WEEK": {
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday start
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff + 6, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "THIS_MONTH": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "LAST_MONTH": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "THIS_QUARTER": {
      const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      const start = new Date(Date.UTC(now.getUTCFullYear(), quarterMonth, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "THIS_YEAR": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "ALL_TIME": {
      const start = new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear() + 2, 11, 31, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    case "CUSTOM_RANGE": {
      if (customStart && customEnd) {
        const start = new Date(customStart);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(customEnd);
        end.setUTCHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          return { startDate: start, endDate: end };
        }
      }
      // Fallback to this month
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }

    default: {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { startDate: start, endDate: end };
    }
  }
}
