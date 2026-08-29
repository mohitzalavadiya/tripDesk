import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { updateOperationalIssueSchema } from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
  issueId: z.string().min(1, "Issue ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string; issueId: string }>;
}

/**
 * PATCH /api/operations/[id]/issues/[issueId]
 * Updates issue details, changes priority/status, or records resolution.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, issueId } = validateRouteParams(
      paramsSchema,
      await props.params
    );
    const body = await validateJson(updateOperationalIssueSchema, request);

    const updated = await operationsService.updateIssue(
      context.agencyId,
      id,
      issueId,
      body,
      context.dbUser.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
