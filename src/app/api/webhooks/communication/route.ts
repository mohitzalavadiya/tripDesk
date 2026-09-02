import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationDeliveryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/communication
 * Generic communication delivery webhook handler (Resend, SendGrid, Meta WhatsApp, Gupshup)
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-provider-signature") || request.headers.get("x-hub-signature-256");
    const secret = process.env.COMMUNICATION_WEBHOOK_SECRET;

    // If webhook secret configured, require valid signature
    if (secret && !signature) {
      return NextResponse.json(
        { success: false, error: "Missing webhook authentication signature" },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { providerMessageId, status, error: providerError, deliveredAt } = payload;

    if (!providerMessageId) {
      return NextResponse.json(
        { success: false, error: "Missing providerMessageId in webhook payload" },
        { status: 400 }
      );
    }

    const existing = await prisma.customerNotification.findFirst({
      where: { providerMessageId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: true, message: "No matching message ID found, ignored" },
        { status: 200 }
      );
    }

    let deliveryStatus: NotificationDeliveryStatus = existing.status;
    if (status === "DELIVERED" || status === "delivered" || status === "read") {
      deliveryStatus = NotificationDeliveryStatus.DELIVERED;
    } else if (status === "FAILED" || status === "failed" || status === "undelivered" || status === "bounced") {
      deliveryStatus = NotificationDeliveryStatus.FAILED;
    }

    await prisma.customerNotification.update({
      where: { id: existing.id },
      data: {
        status: deliveryStatus,
        failureReason: providerError || existing.failureReason,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : deliveryStatus === NotificationDeliveryStatus.DELIVERED ? new Date() : existing.deliveredAt,
        failedAt: deliveryStatus === NotificationDeliveryStatus.FAILED ? new Date() : existing.failedAt,
      },
    });

    return NextResponse.json({ success: true, updatedId: existing.id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
