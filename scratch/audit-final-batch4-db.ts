import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function checkFinalDb() {
  const totalInvoices = await prisma.invoice.count();
  
  const nullBookingsRes = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "invoices"
    WHERE "bookingId" IS NULL;
  `;
  const nullBookings = Number(nullBookingsRes[0]?.count ?? 0);
  
  // Group duplicate agencyId, bookingId
  const dupGroups = await prisma.$queryRaw<Array<{ agencyId: string; bookingId: string; count: bigint }>>`
    SELECT "agencyId", "bookingId", COUNT(*) as count
    FROM "invoices"
    GROUP BY "agencyId", "bookingId"
    HAVING COUNT(*) > 1;
  `;

  // Duplicate invoice numbers within agency
  const dupNumbers = await prisma.$queryRaw<Array<{ agencyId: string; invoiceNumber: string; count: bigint }>>`
    SELECT "agencyId", "invoiceNumber", COUNT(*) as count
    FROM "invoices"
    GROUP BY "agencyId", "invoiceNumber"
    HAVING COUNT(*) > 1;
  `;

  // Cross agency mismatches (invoice.agencyId != booking.agencyId)
  const crossAgency = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT i.id
    FROM "invoices" i
    JOIN "bookings" b ON i."bookingId" = b.id
    WHERE i."agencyId" != b."agencyId";
  `;

  // Orphaned bookings
  const orphanedBookings = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT i.id
    FROM "invoices" i
    LEFT JOIN "bookings" b ON i."bookingId" = b.id
    WHERE b.id IS NULL;
  `;

  console.log("=== FINAL DATABASE INTEGRITY AUDIT ===");
  console.log("Total Invoice rows:", totalInvoices);
  console.log("Duplicate agencyId + bookingId groups:", dupGroups.length);
  console.log("Duplicate invoice numbers within agency:", dupNumbers.length);
  console.log("Cross-agency mismatches:", crossAgency.length);
  console.log("Orphaned bookings:", orphanedBookings.length);
  console.log("NULL bookingId:", nullBookings);
}

checkFinalDb().catch(console.error);
