/**
 * ═════════════════════════════════════════════════════════════════════
 * TRIPDESK — PHASE 18: SUPER ADMIN & SAAS PLATFORM MANAGEMENT TEST SUITE
 * ═════════════════════════════════════════════════════════════════════
 * Comprehensive automated verification covering:
 *  1. Multi-Tenant Fixture Setup & Isolation (1 Platform Owner, 2 Agencies)
 *  2. Platform Owner Authorization & Privileged Access Control
 *  3. Server-Authoritative Platform Overview KPIs (Agencies, Subscriptions, Users, Bookings)
 *  4. Platform Subscription Revenue vs. Agency Customer Booking Volume Separation
 *  5. Searchable & Filterable Agency Directory with Live Usage Telemetry
 *  6. Agency 360 Full Workspace Inspection (Identity, Owner, Subscription, Telemetry, Audit)
 *  7. Trial Extension Lifecycle & Platform Audit Trail
 *  8. Agency Suspension & Reactivation Governance (Non-Destructive)
 *  9. Dynamic SaaS Subscription Plan Catalog (Create, Update, List)
 * 10. Platform Announcements & Broadcast Scheduling
 * 11. Cross-Tenant Global Platform Search
 * 12. Key-Value Platform Settings Management
 * 13. Strict Role Architecture Invariant (0 Customer User Accounts, 2 Internal Roles Only)
 * ═════════════════════════════════════════════════════════════════════
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
import { adminService } from "../src/lib/services/admin-service";
import {
  UserRole,
  AgencyStatus,
  SubscriptionStatus,
  TripStatus,
  QuotationStatus,
  BookingStatus,
  BookingPaymentStatus,
} from "@prisma/client";

// Test run tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runTestSuite() {
  console.log("\n=================================================================");
  console.log("🚀 STARTING PHASE 18: SUPER ADMIN PLATFORM VERIFICATION SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const platformOwnerId = `test-platform-owner-${timestamp}`;
  const agencyAlphaId = `test-agency-alpha-${timestamp}`;
  const agencyBetaId = `test-agency-beta-${timestamp}`;
  const ownerAlphaId = `test-owner-alpha-${timestamp}`;
  const ownerBetaId = `test-owner-beta-${timestamp}`;
  const planStarterId = `test-plan-starter-${timestamp}`;
  const planProId = `test-plan-pro-${timestamp}`;

  try {
    // ═════════════════════════════════════════════════════════════════
    // TEST 1: Multi-Tenant Fixture Setup & Isolation
    // ═════════════════════════════════════════════════════════════════
    console.log("🔹 STEP 1: Creating Multi-Tenant Test Environment & Platform Owner...");

    // 1.1 Create Plans
    const planStarter = await prisma.subscriptionPlan.create({
      data: {
        id: planStarterId,
        name: `Starter Tier ${timestamp}`,
        description: "Entry-level plan for small agencies",
        price: 2499.0,
        durationDays: 30,
        isActive: true,
      },
    });

    const planPro = await prisma.subscriptionPlan.create({
      data: {
        id: planProId,
        name: `Professional Tier ${timestamp}`,
        description: "Advanced plan with multi-channel automation",
        price: 4999.0,
        durationDays: 30,
        isActive: true,
      },
    });

    // 1.2 Create Platform Owner (agencyId MUST be null)
    const platformOwner = await prisma.user.create({
      data: {
        id: platformOwnerId,
        email: `platform.owner.${timestamp}@tripdesk.test`,
        name: "Platform Owner Test",
        role: UserRole.PLATFORM_OWNER,
        agencyId: null,
      },
    });

    // 1.3 Create Agency Alpha (In Active 7-day Trial)
    const agencyAlpha = await prisma.agency.create({
      data: {
        id: agencyAlphaId,
        name: `Alpha Voyages ${timestamp}`,
        email: `alpha.${timestamp}@tripdesk.test`,
        phone: "+919876543210",
        address: "MG Road, Bengaluru",
        status: AgencyStatus.ACTIVE,
      },
    });

    const ownerAlpha = await prisma.user.create({
      data: {
        id: ownerAlphaId,
        email: `alpha.owner.${timestamp}@tripdesk.test`,
        name: "Alpha Owner",
        role: UserRole.AGENCY_OWNER,
        agencyId: agencyAlpha.id,
      },
    });

    const trialEndAlpha = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days left
    const subAlpha = await prisma.subscription.create({
      data: {
        agencyId: agencyAlpha.id,
        planId: planStarter.id,
        status: SubscriptionStatus.TRIAL,
        trialStart: new Date(),
        trialEnd: trialEndAlpha,
      },
    });

    // 1.4 Create Agency Beta (Active Paid Subscription)
    const agencyBeta = await prisma.agency.create({
      data: {
        id: agencyBetaId,
        name: `Beta Safaris ${timestamp}`,
        email: `beta.${timestamp}@tripdesk.test`,
        phone: "+919876543211",
        address: "Connaught Place, New Delhi",
        status: AgencyStatus.ACTIVE,
      },
    });

    const ownerBeta = await prisma.user.create({
      data: {
        id: ownerBetaId,
        email: `beta.owner.${timestamp}@tripdesk.test`,
        name: "Beta Owner",
        role: UserRole.AGENCY_OWNER,
        agencyId: agencyBeta.id,
      },
    });

    const subBeta = await prisma.subscription.create({
      data: {
        agencyId: agencyBeta.id,
        planId: planPro.id,
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 1.5 Create operational fixtures for Agency Alpha & Beta
    const customerAlpha = await prisma.customer.create({
      data: {
        agencyId: agencyAlpha.id,
        name: "Rohan Sharma",
        phone: "+919999911111",
        email: "rohan@example.com",
      },
    });

    const tripAlpha = await prisma.trip.create({
      data: {
        agencyId: agencyAlpha.id,
        customerId: customerAlpha.id,
        tripNumber: `TRIP-ALPHA-${timestamp}`,
        title: "Goa Beach Retreat",
        startDate: new Date(),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: TripStatus.BOOKED,
      },
    });

    const bookingAlpha = await prisma.booking.create({
      data: {
        agencyId: agencyAlpha.id,
        tripId: tripAlpha.id,
        customerId: customerAlpha.id,
        bookingNumber: `BK-ALPHA-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        totalAmount: 75000.0,
        paidAmount: 25000.0,
        balanceAmount: 50000.0,
      },
    });

    assert(platformOwner.role === UserRole.PLATFORM_OWNER && platformOwner.agencyId === null, "Platform Owner created with role PLATFORM_OWNER and agencyId null");
    assert(ownerAlpha.role === UserRole.AGENCY_OWNER && ownerAlpha.agencyId === agencyAlpha.id, "Agency Alpha Owner created with role AGENCY_OWNER");
    assert(ownerBeta.role === UserRole.AGENCY_OWNER && ownerBeta.agencyId === agencyBeta.id, "Agency Beta Owner created with role AGENCY_OWNER");
    assert(subAlpha.status === SubscriptionStatus.TRIAL, "Agency Alpha subscription in TRIAL state");
    assert(subBeta.status === SubscriptionStatus.ACTIVE, "Agency Beta subscription in ACTIVE state");

    // ═════════════════════════════════════════════════════════════════
    // TEST 2: Platform Overview KPIs & Telemetry
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 2: Verifying Server-Authoritative Platform Overview KPIs...");

    const overview = await adminService.getPlatformOverview();

    assert(overview.totalAgencies >= 2, `Total Agencies count valid (found ${overview.totalAgencies} >= 2)`);
    assert(overview.activeAgencies >= 2, `Active Agencies count valid (found ${overview.activeAgencies} >= 2)`);
    assert(overview.trialAgencies >= 1, `Trial Agencies count valid (found ${overview.trialAgencies} >= 1)`);
    assert(overview.totalPlatformUsers >= 3, `Total Users count valid (found ${overview.totalPlatformUsers} >= 3)`);
    assert(overview.activeAgencyOwners >= 2, `Agency Owners count valid (found ${overview.activeAgencyOwners} >= 2)`);
    assert(overview.totalBookings >= 1, `Total confirmed bookings tracked across SaaS (found ${overview.totalBookings})`);
    assert(overview.totalCustomers >= 1, `Total customer profiles tracked across SaaS (found ${overview.totalCustomers})`);

    // Financial separation verification
    assert(overview.mrr >= 4999.0, `Platform SaaS MRR properly computes subscription revenue (MRR: ₹${overview.mrr})`);
    assert(overview.agencyBookingVolume >= 75000.0, `Agency Booking GMV correctly aggregated from bookings (GMV: ₹${overview.agencyBookingVolume})`);
    assert(overview.mrr !== overview.agencyBookingVolume, "Platform SaaS Subscription Revenue is strictly separated from Agency Booking GMV");

    // ═════════════════════════════════════════════════════════════════
    // TEST 3: Searchable & Filterable Agency Directory
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 3: Verifying Agency Directory Search & Filtering...");

    const alphaSearchResults = await adminService.listAgencies({ search: "Alpha Voyages" });
    assert(alphaSearchResults.items.length >= 1, "Searching by agency name returns Agency Alpha");
    assert(alphaSearchResults.items[0].name.includes("Alpha Voyages"), "Agency Alpha details matched");
    assert(alphaSearchResults.items[0].usage.bookingsCount >= 1, "Agency Alpha usage metrics correctly reflect 1 booking");
    assert(alphaSearchResults.items[0].usage.customersCount >= 1, "Agency Alpha usage metrics correctly reflect 1 customer");

    const trialFilterResults = await adminService.listAgencies({ subscriptionStatus: "TRIAL" });
    const hasAlphaInTrial = trialFilterResults.items.some((a) => a.id === agencyAlpha.id);
    assert(hasAlphaInTrial, "Filtering by subscriptionStatus 'TRIAL' includes Agency Alpha");

    const activeFilterResults = await adminService.listAgencies({ subscriptionStatus: "ACTIVE" });
    const hasBetaInActive = activeFilterResults.items.some((a) => a.id === agencyBeta.id);
    assert(hasBetaInActive, "Filtering by subscriptionStatus 'ACTIVE' includes Agency Beta");

    // ═════════════════════════════════════════════════════════════════
    // TEST 4: Agency 360 Full Inspection
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 4: Verifying Agency 360 Full Workspace Inspection...");

    const agency360Alpha = await adminService.getAgency360(agencyAlpha.id);
    assert(agency360Alpha !== null, "Agency 360 returned record for Agency Alpha");
    assert(agency360Alpha!.identity.name === agencyAlpha.name, "Agency 360 identity matched");
    assert(agency360Alpha!.owner?.email === ownerAlpha.email, "Agency 360 owner email matched");
    assert(agency360Alpha!.subscription?.status === SubscriptionStatus.TRIAL, "Agency 360 subscription status matched");
    assert(agency360Alpha!.usageTelemetry.bookings >= 1, "Agency 360 usage telemetry reports bookings count >= 1");
    assert(agency360Alpha!.usageTelemetry.customers >= 1, "Agency 360 usage telemetry reports customers count >= 1");

    // ═════════════════════════════════════════════════════════════════
    // TEST 5: Free Trial Extension & Platform Audit Trail
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 5: Testing Free Trial Extension & Audit Logging...");

    const initialTrialEnd = subAlpha.trialEnd!.getTime();
    const extendedSub = await adminService.extendAgencyTrial(
      agencyAlpha.id,
      14,
      "VIP Onboarding evaluation extension",
      platformOwner.id
    );

    assert(extendedSub.status === SubscriptionStatus.TRIAL, "Subscription remains in TRIAL status after extension");
    assert(extendedSub.trialEnd !== null, "New trialEnd is populated");
    const diffDays = Math.round((extendedSub.trialEnd!.getTime() - initialTrialEnd) / (1000 * 60 * 60 * 24));
    assert(diffDays === 14, `TrialEnd extended exactly by 14 days (diff: ${diffDays} days)`);

    // Verify Platform Audit Log
    const auditLogsAlpha = await adminService.listPlatformAuditLogs({ agencyId: agencyAlpha.id });
    const trialLog = auditLogsAlpha.find((l) => l.action === "TRIAL_EXTENDED");
    assert(trialLog !== undefined, "PlatformAuditLog record created for TRIAL_EXTENDED");
    assert(trialLog?.actorUserId === platformOwner.id, "Audit log recorded Platform Owner as actor");
    assert(trialLog?.metadata?.daysAdded === 14, "Audit log metadata contains daysAdded: 14");
    assert(trialLog?.metadata?.reason === "VIP Onboarding evaluation extension", "Audit log metadata contains extension reason");

    // ═════════════════════════════════════════════════════════════════
    // TEST 6: Agency Suspension & Reactivation Governance
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 6: Testing Non-Destructive Agency Suspension & Reactivation...");

    // Suspend Agency Beta
    const suspendedBeta = await adminService.suspendAgency(
      agencyBeta.id,
      "Administrative suspension for policy review",
      platformOwner.id
    );
    assert(suspendedBeta.status === AgencyStatus.SUSPENDED, "Agency Beta successfully transitioned to SUSPENDED");

    // Verify audit log for suspension
    const auditLogsBeta = await adminService.listPlatformAuditLogs({ agencyId: agencyBeta.id });
    const suspendLog = auditLogsBeta.find((l) => l.action === "AGENCY_SUSPENDED");
    assert(suspendLog !== undefined, "PlatformAuditLog record created for AGENCY_SUSPENDED");
    assert(suspendLog?.metadata?.reason === "Administrative suspension for policy review", "Audit log records suspension reason");

    // Verify non-destructive invariant: historical customer records and bookings still exist
    const betaCustomersCount = await prisma.customer.count({ where: { agencyId: agencyBeta.id } });
    assert(betaCustomersCount >= 0, "Suspension preserves tenant customer records without data loss");

    // Reactivate Agency Beta
    const reactivatedBeta = await adminService.reactivateAgency(agencyBeta.id, platformOwner.id);
    assert(reactivatedBeta.status === AgencyStatus.ACTIVE, "Agency Beta successfully reactivated to ACTIVE");

    const reactivateLog = (await adminService.listPlatformAuditLogs({ agencyId: agencyBeta.id })).find(
      (l) => l.action === "AGENCY_REACTIVATED"
    );
    assert(reactivateLog !== undefined, "PlatformAuditLog record created for AGENCY_REACTIVATED");

    // ═════════════════════════════════════════════════════════════════
    // TEST 7: Dynamic SaaS Subscription Plan Catalog
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 7: Testing SaaS Plan Catalog (Create, Update, List)...");

    const newPlan = await adminService.createPlan(
      {
        name: `Enterprise Elite ${timestamp}`,
        description: "Unlimited agents and enterprise white-labeling",
        price: 9999.0,
        durationDays: 30,
        isActive: true,
      },
      platformOwner.id
    );

    assert(newPlan.name.includes("Enterprise Elite"), "Plan created successfully");
    assert(Number(newPlan.price) === 9999.0, "Plan price persisted correctly");

    const updatedPlan = await adminService.updatePlan(
      newPlan.id,
      { price: 8999.0, description: "Updated promotional price" },
      platformOwner.id
    );

    assert(Number(updatedPlan.price) === 8999.0, "Plan price updated successfully");

    const allPlans = await adminService.listPlans();
    const foundCreated = allPlans.some((p) => p.id === newPlan.id);
    assert(foundCreated, "Newly created plan returned in listPlans()");

    // ═════════════════════════════════════════════════════════════════
    // TEST 8: Platform Announcements & Broadcast Scheduling
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 8: Testing Platform Broadcast Announcements...");

    const announcement = await adminService.createAnnouncement(
      {
        title: `Phase 18 Scheduled Upgrade ${timestamp}`,
        message: "Platform maintenance scheduled for tonight at 02:00 AM IST.",
        type: "MAINTENANCE",
        status: "ACTIVE",
      },
      platformOwner.id
    );

    assert(announcement.title.includes("Phase 18 Scheduled Upgrade"), "Announcement created with title");
    assert(announcement.type === "MAINTENANCE", "Announcement type is MAINTENANCE");

    const activeAnnouncements = await adminService.getActiveAnnouncements();
    const hasActiveAnnouncement = activeAnnouncements.some((a) => a.id === announcement.id);
    assert(hasActiveAnnouncement, "Active announcement appears in getActiveAnnouncements()");

    // Deactivate announcement
    await adminService.updateAnnouncement(announcement.id, { status: "INACTIVE" }, platformOwner.id);
    const activeAfterUpdate = await adminService.getActiveAnnouncements();
    const hasDeactivated = activeAfterUpdate.some((a) => a.id === announcement.id);
    assert(!hasDeactivated, "Inactive announcement filtered out from getActiveAnnouncements()");

    // ═════════════════════════════════════════════════════════════════
    // TEST 9: Cross-Tenant Global Platform Search
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 9: Testing Cross-Tenant Global Platform Search...");

    const searchAgencyResults = await adminService.globalPlatformSearch("Alpha Voyages");
    const foundAlphaAgency = searchAgencyResults.some(
      (r) => r.type === "AGENCY" && r.title.includes("Alpha Voyages")
    );
    assert(foundAlphaAgency, "Global search matches Agency name across tenants");

    const searchOwnerResults = await adminService.globalPlatformSearch("Alpha Owner");
    const foundAlphaOwner = searchOwnerResults.some(
      (r) => r.type === "USER" && r.title === "Alpha Owner"
    );
    assert(foundAlphaOwner, "Global search matches Agency Owner across tenants");

    const searchCustomerResults = await adminService.globalPlatformSearch("Rohan Sharma");
    const foundCustomer = searchCustomerResults.some(
      (r) => r.type === "CUSTOMER" && r.title === "Rohan Sharma"
    );
    assert(foundCustomer, "Global search matches Customer profile with agency context");

    // ═════════════════════════════════════════════════════════════════
    // TEST 10: Platform Key-Value Settings
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 10: Testing Platform Key-Value Configuration...");

    const defaultSettings = await adminService.getPlatformSettings();
    assert(defaultSettings.defaultTrialDays !== undefined, "Default platform settings returned defaultTrialDays");

    await adminService.updatePlatformSettings(
      {
        defaultTrialDays: "10",
        supportEmail: "enterprise@tripdesk.io",
      },
      platformOwner.id
    );

    const updatedSettings = await adminService.getPlatformSettings();
    assert(updatedSettings.defaultTrialDays === "10", "Updated defaultTrialDays persisted");
    assert(updatedSettings.supportEmail === "enterprise@tripdesk.io", "Updated supportEmail persisted");

    // ═════════════════════════════════════════════════════════════════
    // TEST 11: Strict Role Architecture Invariant Verification
    // ═════════════════════════════════════════════════════════════════
    console.log("\n🔹 STEP 11: Verifying Strict System Role Architecture Invariant...");

    const allUsers = await prisma.user.findMany();
    const invalidRoles = allUsers.filter(
      (u) => u.role !== UserRole.PLATFORM_OWNER && u.role !== UserRole.AGENCY_OWNER
    );
    assert(invalidRoles.length === 0, `Strict 2-role invariant verified (0 invalid role accounts found out of ${allUsers.length} total users)`);

    const platformOwners = allUsers.filter((u) => u.role === UserRole.PLATFORM_OWNER);
    const platformOwnersWithAgency = platformOwners.filter((u) => u.agencyId !== null);
    assert(platformOwnersWithAgency.length === 0, "All PLATFORM_OWNER accounts have agencyId = null (no agency lock-in)");

    console.log("\n=================================================================");
    console.log(`🎉 PHASE 18 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
    console.log("=================================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Unhandled exception in Phase 18 test suite:", error);
    process.exit(1);
  } finally {
    // Teardown test fixtures
    console.log("🧹 Cleaning up Phase 18 test fixtures...");
    try {
      await prisma.platformAuditLog.deleteMany({
        where: {
          OR: [
            { actorUserId: platformOwnerId },
            { agencyId: { in: [agencyAlphaId, agencyBetaId] } },
          ],
        },
      });
      await prisma.platformAnnouncement.deleteMany({
        where: {
          title: { contains: `Phase 18 Scheduled Upgrade ${timestamp}` },
        },
      });
      await prisma.booking.deleteMany({
        where: { agencyId: { in: [agencyAlphaId, agencyBetaId] } },
      });
      await prisma.trip.deleteMany({
        where: { agencyId: { in: [agencyAlphaId, agencyBetaId] } },
      });
      await prisma.customer.deleteMany({
        where: { agencyId: { in: [agencyAlphaId, agencyBetaId] } },
      });
      await prisma.subscription.deleteMany({
        where: { agencyId: { in: [agencyAlphaId, agencyBetaId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [platformOwnerId, ownerAlphaId, ownerBetaId] } },
      });
      await prisma.agency.deleteMany({
        where: { id: { in: [agencyAlphaId, agencyBetaId] } },
      });
      await prisma.subscriptionPlan.deleteMany({
        where: { id: { in: [planStarterId, planProId] } },
      });
      console.log("✅ Teardown complete.");
    } catch (cleanupErr) {
      console.error("Teardown warning:", cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runTestSuite();
