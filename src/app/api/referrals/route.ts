import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { referralService } from "@/lib/services/referral-service";
import {
  referralFilterSchema,
  referralCreateSchema,
} from "@/lib/validation/referral-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals
 * List agency referrals and summary metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();
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
  } catch (error: any) {
    console.error("GET /api/referrals error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch referrals" },
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
    const authContext = await requireAgencyOwnerContext();
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
  } catch (error: any) {
    console.error("POST /api/referrals error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create referral" },
      { status }
    );
  }
}
