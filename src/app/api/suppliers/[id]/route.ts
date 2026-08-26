import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
  NotFoundError,
} from "@/lib/api";
import {
  updateSupplierSchema,
  supplierIdParamSchema,
} from "@/lib/validation/supplier-schema";
import { supplierService } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/[id]
 * Retrieves comprehensive Supplier profile with linked hotels, vehicles, activities, and rate sheets.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(supplierIdParamSchema, await props.params);

    const supplier = await supplierService.getSupplierDetails(context.agencyId, id);

    if (!supplier) {
      throw new NotFoundError("Supplier");
    }

    return apiSuccess(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/suppliers/[id]
 * Updates an existing supplier record under the authenticated agency.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(supplierIdParamSchema, await props.params);
    const body = await validateJson(updateSupplierSchema, request);

    const updatedSupplier = await supplierService.updateSupplier(context.agencyId, id, body);

    return apiSuccess(updatedSupplier);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/suppliers/[id]
 * Soft-deletes (archives) a supplier record.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(supplierIdParamSchema, await props.params);

    const archivedSupplier = await supplierService.archiveSupplier(context.agencyId, id);

    return apiSuccess({
      message: "Supplier archived successfully.",
      supplier: archivedSupplier,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
