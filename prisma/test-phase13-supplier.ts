/**
 * TripDesk Phase 13 Automated Verification Test Suite
 * Supplier Management Architecture, Multi-Tenant Isolation, 360 Operational & Financial Linkage,
 * Duplicate Detection, and Historical Protection Audit
 */

import "dotenv/config";

// Mock server-only before importing service modules
import Module from "module";
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  // @ts-ignore
  return originalRequire.apply(this, arguments);
};

import { prisma } from "../src/lib/prisma";
import { supplierService } from "../src/lib/services/supplier-service";

async function main() {
  console.log("================================================================================");
  console.log("TRIPDESK PHASE 13: SUPPLIER MANAGEMENT VERIFICATION TEST SUITE");
  console.log("================================================================================\n");

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition: boolean, description: string) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  ✅ [PASS] ${description}`);
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error("Retry failed");
  }

  // 1. SETUP TEST FIXTURES: Two distinct agencies
  console.log("─── STEP 1: Creating Isolated Multi-Tenant Test Agencies ───");
  const timestamp = Date.now();
  const agencyA = await withRetry(() =>
    prisma.agency.create({
      data: {
        name: `Test Agency Phase13 A ${timestamp}`,
        email: `owner-a-${timestamp}@example.com`,
        phone: "+91 9876543210",
        status: "ACTIVE",
      },
    })
  );

  const agencyB = await withRetry(() =>
    prisma.agency.create({
      data: {
        name: `Test Agency Phase13 B ${timestamp}`,
        email: `owner-b-${timestamp}@example.com`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    })
  );

  assert(Boolean(agencyA.id && agencyB.id), "Agencies A and B created successfully");

  // 2. SUPPLIER CREATION & SEQUENTIAL CODE GENERATION
  console.log("\n─── STEP 2: Supplier Creation & Code Sequentiality ───");
  const supplierA1 = await supplierService.createSupplier(agencyA.id, {
    name: "Himalayan Luxury Resorts",
    type: "Hotel Supplier",
    contactPerson: "Tenzing Norgay",
    phone: "+91 98111 22233",
    email: `contact@himalayanresorts-${timestamp}.com`,
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    gstNumber: "02ABCDE1234F1Z5",
    paymentTerms: "50% advance on booking, balance 7 days prior to check-in",
    bankDetails: "HDFC Bank, A/C: 5010099887766, IFSC: HDFC0001234",
  });

  assert(Boolean(supplierA1.id), "Supplier A1 created with full commercial metadata");
  assert(
    /^SUP-\d{4}-\d{5}$/.test(supplierA1.supplierCode || ""),
    `Supplier code matches SUP-YYYY-XXXXX format: ${supplierA1.supplierCode}`
  );
  assert(supplierA1.status === "ACTIVE", "Supplier initial status is ACTIVE");
  assert(supplierA1.archivedAt === null, "Supplier initial archivedAt is null");

  const supplierA2 = await supplierService.createSupplier(agencyA.id, {
    name: "Valley Cabs & Fleet Logistics",
    type: "Transport Supplier",
    phone: "+91 98222 33344",
    email: `fleet@valleycabs-${timestamp}.com`,
    city: "Shimla",
  });

  assert(Boolean(supplierA2.supplierCode), "Supplier A2 created with sequential code");
  assert(supplierA1.supplierCode !== supplierA2.supplierCode, "Sequential supplier codes are distinct");

  // Multi-tenant check: Agency B creates supplier
  const supplierB1 = await supplierService.createSupplier(agencyB.id, {
    name: "Goa Beach DMCs",
    type: "DMC",
    phone: "+91 98333 44455",
    email: `goa@dmc-${timestamp}.com`,
  });

  assert(supplierB1.agencyId === agencyB.id, "Supplier B1 correctly scoped to Agency B");

  // 3. MULTI-TENANT ISOLATION (IDOR PROTECTION)
  console.log("\n─── STEP 3: Multi-Tenant Scoping & IDOR Protection ───");
  const detailsAcrossAgency = await supplierService.getSupplierDetails(agencyA.id, supplierB1.id);
  assert(detailsAcrossAgency === null, "Agency A cannot read Agency B's supplier details (IDOR returns null)");

  idorBlocked = false;
  try {
    await supplierService.updateSupplier(agencyA.id, supplierB1.id, { name: "Hacked DMC" });
  } catch (err: any) {
    idorBlocked = err?.message?.includes("Supplier not found") || err?.code === "NOT_FOUND";
  }
  assert(idorBlocked, "Agency A cannot update Agency B's supplier (IDOR blocked)");

  idorBlocked = false;
  try {
    await supplierService.archiveSupplier(agencyA.id, supplierB1.id);
  } catch (err: any) {
    idorBlocked = err?.message?.includes("Supplier not found") || err?.code === "NOT_FOUND";
  }
  assert(idorBlocked, "Agency A cannot archive Agency B's supplier (IDOR blocked)");

  // 4. DUPLICATE DETECTION SERVICE
  console.log("\n─── STEP 4: Duplicate Supplier Detection Engine ───");
  const dupCheckByName = await supplierService.checkDuplicateSupplier(agencyA.id, {
    name: "himalayan luxury resorts", // Lowercase check
  });
  assert(dupCheckByName.isDuplicate === true, "Detects duplicate by case-insensitive name");
  assert(dupCheckByName.matches.length >= 1, "Returns duplicate match metadata");
  assert(dupCheckByName.matches[0].id === supplierA1.id, "Match points to exact supplier A1");

  const dupCheckByPhone = await supplierService.checkDuplicateSupplier(agencyA.id, {
    name: "Different Name Hotel",
    phone: "9811122233", // Unformatted digits
  });
  assert(dupCheckByPhone.isDuplicate === true, "Detects duplicate by normalized phone digits");

  const dupCheckExcludeSelf = await supplierService.checkDuplicateSupplier(agencyA.id, {
    name: "Himalayan Luxury Resorts",
    excludeId: supplierA1.id,
  });
  assert(dupCheckExcludeSelf.isDuplicate === false, "ExcludeId correctly ignores self during edit checks");

  const dupCheckAgencyB = await supplierService.checkDuplicateSupplier(agencyB.id, {
    name: "Himalayan Luxury Resorts",
  });
  assert(dupCheckAgencyB.isDuplicate === false, "Duplicate detection respects tenant boundaries (Agency B has no matches)");

  // 5. ARCHIVE & REACTIVATION LIFECYCLE
  console.log("\n─── STEP 5: Soft-Archive & Reactivation Lifecycle ───");
  const archived = await supplierService.archiveSupplier(agencyA.id, supplierA2.id);
  assert(archived.status === "INACTIVE", "Archived supplier status is INACTIVE");
  assert(archived.archivedAt !== null, "Archived supplier archivedAt timestamp is set");

  // List suppliers default excludes archived
  const activeList = await supplierService.listSuppliers(agencyA.id, { includeArchived: false });
  const inActiveList = activeList.items.some((s) => s.id === supplierA2.id);
  assert(!inActiveList, "Default list query excludes archived/inactive suppliers");

  const fullList = await supplierService.listSuppliers(agencyA.id, { includeArchived: true });
  const inFullList = fullList.items.some((s) => s.id === supplierA2.id);
  assert(inFullList, "List query with includeArchived=true includes archived suppliers");

  // Reactivate
  const reactivated = await supplierService.reactivateSupplier(agencyA.id, supplierA2.id);
  assert(reactivated.status === "ACTIVE", "Reactivated supplier status is ACTIVE");
  assert(reactivated.archivedAt === null, "Reactivated supplier archivedAt is null");

  // 6. OPERATIONAL & FINANCIAL LINKAGE (360 º PROFILE)
  console.log("\n─── STEP 6: 360 Operational & Financial Linkage ───");

  // Create a customer, trip, and booking under Agency A
  const customerA = await prisma.customer.create({
    data: {
      agencyId: agencyA.id,
      customerNumber: `CUST-P13-${timestamp}`,
      name: "Aarav Patel",
      email: `aarav-${timestamp}@example.com`,
      phone: "+91 99000 11122",
    },
  });

  const tripA = await prisma.trip.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripNumber: `TRIP-P13-${timestamp}`,
      title: "Himachal Summer Holiday",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-07"),
      status: "BOOKED",
    },
  });

  const bookingA = await prisma.booking.create({
    data: {
      agencyId: agencyA.id,
      tripId: tripA.id,
      customerId: customerA.id,
      bookingNumber: `BK-P13-${timestamp}`,
      status: "CONFIRMED",
      currency: "INR",
      totalAmount: 150000,
      paidAmount: 150000,
      balanceAmount: 0,
    },
  });

  const tripOpA = await prisma.tripOperation.create({
    data: {
      agencyId: agencyA.id,
      tripId: tripA.id,
      bookingId: bookingA.id,
      status: "ONGOING",
    },
  });

  // Link Hotel Confirmation to Supplier A1
  const hotelConf = await prisma.hotelConfirmation.create({
    data: {
      agencyId: agencyA.id,
      supplierId: supplierA1.id,
      tripOperationId: tripOpA.id,
      confirmationNumber: `CONF-HIM-${timestamp}`,
      checkIn: new Date("2026-06-01"),
      checkOut: new Date("2026-06-05"),
      roomDetails: "2x Executive Valley View Suite",
      status: "CONFIRMED",
    },
  });

  assert(Boolean(hotelConf.id), "Created operational HotelConfirmation linked to supplier A1");

  // Link Supplier Payable to Supplier A1
  const payableA = await prisma.supplierPayable.create({
    data: {
      agencyId: agencyA.id,
      bookingId: bookingA.id,
      supplierId: supplierA1.id,
      payableNumber: `PAYABLE-P13-${timestamp}`,
      description: "Hotel room accommodation & meals for 4 nights",
      plannedAmount: 65000,
      actualAmount: 65000,
      paidAmount: 30000,
      outstandingAmount: 35000,
      status: "PARTIALLY_PAID",
      dueDate: new Date("2026-05-25"),
    },
  });

  // Link Supplier Payment (Disbursement)
  const paymentA = await prisma.supplierPayment.create({
    data: {
      agencyId: agencyA.id,
      payableId: payableA.id,
      supplierId: supplierA1.id,
      paymentNumber: `SPAY-P13-${timestamp}`,
      amount: 30000,
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: `UTR-HDFC-${timestamp}`,
      status: "COMPLETED",
      paymentDate: new Date("2026-05-15"),
    },
  });

  assert(Boolean(payableA.id && paymentA.id), "Created financial SupplierPayable & SupplierPayment linked to supplier A1");

  // Query 360 Profile
  const details360 = await supplierService.getSupplierDetails(agencyA.id, supplierA1.id);

  assert(details360.hotelConfirmations?.length === 1, "Supplier 360 includes linked operational confirmations");
  assert(details360.hotelConfirmations?.[0].confirmationNumber === `CONF-HIM-${timestamp}`, "Operational confirmation number matches");
  assert(details360.payables?.length === 1, "Supplier 360 includes linked financial payables");
  assert(details360.payables?.[0].payableNumber === `PAYABLE-P13-${timestamp}`, "Payable record matches");
  assert(details360.payments?.length === 1, "Supplier 360 includes linked disbursement payments");

  // Verify Financial Aggregates
  assert(details360.financialSummary?.totalPayableAmount === 65000, "Financial summary correctly sums total payable amount (65,000)");
  assert(details360.financialSummary?.totalPaidAmount === 30000, "Financial summary correctly sums total paid amount (30,000)");
  assert(details360.financialSummary?.totalOutstandingAmount === 35000, "Financial summary correctly calculates outstanding amount (35,000)");
  assert(details360.financialSummary?.pendingPayablesCount === 1, "Financial summary flags 1 pending payable");

  // Verify Operational Aggregates
  assert(details360.operationalSummary?.totalConfirmationsCount === 1, "Operational summary counts total confirmations");
  assert(details360.operationalSummary?.activeConfirmationsCount === 1, "Operational summary counts active confirmations");

  // 7. HISTORICAL RECORD HARD-DELETE PROTECTION
  console.log("\n─── STEP 7: Historical Protection & Hard-Delete Blocking ───");
  let deleteBlocked = false;
  try {
    await supplierService.deleteSupplier(agencyA.id, supplierA1.id);
  } catch (err: any) {
    deleteBlocked =
      err?.code === "CANNOT_DELETE_ACTIVE_RECORDS" ||
      err?.message?.includes("Cannot permanently delete") ||
      err?.message?.includes("historical") ||
      err?.message?.includes("cannot be deleted");
  }
  assert(deleteBlocked, "Permanent deletion of supplier with historical payables/confirmations is strictly blocked");

  // Verify that an empty test supplier CAN be safely hard-deleted
  const disposableSupplier = await supplierService.createSupplier(agencyA.id, {
    name: "Temporary Disposable Vendor",
    type: "DMC",
  });
  const deletedResult = await supplierService.deleteSupplier(agencyA.id, disposableSupplier.id);
  assert(deletedResult.id === disposableSupplier.id, "Supplier with zero historical dependencies can be permanently purged");

  // Verify it is purged
  const purgedSupplier = await prisma.supplier.findUnique({ where: { id: disposableSupplier.id } });
  assert(purgedSupplier === null, "Purged supplier no longer exists in database");

  // 8. COMMERCIAL PRIVACY & CUSTOMER ARCHITECTURE SANITY
  console.log("\n─── STEP 8: Commercial Privacy & Customer Role Guard ───");
  // Check that no customer user roles or agent roles were created
  const customerUser = await prisma.user.findFirst({
    where: { email: customerA.email },
  });
  assert(customerUser === null, "Zero customer User records created (External customer architecture strictly preserved)");

  // Check roles in database
  const validRoles = ["PLATFORM_OWNER", "AGENCY_OWNER"];
  const usersWithInvalidRoles = await prisma.user.findMany({
    where: {
      role: {
        notIn: validRoles as any,
      },
    },
  });
  assert(usersWithInvalidRoles.length === 0, "All users adhere strictly to PLATFORM_OWNER or AGENCY_OWNER roles");

  // CLEANUP TEST FIXTURES
  console.log("\n─── CLEANUP: Purging Phase 13 Test Fixtures ───");
  try {
    await prisma.supplierPayment.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.supplierPayable.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.supplier.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
  } catch (cleanErr) {
    console.log("  ⚠️ Cleanup notice:", (cleanErr as any)?.message || cleanErr);
  }

  console.log("\n================================================================================");
  console.log(`PHASE 13 VERIFICATION SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED (100%)`);
  console.log("================================================================================\n");
}

main()
  .catch((err) => {
    console.error("FATAL TEST ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
