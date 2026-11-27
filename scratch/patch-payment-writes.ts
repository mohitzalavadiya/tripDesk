import * as fs from "fs";
import * as path from "path";

// 1. Patch booking-service.ts
const bookingPath = path.resolve("src/lib/services/booking-service.ts");
let bookingContent = fs.readFileSync(bookingPath, "utf8");

const bookingTarget = `        await tx.payment.create({
          data: {
            agencyId,
            bookingId: b.id,
            tripId: data.tripId,
            customerId: data.customerId,
            paymentNumber,
            amount: new Prisma.Decimal(paidAmount),
            currency: data.currency || "INR",
            paymentDate: new Date(),
            status: "COMPLETED",
            notes: "Initial advance logged on booking creation.",
          },
        });`;

const bookingReplacement = `        await tx.payment.create({
          data: {
            agencyId,
            bookingId: b.id,
            tripId: data.tripId,
            customerId: data.customerId,
            paymentNumber,
            amount: new Prisma.Decimal(paidAmount),
            currency: data.currency || "INR",
            paymentDate: new Date(),
            status: "COMPLETED",
            notes: "Initial advance logged on booking creation.",
          },
          select: { id: true },
        });`;

if (bookingContent.includes(bookingTarget)) {
  bookingContent = bookingContent.replace(bookingTarget, bookingReplacement);
  fs.writeFileSync(bookingPath, bookingContent, "utf8");
  console.log("Successfully patched booking-service.ts");
} else {
  // Try CRLF / LF normalization match
  const normBooking = bookingContent.replace(/\r\n/g, "\n");
  const normTarget = bookingTarget.replace(/\r\n/g, "\n");
  const normRepl = bookingReplacement.replace(/\r\n/g, "\n");
  if (normBooking.includes(normTarget)) {
    const isCRLF = bookingContent.includes("\r\n");
    let patched = normBooking.replace(normTarget, normRepl);
    if (isCRLF) patched = patched.replace(/\n/g, "\r\n");
    fs.writeFileSync(bookingPath, patched, "utf8");
    console.log("Successfully patched booking-service.ts (normalized)");
  } else {
    console.error("FAILED to find bookingTarget in booking-service.ts");
  }
}

// 2. Patch finance-service.ts
const financePath = path.resolve("src/lib/services/finance-service.ts");
let financeContent = fs.readFileSync(financePath, "utf8");

const financeTarget1 = `      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: input.bookingId,
          tripId: booking.tripId,
          customerId: booking.customerId,
          paymentNumber,
          paymentType: input.paymentType,
          amount: new Prisma.Decimal(input.amount),
          currency: booking.currency || "INR",
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          status: PaymentStatus.COMPLETED,
          referenceNumber: input.referenceNumber,
          receiptNumber: input.receiptNumber,
          receivedBy: input.receivedBy,
          notes: notesWithIdempotency,
        },
      });`;

const financeRepl1 = `      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: input.bookingId,
          tripId: booking.tripId,
          customerId: booking.customerId,
          paymentNumber,
          paymentType: input.paymentType,
          amount: new Prisma.Decimal(input.amount),
          currency: booking.currency || "INR",
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          status: PaymentStatus.COMPLETED,
          referenceNumber: input.referenceNumber,
          receiptNumber: input.receiptNumber,
          receivedBy: input.receivedBy,
          notes: notesWithIdempotency,
        },
        select: PAYMENT_SCALAR_SELECT,
      });`;

const financeTarget2 = `      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: new Prisma.Decimal(newRefundedAmount),
          refundedAt: input.refundDate ? new Date(input.refundDate) : new Date(),
          status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED,
          notes: payment.notes
            ? \`\${payment.notes} | \${refundNoteText}\`
            : refundNoteText,
        },
      });`;

const financeRepl2 = `      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: new Prisma.Decimal(newRefundedAmount),
          refundedAt: input.refundDate ? new Date(input.refundDate) : new Date(),
          status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED,
          notes: payment.notes
            ? \`\${payment.notes} | \${refundNoteText}\`
            : refundNoteText,
        },
        select: PAYMENT_SCALAR_SELECT,
      });`;

const normFinance = financeContent.replace(/\r\n/g, "\n");
const normFTarget1 = financeTarget1.replace(/\r\n/g, "\n");
const normFRepl1 = financeRepl1.replace(/\r\n/g, "\n");
const normFTarget2 = financeTarget2.replace(/\r\n/g, "\n");
const normFRepl2 = financeRepl2.replace(/\r\n/g, "\n");

let patchedFinance = normFinance;
if (patchedFinance.includes(normFTarget1)) {
  patchedFinance = patchedFinance.replace(normFTarget1, normFRepl1);
  console.log("Found financeTarget1");
} else {
  console.error("FAILED to find financeTarget1");
}

if (patchedFinance.includes(normFTarget2)) {
  patchedFinance = patchedFinance.replace(normFTarget2, normFRepl2);
  console.log("Found financeTarget2");
} else {
  console.error("FAILED to find financeTarget2");
}

if (financeContent.includes("\r\n")) {
  patchedFinance = patchedFinance.replace(/\n/g, "\r\n");
}
fs.writeFileSync(financePath, patchedFinance, "utf8");
console.log("Saved finance-service.ts");

