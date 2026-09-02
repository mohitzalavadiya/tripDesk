import "dotenv/config";

// Mock server-only for standalone script execution
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
import { getAdminClient, deleteAuthUser } from "../src/lib/supabase/admin";

interface DryRunActionSummary {
  model: string;
  action: "PRESERVE" | "DELETE" | "REVIEW";
  count: number;
  description: string;
}

const CANONICAL_PLATFORM_OWNER_ID = "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9";
const CANONICAL_PLANS = ["Starter", "Professional"];

async function resetPilotDatabase() {
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("   TRIPDESK PHASE 20.5 — PRODUCTION DATABASE RESET & PILOT INITIALIZATION");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  const confirmationFlag = process.env.RESET_PILOT_DATABASE;
  const isConfirmed = confirmationFlag === "CONFIRM";
  const mode = isConfirmed ? "💥 DESTRUCTIVE EXECUTION" : "🔍 DRY RUN (READ ONLY)";

  console.log(`  Current Execution Mode: ${mode}`);
  console.log(`  Confirmation Guard:     RESET_PILOT_DATABASE="${confirmationFlag ?? ""}"`);

  if (!isConfirmed) {
    console.log("  ℹ️  Defaulting to DRY-RUN mode. No changes will be committed to the database.\n");
  }

  // 1. Target Database Safety Verification
  const rawDbUrl = process.env.DATABASE_URL || "";
  let dbHost = "Unknown";
  try {
    const parsedUrl = new URL(rawDbUrl.replace("postgresql://", "http://"));
    dbHost = parsedUrl.hostname;
  } catch {}

  console.log(`  Target Host: ${dbHost}`);
  if (!dbHost.includes("supabase.com") && !dbHost.includes("localhost") && !dbHost.includes("127.0.0.1")) {
    throw new Error(`Unexpected database host: "${dbHost}". Aborting reset for safety.`);
  }

  // 2. Pre-Reset Inventory and Classification
  console.log("\n▶ 1. EVALUATING RECORDS FOR DELETION VS PRESERVATION");

  const planActionSummary: DryRunActionSummary[] = [];

  // Models to delete completely in relational order
  const tenantModelsInOrder = [
    { name: "OperationEvent", delegate: prisma.operationEvent, desc: "Operational activity event log" },
    { name: "OperationalIssue", delegate: prisma.operationalIssue, desc: "Operational trip incident/issue reports" },
    { name: "HotelConfirmation", delegate: prisma.hotelConfirmation, desc: "Supplier hotel reservation confirmations" },
    { name: "VehicleDispatch", delegate: prisma.vehicleDispatch, desc: "Transport fleet vehicle dispatches" },
    { name: "ActivityConfirmation", delegate: prisma.activityConfirmation, desc: "Activity & excursion bookings" },
    { name: "TripOperation", delegate: prisma.tripOperation, desc: "Trip operations central hub records" },
    { name: "TravelDocument", delegate: prisma.travelDocument, desc: "Customer vouchers and itineraries" },
    { name: "CustomerNotification", delegate: prisma.customerNotification, desc: "Email and WhatsApp communication records" },
    { name: "CustomerNotificationPreference", delegate: prisma.customerNotificationPreference, desc: "Customer communication preferences" },
    { name: "CustomerFeedback", delegate: prisma.customerFeedback, desc: "Post-trip customer feedback and ratings" },
    { name: "AgencyCommunicationSetting", delegate: prisma.agencyCommunicationSetting, desc: "Agency communication configuration" },
    { name: "SupplierPayment", delegate: prisma.supplierPayment, desc: "Supplier disbursement records" },
    { name: "SupplierPayable", delegate: prisma.supplierPayable, desc: "Accounts payable to vendors" },
    { name: "OperationalExpense", delegate: prisma.operationalExpense, desc: "Miscellaneous trip operating expenses" },
    { name: "RateSheet", delegate: prisma.rateSheet, desc: "Supplier rate sheet contracts" },
    { name: "Supplier", delegate: prisma.supplier, desc: "Vendor directory & supplier contacts" },
    { name: "EnquiryFollowUp", delegate: prisma.enquiryFollowUp, desc: "CRM enquiry follow-up tasks" },
    { name: "Enquiry", delegate: prisma.enquiry, desc: "CRM leads and trip inquiries" },
    { name: "Payment", delegate: prisma.payment, desc: "Customer payment transactions" },
    { name: "QuotationItem", delegate: prisma.quotationItem, desc: "Quotation costing line items" },
    { name: "QuotationProposalItem", delegate: prisma.quotationProposalItem, desc: "Quotation customer proposal inclusions/notes" },
    { name: "QuotationPaymentMilestone", delegate: prisma.quotationPaymentMilestone, desc: "Quotation scheduled payment milestones" },
    { name: "QuotationPackageOption", delegate: prisma.quotationPackageOption, desc: "Quotation tier package alternatives" },
    { name: "PublicShareLink", delegate: prisma.publicShareLink, desc: "Public token share links" },
    { name: "Booking", delegate: prisma.booking, desc: "Customer travel bookings" },
    { name: "Quotation", delegate: prisma.quotation, desc: "Trip quotations and proposals" },
    { name: "TripActivity", delegate: prisma.tripActivity, desc: "Trip activity attachments" },
    { name: "TripVehicle", delegate: prisma.tripVehicle, desc: "Trip vehicle allocations" },
    { name: "TripHotel", delegate: prisma.tripHotel, desc: "Trip hotel bookings" },
    { name: "ItineraryItem", delegate: prisma.itineraryItem, desc: "Day-by-day itinerary entries" },
    { name: "Traveler", delegate: prisma.traveler, desc: "Traveler passenger details" },
    { name: "Activity", delegate: prisma.activity, desc: "Agency activity catalog" },
    { name: "Vehicle", delegate: prisma.vehicle, desc: "Agency vehicle catalog" },
    { name: "Hotel", delegate: prisma.hotel, desc: "Agency hotel catalog" },
    { name: "Trip", delegate: prisma.trip, desc: "Travel trip master records" },
    { name: "Customer", delegate: prisma.customer, desc: "Customer business profiles" },
    { name: "Subscription", delegate: prisma.subscription, desc: "Agency SaaS subscription records" },
  ];

  let totalTenantRecordsToDelete = 0;

  for (const item of tenantModelsInOrder) {
    const count = await (item.delegate as any).count();
    totalTenantRecordsToDelete += count;
    planActionSummary.push({
      model: item.name,
      action: "DELETE",
      count,
      description: item.desc,
    });
  }

  // Users to delete (All test users EXCEPT canonical platform owner)
  const testUsersCount = await prisma.user.count({
    where: { id: { not: CANONICAL_PLATFORM_OWNER_ID } },
  });
  const platformOwnerCount = await prisma.user.count({
    where: { id: CANONICAL_PLATFORM_OWNER_ID },
  });

  planActionSummary.push({
    model: "User (Test Users)",
    action: "DELETE",
    count: testUsersCount,
    description: "Test agency owners and test platform owner IDs",
  });
  planActionSummary.push({
    model: "User (Platform Owner)",
    action: "PRESERVE",
    count: platformOwnerCount,
    description: "Authoritative singleton Platform Owner (mzpatel14@gmail.com)",
  });

  // Agencies to delete
  const agencyCount = await prisma.agency.count();
  planActionSummary.push({
    model: "Agency",
    action: "DELETE",
    count: agencyCount,
    description: "All test and QA agency workspaces",
  });

  // Platform Audit Logs (Clean slate for pilot)
  const auditLogsCount = await prisma.platformAuditLog.count();
  planActionSummary.push({
    model: "PlatformAuditLog",
    action: "DELETE",
    count: auditLogsCount,
    description: "Test audit entries from automated tests",
  });

  // Subscription Plans
  const canonicalPlansCount = await prisma.subscriptionPlan.count({
    where: { name: { in: CANONICAL_PLANS } },
  });
  const testPlansCount = await prisma.subscriptionPlan.count({
    where: { name: { notIn: CANONICAL_PLANS } },
  });
  planActionSummary.push({
    model: "SubscriptionPlan (Canonical)",
    action: "PRESERVE",
    count: canonicalPlansCount,
    description: "Starter & Professional production SaaS plans",
  });
  planActionSummary.push({
    model: "SubscriptionPlan (Test Tiers)",
    action: "DELETE",
    count: testPlansCount,
    description: "Temporary timestamped plans created during testing",
  });

  // Platform Settings
  const settingsCount = await prisma.platformSetting.count();
  planActionSummary.push({
    model: "PlatformSetting",
    action: "PRESERVE",
    count: settingsCount,
    description: "Global production settings (defaultTrialDays, supportEmail)",
  });

  // Print Summary Table
  console.log("  ┌──────────────────────────────────────┬──────────┬───────┬──────────────────────────────────────────────────────┐");
  console.log("  │ Model                                │ Action   │ Count │ Description                                          │");
  console.log("  ├──────────────────────────────────────┼──────────┼───────┼──────────────────────────────────────────────────────┤");
  for (const item of planActionSummary) {
    console.log(
      `  │ ${item.model.padEnd(36, " ")} │ ${item.action.padEnd(8, " ")} │ ${String(item.count).padStart(5, " ")} │ ${item.description.padEnd(52, " ")} │`
    );
  }
  console.log("  └──────────────────────────────────────┴──────────┴───────┴──────────────────────────────────────────────────────┘\n");

  // 3. Supabase Auth Users Evaluation
  console.log("▶ 2. SUPABASE AUTH RECONCILIATION & ACTION PLAN");
  const adminClient = getAdminClient();
  let authUsersToDelete: { id: string; email?: string }[] = [];

  if (adminClient) {
    const { data } = await adminClient.auth.admin.listUsers();
    const authUsers = data?.users || [];
    const platformOwnerAuth = authUsers.find((u) => u.id === CANONICAL_PLATFORM_OWNER_ID);
    authUsersToDelete = authUsers.filter((u) => u.id !== CANONICAL_PLATFORM_OWNER_ID);

    console.log(`  Supabase Auth Platform Owner: ${platformOwnerAuth ? `[PRESERVED] ${platformOwnerAuth.email}` : "⚠️ NOT FOUND"}`);
    console.log(`  Supabase Auth Test/Orphan Accounts to Delete: ${authUsersToDelete.length}`);
    for (const au of authUsersToDelete) {
      console.log(`    - ID: ${au.id} | Email: ${au.email || "No email"}`);
    }
  } else {
    console.log("  ⚠️ Supabase Admin client not available (SUPABASE_SERVICE_ROLE_KEY missing).");
  }

  // 4. Execution Guard & Destructive Phase
  if (!isConfirmed) {
    console.log("\n═════════════════════════════════════════════════════════════════════════");
    console.log("   DRY RUN COMPLETE — ZERO DATA WAS MODIFIED");
    console.log("   To execute destructive cleanup, provide: RESET_PILOT_DATABASE=CONFIRM");
    console.log("═════════════════════════════════════════════════════════════════════════\n");
    await prisma.$disconnect();
    return;
  }

  console.log("\n▶ 3. EXECUTING DESTRUCTIVE DATABASE RESET TRANSACTION...");

  // Execute relational database deletion inside an atomic transaction with 60s timeout
  await prisma.$transaction(async (tx) => {
    // 1. Delete tenant-scoped child models
    for (const item of tenantModelsInOrder) {
      const res = await (tx as any)[item.delegate.name || item.name.charAt(0).toLowerCase() + item.name.slice(1)].deleteMany();
      console.log(`  ✔ Deleted ${res.count} records from ${item.name}`);
    }

    // 2. Delete test users (keeping only canonical platform owner)
    const userRes = await tx.user.deleteMany({
      where: { id: { not: CANONICAL_PLATFORM_OWNER_ID } },
    });
    console.log(`  ✔ Deleted ${userRes.count} test User records`);

    // 3. Delete all test agencies
    const agencyRes = await tx.agency.deleteMany();
    console.log(`  ✔ Deleted ${agencyRes.count} Agency records`);

    // 4. Delete test platform audit logs
    const logRes = await tx.platformAuditLog.deleteMany();
    console.log(`  ✔ Deleted ${logRes.count} PlatformAuditLog records`);

    // 5. Delete test subscription plans
    const planRes = await tx.subscriptionPlan.deleteMany({
      where: { name: { notIn: CANONICAL_PLANS } },
    });
    console.log(`  ✔ Deleted ${planRes.count} test SubscriptionPlan records`);
  }, { timeout: 60000, maxWait: 15000 });

  console.log("\n▶ 4. CLEANING UP SUPABASE AUTH TEST ACCOUNTS...");
  if (adminClient && authUsersToDelete.length > 0) {
    let deletedCount = 0;
    for (const au of authUsersToDelete) {
      const ok = await deleteAuthUser(au.id);
      if (ok) deletedCount++;
    }
    console.log(`  ✔ Successfully deleted ${deletedCount}/${authUsersToDelete.length} Supabase Auth test accounts.`);
  }

  // Ensure Canonical Plans exist
  console.log("\n▶ 5. ENSURING CANONICAL SAAS PLANS...");
  await prisma.subscriptionPlan.upsert({
    where: { name: "Starter" },
    update: {
      description: "Essential travel planning & quotation workflow for boutique operators.",
      price: 1999.0,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Starter",
      description: "Essential travel planning & quotation workflow for boutique operators.",
      price: 1999.0,
      durationDays: 30,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: "Professional" },
    update: {
      description: "Comprehensive operating suite for established agencies and tour desks.",
      price: 4999.0,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Professional",
      description: "Comprehensive operating suite for established agencies and tour desks.",
      price: 4999.0,
      durationDays: 30,
      isActive: true,
    },
  });
  console.log("  ✔ Starter and Professional plans verified.");

  console.log("\n═════════════════════════════════════════════════════════════════════════");
  console.log("   RESET COMPLETE — PRODUCTION DATABASE IS CLEAN & PILOT READY");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

resetPilotDatabase().catch(async (e) => {
  console.error("FATAL ERROR in resetPilotDatabase:", e);
  await prisma.$disconnect();
  process.exit(1);
});
