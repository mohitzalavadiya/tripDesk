import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/customer-service.ts");
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

const targetImport = `import { Customer, Prisma } from "@prisma/client";
import "server-only";`;

const replImport = `import { Customer, Prisma } from "@prisma/client";
import "server-only";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";`;

content = replaceNormalized(content, targetImport, replImport);

const targetPayments = `            payments: {
              where: { archivedAt: null },
              orderBy: { paymentDate: "desc" },
            },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          take: 50,
          include: {
            booking: { select: { id: true, bookingNumber: true } },
            trip: { select: { id: true, tripNumber: true, title: true } },
          },
        },`;

const replPayments = `            payments: {
              where: { archivedAt: null },
              orderBy: { paymentDate: "desc" },
              select: PAYMENT_SCALAR_SELECT,
            },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          take: 50,
          select: {
            ...PAYMENT_SCALAR_SELECT,
            booking: { select: { id: true, bookingNumber: true } },
            trip: { select: { id: true, tripNumber: true, title: true } },
          },
        },`;

content = replaceNormalized(content, targetPayments, replPayments);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated customer-service.ts!");

