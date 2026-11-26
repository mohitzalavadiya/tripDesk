import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/invoice-service.ts");
let content = fs.readFileSync(filePath, "utf-8");

// 1. Add import
if (!content.includes("PAYMENT_SCALAR_SELECT")) {
  content = content.replace(
    'import { taxService } from "./tax-service";',
    'import { taxService } from "./tax-service";\r\nimport { PAYMENT_SCALAR_SELECT } from "./payment-service";'
  );
}

// 2. Replace one-line payment includes
content = content.replaceAll(
  "payments: { where: { archivedAt: null }, orderBy: { paymentDate: \"desc\" } }",
  "payments: { where: { archivedAt: null }, orderBy: { paymentDate: \"desc\" }, select: PAYMENT_SCALAR_SELECT }"
);

// 3. Replace multi-line payment in getInvoice (line 837)
content = content.replace(
  `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },`,
  `        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          select: PAYMENT_SCALAR_SELECT,
        },`
);

// 4. Replace line 164 (payment totals recalculation)
content = content.replace(
  `        payments: {
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
        },`,
  `        payments: {
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
          select: { id: true, amount: true, refundedAmount: true, status: true },
        },`
);

// 5. Replace line 1243 (voided check)
content = content.replace(
  "include: { items: true, payments: { where: { archivedAt: null, status: { not: PaymentStatus.VOIDED } } } },",
  "include: { items: true, payments: { where: { archivedAt: null, status: { not: PaymentStatus.VOIDED } }, select: PAYMENT_SCALAR_SELECT } },"
);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated invoice-service.ts!");
