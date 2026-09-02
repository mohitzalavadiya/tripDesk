import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import {
  subscriptionPaymentFilterSchema,
  subscriptionPaymentCreateSchema,
} from "@/lib/validation/admin-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/subscription-payments
 * List SaaS subscription payments with filtering, pagination, and summary telemetry.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requirePlatformOwnerContext();
    const { searchParams } = new URL(request.url);

    const filter = subscriptionPaymentFilterSchema.parse({
      status: searchParams.get("status") || undefined,
      agencyId: searchParams.get("agencyId") || undefined,
      subscriptionId: searchParams.get("subscriptionId") || undefined,
      planId: searchParams.get("planId") || undefined,
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await adminService.listSubscriptionPayments(filter);

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/subscription-payments error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscription payments" },
      { status }
    );
  }
}

/**
 * POST /api/admin/subscription-payments
 * Record a manual SaaS subscription payment.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requirePlatformOwnerContext();
    const body = await request.json();
    const validatedInput = subscriptionPaymentCreateSchema.parse(body);

    const payment = await adminService.createSubscriptionPayment(
      validatedInput,
      authContext.dbUser.id
    );

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error("POST /api/admin/subscription-payments error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record subscription payment" },
      { status }
    );
  }
}
