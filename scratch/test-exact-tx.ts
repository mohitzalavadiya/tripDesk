import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { paymentService } from "../src/lib/services/payment-service";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

async function main() {
  console.log("Starting real write path verification against PostgreSQL database...");

  const agency = await prisma.agency.findFirst({ select: { id: true } });
  if (!agency) {
    console.log("No agency found.");
    return;
  }
  const agencyId = agency.id;

  let customerId: string | null = null;
  let tripId: string | null = null;
  let bookingId: string | null = null;
  let paymentId: string | null = null;

  try {
    // 1. Create a test customer
    const customer = await prisma.customer.create({
      data: {
        agency: { connect: { id: agencyId } },
        name: "Test Payment Verification Customer",
        email: `test.verify.${Date.now()}@example.com`,
        phone: "+919999999999",
      },
      select: { id: true },
    });
    customerId = customer.id;

    // 2. Create a test trip
    const trip = await prisma.trip.create({
      data: {
        agency: { connect: { id: agencyId } },
        customer: { connect: { id: customer.id } },
        title: "Test Trip Verification",
        tripNumber: `TRIP-TEST-${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 5),
        status: "DRAFT",
      },
      select: { id: true },
    });
    tripId = trip.id;

    // 3. Create a test booking
    const booking = await prisma.booking.create({
      data: {
        agency: { connect: { id: agencyId } },
        customer: { connect: { id: customer.id } },
        trip: { connect: { id: trip.id } },
        bookingNumber: `BKG-TEST-${Date.now()}`,
        totalAmount: 50000,
        currency: "INR",
        status: "CONFIRMED",
      },
      select: { id: true, tripId: true, customerId: true, currency: true, totalAmount: true },
    });
    bookingId = booking.id;

    console.log("Created test fixtures:", { customerId, tripId, bookingId });

    // 4. Test paymentService.createPayment write path
    const p = await paymentService.createPayment(
      agencyId,
      {
        bookingId: booking.id,
        amount: 15000,
        paymentMethod: PaymentMethod.UPI,
        notes: "Initial test payment",
      },
      { role: "AGENCY_STAFF", userId: "00000000-0000-0000-0000-000000000000" }
    );
    paymentId = p.id;
    console.log("1. createPayment succeeded:", p.id, p.paymentNumber, p.status);

    // 5. Test paymentService.updatePayment write path
    const updated = await paymentService.updatePayment(
      agencyId,
      p.id,
      {
        notes: "Updated verification note",
        referenceNumber: "UPI12345678",
      }
    );
    console.log("2. updatePayment succeeded:", updated.id, updated.notes);

    // 6. Test paymentService.verifyStaffReceipt / verifyPaymentReceipt write path
    const verified = await paymentService.verifyStaffReceipt(
      agencyId,
      p.id,
      "00000000-0000-0000-0000-000000000000"
    );
    console.log("3. verifyStaffReceipt succeeded:", verified.id, verified.status);

    // 7. Test paymentService.voidStaffReceipt / voidPaymentReceipt write path
    const voided = await paymentService.voidStaffReceipt(
      agencyId,
      p.id,
      "00000000-0000-0000-0000-000000000000",
      "Test receipt voiding reason"
    );
    console.log("4. voidStaffReceipt succeeded:", voided.id, voided.status);

    // 8. Test paymentService.archivePayment write path
    const archived = await paymentService.archivePayment(agencyId, p.id);
    console.log("5. archivePayment succeeded:", archived.id, archived.archivedAt);

    console.log("ALL REAL PAYMENT WRITES PASSED SUCCESSFULLY AGAINST POSTGRESQL!");
  } finally {
    // Clean up test data
    console.log("Cleaning up test fixtures...");
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    if (bookingId) await prisma.booking.deleteMany({ where: { id: bookingId } });
    if (tripId) await prisma.trip.deleteMany({ where: { id: tripId } });
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    console.log("Cleanup complete.");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error("TEST FAILED:", e); process.exit(1); });
