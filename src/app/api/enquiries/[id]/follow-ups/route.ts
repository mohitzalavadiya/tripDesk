import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { createFollowUpSchema } from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/enquiries/[id]/follow-ups
 * List follow-up timeline activities for an enquiry.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id: enquiryId } = await params;

    const followUps = await enquiryService.getFollowUps(context.agencyId, enquiryId);

    return apiSuccess(followUps);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/enquiries/[id]/follow-ups
 * Add a follow-up interaction or scheduled call for an enquiry.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: enquiryId } = await params;
    const body = await validateJson(createFollowUpSchema, request);

    const newFollowUp = await enquiryService.createFollowUp(context.agencyId, enquiryId, body);

    return apiCreated(newFollowUp);
  } catch (error) {
    return handleApiError(error);
  }
}
