import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateRouteParams,
} from "@/lib/api";
import { supplierIdParamSchema } from "@/lib/validation/supplier-schema";
import { supplierService } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/suppliers/[id]/reactivate
 * Reactivates an archived or inactive supplier.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(supplierIdParamSchema, await props.params);

    const reactivatedSupplier = await supplierService.reactivateSupplier(context.agencyId, id);

    return apiSuccess({
      message: "Supplier reactivated successfully.",
      supplier: reactivatedSupplier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
