import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { createProposalItemSchema } from "@/lib/validation/proposal-item-schema";
import { quotationService } from "@/lib/services/quotation-service";
import { ProposalItemType } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]/proposal-items
 * Lists all structured inclusions, exclusions, and notes for a quotation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;
    const typeParam = request.nextUrl.searchParams.get("type") as ProposalItemType | null;

    const items = await quotationService.getProposalItems(
      context.agencyId,
      id,
      typeParam || undefined
    );

    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/[id]/proposal-items
 * Creates a new proposal item (inclusion, exclusion, note) on a quotation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(createProposalItemSchema, request);

    const item = await quotationService.createProposalItem(context.agencyId, id, body);

    return apiCreated(item);
  } catch (error) {
    return handleApiError(error);
  }
}
