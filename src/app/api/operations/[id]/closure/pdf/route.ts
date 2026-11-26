import { ForbiddenError, handleApiError, requireReadAccess } from "@/lib/api";
import { canAccessFinancialMargins } from "@/lib/auth/permissions";
import { operationsDocumentService } from "@/lib/services/operations-document-service";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/operations/[id]/closure/pdf
 * Generates and returns the internal Operations Closure & Financial Reconciliation Report PDF.
 * Restricted to Agency Owners (contains internal planned/actual costs and margins).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    if (!canAccessFinancialMargins(context.dbUser.role)) {
      throw new ForbiddenError("Financial closure reports are restricted to Agency Owners.");
    }
    const { id } = await params;

    const { buffer, filename } =
      await operationsDocumentService.generateClosureSummary(
        context.agencyId,
        id,
        context.dbUser?.name || "Operations Lead"
      );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
