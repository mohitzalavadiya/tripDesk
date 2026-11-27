const fs = require('fs');
const path = require('path');

const permsPath = path.resolve('src/lib/auth/permissions.ts');
let content = fs.readFileSync(permsPath, 'utf8');

// 1. Update DELEGABLE_STAFF_DELETE_MODULES
const oldDelegable = `export const DELEGABLE_STAFF_DELETE_MODULES = new Set([
  "CUSTOMERS",
  "ENQUIRIES",
  "FOLLOW_UPS",
  "TRIPS",
  "ITINERARIES",
  "QUOTATIONS",
  "BOOKINGS",
  "DOCUMENTS",
  "OPERATIONS",
  "DESTINATIONS",
  "HOTELS",
  "VEHICLES",
  "ACTIVITIES",
  "FEEDBACK",
  "REFERRALS",
]);`;

const newDelegable = `export const DELEGABLE_STAFF_DELETE_MODULES = new Set([
  "CUSTOMERS",
  "CUSTOMER_DETAIL",
  "ENQUIRIES",
  "ENQUIRY_DETAIL",
  "FOLLOW_UPS",
  "TRIPS",
  "TRIP_DETAIL",
  "ITINERARIES",
  "QUOTATIONS",
  "QUOTATION_DETAIL",
  "BOOKINGS",
  "BOOKING_DETAIL",
  "DOCUMENTS",
  "OPERATIONS",
  "OPERATIONS_ISSUES",
  "DESTINATIONS",
  "HOTELS",
  "VEHICLES",
  "ACTIVITIES",
  "FEEDBACK",
  "REFERRALS",
]);`;

content = content.replace(/\r\n/g, '\n');
if (content.includes(oldDelegable.replace(/\r\n/g, '\n'))) {
  content = content.replace(oldDelegable.replace(/\r\n/g, '\n'), newDelegable);
  console.log("Updated DELEGABLE_STAFF_DELETE_MODULES");
} else {
  console.error("Could not find oldDelegable block");
}

// 2. Replace PAGE_PERMISSIONS_REGISTRY
const registryStart = 'export const PAGE_PERMISSIONS_REGISTRY: PagePermissionConfig[] = [';
const registryEnd = '];\n\n/**\n * Standard Least-Privilege Staff Defaults';

const startIndex = content.indexOf(registryStart);
const endIndex = content.indexOf(registryEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newRegistryCode = `export const PAGE_PERMISSIONS_REGISTRY: PagePermissionConfig[] = [
  // 1. CRM & Sales
  {
    moduleKey: "DASHBOARD",
    name: "Dashboard Overview",
    description: "Operational overview, consultant tasks, and pipeline summary",
    route: "/dashboard",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view"],
    ownerOnlyActions: ["export"],
    defaultPermissions: { view: true, delete: false },
  },
  {
    moduleKey: "CUSTOMERS",
    name: "Customer Directory (List)",
    description: "Client contact directory, search, filter, and customer record management",
    route: "/customers",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "CUSTOMER_DETAIL",
    name: "Customer Detail (360 Dossier)",
    description: "Detailed traveler profile, booking history, preferences, and files",
    route: "/customers/[id]",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, update: true, delete: false },
  },
  {
    moduleKey: "CUSTOMER_INSIGHTS",
    name: "Customer Insights",
    description: "Repeat traveler metrics, lifetime value, and behavior telemetry",
    route: "/customer-insights",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view"],
    ownerOnlyActions: ["export"],
    defaultPermissions: { view: false, delete: false },
  },
  {
    moduleKey: "ENQUIRIES",
    name: "Enquiries & Pipeline (List)",
    description: "Lead management, enquiry progression, and pipeline stages",
    route: "/enquiries",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "ENQUIRY_DETAIL",
    name: "Enquiry Workspace (Detail)",
    description: "Lead qualification dossier, passenger requirements, and custom notes",
    route: "/enquiries/[id]",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, update: true, delete: false },
  },
  {
    moduleKey: "FOLLOW_UPS",
    name: "Follow-ups & CRM Activity",
    description: "Call logs, interaction notes, and scheduled customer reminders",
    route: "/follow-ups",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete", "logInteraction"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false, logInteraction: true },
  },

  // 2. Trips & Bookings
  {
    moduleKey: "TRIPS",
    name: "Trips Planning (List)",
    description: "Trip dossiers, day-by-day schedules, passenger coordination",
    route: "/trips",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "TRIP_DETAIL",
    name: "Trip Dossier & Itinerary (Detail)",
    description: "Trip builder, day-by-day schedules, accommodations, and costing",
    route: "/trips/[id]",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, update: true, delete: false },
  },
  {
    moduleKey: "ITINERARIES",
    name: "Itinerary Templates",
    description: "Package & day itinerary templates and reusable blocks",
    route: "/trips",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "QUOTATIONS",
    name: "Quotations & Proposals (List)",
    description: "Pricing proposals (sensitive net supplier rates and margins redacted)",
    route: "/quotations",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: ["commercialMargins"],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "QUOTATION_DETAIL",
    name: "Quotation Builder (Detail)",
    description: "Proposal line items, pricing tiers, and presentation preview",
    route: "/quotations/[id]",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: ["commercialMargins"],
    defaultPermissions: { view: true, update: true, delete: false },
  },
  {
    moduleKey: "BOOKINGS",
    name: "Bookings Directory (List)",
    description: "Confirmed bookings, client vouchers, and operational milestones",
    route: "/bookings",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "BOOKING_DETAIL",
    name: "Booking Dossier (Detail)",
    description: "Confirmed booking dossier, passenger rooming, and payment schedules",
    route: "/bookings/[id]",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, update: true, delete: false },
  },
  {
    moduleKey: "DOCUMENTS",
    name: "Travel Documents",
    description: "Travel vouchers, welcome dossiers, and customer-facing itineraries",
    route: "/documents",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "OPERATIONS",
    name: "Operations & Manifests",
    description: "Live trip readiness, vehicle dispatch, driver notes, and manifests",
    route: "/operations",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: true, delete: false },
  },
  {
    moduleKey: "OPERATIONS_ISSUES",
    name: "Operations Incidents & Issues",
    description: "Live tour operational blockers, incident resolution, and supplier complaints",
    route: "/operations/issues",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },

  // 3. Catalog & Inventory
  {
    moduleKey: "DESTINATIONS",
    name: "Destinations Catalog",
    description: "Destinations, regions, season indicators, and attractions",
    route: "/destinations",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "HOTELS",
    name: "Hotels Directory",
    description: "Hotel directory records, room categories, and property amenities",
    route: "/hotels",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "VEHICLES",
    name: "Vehicles & Fleet",
    description: "Fleet records, vehicle models, passenger capacities, and drivers",
    route: "/vehicles",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "ACTIVITIES",
    name: "Activities & Sightseeing",
    description: "Sightseeing experiences, activity catalog, and standard inclusions",
    route: "/activities",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "RATE_SHEETS",
    name: "Rate Sheets",
    description: "Confidential supplier contract rates & seasonal tariffs",
    route: "/rate-sheets",
    category: "Catalog & Inventory",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "create", "update", "delete"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "SUPPLIERS",
    name: "Suppliers Directory",
    description: "Supplier contacts, commercial agreements, and procurement ledger",
    route: "/suppliers",
    category: "Catalog & Inventory",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "create", "update", "delete"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },

  // 4. Finance & Invoicing
  {
    moduleKey: "PAYMENTS",
    name: "Payments & Receipts",
    description: "View customer receipts and record pending receipts (verification is Owner Only)",
    route: "/payments",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "recordReceipt"],
    ownerOnlyActions: ["verify", "void", "delete"],
    defaultPermissions: { view: true, recordReceipt: false, delete: false },
  },
  {
    moduleKey: "INVOICES",
    name: "Invoices",
    description: "Tax invoices, credit notes, and official financial billing records",
    route: "/invoices",
    category: "Finance & Invoicing",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "create", "update", "delete"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "FINANCE",
    name: "Financial Margins & Ledger",
    description: "Agency profitability, gross margins, supplier disbursements, and bank ledger",
    route: "/finance",
    category: "Finance & Invoicing",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "create", "update", "delete"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },

  // 5. Engagement & Analytics
  {
    moduleKey: "FEEDBACK",
    name: "Feedback & Reviews",
    description: "Customer trip reviews, ratings, and service recovery logging",
    route: "/feedback",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "REPORTS",
    name: "Reports & Analytics",
    description: "Agency revenue trends, executive analytics, and data exports",
    route: "/reports",
    category: "Engagement & Analytics",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "export"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "COMMUNICATIONS",
    name: "Communications",
    description: "Client email/SMS delivery logs and ad-hoc client notifications",
    route: "/communications",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "create"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: false, delete: false },
  },
  {
    moduleKey: "REFERRALS",
    name: "Referrals & Rewards",
    description: "Customer referral tracking, reward programs, and advocate conversions",
    route: "/referrals",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: false, delete: false },
  },

  // 6. Settings & Admin
  {
    moduleKey: "SETTINGS",
    name: "Agency Settings",
    description: "Company profile, logo, tax registration (GST), and team management",
    route: "/settings",
    category: "Settings & Admin",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "manage"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "SUBSCRIPTION",
    name: "Subscription & Billing",
    description: "Plan tiers, usage entitlements, billing renewals, and invoice receipts",
    route: "/subscription",
    category: "Settings & Admin",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "manage"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "SUPPORT_CHAT",
    name: "Platform Support Chat",
    description: "Direct help desk messaging with Your Travel Desk SaaS support team",
    route: "/support",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "create"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: false, delete: false },
  },
]`;

  content = content.substring(0, startIndex) + newRegistryCode + content.substring(endIndex);
  console.log("Updated PAGE_PERMISSIONS_REGISTRY");
} else {
  console.error("Could not find PAGE_PERMISSIONS_REGISTRY bounds", startIndex, endIndex);
}

// 3. Add getParentModuleFallback and update mapModuleToDomain
const oldMapModule = `function mapModuleToDomain(moduleKey: string): PermissionDomain | null {
  const m = moduleKey.toUpperCase();
  switch (m) {
    case "DASHBOARD":
      return "DASHBOARD_CRM";
    case "CUSTOMERS":
      return "CUSTOMER_RECORDS";
    case "ENQUIRIES":
      return "ENQUIRY_MANAGEMENT";
    case "FOLLOW_UPS":
      return "FOLLOW_UP_MANAGEMENT";
    case "TRIPS":
    case "ITINERARIES":
      return "TRIP_ITINERARY";
    case "QUOTATIONS":
      return "QUOTATION_MANAGEMENT";
    case "BOOKINGS":
      return "BOOKING_MANAGEMENT";
    case "FINANCE":
      return "FINANCIAL_MARGINS";
    case "REPORTS":
      return "REPORTS_ANALYTICS";
    case "SETTINGS":
    case "SUBSCRIPTION":
      return "AGENCY_SETTINGS_BILLING";
    case "TEAM":
      return "TEAM_INVITATIONS";
    default:
      return null;
  }
}`;

const newMapModule = `/**
 * Safe backward-compatibility fallback resolver.
 * When evaluating a sub-page or detail-page that has no explicit entry in a legacy staff profile,
 * falls back to the parent module configuration.
 * When the sub-page has an explicit entry in the profile, this fallback is bypassed,
 * guaranteeing genuine page-level independence.
 */
export function getParentModuleFallback(moduleKey: string): string | null {
  switch (moduleKey.toUpperCase()) {
    case "CUSTOMER_DETAIL":
      return "CUSTOMERS";
    case "ENQUIRY_DETAIL":
      return "ENQUIRIES";
    case "TRIP_DETAIL":
      return "TRIPS";
    case "QUOTATION_DETAIL":
      return "QUOTATIONS";
    case "BOOKING_DETAIL":
      return "BOOKINGS";
    case "OPERATIONS_ISSUES":
      return "OPERATIONS";
    default:
      return null;
  }
}

function mapModuleToDomain(moduleKey: string): PermissionDomain | null {
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
      return "BOOKING_MANAGEMENT";
    case "OPERATIONS":
    case "OPERATIONS_ISSUES":
      return "TRIP_ITINERARY";
    case "FINANCE":
      return "FINANCIAL_MARGINS";
    case "REPORTS":
      return "REPORTS_ANALYTICS";
    case "SETTINGS":
    case "SUBSCRIPTION":
      return "AGENCY_SETTINGS_BILLING";
    case "TEAM":
      return "TEAM_INVITATIONS";
    default:
      return null;
  }
}`;

if (content.includes(oldMapModule)) {
  content = content.replace(oldMapModule, newMapModule);
  console.log("Updated mapModuleToDomain and added getParentModuleFallback");
} else {
  console.error("Could not find oldMapModule");
}

// 4. Update evaluateStaffPermission to use getParentModuleFallback
const oldEvalBlock = `  const modulePerms = staffGrants[normalizedModule];
  if (!modulePerms || typeof modulePerms !== "object") {
    return false; // Fail closed
  }`;

const newEvalBlock = `  let modulePerms = staffGrants[normalizedModule];
  if (!modulePerms || typeof modulePerms !== "object") {
    // Check fallback for detail pages to parent module if detail key is not explicitly set in profile
    const parentFallback = getParentModuleFallback(normalizedModule);
    if (parentFallback && staffGrants[parentFallback] && typeof staffGrants[parentFallback] === "object") {
      modulePerms = staffGrants[parentFallback];
    } else {
      return false; // Fail closed
    }
  }`;

if (content.includes(oldEvalBlock)) {
  content = content.replace(oldEvalBlock, newEvalBlock);
  console.log("Updated evaluateStaffPermission fallback logic");
} else {
  console.error("Could not find oldEvalBlock");
}

fs.writeFileSync(permsPath, content, 'utf8');
console.log("Saved permissions.ts successfully!");

