import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { hasPermission } from "@/lib/auth/permissions";
import { enquiryService } from "@/lib/services/enquiry-service";
import { assignLeadSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/enquiries/[id]/assign
 * Controlled, tenant-isolated lead assignment and handoff flow with concurrency protection
 * and auditable timeline event persistence.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();

    if (!hasPermission(context.dbUser.role, "LEAD_ASSIGNMENT", "REASSIGN")) {
      throw new ForbiddenError("You do not have permission to reassign enquiries.");
    }

    const { id } = await params;
    const body = await validateJson(assignLeadSchema, request);

    const actor = {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || "Agency Owner",
    };

    const updated = await enquiryService.reassignEnquiry(context.agencyId, id, body, actor);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
