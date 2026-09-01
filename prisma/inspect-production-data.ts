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
import { Prisma } from "@prisma/client";
import { getAdminClient } from "../src/lib/supabase/admin";

interface ModelInventory {
  model: string;
  count: number;
  scope: "Tenant" | "Platform" | "System";
  classification: "PRESERVE" | "DELETE" | "REVIEW" | "RECREATE";
  notes?: string;
}

async function inspectProductionData() {
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("   TRIPDESK PHASE 20.5 — PRODUCTION DATABASE READ-ONLY AUDIT");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  // 1. Connection & Environment Summary
  console.log("▶ 1. DATABASE & ENVIRONMENT SUMMARY");
  const rawDbUrl = process.env.DATABASE_URL || "";
  const rawDirectUrl = process.env.DIRECT_URL || "";
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  // Parse connection details safely without printing passwords
  let dbHost = "Unknown";
  let dbPort = "Unknown";
  let isPooler = false;
  try {
    const parsedUrl = new URL(rawDbUrl.replace("postgresql://", "http://"));
    dbHost = parsedUrl.hostname;
    dbPort = parsedUrl.port;
    isPooler = rawDbUrl.includes("pgbouncer=true") || parsedUrl.port === "6543";
  } catch {}

  console.log(`  Database Target Host: ${dbHost}`);
  console.log(`  Database Port:        ${dbPort}`);
  console.log(`  Connection Mode:      ${isPooler ? "Transaction Pooler (pgbouncer)" : "Direct Session"}`);
  console.log(`  Supabase URL:         ${rawSupabaseUrl ? rawSupabaseUrl.substring(0, 25) + "..." : "Not Set"}`);
  console.log(`  Node Environment:     ${process.env.NODE_ENV || "development"}`);
  console.log(`  Prisma Client:        v7.9.1 with @prisma/adapter-pg\n`);

  // 2. Complete Model-by-Model Record Count
  console.log("▶ 2. COMPLETE PRISMA MODEL INVENTORY");
  const models = Object.keys(Prisma.ModelName) as (keyof typeof Prisma.ModelName)[];
  const inventory: ModelInventory[] = [];

  for (const modelName of models) {
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const delegate = (prisma as any)[delegateName];
    if (delegate && typeof delegate.count === "function") {
      try {
        const count = await delegate.count();
        let scope: "Tenant" | "Platform" | "System" = "Tenant";
        let classification: "PRESERVE" | "DELETE" | "REVIEW" | "RECREATE" = "DELETE";

        // Classify platform vs tenant models
        if (["SubscriptionPlan", "PlatformSetting"].includes(modelName)) {
          scope = "Platform";
          classification = "PRESERVE";
        } else if (["PlatformAuditLog", "PlatformAnnouncement"].includes(modelName)) {
          scope = "Platform";
          classification = "REVIEW";
        } else if (["User", "Subscription"].includes(modelName)) {
          scope = "System";
          classification = "REVIEW";
        }

        inventory.push({
          model: modelName,
          count,
          scope,
          classification,
        });
      } catch (err: any) {
        inventory.push({
          model: modelName,
          count: -1,
          scope: "Tenant",
          classification: "REVIEW",
          notes: `Error counting: ${err.message}`,
        });
      }
    }
  }

  console.log("  ┌─────────────────────────────────┬───────┬──────────┬────────────────┐");
  console.log("  │ Model Name                      │ Count │ Scope    │ Classification │");
  console.log("  ├─────────────────────────────────┼───────┼──────────┼────────────────┤");
  for (const row of inventory) {
    const countStr = row.count >= 0 ? String(row.count).padStart(5, " ") : " ERR ";
    console.log(
      `  │ ${row.model.padEnd(31, " ")} │ ${countStr} │ ${row.scope.padEnd(8, " ")} │ ${row.classification.padEnd(14, " ")} │`
    );
  }
  console.log("  └─────────────────────────────────┴───────┴──────────┴────────────────┘\n");

  // 3. Platform Owner & System User Invariants
  console.log("▶ 3. PLATFORM OWNER & INTERNAL APPLICATION USERS");
  const users = await prisma.user.findMany({
    include: {
      agency: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  const platformOwners = users.filter((u) => u.role === "PLATFORM_OWNER");
  const agencyOwners = users.filter((u) => u.role === "AGENCY_OWNER");
  const invalidRoleUsers = users.filter((u) => u.role !== "PLATFORM_OWNER" && u.role !== "AGENCY_OWNER");

  console.log(`  Total DB Users:             ${users.length}`);
  console.log(`  Platform Owners (SuperAdmin): ${platformOwners.length}`);
  console.log(`  Agency Owners (Tenants):    ${agencyOwners.length}`);
  console.log(`  Invalid/Other Roles:        ${invalidRoleUsers.length}`);

  console.log("\n  Platform Owner Details:");
  for (const po of platformOwners) {
    console.log(`    - ID:        ${po.id}`);
    console.log(`      Email:     ${po.email}`);
    console.log(`      Name:      ${po.name}`);
    console.log(`      agencyId:  ${po.agencyId ?? "null (CORRECT)"}`);
    console.log(`      CreatedAt: ${po.createdAt.toISOString()}`);
  }

  // 4. Supabase Auth Users Audit & Reconciliation
  console.log("\n▶ 4. SUPABASE AUTH AUDIT & RECONCILIATION");
  const adminClient = getAdminClient();
  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error) {
      console.log(`  ⚠️ Failed to list Supabase Auth users: ${error.message}`);
    } else {
      const authUsers = data.users || [];
      console.log(`  Total Supabase Auth Users: ${authUsers.length}`);

      const userMap = new Map(users.map((u) => [u.id, u]));
      const authUserMap = new Map(authUsers.map((au) => [au.id, au]));

      const caseA_TestAgencyUsers: any[] = [];
      const caseB_PlatformOwners: any[] = [];
      const caseC_OrphanAuthUsers: any[] = [];
      const caseD_OrphanDbUsers: any[] = [];

      for (const au of authUsers) {
        const dbU = userMap.get(au.id);
        if (dbU) {
          if (dbU.role === "PLATFORM_OWNER") {
            caseB_PlatformOwners.push({ authUser: au, dbUser: dbU });
          } else {
            caseA_TestAgencyUsers.push({ authUser: au, dbUser: dbU });
          }
        } else {
          caseC_OrphanAuthUsers.push(au);
        }
      }

      for (const dbU of users) {
        if (!authUserMap.has(dbU.id)) {
          caseD_OrphanDbUsers.push(dbU);
        }
      }

      console.log(`\n  Case A (Auth User + DB User + Test Agency): ${caseA_TestAgencyUsers.length}`);
      for (const item of caseA_TestAgencyUsers) {
        console.log(`    - Auth ID: ${item.authUser.id} | Email: ${item.authUser.email} | Agency: ${item.dbUser.agency?.name || "None"}`);
      }

      console.log(`\n  Case B (Auth User + DB User + PLATFORM_OWNER): ${caseB_PlatformOwners.length} [PRESERVE]`);
      for (const item of caseB_PlatformOwners) {
        console.log(`    - Auth ID: ${item.authUser.id} | Email: ${item.authUser.email} | Name: ${item.dbUser.name}`);
      }

      console.log(`\n  Case C (Supabase Auth User with NO DB User): ${caseC_OrphanAuthUsers.length}`);
      for (const au of caseC_OrphanAuthUsers) {
        console.log(`    - Auth ID: ${au.id} | Email: ${au.email} | Created: ${au.created_at}`);
      }

      console.log(`\n  Case D (DB User with NO Supabase Auth User): ${caseD_OrphanDbUsers.length}`);
      for (const du of caseD_OrphanDbUsers) {
        console.log(`    - DB User ID: ${du.id} | Email: ${du.email} | Role: ${du.role}`);
      }
    }
  } else {
    console.log("  ⚠️ Supabase Admin client not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
  }

  // 5. SaaS Plans & Platform Settings
  console.log("\n▶ 5. SAAS PLANS & PLATFORM CONFIGURATION");
  const plans = await prisma.subscriptionPlan.findMany({
    include: { _count: { select: { subscriptions: true } } },
  });
  console.log(`  Total SaaS Subscription Plans: ${plans.length}`);
  for (const p of plans) {
    console.log(`    - Plan: [${p.code}] "${p.name}" | Price: $${p.price}/${p.interval} | Active Subs: ${p._count.subscriptions}`);
  }

  const settings = await prisma.platformSetting.findMany();
  console.log(`\n  Total Platform Settings: ${settings.length}`);
  for (const s of settings) {
    console.log(`    - Key: [${s.category}] "${s.key}" = ${s.value.substring(0, 30)}`);
  }

  const announcements = await prisma.platformAnnouncement.findMany();
  console.log(`\n  Total Platform Announcements: ${announcements.length}`);
  for (const a of announcements) {
    console.log(`    - [${a.type}] "${a.title}" | Target: ${a.targetRole || "ALL"} | Active: ${a.isActive}`);
  }

  const auditLogs = await prisma.platformAuditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  const totalAuditLogs = await prisma.platformAuditLog.count();
  console.log(`\n  Total Platform Audit Logs: ${totalAuditLogs}`);
  console.log(`  Latest 10 Audit Actions:`);
  for (const log of auditLogs) {
    console.log(`    - [${log.createdAt.toISOString()}] ${log.action} on ${log.entityType} by ${log.actorRole} (${log.actorEmail})`);
  }

  // 6. Tenant Agencies Inventory
  console.log("\n▶ 6. TENANT AGENCIES INVENTORY");
  const agencies = await prisma.agency.findMany({
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          enquiries: true,
          trips: true,
          quotations: true,
          bookings: true,
          payments: true,
          suppliers: true,
          travelDocuments: true,
          customerNotifications: true,
        },
      },
    },
  });
  console.log(`  Total Agencies in Database: ${agencies.length}`);
  for (const ag of agencies) {
    console.log(`    - Agency: "${ag.name}" (ID: ${ag.id})`);
    console.log(`      Status: ${ag.status} | Created: ${ag.createdAt.toISOString()}`);
    console.log(`      Users: ${ag._count.users}, Customers: ${ag._count.customers}, Enquiries: ${ag._count.enquiries}, Trips: ${ag._count.trips}`);
    console.log(`      Quotations: ${ag._count.quotations}, Bookings: ${ag._count.bookings}, Payments: ${ag._count.payments}, Docs: ${ag._count.travelDocuments}`);
  }

  // 7. Commercial & Financial Exposure Check
  console.log("\n▶ 7. COMMERCIAL & FINANCIAL RECONCILIATION SUMMARY");
  const bookingAgg = await prisma.booking.aggregate({
    _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
    _count: true,
  });
  const paymentAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
  });
  const payableAgg = await prisma.supplierPayable.aggregate({
    _sum: { plannedAmount: true, actualAmount: true, paidAmount: true },
    _count: true,
  });
  const expenseAgg = await prisma.operationalExpense.aggregate({
    _sum: { amount: true },
    _count: true,
  });

  console.log(`  Total Bookings Count:       ${bookingAgg._count}`);
  console.log(`  Total Booking GMV:          $${bookingAgg._sum.totalAmount ?? 0}`);
  console.log(`  Total Customer Collections: $${bookingAgg._sum.paidAmount ?? 0}`);
  console.log(`  Total Outstanding Balances: $${bookingAgg._sum.balanceAmount ?? 0}`);
  console.log(`  Total Payments Recorded:    ${paymentAgg._count} (Sum: $${paymentAgg._sum.amount ?? 0})`);
  console.log(`  Total Supplier Payables:    ${payableAgg._count} (Planned: $${payableAgg._sum.plannedAmount ?? 0}, Paid: $${payableAgg._sum.paidAmount ?? 0})`);
  console.log(`  Total Operational Expenses: ${expenseAgg._count} (Sum: $${expenseAgg._sum.amount ?? 0})`);

  // 8. Public Share Links & Documents
  console.log("\n▶ 8. PUBLIC SHARE TOKENS & DOCUMENTS INVENTORY");
  const publicShareLinks = await prisma.publicShareLink.count();
  const quotationTokens = await prisma.quotation.count({
    where: { shareToken: { not: null } },
  });
  const travelDocs = await prisma.travelDocument.count();

  console.log(`  PublicShareLink records:    ${publicShareLinks}`);
  console.log(`  Quotations with ShareToken: ${quotationTokens}`);
  console.log(`  Travel Document records:    ${travelDocs}`);

  console.log("\n═════════════════════════════════════════════════════════════════════════");
  console.log("   READ-ONLY AUDIT COMPLETE — ZERO DATA MUTATIONS PERFORMED");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

inspectProductionData().catch(async (e) => {
  console.error("FATAL ERROR in inspectProductionData:", e);
  await prisma.$disconnect();
  process.exit(1);
});
