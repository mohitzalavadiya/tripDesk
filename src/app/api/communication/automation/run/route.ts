import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { communicationService } from "@/lib/services/communication-service";
import { runAutomationSchema } from "@/lib/validation/communication-schema";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/communication/automation/run
 * Trigger automated background reminder checks (Payment milestones, Upcoming trips, Feedback requests).
 * 
 * Supports two execution modes:
 * 1. Server-side Cron: Verified via `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
 *    Processes all active agencies across the platform safely.
 * 2. Interactive Agency Owner: Verified via session `requireWriteAccess()`
 *    Processes only the authenticated agency.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;

    const isBearerCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isHeaderCron = !!cronSecret && cronHeader === cronSecret;
    const isCronAuthorized = isBearerCron || isHeaderCron;

    const body = await validateJson(runAutomationSchema, request).catch(() => ({ scope: "all" as const }));

    let targetAgencyIds: string[] = [];

    if (isCronAuthorized) {
      logger.info("Automation triggered via authorized server-side CRON", { scope: body.scope });
      const activeAgencies = await prisma.agency.findMany({
        where: {
          status: "ACTIVE",
        },
        select: { id: true },
      });
      targetAgencyIds = activeAgencies.map((a) => a.id);
    } else {
      const context = await requireWriteAccess();
      targetAgencyIds = [context.agencyId];
    }

    let paymentRemindersSent = 0;
    let travelRemindersSent = 0;
    let feedbackRequestsSent = 0;

    for (const agencyId of targetAgencyIds) {
      if (body.scope === "all" || body.scope === "payment_reminders") {
        const res = await communicationService.runPaymentReminders(agencyId);
        paymentRemindersSent += res.sentCount;
      }

      if (body.scope === "all" || body.scope === "travel_reminders") {
        const res = await communicationService.runTravelReminders(agencyId);
        travelRemindersSent += res.sentCount;
      }

      if (body.scope === "all" || body.scope === "feedback_requests") {
        const res = await communicationService.runFeedbackRequests(agencyId);
        feedbackRequestsSent += res.sentCount;
      }
    }

    return apiSuccess({
      success: true,
      mode: isCronAuthorized ? "CRON" : "SESSION",
      agenciesProcessed: targetAgencyIds.length,
      summary: {
        paymentRemindersSent,
        travelRemindersSent,
        feedbackRequestsSent,
        totalDispatched: paymentRemindersSent + travelRemindersSent + feedbackRequestsSent,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
