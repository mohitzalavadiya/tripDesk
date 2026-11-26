import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { paymentService, checkHasPaymentVerificationColumns } from "../src/lib/services/payment-service";

async function main() {
  console.log("Checking payment verification columns in DB...");
  const hasCols = await checkHasPaymentVerificationColumns(prisma);
  console.log("hasVerificationCols:", hasCols);

  const agency = await prisma.agency.findFirst({ select: { id: true } });
  if (!agency) {
    console.log("No agency found.");
    return;
  }
  console.log("Found agency:", agency.id);

  const booking = await prisma.booking.findFirst({
    where: { agencyId: agency.id },
    select: { id: true, customerId: true, tripId: true, totalAmount: true }
  });
  console.log("Found booking:", booking?.id);

  const existingPayment = await prisma.payment.findFirst({
    where: { agencyId: agency.id, archivedAt: null },
    select: { id: true, amount: true, status: true }
  });
  console.log("Found existing payment:", existingPayment?.id, existingPayment?.status);

  // Test updatePayment in a rolled back transaction or test run
  if (existingPayment) {
    try {
      console.log("Testing updatePayment on payment:", existingPayment.id);
      // We will run inside a transaction that throws to roll back
      await prisma.$transaction(async (tx) => {
        // Test update
        const updated = await tx.payment.update({
          where: { id: existingPayment.id },
          data: { notes: "Test update for schema compatibility" },
          select: { id: true, notes: true }
        });
        console.log("Update executed successfully inside tx:", updated.id);
        throw new Error("ROLLBACK_TEST");
      });
    } catch (e: any) {
      if (e.message === "ROLLBACK_TEST") {
        console.log("Update test verified and rolled back cleanly!");
      } else {
        console.error("Update test failed with real error:", e);
      }
    }

    // Now test verifyPaymentReceipt logic
    try {
      console.log("Testing verifyPaymentReceipt logic on payment:", existingPayment.id);
      await prisma.$transaction(async (tx) => {
        const hasCols = await checkHasPaymentVerificationColumns(tx);
        const updateData: any = { status: "COMPLETED" };
        if (hasCols) {
          updateData.verifiedById = "00000000-0000-0000-0000-000000000000";
          updateData.verifiedAt = new Date();
        }
        const updated = await tx.payment.update({
          where: { id: existingPayment.id },
          data: updateData,
          select: { id: true, status: true }
        });
        console.log("Verify update executed successfully inside tx:", updated.id, updated.status);
        throw new Error("ROLLBACK_VERIFY_TEST");
      });
    } catch (e: any) {
      if (e.message === "ROLLBACK_VERIFY_TEST") {
        console.log("Verify test verified and rolled back cleanly!");
      } else {
        console.error("Verify test failed with real error:", e);
      }
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

