-- CreateEnum
CREATE TYPE "ItineraryTemplateType" AS ENUM ('DAY', 'PACKAGE');

-- CreateTable
CREATE TABLE "itinerary_templates" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "destinationId" TEXT,
    "type" "ItineraryTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayCount" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itinerary_templates_agencyId_idx" ON "itinerary_templates"("agencyId");

-- CreateIndex
CREATE INDEX "itinerary_templates_agencyId_type_idx" ON "itinerary_templates"("agencyId", "type");

-- CreateIndex
CREATE INDEX "itinerary_templates_agencyId_destinationId_idx" ON "itinerary_templates"("agencyId", "destinationId");

-- CreateIndex
CREATE INDEX "itinerary_templates_agencyId_isArchived_idx" ON "itinerary_templates"("agencyId", "isArchived");

-- AddForeignKey
ALTER TABLE "itinerary_templates" ADD CONSTRAINT "itinerary_templates_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_templates" ADD CONSTRAINT "itinerary_templates_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
