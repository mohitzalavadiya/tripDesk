import assert from "node:assert";
import {
  PAGE_PERMISSIONS_REGISTRY,
  DEFAULT_STAFF_PERMISSIONS,
  DELEGABLE_STAFF_DELETE_MODULES,
  IMMUTABLE_OWNER_ONLY_MODULES,
  normalizeStaffPermissions,
  evaluateStaffPermission,
  redactStaffFinancials,
  canAccessFinancialMargins,
} from "../src/lib/auth/permissions";
import { agencyNavigationConfig } from "../src/lib/navigation";

console.log("================================================================================");
console.log("  FINAL RECONCILIATION TEST: PAGE-LEVEL STAFF PERMISSIONS & INVARIANTS");
console.log("================================================================================\n");

// 1. Navigation Visibility & Lock Removal
console.log("▶ CHECK 1: Navigation Config Invariants");
const financeNavItem = agencyNavigationConfig.flatMap(s => s.items).find(i => i.href === "/finance");
const settingsNavItem = agencyNavigationConfig.flatMap(s => s.items).find(i => i.href === "/settings");
const subscriptionNavItem = agencyNavigationConfig.flatMap(s => s.items).find(i => i.href === "/subscription");

assert.strictEqual(financeNavItem?.ownerOnly, undefined, "Finance nav item must NOT have hardcoded ownerOnly");
assert.strictEqual(financeNavItem?.moduleKey, "FINANCE", "Finance nav item must have moduleKey: FINANCE");
assert.strictEqual(settingsNavItem?.ownerOnly, undefined, "Settings nav item must NOT have hardcoded ownerOnly");
assert.strictEqual(settingsNavItem?.moduleKey, "SETTINGS", "Settings nav item must have moduleKey: SETTINGS");
assert.strictEqual(subscriptionNavItem?.ownerOnly, true, "Subscription nav item MUST have ownerOnly: true");
console.log("  [PASS] Navigation items correctly configured for dynamic staff permissions\n");

// 2. Settings & Admin Delegable Permissions
console.log("▶ CHECK 2: Settings & Admin Configurable Permissions");
const settingsConfig = PAGE_PERMISSIONS_REGISTRY.find(p => p.moduleKey === "SETTINGS");
assert(settingsConfig, "SETTINGS must exist in PAGE_PERMISSIONS_REGISTRY");
assert.strictEqual(settingsConfig.isOwnerOnly, false, "SETTINGS must be delegable (isOwnerOnly: false)");
assert(settingsConfig.delegableActions.includes("view"), "SETTINGS must support delegable view");
assert(settingsConfig.delegableActions.includes("update"), "SETTINGS must support delegable update");

// Evaluates true when granted
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true } }, "SETTINGS", "view"), true);
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, update: true } }, "SETTINGS", "update"), true);
// Evaluates false when not granted or delete attempted
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: false } }, "SETTINGS", "view"), false);
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, delete: true } }, "SETTINGS", "delete"), false);
console.log("  [PASS] Settings & Admin delegable permissions verified\n");

// 3. Finance & Invoicing Delegable Permissions
console.log("▶ CHECK 3: Finance & Invoicing Configurable Permissions");
const financeConfig = PAGE_PERMISSIONS_REGISTRY.find(p => p.moduleKey === "FINANCE");
assert(financeConfig, "FINANCE must exist in PAGE_PERMISSIONS_REGISTRY");
assert.strictEqual(financeConfig.isOwnerOnly, false, "FINANCE must be delegable (isOwnerOnly: false)");
assert(financeConfig.delegableActions.includes("view"), "FINANCE must support delegable view");
assert(financeConfig.delegableActions.includes("create"), "FINANCE must support delegable create");

// Evaluates true when granted
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true } }, "FINANCE", "view"), true);
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, create: true } }, "FINANCE", "create"), true);
// Deletion and sensitive margins strictly protected
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "delete"), false);
assert.strictEqual(canAccessFinancialMargins("AGENCY_STAFF"), false, "canAccessFinancialMargins must remain false for staff");
assert.strictEqual(canAccessFinancialMargins("AGENCY_OWNER"), true, "canAccessFinancialMargins must be true for owner");
console.log("  [PASS] Finance & Invoicing delegable permissions verified\n");

// 4. Engagement & Analytics Delegable Permissions
console.log("▶ CHECK 4: Engagement & Analytics Configurable Permissions");
const feedbackConfig = PAGE_PERMISSIONS_REGISTRY.find(p => p.moduleKey === "FEEDBACK");
assert(feedbackConfig, "FEEDBACK must exist in PAGE_PERMISSIONS_REGISTRY");
assert(feedbackConfig.delegableActions.includes("create"), "FEEDBACK must support delegable create");
assert(feedbackConfig.delegableActions.includes("update"), "FEEDBACK must support delegable update");
assert(feedbackConfig.delegableActions.includes("delete"), "FEEDBACK must support delegable delete");

assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FEEDBACK: { view: true, create: true } }, "FEEDBACK", "create"), true);
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FEEDBACK: { view: true, update: true } }, "FEEDBACK", "update"), true);
assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", { FEEDBACK: { view: true, delete: true } }, "FEEDBACK", "delete"), true);
console.log("  [PASS] Engagement & Analytics delegable permissions verified\n");

// 5. Sensitive Financial Redaction Invariants
console.log("▶ CHECK 5: Financial Redaction Contracts");
const sampleFinanceDashboard = {
  kpis: {
    totalSales: 150000,
    amountReceived: 100000,
    customerOutstanding: 50000,
    supplierPayable: 80000,
    grossProfit: 45000,
    profitMarginPercent: 30,
    netCashPosition: 20000,
  },
  profitability: {
    grossProfit: 45000,
    profitMarginPercent: 30,
  },
  supplierPayables: [
    { id: "sp_1", supplierCost: 50000, netRate: 45000 }
  ]
};

const redactedForStaff = redactStaffFinancials(sampleFinanceDashboard, "AGENCY_STAFF");
assert.strictEqual(redactedForStaff.kpis.totalSales, 150000, "Operational totalSales preserved for staff");
assert.strictEqual(redactedForStaff.kpis.amountReceived, 100000, "Operational amountReceived preserved for staff");
assert.strictEqual(redactedForStaff.kpis.customerOutstanding, 50000, "Operational customerOutstanding preserved for staff");
assert.strictEqual(redactedForStaff.kpis.grossProfit, undefined, "Gross profit stripped for staff");
assert.strictEqual(redactedForStaff.kpis.profitMarginPercent, undefined, "Profit margin stripped for staff");
assert.strictEqual(redactedForStaff.kpis.supplierPayable, undefined, "Supplier payable stripped for staff");
assert.strictEqual(redactedForStaff.kpis.netCashPosition, undefined, "Net cash position stripped for staff");

const unredactedForOwner = redactStaffFinancials(sampleFinanceDashboard, "AGENCY_OWNER");
assert.strictEqual(unredactedForOwner.kpis.grossProfit, 45000, "Gross profit retained for owner");
assert.strictEqual(unredactedForOwner.kpis.supplierPayable, 80000, "Supplier payable retained for owner");
console.log("  [PASS] Financial data redaction contracts strictly enforced\n");

// 6. Normalization & Fail-Closed Invariants
console.log("▶ CHECK 6: Normalization & Security Ceilings");
const maliciousInput = {
  FINANCE: { view: true, create: true, delete: true },
  SETTINGS: { view: true, update: true, delete: true },
  SUBSCRIPTION: { view: true, manage: true },
  TEAM: { view: true, invite: true },
  CUSTOMERS: { view: false, create: true, delete: true },
};

const normalized = normalizeStaffPermissions(maliciousInput);
assert.strictEqual(normalized.SUBSCRIPTION, undefined, "SUBSCRIPTION strictly omitted");
assert.strictEqual(normalized.TEAM, undefined, "TEAM strictly omitted");
assert.strictEqual(normalized.FINANCE.view, true, "FINANCE view allowed");
assert.strictEqual(normalized.FINANCE.delete, false, "FINANCE delete forced to false");
assert.strictEqual(normalized.SETTINGS.view, true, "SETTINGS view allowed");
assert.strictEqual(normalized.SETTINGS.delete, false, "SETTINGS delete forced to false");
assert.strictEqual(normalized.CUSTOMERS.view, false, "CUSTOMERS view false");
assert.strictEqual(normalized.CUSTOMERS.create, false, "CUSTOMERS create forced false when view is false");
assert.strictEqual(normalized.CUSTOMERS.delete, false, "CUSTOMERS delete forced false when view is false");
console.log("  [PASS] Normalization and ceiling invariants strictly enforced\n");

console.log("================================================================================");
console.log("  ALL RECONCILIATION INVARIANTS VERIFIED SUCCESSFULLY (100%)");
console.log("================================================================================");

