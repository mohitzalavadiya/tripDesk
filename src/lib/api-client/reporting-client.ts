import { ReportFilterInput, ReportType } from "@/lib/validation/reporting-schema";
import { AgencyBIReportResult } from "@/lib/services/reporting-service";

export const reportingClient = {
  /**
   * Fetches the agency BI report data with filters.
   */
  async getReport(filter?: Partial<ReportFilterInput>): Promise<{ success: boolean; data: AgencyBIReportResult }> {
    const params = new URLSearchParams();
    if (filter?.preset) params.set("preset", filter.preset);
    if (filter?.startDate) params.set("startDate", filter.startDate);
    if (filter?.endDate) params.set("endDate", filter.endDate);
    if (filter?.type) params.set("type", filter.type);
    if (filter?.search) params.set("search", filter.search);
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/reports?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch reports");
    }
    return res.json();
  },

  /**
   * Builds the export URL for CSV downloads.
   */
  getExportUrl(filter?: Partial<ReportFilterInput>, reportType: ReportType = "OVERVIEW"): string {
    const params = new URLSearchParams();
    if (filter?.preset) params.set("preset", filter.preset);
    if (filter?.startDate) params.set("startDate", filter.startDate);
    if (filter?.endDate) params.set("endDate", filter.endDate);
    params.set("type", reportType);

    return `/api/reports/export?${params.toString()}`;
  },

  /**
   * Builds the export URL for PDF downloads.
   */
  getPdfUrl(filter?: Partial<ReportFilterInput>): string {
    const params = new URLSearchParams();
    if (filter?.preset) params.set("preset", filter.preset);
    if (filter?.startDate) params.set("startDate", filter.startDate);
    if (filter?.endDate) params.set("endDate", filter.endDate);

    return `/api/reports/pdf?${params.toString()}`;
  },
};
