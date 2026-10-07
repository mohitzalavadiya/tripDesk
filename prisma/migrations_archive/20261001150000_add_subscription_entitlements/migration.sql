-- CreateTable
CREATE TABLE "plan_feature_entitlements" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "limit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_usage_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_feature_entitlements_planId_idx" ON "plan_feature_entitlements"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_entitlements_planId_featureKey_key" ON "plan_feature_entitlements"("planId", "featureKey");

-- CreateIndex
CREATE INDEX "plan_usage_limits_planId_idx" ON "plan_usage_limits"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usage_limits_planId_resourceKey_key" ON "plan_usage_limits"("planId", "resourceKey");

-- CreateIndex
CREATE INDEX "bookings_agencyId_createdAt_idx" ON "bookings"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "quotations_agencyId_createdAt_idx" ON "quotations"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "trips_agencyId_createdAt_idx" ON "trips"("agencyId", "createdAt");

-- AddForeignKey
ALTER TABLE "plan_feature_entitlements" ADD CONSTRAINT "plan_feature_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_limits" ADD CONSTRAINT "plan_usage_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
