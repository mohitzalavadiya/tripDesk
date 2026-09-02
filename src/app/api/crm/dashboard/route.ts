import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/dashboard
 * Retrieve high-level CRM pipeline, sales conversion, follow-up telemetry, and sources summary.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const stats = await enquiryService.getCrmDashboardStats(context.agencyId);

    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
