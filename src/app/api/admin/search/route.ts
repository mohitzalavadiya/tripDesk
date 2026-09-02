import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { globalSearchSchema } from "@/lib/validation/admin-schema";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const { searchParams } = new URL(req.url);

    const parsed = globalSearchSchema.parse({
      q: searchParams.get("q") || "",
      limit: searchParams.get("limit") || undefined,
    });

    const results = await adminService.globalPlatformSearch(parsed.q, parsed.limit);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to execute platform search" },
      { status: 500 }
    );
  }
}
