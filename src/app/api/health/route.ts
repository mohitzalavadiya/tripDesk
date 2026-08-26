import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Perform lightweight database connectivity check
    await prisma.$queryRaw`SELECT 1`;

    return apiSuccess({
      status: "healthy",
      service: "TripDesk API",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check database connectivity failure:", err instanceof Error ? err.message : err);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database connectivity check failed.",
        },
      },
      { status: 503 }
    );
  }
}
