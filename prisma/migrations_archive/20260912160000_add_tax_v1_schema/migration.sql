-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');

-- CreateEnum
CREATE TYPE "GstTreatment" AS ENUM ('INTRA_STATE', 'INTER_STATE', 'NON_GST_EXEMPT');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cgstAmount" DECIMAL(12,2),
ADD COLUMN     "gstTreatment" "GstTreatment",
ADD COLUMN     "igstAmount" DECIMAL(12,2),
ADD COLUMN     "sgstAmount" DECIMAL(12,2),
ADD COLUMN     "taxAmount" DECIMAL(12,2),
ADD COLUMN     "taxMode" "TaxMode",
ADD COLUMN     "taxRate" DECIMAL(5,2),
ADD COLUMN     "taxableAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "gstTreatment" "GstTreatment" DEFAULT 'INTRA_STATE',
ADD COLUMN     "igstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "taxMode" "TaxMode" DEFAULT 'EXCLUSIVE',
ADD COLUMN     "taxRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "taxableAmount" DECIMAL(12,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "quotation_package_options" ADD COLUMN     "cgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "gstTreatment" "GstTreatment" DEFAULT 'INTRA_STATE',
ADD COLUMN     "igstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "taxMode" "TaxMode" DEFAULT 'EXCLUSIVE',
ADD COLUMN     "taxRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "taxableAmount" DECIMAL(12,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "cgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "gstTreatment" "GstTreatment" DEFAULT 'INTRA_STATE',
ADD COLUMN     "igstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "taxMode" "TaxMode" DEFAULT 'EXCLUSIVE',
ADD COLUMN     "taxRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "taxableAmount" DECIMAL(12,2) DEFAULT 0;

-- CreateTable
CREATE TABLE "agency_tax_profiles" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "isGstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "legalBusinessName" TEXT,
    "registeredAddress" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "defaultTaxMode" "TaxMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "defaultGstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "defaultGstTreatment" "GstTreatment" NOT NULL DEFAULT 'INTRA_STATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agency_tax_profiles_agencyId_key" ON "agency_tax_profiles"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_rate_key" ON "tax_rates"("rate");

-- AddForeignKey
ALTER TABLE "agency_tax_profiles" ADD CONSTRAINT "agency_tax_profiles_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
