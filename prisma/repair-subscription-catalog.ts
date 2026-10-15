import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  extractSupabaseProjectRef,
  extractDatabaseProjectRef,
  PRODUCTION_TARGET_SUPABASE_PROJECT_REF,
  LOCAL_QA_SUPABASE_PROJECT_REF,
} from "./bootstrap-owner";

export interface RepairEnvironmentOptions {
  targetMode?: string;
  allowProductionCatalogRepair?: boolean | string;
  supabaseUrl?: string;
  databaseUrl?: string;
  expectedProjectRef?: string;
}

export interface ValidatedRepairEnvironment {
  projectRef: string;
  dbProjectRef: string;
  targetMode: string;
}

/**
 * Canonical Subscription Plan & Entitlements Specifications
 */
export const CANONICAL_PLANS = [
  {
    name: "Starter",
    description: "Essential travel planning & quotation workflow for boutique operators.",
    price: 499.0,
    yearlyPrice: 4999.0,
    durationDays: 30,
    isActive: true,
    isPopular: false,
    displayOrder: 1,
    features: [
      "Customer Management & CRM",
      "Trip Planning & Itinerary Builder",
      "Quotation Engine & PDF Export",
      "Booking Management & Vouchers",
      "Hotel & Vehicle Inventory",
      "Basic Payment Receipts & Invoicing",
      "Standard Email Support",
    ],
    featureEntitlements: [
      { featureKey: "CUSTOM_AGENCY_LOGO", enabled: false },
      { featureKey: "FEEDBACK_REVIEWS", enabled: false },
      { featureKey: "CUSTOMER_INSIGHTS", enabled: false },
      { featureKey: "REPORTS_ANALYTICS", enabled: false },
    ],
    usageLimits: [
      { resourceKey: "TRIPS", limit: 20 },
      { resourceKey: "QUOTATIONS", limit: 20 },
      { resourceKey: "BOOKINGS", limit: 20 },
    ],
  },
  {
    name: "Professional",
    description: "Comprehensive operating suite for established agencies and tour desks.",
    price: 999.0,
    yearlyPrice: 9999.0,
    durationDays: 30,
    isActive: true,
    isPopular: false,
    displayOrder: 2,
    features: [
      "Everything in Starter Plan",
      "Operations Desk & Supplier Confirmations",
      "Advanced Finance & Profit Margin Analysis",
      "Agency Business Intelligence & Reports",
      "Multi-Channel Communication Center",
      "Customer Feedback & Service Recovery",
      "Customer Insights & Lifetime Analytics",
      "Custom Agency Branding & Logo",
      "Priority Email & Helpdesk Support",
    ],
    featureEntitlements: [
      { featureKey: "CUSTOM_AGENCY_LOGO", enabled: true },
      { featureKey: "FEEDBACK_REVIEWS", enabled: true },
      { featureKey: "CUSTOMER_INSIGHTS", enabled: true },
      { featureKey: "REPORTS_ANALYTICS", enabled: true },
    ],
    usageLimits: [
      { resourceKey: "TRIPS", limit: null },
      { resourceKey: "QUOTATIONS", limit: null },
      { resourceKey: "BOOKINGS", limit: null },
    ],
  },
];

export const CANONICAL_TAX_RATES = [
  { name: "0%", rate: 0, displayOrder: 1, isDefault: true, isActive: true },
  { name: "5%", rate: 5, displayOrder: 2, isDefault: false, isActive: true },
  { name: "12%", rate: 12, displayOrder: 3, isDefault: false, isActive: true },
  { name: "18%", rate: 18, displayOrder: 4, isDefault: false, isActive: true },
  { name: "28%", rate: 28, displayOrder: 5, isDefault: false, isActive: true },
];

/**
 * Fail-Closed Production Environment Safety Validator.
 *
 * Enforces:
 * 1. Target mode authorization: Requires explicit REPAIR_TARGET_MODE="production" (or options.targetMode === "production").
 *    NOTE: NODE_ENV=production alone is NEVER accepted.
 * 2. Explicit repair authorization: Requires ALLOW_PRODUCTION_CATALOG_REPAIR="true" (or options.allowProductionCatalogRepair === true).
 * 3. Structural Supabase URL validation: Hostname must match `<project-ref>.supabase.co`.
 * 4. Structural Database URL validation: Connection string must match Supabase pooler or direct host.
 * 5. Cross-target matching: Detected Auth project ref must match detected Database URL project ref.
 * 6. Local/QA protection: Fails closed immediately if either URL targets the Local/QA project (nsqarlegqxymqfyvfrjw).
 * 7. Target project matching: Confirms detected project ref matches expected target ref (default: qypkowejgqrmilckemcr).
 * 8. Zero fallback: Rejects ambiguous or missing environment configuration.
 */
export function validateRepairEnvironment(
  options?: RepairEnvironmentOptions
): ValidatedRepairEnvironment {
  const explicitTargetMode = (
    options?.targetMode ||
    process.env.REPAIR_TARGET_MODE ||
    ""
  )
    .trim()
    .toLowerCase();

  const allowRepair =
    options?.allowProductionCatalogRepair !== undefined
      ? String(options.allowProductionCatalogRepair).trim().toLowerCase() === "true"
      : process.env.ALLOW_PRODUCTION_CATALOG_REPAIR === "true";

  // 1. Target mode authorization
  if (explicitTargetMode !== "production") {
    console.error("❌ Target Mode Authorization Required: Missing explicit REPAIR_TARGET_MODE='production'.");
    console.error("   Note: NODE_ENV=production alone does NOT prove target authorization.");
    throw new Error("Target Mode Authorization Required: Missing explicit REPAIR_TARGET_MODE='production'.");
  }

  // 2. Explicit repair authorization
  if (!allowRepair) {
    console.error(
      "❌ Production Catalog Repair Authorization Required: Missing explicit ALLOW_PRODUCTION_CATALOG_REPAIR='true'."
    );
    throw new Error(
      "Production Catalog Repair Authorization Required: Missing explicit ALLOW_PRODUCTION_CATALOG_REPAIR='true'."
    );
  }

  // 3. Supabase URL validation
  const rawUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    console.error("❌ Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL is not configured.");
    throw new Error("Invalid Supabase URL: Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  const detectedRef = extractSupabaseProjectRef(rawUrl);
  if (!detectedRef) {
    console.error("❌ Malformed Supabase URL: Hostname must structurally match '<project-ref>.supabase.co'.");
    throw new Error("Invalid Supabase URL: Malformed URL structure.");
  }

  // 4. Database URL validation
  const rawDbUrl = options?.databaseUrl || process.env.DATABASE_URL;
  if (!rawDbUrl || typeof rawDbUrl !== "string" || !rawDbUrl.trim()) {
    console.error("❌ Missing Database URL: DATABASE_URL is not configured.");
    throw new Error("Invalid Database URL: Missing DATABASE_URL.");
  }

  const detectedDbRef = extractDatabaseProjectRef(rawDbUrl);
  if (!detectedDbRef) {
    console.error(
      "❌ Malformed Database URL: Connection string must structurally match Supabase pooler or direct host."
    );
    throw new Error("Invalid Database URL: Malformed connection string structure.");
  }

  // 5. Cross-target matching
  if (detectedRef !== detectedDbRef) {
    console.error(
      `❌ Target Project Mismatch: Auth project ref ('${detectedRef}') != Database project ref ('${detectedDbRef}').`
    );
    throw new Error(
      `Target Project Mismatch: Auth project ref '${detectedRef}' != Database project ref '${detectedDbRef}'.`
    );
  }

  // 6. Local/QA project lock
  if (
    detectedRef === LOCAL_QA_SUPABASE_PROJECT_REF ||
    detectedDbRef === LOCAL_QA_SUPABASE_PROJECT_REF
  ) {
    console.error(
      `❌ Environment Lock: Production repair is strictly forbidden from targeting Local/QA project '${LOCAL_QA_SUPABASE_PROJECT_REF}'.`
    );
    throw new Error(
      `Environment Lock: Cannot target Local/QA project ref '${LOCAL_QA_SUPABASE_PROJECT_REF}'.`
    );
  }

  // 7. Validate against expected project reference
  const expectedRef = (
    options?.expectedProjectRef ||
    process.env.EXPECTED_SUPABASE_PROJECT_REF ||
    PRODUCTION_TARGET_SUPABASE_PROJECT_REF
  )
    .trim()
    .toLowerCase();

  if (detectedRef !== expectedRef || detectedDbRef !== expectedRef) {
    console.error(
      `❌ Target Project Mismatch: Detected ref '${detectedRef}' does not match expected ref '${expectedRef}'.`
    );
    throw new Error(
      `Target Project Mismatch: Detected project ref '${detectedRef}' != expected '${expectedRef}'.`
    );
  }

  return {
    projectRef: detectedRef,
    dbProjectRef: detectedDbRef,
    targetMode: explicitTargetMode,
  };
}

export interface CatalogRepairOptions extends RepairEnvironmentOptions {
  prismaClient?: any;
}

export interface CatalogRepairResult {
  success: boolean;
  projectRef: string;
  plans: {
    id: string;
    name: string;
    action: "created" | "updated" | "verified_existing";
    monthlyPrice: number;
    yearlyPrice: number;
    featuresCount?: number;
  }[];
  entitlements: {
    plan: string;
    featureKey: string;
    action: "created" | "updated" | "verified_existing";
  }[];
  usageLimits: {
    plan: string;
    resourceKey: string;
    limit: number | null;
    action: "created" | "updated" | "verified_existing";
  }[];
  taxRates: {
    rate: number;
    name: string;
    action: "created" | "updated" | "verified_existing";
  }[];
  preservedPlatformOwners: number;
  preservedAgencies: number;
  preservedSubscriptions: number;
}

/**
 * Idempotent, safe, catalog-only repair routine.
 *
 * Touches ONLY:
 * 1. SubscriptionPlan
 * 2. PlanFeatureEntitlement
 * 3. PlanUsageLimit
 * 4. TaxRate
 *
 * Guaranteed invariants:
 * - ZERO deletions or truncations.
 * - Zero mutations to Users, Agencies, Subscriptions, Bookings, Quotations, Invoices, or Settings.
 * - Compares existing rows against canonical values before modifying.
 */
export async function repairSubscriptionCatalog(
  options?: CatalogRepairOptions
): Promise<CatalogRepairResult> {
  // 1. Fail-Closed Environment Target Safety Lock
  const validatedEnv = validateRepairEnvironment(options);
  console.log(`🔒 Production Safety Lock Verified: Project ref [${validatedEnv.projectRef}], Target mode [${validatedEnv.targetMode}]`);

  // 2. Resolve database client
  let client = options?.prismaClient;
  let pool: Pool | null = null;
  let ownsClient = false;

  if (!client) {
    const connectionString = options?.databaseUrl || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    client = new PrismaClient({ adapter });
    ownsClient = true;
  }

  try {
    // 3. Pre-flight read-only inventory of preserved business data
    const prePlatformOwners = await client.user.count({
      where: { role: "PLATFORM_OWNER" },
    });
    const preAgencies = await client.agency.count();
    const preSubscriptions = await client.subscription.count();

    const planResults: CatalogRepairResult["plans"] = [];
    const entitlementResults: CatalogRepairResult["entitlements"] = [];
    const usageLimitResults: CatalogRepairResult["usageLimits"] = [];
    const taxRateResults: CatalogRepairResult["taxRates"] = [];

    // 4. Seed / Reconcile Subscription Plans
    for (const spec of CANONICAL_PLANS) {
      const existing = await client.subscriptionPlan.findUnique({
        where: { name: spec.name },
      });

      let planId: string;
      if (!existing) {
        console.log(`➕ Creating missing SubscriptionPlan: "${spec.name}" (₹${spec.price}/mo, ₹${spec.yearlyPrice}/yr)`);
        const created = await client.subscriptionPlan.create({
          data: {
            name: spec.name,
            description: spec.description,
            price: spec.price,
            yearlyPrice: spec.yearlyPrice,
            durationDays: spec.durationDays,
            features: spec.features,
            isActive: spec.isActive,
            isPopular: spec.isPopular,
            displayOrder: spec.displayOrder,
          },
        });
        planId = created.id;
        planResults.push({
          id: planId,
          name: spec.name,
          action: "created",
          monthlyPrice: spec.price,
          yearlyPrice: spec.yearlyPrice,
          featuresCount: spec.features.length,
        });
      } else {
        planId = existing.id;
        const featuresMatch =
          JSON.stringify(existing.features) === JSON.stringify(spec.features);
        const needsUpdate =
          Number(existing.price) !== spec.price ||
          Number(existing.yearlyPrice) !== spec.yearlyPrice ||
          existing.durationDays !== spec.durationDays ||
          existing.isActive !== spec.isActive ||
          existing.displayOrder !== spec.displayOrder ||
          !featuresMatch;

        if (needsUpdate) {
          console.log(`🔄 Updating conflicting fields for SubscriptionPlan: "${spec.name}"`);
          const updateData: any = {};
          if (Number(existing.price) !== spec.price) updateData.price = spec.price;
          if (Number(existing.yearlyPrice) !== spec.yearlyPrice) updateData.yearlyPrice = spec.yearlyPrice;
          if (existing.durationDays !== spec.durationDays) updateData.durationDays = spec.durationDays;
          if (existing.isActive !== spec.isActive) updateData.isActive = spec.isActive;
          if (existing.displayOrder !== spec.displayOrder) updateData.displayOrder = spec.displayOrder;
          if (!featuresMatch) updateData.features = spec.features;

          await client.subscriptionPlan.update({
            where: { id: planId },
            data: updateData,
          });
          planResults.push({
            id: planId,
            name: spec.name,
            action: "updated",
            monthlyPrice: spec.price,
            yearlyPrice: spec.yearlyPrice,
            featuresCount: spec.features.length,
          });
        } else {
          console.log(`✔ Verified existing canonical SubscriptionPlan: "${spec.name}"`);
          planResults.push({
            id: planId,
            name: spec.name,
            action: "verified_existing",
            monthlyPrice: Number(existing.price),
            yearlyPrice: Number(existing.yearlyPrice),
            featuresCount: Array.isArray(existing.features) ? existing.features.length : 0,
          });
        }
      }

      // 4B. Feature Entitlements
      for (const fe of spec.featureEntitlements) {
        const existingFe = await client.planFeatureEntitlement.findUnique({
          where: {
            planId_featureKey: {
              planId,
              featureKey: fe.featureKey,
            },
          },
        });

        if (!existingFe) {
          await client.planFeatureEntitlement.create({
            data: {
              planId,
              featureKey: fe.featureKey,
              enabled: fe.enabled,
            },
          });
          entitlementResults.push({
            plan: spec.name,
            featureKey: fe.featureKey,
            action: "created",
          });
        } else if (existingFe.enabled !== fe.enabled) {
          await client.planFeatureEntitlement.update({
            where: { id: existingFe.id },
            data: { enabled: fe.enabled },
          });
          entitlementResults.push({
            plan: spec.name,
            featureKey: fe.featureKey,
            action: "updated",
          });
        } else {
          entitlementResults.push({
            plan: spec.name,
            featureKey: fe.featureKey,
            action: "verified_existing",
          });
        }
      }

      // 4C. Usage Limits
      for (const ul of spec.usageLimits) {
        const existingUl = await client.planUsageLimit.findUnique({
          where: {
            planId_resourceKey: {
              planId,
              resourceKey: ul.resourceKey,
            },
          },
        });

        if (!existingUl) {
          await client.planUsageLimit.create({
            data: {
              planId,
              resourceKey: ul.resourceKey,
              limit: ul.limit,
            },
          });
          usageLimitResults.push({
            plan: spec.name,
            resourceKey: ul.resourceKey,
            limit: ul.limit,
            action: "created",
          });
        } else if (existingUl.limit !== ul.limit) {
          await client.planUsageLimit.update({
            where: { id: existingUl.id },
            data: { limit: ul.limit },
          });
          usageLimitResults.push({
            plan: spec.name,
            resourceKey: ul.resourceKey,
            limit: ul.limit,
            action: "updated",
          });
        } else {
          usageLimitResults.push({
            plan: spec.name,
            resourceKey: ul.resourceKey,
            limit: ul.limit,
            action: "verified_existing",
          });
        }
      }
    }

    // 5. Seed / Reconcile Tax Rates Catalog
    for (const tr of CANONICAL_TAX_RATES) {
      const existingTr = await client.taxRate.findUnique({
        where: { rate: tr.rate },
      });

      if (!existingTr) {
        console.log(`➕ Creating missing TaxRate preset: ${tr.name} (${tr.rate}%)`);
        await client.taxRate.create({
          data: {
            name: tr.name,
            rate: tr.rate,
            displayOrder: tr.displayOrder,
            isDefault: tr.isDefault,
            isActive: tr.isActive,
          },
        });
        taxRateResults.push({
          rate: tr.rate,
          name: tr.name,
          action: "created",
        });
      } else {
        const needsUpdate =
          existingTr.name !== tr.name ||
          existingTr.displayOrder !== tr.displayOrder ||
          existingTr.isDefault !== tr.isDefault ||
          existingTr.isActive !== tr.isActive;

        if (needsUpdate) {
          console.log(`🔄 Updating conflicting TaxRate preset: ${tr.rate}%`);
          await client.taxRate.update({
            where: { id: existingTr.id },
            data: {
              name: tr.name,
              displayOrder: tr.displayOrder,
              isDefault: tr.isDefault,
              isActive: tr.isActive,
            },
          });
          taxRateResults.push({
            rate: tr.rate,
            name: tr.name,
            action: "updated",
          });
        } else {
          taxRateResults.push({
            rate: tr.rate,
            name: tr.name,
            action: "verified_existing",
          });
        }
      }
    }

    // 6. Post-repair safety invariant check
    const postPlatformOwners = await client.user.count({
      where: { role: "PLATFORM_OWNER" },
    });
    const postAgencies = await client.agency.count();
    const postSubscriptions = await client.subscription.count();

    if (
      postPlatformOwners !== prePlatformOwners ||
      postAgencies !== preAgencies ||
      postSubscriptions !== preSubscriptions
    ) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Business data count changed during catalog repair! Pre: [PO:${prePlatformOwners}, Ag:${preAgencies}, Sub:${preSubscriptions}], Post: [PO:${postPlatformOwners}, Ag:${postAgencies}, Sub:${postSubscriptions}]`
      );
    }

    console.log("✅ Catalog repair completed successfully with zero mutations to business records.");

    return {
      success: true,
      projectRef: validatedEnv.projectRef,
      plans: planResults,
      entitlements: entitlementResults,
      usageLimits: usageLimitResults,
      taxRates: taxRateResults,
      preservedPlatformOwners: postPlatformOwners,
      preservedAgencies: postAgencies,
      preservedSubscriptions: postSubscriptions,
    };
  } finally {
    if (ownsClient) {
      await client.$disconnect();
      if (pool) {
        await pool.end();
      }
    }
  }
}

// Direct CLI entry point
if (require.main === module) {
  repairSubscriptionCatalog()
    .then((result) => {
      console.log("\n=======================================================");
      console.log("   CATALOG REPAIR EXECUTION REPORT");
      console.log("=======================================================");
      console.log(`Target Project:              ${result.projectRef}`);
      console.log(`Subscription Plans:          ${result.plans.length} processed (${result.plans.map((p) => `${p.name}: ${p.action}`).join(", ")})`);
      console.log(`Feature Entitlements:        ${result.entitlements.length} processed`);
      console.log(`Usage Limits:                ${result.usageLimits.length} processed`);
      console.log(`Tax Rate Presets:            ${result.taxRates.length} processed`);
      console.log(`Preserved Platform Owners:   ${result.preservedPlatformOwners}`);
      console.log(`Preserved Tenant Agencies:   ${result.preservedAgencies}`);
      console.log(`Preserved Subscriptions:     ${result.preservedSubscriptions}`);
      console.log("=======================================================\n");
    })
    .catch((err) => {
      console.error("\n❌ FATAL ERROR in catalog repair:", err.message);
      process.exit(1);
    });
}
