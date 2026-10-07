-- CreateEnum
CREATE TYPE "UserNotificationType" AS ENUM (
  'AGENCY_SIGNUP',
  'SUBSCRIPTION_PAYMENT_SUBMITTED',
  'SUBSCRIPTION_PAYMENT_VERIFIED',
  'SUBSCRIPTION_PAYMENT_REJECTED',
  'AGENCY_STATUS_CHANGED',
  'QUOTATION_ACCEPTED',
  'QUOTATION_CHANGE_REQUESTED',
  'BOOKING_CREATED',
  'PAYMENT_RECEIVED',
  'CUSTOMER_ENQUIRY_CREATED',
  'PLATFORM_ANNOUNCEMENT'
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "role" "UserRole" NOT NULL,
    "type" "UserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_userId_idempotencyKey_key" ON "user_notifications"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "user_notifications_userId_isRead_createdAt_idx" ON "user_notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "user_notifications_agencyId_isRead_createdAt_idx" ON "user_notifications"("agencyId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
