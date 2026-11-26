import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/finance-service.ts");
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
const targetImport = `import "server-only";`;
const replImport = `import "server-only";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";`;
content = replaceNormalized(content, targetImport, replImport);

// 2. Line 354:
const target2 = `        payments: {
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
        },`;
const repl2 = `        payments: {
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
          select: { id: true, amount: true, refundedAmount: true },
        },`;
content = replaceNormalized(content, target2, repl2);

// 3. Line 1588:
const target3 = `        payments: { where: { archivedAt: null } },
        supplierPayables: { where: { archivedAt: null } },`;
const repl3 = `        payments: { where: { archivedAt: null }, select: PAYMENT_SCALAR_SELECT },
        supplierPayables: { where: { archivedAt: null } },`;
content = replaceNormalized(content, target3, repl3);

// 4. Line 1597:
const target4 = `    const [allPayments, allPayables, allSupplierPayments, allExpenses] = await Promise.all([
      prisma.payment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          paymentDate: { gte: start, lte: end },
        },
      }),`;
const repl4 = `    const [allPayments, allPayables, allSupplierPayments, allExpenses] = await Promise.all([
      prisma.payment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          paymentDate: { gte: start, lte: end },
        },
        select: PAYMENT_SCALAR_SELECT,
      }),`;
content = replaceNormalized(content, target4, repl4);

// 5. Line 1837:
const target5 = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },
        supplierPayables: {`;
const repl5 = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          select: PAYMENT_SCALAR_SELECT,
        },
        supplierPayables: {`;
content = replaceNormalized(content, target5, repl5);

// 6. Line 1958:
const target6 = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "asc" },
        },
      },
    });

    if (!booking) {`;
const repl6 = `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "asc" },
          select: PAYMENT_SCALAR_SELECT,
        },
      },
    });

    if (!booking) {`;
content = replaceNormalized(content, target6, repl6);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated finance-service.ts!");

