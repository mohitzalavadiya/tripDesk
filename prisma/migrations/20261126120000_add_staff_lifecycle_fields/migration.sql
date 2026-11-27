-- Add staff account lifecycle & session revocation fields to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sessionRevokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deactivatedById" TEXT;
