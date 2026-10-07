-- AlterTable: Make supplierId nullable and add payeeName, origin to supplier_payables
ALTER TABLE "supplier_payables" ALTER COLUMN "supplierId" DROP NOT NULL;
ALTER TABLE "supplier_payables" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;
ALTER TABLE "supplier_payables" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'AUTOMATIC';

-- AlterTable: Make supplierId nullable and add payeeName to supplier_payments
ALTER TABLE "supplier_payments" ALTER COLUMN "supplierId" DROP NOT NULL;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;
