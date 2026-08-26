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
  updateCustomerSchema,
  customerIdParamSchema,
} from "@/lib/validation/customer-schema";
import { customerService } from "@/lib/services/customer-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 * Retrieves comprehensive 360-degree Customer profile including enquiries, trips,
 * quotations, bookings, payments, financial aggregates, and derived activity timeline.
 * Returns 404 if not found or if the customer belongs to another agency.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(customerIdParamSchema, await props.params);

    const customer = await customerService.getCustomerDetails(context.agencyId, id);

    if (!customer) {
      throw new NotFoundError("Customer");
    }

    return apiSuccess(customer);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/customers/[id]
 * Updates an existing customer record under the authenticated agency.
 * Enforces write permissions (TRIAL / ACTIVE subscription required).
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(customerIdParamSchema, await props.params);
    const body = await validateJson(updateCustomerSchema, request);

    const updatedCustomer = await customerService.updateCustomer(context.agencyId, id, body);

    return apiSuccess(updatedCustomer);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/customers/[id]
 * Soft-deletes (archives) a customer record by setting archivedAt.
 * Preserves historical references for trips, quotations, and bookings.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(customerIdParamSchema, await props.params);

    const archivedCustomer = await customerService.archiveCustomer(context.agencyId, id);

    return apiSuccess({
      message: "Customer archived successfully.",
      customer: archivedCustomer,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
