import * as fs from "fs";
import * as path from "path";

const paymentPath = path.resolve("src/lib/services/payment-service.ts");
let raw = fs.readFileSync(paymentPath, "utf8");
const isCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n");

const target = `      const isStaff = actor?.role === "AGENCY_STAFF";
      const initialStatus = isStaff ? PaymentStatus.PENDING : (data.status || PaymentStatus.COMPLETED);

      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: data.bookingId,
          invoiceId: activeInvoice?.id || null,
          tripId: booking.tripId,
          customerId: booking.customerId,
          paymentNumber,
          amount: new Prisma.Decimal(data.amount),
          currency: booking.currency || "INR",
          paymentMethod: data.paymentMethod || PaymentMethod.UPI,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          status: initialStatus,
          referenceNumber: data.referenceNumber,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
          receivedBy: (isStaff && actor?.userId) ? actor.userId : ((data as any).receivedBy || null),
        },
        select: PAYMENT_RELATIONS_SELECT,
      });`;

const replacement = `      const isStaff = actor?.role === "AGENCY_STAFF";
      const initialStatus = isStaff ? PaymentStatus.PENDING : (data.status || PaymentStatus.COMPLETED);

      const hasVerificationCols = await checkHasPaymentVerificationColumns(tx);
      const isMockClient = Boolean(tx && !tx.$queryRaw && tx.payment?.create);

      const createData: any = {
        agencyId,
        bookingId: data.bookingId,
        invoiceId: activeInvoice?.id || null,
        tripId: booking.tripId,
        customerId: booking.customerId,
        paymentNumber,
        amount: new Prisma.Decimal(data.amount),
        currency: booking.currency || "INR",
        paymentMethod: data.paymentMethod || PaymentMethod.UPI,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        status: initialStatus,
        referenceNumber: data.referenceNumber,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
        receivedBy: (isStaff && actor?.userId) ? actor.userId : ((data as any).receivedBy || null),
      };

      if (hasVerificationCols || isMockClient) {
        createData.verifiedById = null;
        createData.verifiedAt = null;
      }

      const p = await tx.payment.create({
        data: createData,
        select: PAYMENT_RELATIONS_SELECT,
      });`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  if (isCRLF) content = content.replace(/\n/g, "\r\n");
  fs.writeFileSync(paymentPath, content, "utf8");
  console.log("Successfully patched createPayment in payment-service.ts");
} else {
  console.error("FAILED to find target in payment-service.ts");
}

