import * as fs from "fs";
import * as path from "path";

// 1. finance-service.ts
const fPath = path.resolve("src/lib/services/finance-service.ts");
let fRaw = fs.readFileSync(fPath, "utf8");
const fIsCRLF = fRaw.includes("\r\n");
let fContent = fRaw.replace(/\r\n/g, "\n");

fContent = fContent.replace(
  "    return payment;\n  },\n\n  /**\n   * Refund Customer Payment",
  "    return payment as unknown as Payment;\n  },\n\n  /**\n   * Refund Customer Payment"
);

fContent = fContent.replace(
  "    return updated;\n  },\n\n  // ═════════════════════════════════════════════════════════════════════\n  // SUPPLIER",
  "    return updated as unknown as Payment;\n  },\n\n  // ═════════════════════════════════════════════════════════════════════\n  // SUPPLIER"
);

if (fIsCRLF) fContent = fContent.replace(/\n/g, "\r\n");
fs.writeFileSync(fPath, fContent, "utf8");
console.log("Patched finance-service.ts casts");

// 2. payment-service.ts
const pPath = path.resolve("src/lib/services/payment-service.ts");
let pRaw = fs.readFileSync(pPath, "utf8");
const pIsCRLF = pRaw.includes("\r\n");
let pContent = pRaw.replace(/\r\n/g, "\n");

pContent = pContent.replace(
  "    return verified;\n  },",
  "    return verified as unknown as Payment;\n  },"
);

pContent = pContent.replace(
  "      return voided;\n    });\n  },",
  "      return voided as unknown as Payment;\n    });\n  },"
);

pContent = pContent.replace(
  `    return prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });`,
  `    const archived = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });

    return archived as unknown as Payment;`
);

if (pIsCRLF) pContent = pContent.replace(/\n/g, "\r\n");
fs.writeFileSync(pPath, pContent, "utf8");
console.log("Patched payment-service.ts casts");

