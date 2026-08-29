import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { createOperationalIssueSchema } from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idParamSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/operations/[id]/issues
 * Reports an operational blocker/issue for the operation.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(createOperationalIssueSchema, request);

    const issue = await operationsService.createIssue(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiCreated(issue);
  } catch (error) {
    return handleApiError(error);
  }
}
