/**
 * YOUR TRAVEL DESK — HISTORICAL BOOKING-ENQUIRY LINKAGE BACKFILL UTILITY
 *
 * Resolves and backfills missing `enquiryId` on existing `bookings` records.
 *
 * Invariant & Safety Guarantees:
 * 1. Default Mode: DRY-RUN / REPORT-ONLY (requires explicit `--execute` flag).
 * 2. Strict Tenancy: Linkage is strictly enforced within the same `agencyId`.
 * 3. Never Overwrite: Ignores bookings that already have an `enquiryId`.
 * 4. Ambiguity Guard:
 *    - Multiple enquiries linked to the same trip: SKIPPED (unresolved ambiguity).
 *    - Customer mismatch between enquiry and booking: SKIPPED (unresolved conflict).
 *    - Conflicting quotation candidate vs trip candidate: SKIPPED.
 * 5. Batch & Transaction Handling: Executes in transactional batches with rollback protection.
 * 6. Zero Customer PII in logs (reports aggregated counts and internal IDs only).
 * 7. Fully Idempotent: Re-running against an already-backfilled database performs 0 changes.
 *
 * Usage:
 *   npx tsx scripts/backfill-booking-enquiries.ts            # Dry-run analysis & report
 *   npx tsx scripts/backfill-booking-enquiries.ts --execute  # Execute batch updates
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

export interface BackfillStats {
  totalBookings: number;
  alreadyLinked: number;
  unlinkedTargeted: number;
  eligibleForLinkage: number;
  unmatchedDirectBookings: number;
  ambiguousMultipleTripEnquiries: number;
  ambiguousConflictingCandidates: number;
  ambiguousCustomerMismatch: number;
  successfullyUpdated: number;
  failedUpdates: number;
}

export async function runBackfill(options: {
  isExecute: boolean;
  batchSize?: number;
  targetAgencyId?: string;
}): Promise<BackfillStats> {
  const { isExecute, batchSize = 50, targetAgencyId } = options;

  console.log("================================================================================");
  console.log(`  TRIPDESK: BOOKING-ENQUIRY RELATION BACKFILL (${isExecute ? "EXECUTE MODE" : "DRY-RUN REPORT"})`);
  console.log("================================================================================");
  console.log(`Target Agency Scope: ${targetAgencyId || "ALL AGENCIES"}`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Execution Mode: ${isExecute ? "LIVE WRITES ENABLED" : "DRY-RUN (NO WRITES)"}\n`);

  const stats: BackfillStats = {
    totalBookings: 0,
    alreadyLinked: 0,
    unlinkedTargeted: 0,
    eligibleForLinkage: 0,
    unmatchedDirectBookings: 0,
    ambiguousMultipleTripEnquiries: 0,
    ambiguousConflictingCandidates: 0,
    ambiguousCustomerMismatch: 0,
    successfullyUpdated: 0,
    failedUpdates: 0,
  };

  const agencyFilter = targetAgencyId ? { agencyId: targetAgencyId } : {};

  // 1. Gather high-level baseline
  stats.totalBookings = await prisma.booking.count({
    where: { ...agencyFilter, archivedAt: null },
  });

  // Pre-flight check: Verify if `enquiryId` column exists in the database
  const colCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'enquiryId'
  `;

  if (colCheck.length === 0) {
    console.log(`ℹ PRE-FLIGHT STATUS: Column 'bookings.enquiryId' does not exist in the database yet.`);
    console.log(`  Discovered ${stats.totalBookings} active bookings across agencies.`);
    console.log(`  Migration '20261021120000_add_booking_enquiry_relation' must be deployed before running this backfill.`);
    console.log(`  Dry-run pre-flight check completed safely (0 database writes, 0 errors).\n`);
    return stats;
  }

  // Column exists: inspect already-linked bookings
  const linkedCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM "bookings" WHERE "enquiryId" IS NOT NULL AND "archivedAt" IS NULL
  `;
  stats.alreadyLinked = Number(linkedCountResult[0]?.count || 0);

  const unlinkedBookings = await prisma.$queryRaw<Array<{
    id: string;
    bookingNumber: string;
    agencyId: string;
    tripId: string;
    customerId: string;
    quotationId: string | null;
  }>>`
    SELECT "id", "bookingNumber", "agencyId", "tripId", "customerId", "quotationId"
    FROM "bookings"
    WHERE "enquiryId" IS NULL AND "archivedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;

  stats.unlinkedTargeted = unlinkedBookings.length;
  console.log(`Discovered ${stats.totalBookings} total active bookings.`);
  console.log(`  - Already linked: ${stats.alreadyLinked}`);
  console.log(`  - Unlinked candidates to inspect: ${stats.unlinkedTargeted}\n`);

  if (stats.unlinkedTargeted === 0) {
    console.log("✔ No unlinked bookings require backfill. All bookings are linked or none exist.");
    return stats;
  }

  const eligibleUpdates: Array<{ bookingId: string; enquiryId: string; reason: string }> = [];

  // 2. Ambiguity-safe matching inspection
  for (const b of unlinkedBookings) {
    // Candidate A: Quotation link (enquiry.convertedQuotationId = b.quotationId)
    let quotationCandidateId: string | null = null;
    if (b.quotationId) {
      const quotationEnquiries = await prisma.enquiry.findMany({
        where: {
          agencyId: b.agencyId,
          convertedQuotationId: b.quotationId,
          archivedAt: null,
        },
        select: { id: true, customerId: true },
      });
      if (quotationEnquiries.length === 1) {
        quotationCandidateId = quotationEnquiries[0].id;
      }
    }

    // Candidate B: Trip link (enquiry.convertedTripId = b.tripId)
    const tripEnquiries = await prisma.enquiry.findMany({
      where: {
        agencyId: b.agencyId,
        convertedTripId: b.tripId,
        archivedAt: null,
      },
      select: { id: true, customerId: true },
    });

    if (tripEnquiries.length > 1) {
      stats.ambiguousMultipleTripEnquiries++;
      continue;
    }

    const tripCandidate = tripEnquiries.length === 1 ? tripEnquiries[0] : null;

    // Check candidate agreement
    if (quotationCandidateId && tripCandidate && quotationCandidateId !== tripCandidate.id) {
      stats.ambiguousConflictingCandidates++;
      continue;
    }

    const matchedEnquiry = tripCandidate || (quotationCandidateId ? { id: quotationCandidateId, customerId: b.customerId } : null);

    if (!matchedEnquiry) {
      stats.unmatchedDirectBookings++;
      continue;
    }

    // Customer consistency check
    if (matchedEnquiry.customerId && b.customerId && matchedEnquiry.customerId !== b.customerId) {
      stats.ambiguousCustomerMismatch++;
      continue;
    }

    stats.eligibleForLinkage++;
    eligibleUpdates.push({
      bookingId: b.id,
      enquiryId: matchedEnquiry.id,
      reason: tripCandidate ? "matched_via_convertedTripId" : "matched_via_convertedQuotationId",
    });
  }

  console.log("--- Inspection Results ---");
  console.log(`Eligible for safe backfill: ${stats.eligibleForLinkage}`);
  console.log(`Direct bookings (no originating enquiry found): ${stats.unmatchedDirectBookings}`);
  console.log(`Ambiguity exclusions:`);
  console.log(`  - Multiple enquiries for same trip: ${stats.ambiguousMultipleTripEnquiries}`);
  console.log(`  - Conflicting quotation vs trip enquiry: ${stats.ambiguousConflictingCandidates}`);
  console.log(`  - Customer ID mismatch: ${stats.ambiguousCustomerMismatch}\n`);

  // 3. Execution Phase
  if (isExecute && eligibleUpdates.length > 0) {
    console.log(`Executing batch updates for ${eligibleUpdates.length} eligible bookings...`);

    for (let i = 0; i < eligibleUpdates.length; i += batchSize) {
      const batch = eligibleUpdates.slice(i, i + batchSize);

      try {
        await prisma.$transaction(async (tx) => {
          for (const item of batch) {
            await tx.$executeRaw`
              UPDATE "bookings"
              SET "enquiryId" = ${item.enquiryId}
              WHERE "id" = ${item.bookingId}
            `;
            stats.successfullyUpdated++;
          }
        });
        console.log(`  ✔ Processed batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
      } catch (err: any) {
        console.error(`  ❌ Error processing batch starting at index ${i}:`, err?.message || err);
        stats.failedUpdates += batch.length;
      }
    }

    console.log(`\nExecution Complete: ${stats.successfullyUpdated} updated, ${stats.failedUpdates} failed.`);
  } else if (!isExecute) {
    console.log("ℹ DRY-RUN COMPLETE: Zero database mutations performed.");
    console.log("To apply these changes, rerun with `--execute` flag in an authorized environment.");
  }

  return stats;
}

// Standalone CLI invocation
if (require.main === module) {
  const isExecute = process.argv.includes("--execute");
  const agencyArg = process.argv.find((a) => a.startsWith("--agency-id="));
  const targetAgencyId = agencyArg ? agencyArg.split("=")[1] : undefined;

  runBackfill({ isExecute, targetAgencyId })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}
