import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/package-options/generate-default
 * Auto-generates 3 Standard package tiers (Standard, Deluxe, Luxury).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;

    const options = await quotationService.generateDefaultPackageTiers(
      context.agencyId,
      quotationId
    );

    return apiSuccess(options);
  } catch (error) {
    return handleApiError(error);
  }
}
