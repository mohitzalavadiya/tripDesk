-- AlterTable: Add verifiedById and verifiedAt to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- AlterTable: Add initialPermissions to agency_invitations
ALTER TABLE "agency_invitations" ADD COLUMN IF NOT EXISTS "initialPermissions" JSONB;

-- CreateTable: staff_permission_profiles
CREATE TABLE IF NOT EXISTS "staff_permission_profiles" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_permission_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agency_audit_logs
CREATE TABLE IF NOT EXISTS "agency_audit_logs" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "staff_permission_profiles_userId_key" ON "staff_permission_profiles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "staff_permission_profiles_agencyId_userId_idx" ON "staff_permission_profiles"("agencyId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agency_audit_logs_agencyId_createdAt_idx" ON "agency_audit_logs"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agency_audit_logs_agencyId_targetUserId_idx" ON "agency_audit_logs"("agencyId", "targetUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agency_audit_logs_agencyId_action_idx" ON "agency_audit_logs"("agencyId", "action");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_permission_profiles_agencyId_fkey') THEN
        ALTER TABLE "staff_permission_profiles" ADD CONSTRAINT "staff_permission_profiles_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_permission_profiles_userId_fkey') THEN
        ALTER TABLE "staff_permission_profiles" ADD CONSTRAINT "staff_permission_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_audit_logs_agencyId_fkey') THEN
        ALTER TABLE "agency_audit_logs" ADD CONSTRAINT "agency_audit_logs_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
