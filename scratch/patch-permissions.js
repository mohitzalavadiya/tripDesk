const fs = require("fs");

let code = fs.readFileSync("src/lib/auth/permissions.ts", "utf8");

// 1. Update ROLE_PERMISSION_MATRIX.AGENCY_STAFF
const oldStaffMatrix = `    AGENCY_SETTINGS_BILLING: [], // Strictly forbidden: NO subscription, invoice, or tax settings access
    TEAM_INVITATIONS: [], // Strictly forbidden: NO staff management or invitation privileges`;

const newStaffMatrix = `    DASHBOARD_CRM: ["VIEW", "EXPORT"], // Operational metrics, delegable export
    ENQUIRY_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    LEAD_ASSIGNMENT: ["VIEW"],
    FOLLOW_UP_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    CUSTOMER_RECORDS: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    TRIP_ITINERARY: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    QUOTATION_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    BOOKING_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    FINANCIAL_MARGINS: [], // Strictly forbidden: NO net supplier rates, markups, or gross margins
    REPORTS_ANALYTICS: ["VIEW", "EXPORT"],
    AGENCY_SETTINGS_BILLING: ["VIEW"], // Delegable: owner can grant view for subscription & billing
    TEAM_INVITATIONS: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant team view and invite
    PLATFORM_ADMIN: [],`;

// Replace AGENCY_STAFF section in ROLE_PERMISSION_MATRIX
code = code.replace(/AGENCY_STAFF:\s*\{[\s\S]*?PLATFORM_ADMIN:\s*\[\],\s*\},/, `AGENCY_STAFF: {
${newStaffMatrix}
  },`);

// 2. Update DELEGABLE_STAFF_DELETE_MODULES
code = code.replace(
  '"REFERRALS",\n]);',
  '"REFERRALS",\n  "TEAM",\n]);'
);

// 3. Update IMMUTABLE_OWNER_ONLY_MODULES
code = code.replace(
  /export const IMMUTABLE_OWNER_ONLY_MODULES = new Set\(\[[\s\S]*?\]\);/,
  'export const IMMUTABLE_OWNER_ONLY_MODULES = new Set<string>([]);'
);

// 4. In PAGE_PERMISSIONS_REGISTRY: Add TRIP_COSTING to Trips & Bookings
const tripCostingEntry = `  {
    moduleKey: "TRIP_COSTING",
    name: "Trip Costing Studio",
    description: "Trip itinerary resource costing calculations and pricing review",
    route: "/trips/[id]/costing",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update"],
    ownerOnlyActions: ["commercialMargins"],
    defaultPermissions: { view: false, update: false },
  },`;

code = code.replace(
  '  // 3. Catalog & Inventory',
  `${tripCostingEntry}\n\n  // 3. Catalog & Inventory`
);

// 5. In PAGE_PERMISSIONS_REGISTRY: Update SUBSCRIPTION and add TEAM
const oldSubscription = `  {
    moduleKey: "SUBSCRIPTION",
    name: "Subscription & Billing",
    description: "Plan tiers, usage entitlements, billing renewals, and invoice receipts",
    route: "/subscription",
    category: "Settings & Admin",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "manage"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`;

const newSubscriptionAndTeam = `  {
    moduleKey: "SUBSCRIPTION",
    name: "Subscription & Billing",
    description: "Plan tiers, usage entitlements, and billing renewals (plan purchase & upgrades are Owner Only)",
    route: "/subscription",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view"],
    ownerOnlyActions: ["purchaseUpgrade", "manage"],
    defaultPermissions: { view: false },
  },
  {
    moduleKey: "TEAM",
    name: "Team & Staff Management",
    description: "Agency staff directory and onboarding invitations (modifying staff permissions is Owner Only)",
    route: "/settings?tab=team",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: ["managePermissions", "transferOwnership"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`;

code = code.replace(oldSubscription, newSubscriptionAndTeam);

// 6. Update mapModuleToDomain
code = code.replace(
  '    case "TRIPS":\n    case "TRIP_DETAIL":\n    case "ITINERARIES":\n      return "TRIP_ITINERARY";',
  '    case "TRIPS":\n    case "TRIP_DETAIL":\n    case "ITINERARIES":\n    case "TRIP_COSTING":\n      return "TRIP_ITINERARY";'
);

// 7. Update getParentModuleFallback
code = code.replace(
  '    case "OPERATIONS_ISSUES":\n      return "OPERATIONS";',
  '    case "OPERATIONS_ISSUES":\n      return "OPERATIONS";\n    case "TRIP_COSTING":\n      return "TRIPS";'
);

fs.writeFileSync("src/lib/auth/permissions.ts", code, "utf8");
console.log("permissions.ts updated successfully!");

