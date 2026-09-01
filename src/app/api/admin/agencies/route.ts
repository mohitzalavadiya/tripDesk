import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { adminAgencyFilterSchema } from "@/lib/validation/admin-schema";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const { searchParams } = new URL(req.url);

    const filter = adminAgencyFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      subscriptionStatus: searchParams.get("subscriptionStatus") || undefined,
      planId: searchParams.get("planId") || undefined,
      trialState: searchParams.get("trialState") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await adminService.listAgencies(filter);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/agencies error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list agencies" },
      { status: 500 }
    );
  }
}
