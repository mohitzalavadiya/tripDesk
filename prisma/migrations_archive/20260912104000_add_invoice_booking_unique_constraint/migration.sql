-- CreateIndex
CREATE UNIQUE INDEX "invoices_agencyId_bookingId_key" ON "invoices"("agencyId", "bookingId");
