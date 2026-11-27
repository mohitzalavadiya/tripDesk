import {
apiSuccess,
handleApiError,
requireReadAccess,
} from "@/lib/api";
import { taxProfileService } from "@/lib/services/tax-profile-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/tax-rates
 * List active commercial tax rates from DB catalog
 */
export async function GET() {
  try {
    // Requires authenticated agency owner context
    await requireReadAccess();
    const rates = await taxProfileService.listActiveTaxRates();

    return apiSuccess(rates);
  } catch (error) {
    return handleApiError(error);
  }
}
