-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "agency_invitations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENCY_STAFF',
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_invitations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "enquiries" ADD COLUMN "assignedToUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agency_invitations_tokenHash_key" ON "agency_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "agency_invitations_agencyId_status_idx" ON "agency_invitations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "agency_invitations_email_idx" ON "agency_invitations"("email");

-- CreateIndex
CREATE INDEX "agency_invitations_invitedById_idx" ON "agency_invitations"("invitedById");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_assignedToUserId_idx" ON "enquiries"("agencyId", "assignedToUserId");

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_invitations" ADD CONSTRAINT "agency_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
