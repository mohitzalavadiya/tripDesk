import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { customerService } from "@/lib/services/customer-service";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/validation/field-validators";
import { z } from "zod";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const resolveOrCreateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(3, "Valid phone number is required")
    .max(30)
    .refine((val) => isValidPhoneNumber(val), "Please provide a valid phone number (digits, optional country code prefix, 7-15 digits).")
    .transform((val) => normalizePhoneNumber(val)),
  email: z.string().trim().email().max(120).optional().nullable(),
});

/**
 * POST /api/customers/resolve-or-create
 * Resolves an existing customer by phone/email or creates a new one safely
 * adhering to Section 4.4 duplicate policy.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "CUSTOMERS", "CREATE");
    const body = await validateJson(resolveOrCreateCustomerSchema, request);

    const result = await customerService.resolveOrCreateCustomerForEnquiry(
      context.agencyId,
      body
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
