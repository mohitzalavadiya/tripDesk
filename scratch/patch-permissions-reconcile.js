const fs = require('fs');
let code = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');

// 1. Update IMMUTABLE_OWNER_ONLY_MODULES
code = code.replace(
  /export const IMMUTABLE_OWNER_ONLY_MODULES = new Set\(\[[\s\S]*?\]\);/,
  `export const IMMUTABLE_OWNER_ONLY_MODULES = new Set([
  "SUBSCRIPTION",
  "BILLING",
  "TEAM",
  "TEAM_INVITATIONS",
]);`
);

// 2. Update FINANCE in PAGE_PERMISSIONS_REGISTRY
code = code.replace(
  /\{\s*moduleKey:\s*"FINANCE"[\s\S]*?defaultPermissions:\s*\{[^}]*\}\s*\},/,
  `{
    moduleKey: "FINANCE",
    name: "Financial Margins & Ledger",
    description: "Operational financial ledger and tour expenses (supplier payables & commercial margins redacted)",
    route: "/finance",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "create"],
    ownerOnlyActions: ["commercialMargins", "supplierDisbursements", "delete"],
    defaultPermissions: { view: false, create: false, delete: false },
  },`
);

// 3. Update FEEDBACK in PAGE_PERMISSIONS_REGISTRY
code = code.replace(
  /\{\s*moduleKey:\s*"FEEDBACK"[\s\S]*?defaultPermissions:\s*\{[^}]*\}\s*\},/,
  `{
    moduleKey: "FEEDBACK",
    name: "Feedback & Reviews",
    description: "Customer trip reviews, ratings, and service recovery logging",
    route: "/feedback",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },`
);

// 4. Update COMMUNICATIONS in PAGE_PERMISSIONS_REGISTRY
code = code.replace(
  /\{\s*moduleKey:\s*"COMMUNICATIONS"[\s\S]*?defaultPermissions:\s*\{[^}]*\}\s*\},/,
  `{
    moduleKey: "COMMUNICATIONS",
    name: "Communications",
    description: "Client email/SMS delivery logs and ad-hoc client notifications",
    route: "/communications",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: false, delete: false },
  },`
);

// 5. Update SETTINGS in PAGE_PERMISSIONS_REGISTRY
code = code.replace(
  /\{\s*moduleKey:\s*"SETTINGS"[\s\S]*?defaultPermissions:\s*\{[^}]*\}\s*\},/,
  `{
    moduleKey: "SETTINGS",
    name: "Agency Settings",
    description: "Company profile, communication templates, and GST settings (team management is Owner Only)",
    route: "/settings",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "update"],
    ownerOnlyActions: ["teamManagement", "legalTaxProfile"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`
);

// 6. Update mapModuleToDomain
code = code.replace(
  /function mapModuleToDomain\(moduleKey: string\): PermissionDomain \| null \{[\s\S]*?switch \(m\) \{[\s\S]*?default:\s*return null;\s*\}\s*\}/,
  `function mapModuleToDomain(moduleKey: string): PermissionDomain | null {
  const m = moduleKey.toUpperCase();
  switch (m) {
    case "DASHBOARD":
      return "DASHBOARD_CRM";
    case "CUSTOMERS":
    case "CUSTOMER_DETAIL":
      return "CUSTOMER_RECORDS";
    case "ENQUIRIES":
    case "ENQUIRY_DETAIL":
      return "ENQUIRY_MANAGEMENT";
    case "FOLLOW_UPS":
      return "FOLLOW_UP_MANAGEMENT";
    case "TRIPS":
    case "TRIP_DETAIL":
    case "ITINERARIES":
      return "TRIP_ITINERARY";
    case "QUOTATIONS":
    case "QUOTATION_DETAIL":
      return "QUOTATION_MANAGEMENT";
    case "BOOKINGS":
    case "BOOKING_DETAIL":
    case "INVOICES":
    case "FINANCE":
      return "BOOKING_MANAGEMENT";
    case "RATE_SHEETS":
    case "SUPPLIERS":
    case "OPERATIONS":
    case "OPERATIONS_ISSUES":
    case "SETTINGS":
      return "TRIP_ITINERARY";
    case "REPORTS":
      return "REPORTS_ANALYTICS";
    case "SUBSCRIPTION":
      return "AGENCY_SETTINGS_BILLING";
    case "TEAM":
      return "TEAM_INVITATIONS";
    default:
      return null;
  }
}`
);

fs.writeFileSync('src/lib/auth/permissions.ts', code);
console.log('Successfully updated src/lib/auth/permissions.ts');

