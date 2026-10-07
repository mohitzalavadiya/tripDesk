-- DropForeignKey
ALTER TABLE "rate_sheets" DROP CONSTRAINT IF EXISTS "rate_sheets_activityId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "rate_sheets_activityId_idx";

-- AlterTable: rate_sheets (remove activity fields and set default HOTEL)
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "activityId";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "adultCost";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "childCost";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "infantCost";
ALTER TABLE "rate_sheets" ALTER COLUMN "inventoryType" SET DEFAULT 'HOTEL';
