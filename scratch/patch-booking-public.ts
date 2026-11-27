import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("src/lib/services/booking-public-service.ts");
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

const target = `        payments: {
          where: { status: "COMPLETED" },
          orderBy: { paymentDate: "desc" },
        },`;

const repl = `        payments: {
          where: { status: "COMPLETED" },
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            paymentDate: true,
            receiptNumber: true,
          },
        },`;

content = replaceNormalized(content, target, repl);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated booking-public-service.ts!");

