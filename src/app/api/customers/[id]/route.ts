import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  NotFoundError,
  requireAgencyOwnerContext,
  enforceStaffPermission,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { customerService } from "@/lib/services/customer-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  customerIdParamSchema,
  updateCustomerSchema,
} from "@/lib/validation/customer-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 * Retrieves comprehensive 360-degree Customer profile.
 * Returns 404 if not found or if the customer belongs to another agency.
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    // const context = await requireReadAccess();
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "CUSTOMERS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view customer records.");
      }
    }

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
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canUpdate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "CUSTOMERS",
        "UPDATE"
      );
      if (!canUpdate) {
        throw new ForbiddenError("You do not have permission to update customer records.");
      }
    }

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
 * Agency Owner only. Destructive deletion is restricted to Agency Owners.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireMemberWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "CUSTOMER_DETAIL", "DELETE");
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
