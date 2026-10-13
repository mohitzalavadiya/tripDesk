-- AlterEnum: Add FIXED to VehiclePricingType
ALTER TYPE "VehiclePricingType" ADD VALUE IF NOT EXISTS 'FIXED';

-- AlterTable: vehicles (remove driver & pricing fields)
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "driverName";
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "driverPhone";
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "pricingType";
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "baseRate";
ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "ratePerKm";

-- AlterTable: trip_vehicles (add actualKm, default FIXED)
ALTER TABLE "trip_vehicles" ADD COLUMN IF NOT EXISTS "actualKm" DECIMAL(10,2);
ALTER TABLE "trip_vehicles" ALTER COLUMN "pricingType" SET DEFAULT 'FIXED';

-- AlterTable: rate_sheets (remove vehicle fields)
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "vehicleId";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "vehiclePricingType";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "ratePerKm";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "minimumKm";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "totalRate";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "extraKmRate";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "driverAllowance";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "nightAllowance";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "tollIncluded";
ALTER TABLE "rate_sheets" DROP COLUMN IF EXISTS "parkingIncluded";
