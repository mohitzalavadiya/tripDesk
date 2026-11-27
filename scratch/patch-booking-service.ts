import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/booking-service.ts");
let content = fs.readFileSync(filePath, "utf-8");

function replaceNormalized(src: string, target: string, replacement: string): string {
  const normTarget = target.replace(/\r\n/g, "\n");
  const normSrc = src.replace(/\r\n/g, "\n");
  if (!normSrc.includes(normTarget)) {
    throw new Error(`Target not found: ${target.substring(0, 60)}...`);
  }
  const isCrlf = src.includes("\r\n");
  const replacedNorm = normSrc.replace(normTarget, replacement.replace(/\r\n/g, "\n"));
  return isCrlf ? replacedNorm.replace(/\n/g, "\r\n") : replacedNorm;
}

// 1. Add PAYMENT_SCALAR_SELECT import
const targetImport = `import "server-only";
import { entitlementService } from "./entitlement-service";`;

const replImport = `import "server-only";
import { entitlementService } from "./entitlement-service";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";`;

content = replaceNormalized(content, targetImport, replImport);

// 2. In getBookings: add select: PAYMENT_SCALAR_SELECT to payments relation
const targetBookings = `          payments: {
            where: { archivedAt: null },
            orderBy: { paymentDate: "desc" },
          },`;

const replBookings = `          payments: {
            where: { archivedAt: null },
            orderBy: { paymentDate: "desc" },
            select: PAYMENT_SCALAR_SELECT,
          },`;

content = replaceNormalized(content, targetBookings, replBookings);

// 3. In getBookingById: add select: PAYMENT_SCALAR_SELECT to payments relation
const targetBookingById = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },`;

const replBookingById = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          select: PAYMENT_SCALAR_SELECT,
        },`;

content = replaceNormalized(content, targetBookingById, replBookingById);

// 4. In recalculateBookingPaymentTotals: select amount, refundedAmount
const targetRecalc = `        payments: {
          where: { archivedAt: null, status: "COMPLETED" },
        },`;

const replRecalc = `        payments: {
          where: { archivedAt: null, status: "COMPLETED" },
          select: {
            id: true,
            amount: true,
            refundedAmount: true,
          },
        },`;

content = replaceNormalized(content, targetRecalc, replRecalc);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated booking-service.ts!");

