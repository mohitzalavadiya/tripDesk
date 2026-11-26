-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "enquiryId" TEXT;

-- CreateIndex
CREATE INDEX "bookings_enquiryId_idx" ON "bookings"("enquiryId");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
