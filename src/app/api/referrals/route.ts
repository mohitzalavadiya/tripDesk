import { enforceStaffPermission, requireReadAccess, requireWriteAccess } from "@/lib/api";
import { referralService } from "@/lib/services/referral-service";
import {
referralCreateSchema,
referralFilterSchema,
} from "@/lib/validation/referral-schema";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals
 * List agency referrals and summary metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requireReadAccess();
    await enforceStaffPermission(
      authContext.dbUser.role,
      authContext.agencyId,
      authContext.dbUser.id,
      "REFERRALS",
      "VIEW"
    );
    const { searchParams } = new URL(request.url);

    const filter = referralFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      referrerCustomerId: searchParams.get("referrerCustomerId") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await referralService.listReferrals(authContext.agencyId, filter);

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error: unknown) {
    console.error("GET /api/referrals error:", error);
    const err = error as { statusCode?: number; name?: string; message?: string };
    const status = err.statusCode || (err.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch referrals" },
      { status }
    );
  }
}

/**
 * POST /api/referrals
 * Record a new customer referral.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireWriteAccess();
    await enforceStaffPermission(
      authContext.dbUser.role,
      authContext.agencyId,
      authContext.dbUser.id,
      "REFERRALS",
      "CREATE"
    );
    const body = await request.json();
    const validatedInput = referralCreateSchema.parse(body);

    const referral = await referralService.createReferral(
      authContext.agencyId,
      validatedInput
    );

    return NextResponse.json({
      success: true,
      data: referral,
    });
  } catch (error: unknown) {
    console.error("POST /api/referrals error:", error);
    const err = error as { statusCode?: number; name?: string; message?: string };
    const status = err.statusCode || (err.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create referral" },
      { status }
    );
  }
}
