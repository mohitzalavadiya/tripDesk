import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action") || undefined;
    const agencyId = searchParams.get("agencyId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const logs = await adminService.listPlatformAuditLogs({ action, agencyId, limit });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/audit-logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
