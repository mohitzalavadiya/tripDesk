import "dotenv/config";

// Mock server-only for standalone test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from "../src/lib/prisma";

async function applyMigration() {
  console.log("Applying non-destructive additive migration for Phase 10.15C...");

  const queries = [
    `DO $$ BEGIN
        CREATE TYPE "CustomerNotificationType" AS ENUM ('TRIP_CONFIRMED', 'TRIP_UPDATED', 'HOTEL_CONFIRMED', 'HOTEL_AMENDED', 'HOTEL_CANCELLED', 'VEHICLE_ASSIGNED', 'VEHICLE_UPDATED', 'ACTIVITY_CONFIRMED', 'ACTIVITY_AMENDED', 'ACTIVITY_CANCELLED', 'DOCUMENT_READY', 'PAYMENT_RECEIVED', 'PAYMENT_DUE', 'PAYMENT_REFUNDED', 'TRIP_DEPARTING', 'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED', 'TRIP_DELAY', 'OPERATIONS_ALERT', 'FEEDBACK_REQUEST');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `CREATE TABLE IF NOT EXISTS "customer_notifications" (
        "id" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "tripId" TEXT,
        "bookingId" TEXT,
        "type" "CustomerNotificationType" NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
        "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'SENT',
        "idempotencyKey" TEXT,
        "linkUrl" TEXT,
        "metadata" JSONB,
        "readAt" TIMESTAMP(3),
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE TABLE IF NOT EXISTS "customer_notification_preferences" (
        "id" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "customerId" TEXT NOT NULL,
        "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
        "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
        "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
        "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
        "tripUpdates" BOOLEAN NOT NULL DEFAULT true,
        "paymentAlerts" BOOLEAN NOT NULL DEFAULT true,
        "documentAlerts" BOOLEAN NOT NULL DEFAULT true,
        "serviceUpdates" BOOLEAN NOT NULL DEFAULT true,
        "marketingMessages" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "customer_notification_preferences_pkey" PRIMARY KEY ("id")
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "customer_notifications_agencyId_idempotencyKey_key" ON "customer_notifications"("agencyId", "idempotencyKey");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_agencyId_idx" ON "customer_notifications"("agencyId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_customerId_idx" ON "customer_notifications"("customerId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_tripId_idx" ON "customer_notifications"("tripId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_bookingId_idx" ON "customer_notifications"("bookingId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_agencyId_customerId_status_idx" ON "customer_notifications"("agencyId", "customerId", "status");`,
    `CREATE INDEX IF NOT EXISTS "customer_notifications_agencyId_customerId_createdAt_idx" ON "customer_notifications"("agencyId", "customerId", "createdAt");`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_key" ON "customer_notification_preferences"("customerId");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "customer_notification_preferences_agencyId_customerId_key" ON "customer_notification_preferences"("agencyId", "customerId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notification_preferences_agencyId_idx" ON "customer_notification_preferences"("agencyId");`,
    `CREATE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_idx" ON "customer_notification_preferences"("customerId");`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,

    `DO $$ BEGIN
        ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;`,
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log("Migration executed successfully!");
  await prisma.$disconnect();
}

applyMigration().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
