import * as fs from "fs";
import * as path from "path";

function replaceNormalized(filePath: string, target: string, replacement: string) {
  let content = fs.readFileSync(filePath, "utf-8");
  const normTarget = target.replace(/\r\n/g, "\n");
  const normSrc = content.replace(/\r\n/g, "\n");
  if (!normSrc.includes(normTarget)) {
    throw new Error(`Target not found in ${filePath}: ${target.substring(0, 60)}...`);
  }
  const isCrlf = content.includes("\r\n");
  const replacedNorm = normSrc.replace(normTarget, replacement.replace(/\r\n/g, "\n"));
  const updated = isCrlf ? replacedNorm.replace(/\n/g, "\r\n") : replacedNorm;
  fs.writeFileSync(filePath, updated, "utf-8");
  console.log(`Updated ${filePath}`);
}

// 1. booking-service.ts line 284
replaceNormalized(
  path.resolve("src/lib/services/booking-service.ts"),
  `    const sanitizedData = data.map((b) => ({
      ...b,
      enquiryId: (b as any).enquiryId ?? null,
    })) as BookingWithRelations[];`,
  `    const sanitizedData = data.map((b) => ({
      ...b,
      enquiryId: (b as any).enquiryId ?? null,
    })) as unknown as BookingWithRelations[];`
);

// 2. booking-service.ts line 433
replaceNormalized(
  path.resolve("src/lib/services/booking-service.ts"),
  `    return {
      ...booking,
      enquiryId: (booking as any).enquiryId ?? null,
      operationalReadiness,
      attributionDiagnostic,
    } as BookingWithRelations;`,
  `    return {
      ...booking,
      enquiryId: (booking as any).enquiryId ?? null,
      operationalReadiness,
      attributionDiagnostic,
    } as unknown as BookingWithRelations;`
);

// 3. finance-service.ts line 1940
replaceNormalized(
  path.resolve("src/lib/services/finance-service.ts"),
  `      customerPayments: booking.payments,`,
  `      customerPayments: booking.payments as any,`
);

console.log("All TS fixes applied successfully!");

