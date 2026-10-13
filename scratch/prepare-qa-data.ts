import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";

async function main() {
  const booking1 = await prisma.booking.findFirst({
    where: { status: "CONFIRMED" },
    include: { agency: true, invoices: true },
  });

  if (!booking1) {
    console.log("No confirmed booking found");
    return;
  }

  console.log("Booking 1 (will generate invoice):", booking1.id, booking1.bookingNumber);
  const inv = await invoiceService.getOrCreateInvoiceForBooking(booking1.agencyId, booking1.id);
  console.log("Invoice created/found:", inv.id, inv.invoiceNumber);

  const booking2 = await prisma.booking.findFirst({
    where: {
      status: "CONFIRMED",
      id: { not: booking1.id },
      invoices: { none: {} },
    },
    include: { agency: true },
  });

  if (booking2) {
    console.log("Booking 2 (NO invoice):", booking2.id, booking2.bookingNumber);
  }
}

main().finally(() => prisma.$disconnect());
