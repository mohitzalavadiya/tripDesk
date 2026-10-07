-- AlterTable: agency_communication_settings (add googleReviewUrl and tripAdvisorReviewUrl columns)
ALTER TABLE "agency_communication_settings" ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT;
ALTER TABLE "agency_communication_settings" ADD COLUMN IF NOT EXISTS "tripAdvisorReviewUrl" TEXT;
