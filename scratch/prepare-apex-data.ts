import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";

async function main() {
  const apexAgency = await prisma.agency.findFirst({
    where: { name: { contains: "Apex" } },
    include: {
      customers: true,
      trips: true,
    },
  });

  if (!apexAgency) {
    console.log("No Apex agency found");
    return;
  }

  console.log("Apex Agency ID:", apexAgency.id);

  // Ensure customer
  let customer = apexAgency.customers[0];
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        agencyId: apexAgency.id,
        name: "Rajesh Kumar",
        phone: "+91 98765 43210",
        email: "rajesh@example.com",
      },
    });
  }

  // Ensure trip
  let trip = apexAgency.trips[0];
  if (!trip) {
    trip = await prisma.trip.create({
      data: {
        agencyId: apexAgency.id,
        customerId: customer.id,
        title: "Golden Triangle Tour",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        status: "CONFIRMED",
      },
    });
  }

  // Create Booking 1 (CONFIRMED with invoice)
  let booking1 = await prisma.booking.findFirst({
    where: { agencyId: apexAgency.id, bookingNumber: "BK-APEX-001" },
    include: { invoices: true },
  });

  if (!booking1) {
    booking1 = await prisma.booking.create({
      data: {
        agencyId: apexAgency.id,
        customerId: customer.id,
        tripId: trip.id,
        bookingNumber: "BK-APEX-001",
        status: "CONFIRMED",
        totalAmount: 95000,
        paidAmount: 35000,
        balanceAmount: 60000,
      },
      include: { invoices: true },
    });
  }

  const invoice = await invoiceService.getOrCreateInvoiceForBooking(apexAgency.id, booking1.id);
  console.log("Apex Booking 1 (WITH invoice):", booking1.id, "Invoice:", invoice.id, invoice.invoiceNumber);

  // Create Booking 2 (CONFIRMED without invoice)
  let booking2 = await prisma.booking.findFirst({
    where: { agencyId: apexAgency.id, bookingNumber: "BK-APEX-002" },
    include: { invoices: true },
  });

  if (!booking2) {
    booking2 = await prisma.booking.create({
      data: {
        agencyId: apexAgency.id,
        customerId: customer.id,
        tripId: trip.id,
        bookingNumber: "BK-APEX-002",
        status: "CONFIRMED",
        totalAmount: 45000,
        paidAmount: 0,
        balanceAmount: 45000,
      },
      include: { invoices: true },
    });
  }
  console.log("Apex Booking 2 (WITHOUT invoice):", booking2.id);
}

main().finally(() => prisma.$disconnect());
