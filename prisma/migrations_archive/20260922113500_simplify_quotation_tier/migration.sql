-- Add tier to quotations
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'Deluxe';

-- Drop foreign key and index on selectedPackageOptionId if exists
ALTER TABLE "quotations" DROP CONSTRAINT IF EXISTS "quotations_selectedPackageOptionId_fkey";
DROP INDEX IF EXISTS "quotations_selectedPackageOptionId_idx";

-- Drop selectedPackageOptionId column
ALTER TABLE "quotations" DROP COLUMN IF EXISTS "selectedPackageOptionId";

-- Drop quotation_package_options table
DROP TABLE IF EXISTS "quotation_package_options" CASCADE;
