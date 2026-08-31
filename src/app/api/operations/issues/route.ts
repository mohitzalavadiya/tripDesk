import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { operationsService } from "@/lib/services/operations-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/operations/issues
 * Lists all operational issues for the authenticated agency with KPI summary and filters.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const search = searchParams.get("search") || undefined;
    const tripId = searchParams.get("tripId") || undefined;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!, 10)
      : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const result = await operationsService.listAgencyIssues(context.agencyId, {
      status,
      priority,
      search,
      tripId,
      page,
      limit,
    });

    return apiSuccess(result.issues, 200, {
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
