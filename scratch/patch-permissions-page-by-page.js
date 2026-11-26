const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'auth', 'permissions.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace the permissions.ts content with the updated comprehensive version
const updatedContent = `/**
 * TripDesk Authoritative Role & Permission Engine (Phase F / Page-by-Page Permissions)
 *
 * Implements a strict, least-privilege capability matrix across business domains and application pages.
 * Differentiates PLATFORM_OWNER (SaaS admin), AGENCY_OWNER (tenant administrator),
 * and AGENCY_STAFF (least-privilege travel consultant / operations operator).
 */

export type AppRole = "PLATFORM_OWNER" | "AGENCY_OWNER" | "AGENCY_STAFF";

export type PermissionDomain =
  | "DASHBOARD_CRM"
  | "ENQUIRY_MANAGEMENT"
  | "LEAD_ASSIGNMENT"
  | "FOLLOW_UP_MANAGEMENT"
  | "CUSTOMER_RECORDS"
  | "TRIP_ITINERARY"
  | "QUOTATION_MANAGEMENT"
  | "BOOKING_MANAGEMENT"
  | "FINANCIAL_MARGINS"
  | "REPORTS_ANALYTICS"
  | "AGENCY_SETTINGS_BILLING"
  | "TEAM_INVITATIONS"
  | "PLATFORM_ADMIN";

export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "REASSIGN"
  | "EXPORT"
  | "MANAGE";

/**
 * Authoritative Permission Matrix.
 * Explicitly maps each role to allowed actions per domain.
 * Unlisted actions default to strictly DENIED.
 *
 * For AGENCY_STAFF:
 * - Operational domains permit VIEW, CREATE, UPDATE, and delegable DELETE (when explicitly granted by Agency Owner).
 * - Financial margins, reports, billing, team management, and platform admin are strictly empty (DENIED).
 */
export const ROLE_PERMISSION_MATRIX: Record<
  AppRole,
  Record<PermissionDomain, readonly PermissionAction[]>
> = {
  PLATFORM_OWNER: {
    DASHBOARD_CRM: ["VIEW"],
    ENQUIRY_MANAGEMENT: [],
    LEAD_ASSIGNMENT: [],
    FOLLOW_UP_MANAGEMENT: [],
    CUSTOMER_RECORDS: [],
    TRIP_ITINERARY: [],
    QUOTATION_MANAGEMENT: [],
    BOOKING_MANAGEMENT: [],
    FINANCIAL_MARGINS: [],
    REPORTS_ANALYTICS: ["VIEW", "EXPORT"],
    AGENCY_SETTINGS_BILLING: ["VIEW", "MANAGE"],
    TEAM_INVITATIONS: [],
    PLATFORM_ADMIN: ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE", "EXPORT"],
  },
  AGENCY_OWNER: {
    DASHBOARD_CRM: ["VIEW", "EXPORT"],
    ENQUIRY_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE", "EXPORT"],
    LEAD_ASSIGNMENT: ["VIEW", "REASSIGN", "MANAGE"],
    FOLLOW_UP_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    CUSTOMER_RECORDS: ["VIEW", "CREATE", "UPDATE", "DELETE", "EXPORT"],
    TRIP_ITINERARY: ["VIEW", "CREATE", "UPDATE", "DELETE"],
    QUOTATION_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"],
    BOOKING_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"],
    FINANCIAL_MARGINS: ["VIEW", "UPDATE", "MANAGE", "EXPORT"],
    REPORTS_ANALYTICS: ["VIEW", "EXPORT"],
    AGENCY_SETTINGS_BILLING: ["VIEW", "UPDATE", "MANAGE"],
    TEAM_INVITATIONS: ["VIEW", "CREATE", "UPDATE", "DELETE", "MANAGE"],
    PLATFORM_ADMIN: [],
  },
  AGENCY_STAFF: {
    DASHBOARD_CRM: ["VIEW"], // Operational metrics only, financial aggregates redacted
    ENQUIRY_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    LEAD_ASSIGNMENT: ["VIEW"], // View assigned owner, cannot arbitrarily reassign other consultants' leads
    FOLLOW_UP_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    CUSTOMER_RECORDS: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    TRIP_ITINERARY: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    QUOTATION_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    BOOKING_MANAGEMENT: ["VIEW", "CREATE", "UPDATE", "DELETE"], // Delegable: owner can grant delete
    FINANCIAL_MARGINS: [], // Strictly forbidden: NO net supplier rates, markups, or gross margins
    REPORTS_ANALYTICS: [], // Strictly forbidden: NO agency-wide revenue or financial reports
    AGENCY_SETTINGS_BILLING: [], // Strictly forbidden: NO subscription, invoice, or tax settings access
    TEAM_INVITATIONS: [], // Strictly forbidden: NO staff management or invitation privileges
    PLATFORM_ADMIN: [], // Strictly forbidden: NO platform admin access
  },
};

/**
 * Checks whether an actor with a given role has permission to execute an action on a domain.
 */
export function hasPermission(
  role: string | null | undefined,
  domain: PermissionDomain,
  action: PermissionAction
): boolean {
  if (!role) return false;
  const normalizedRole = role.trim().toUpperCase() as AppRole;
  const domainPerms = ROLE_PERMISSION_MATRIX[normalizedRole]?.[domain];
  if (!domainPerms) return false;
  return domainPerms.includes(action);
}

/**
 * Checks if the role can view internal financial margins, net supplier costs, and markup rates.
 */
export function canAccessFinancialMargins(role: string | null | undefined): boolean {
  return hasPermission(role, "FINANCIAL_MARGINS", "VIEW");
}

/**
 * Checks if the role can manage agency team members and staff invitations.
 */
export function canManageTeam(role: string | null | undefined): boolean {
  return hasPermission(role, "TEAM_INVITATIONS", "MANAGE");
}

/**
 * Checks if the role can access and modify agency settings, tax profiles, and billing.
 */
export function canManageAgencySettings(role: string | null | undefined): boolean {
  return hasPermission(role, "AGENCY_SETTINGS_BILLING", "MANAGE");
}

/**
 * Checks if the role can access platform administration.
 */
export function canAccessPlatformAdmin(role: string | null | undefined): boolean {
  return hasPermission(role, "PLATFORM_ADMIN", "VIEW");
}

export interface StaffModulePermissions {
  view?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  [key: string]: boolean | undefined;
}

export type StaffPermissionsProfileMap = Record<string, StaffModulePermissions>;

/**
 * Modules where deletion is delegable by the Agency Owner to Staff.
 * When enabled by the Owner, staff can delete records in these operational areas.
 * Default is strictly FALSE (least-privilege).
 */
export const DELEGABLE_STAFF_DELETE_MODULES = new Set([
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
]);

/**
 * Modules where capabilities are permanently restricted to the Agency Owner.
 * Cannot be delegated to staff under any circumstances.
 */
export const IMMUTABLE_OWNER_ONLY_MODULES = new Set([
  "FINANCE",
  "INVOICES",
  "RATE_SHEETS",
  "SUPPLIERS",
  "REPORTS",
  "SETTINGS",
  "AGENCY_SETTINGS",
  "SUBSCRIPTION",
  "BILLING",
  "TEAM",
  "TEAM_INVITATIONS",
]);

export interface PagePermissionConfig {
  moduleKey: string;
  name: string;
  description: string;
  route: string;
  category:
    | "CRM & Sales"
    | "Trips & Bookings"
    | "Catalog & Inventory"
    | "Finance & Invoicing"
    | "Engagement & Analytics"
    | "Settings & Admin";
  isOwnerOnly: boolean;
  delegableActions: string[];
  ownerOnlyActions: string[];
  defaultPermissions: StaffModulePermissions;
}

/**
 * Authoritative Page-by-Page Permissions Registry
 * Covers every application page and relevant sub-section in Your Travel Desk.
 */
export const PAGE_PERMISSIONS_REGISTRY: PagePermissionConfig[] = [
  // 1. CRM & Sales
  {
    moduleKey: "DASHBOARD",
    name: "Dashboard",
    description: "Operational overview, consultant tasks, and pipeline summary",
    route: "/dashboard",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view"],
    ownerOnlyActions: ["export"],
    defaultPermissions: { view: true, delete: false },
  },
  {
    moduleKey: "ENQUIRIES",
    name: "Enquiries",
    description: "Lead management, enquiry progression, and pipeline stages",
    route: "/enquiries",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
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
  {
    moduleKey: "CUSTOMERS",
    name: "Customer Records",
    description: "Client contact records, preferences, passport info, and history",
    route: "/customers",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
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

  // 2. Trips & Bookings
  {
    moduleKey: "TRIPS",
    name: "Trips Planning",
    description: "Trip dossiers, day-by-day schedules, passenger coordination",
    route: "/trips",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
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
    name: "Quotations & Proposals",
    description: "Pricing proposals (sensitive net supplier rates and margins redacted)",
    route: "/quotations",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: ["commercialMargins"],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "BOOKINGS",
    name: "Bookings",
    description: "Confirmed bookings, client vouchers, and operational milestones",
    route: "/bookings",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
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
    name: "Operations & Dispatch",
    description: "Live trip readiness, vehicle dispatch, driver notes, and issue tracking",
    route: "/operations",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: true, delete: false },
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
];

/**
 * Standard Least-Privilege Staff Defaults
 * Built dynamically from PAGE_PERMISSIONS_REGISTRY.
 */
export const DEFAULT_STAFF_PERMISSIONS: StaffPermissionsProfileMap = PAGE_PERMISSIONS_REGISTRY.reduce(
  (acc, page) => {
    acc[page.moduleKey] = { ...page.defaultPermissions };
    return acc;
  },
  {} as StaffPermissionsProfileMap
);

/**
 * Normalizes, validates, and enforces strict security invariants on staff permission profiles.
 * Invariants:
 * 1. Owner-only domains (FINANCE, REPORTS, SETTINGS, TEAM, SUBSCRIPTION, INVOICES, RATE_SHEETS, SUPPLIERS) are strictly omitted.
 * 2. Delete is delegable ONLY for delegable operational modules (DELEGABLE_STAFF_DELETE_MODULES); permanently false for others.
 * 3. View is a strict prerequisite: if view is false, child actions (create, update, delete, recordReceipt) are forced false.
 * 4. Discards unknown non-primitive or unsafe keys.
 */
export function normalizeStaffPermissions(input: any): StaffPermissionsProfileMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const normalized: StaffPermissionsProfileMap = {};

  for (const [key, val] of Object.entries(input)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const cleanKey = key.trim().toUpperCase();

    // Owner-only domains can never be delegated to staff: strictly omitted
    if (IMMUTABLE_OWNER_ONLY_MODULES.has(cleanKey)) {
      continue;
    }

    const valObj = val as Record<string, any>;
    const viewAllowed = Boolean(valObj.view);
    const isDeleteDelegable = DELEGABLE_STAFF_DELETE_MODULES.has(cleanKey);

    normalized[cleanKey] = {
      view: viewAllowed,
      create: viewAllowed ? Boolean(valObj.create) : false,
      update: viewAllowed ? Boolean(valObj.update) : false,
      delete: viewAllowed && isDeleteDelegable ? Boolean(valObj.delete) : false,
    };

    // Sub-actions preserved only if view is allowed
    if (viewAllowed) {
      for (const [subAction, subVal] of Object.entries(valObj)) {
        if (!["view", "create", "update", "delete"].includes(subAction)) {
          normalized[cleanKey][subAction] = Boolean(subVal);
        }
      }
    }
  }

  return normalized;
}

function mapModuleToDomain(moduleKey: string): PermissionDomain | null {
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
}

function mapActionToEnum(actionKey: string): PermissionAction | null {
  const a = actionKey.toUpperCase();
  switch (a) {
    case "VIEW":
      return "VIEW";
    case "CREATE":
    case "RECORDRECEIPT":
    case "LOGINTERACTION":
      return "CREATE";
    case "UPDATE":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return null;
  }
}

/**
 * Evaluates effective staff permission by intersecting role ceiling with individual staff grant.
 * Strict Invariants:
 * 1. Role ceiling is an immutable mathematical ceiling. Staff can never exceed it.
 * 2. Immutable owner-only modules are permanently blocked.
 * 3. Deletion is evaluated strictly: permitted ONLY if module is delegable and staff grant has delete: true.
 * 4. View is a strict prerequisite: if view is false, child actions are false.
 * 5. Missing or malformed grants fail closed.
 */
export function evaluateStaffPermission(
  role: string | null | undefined,
  staffGrants: StaffPermissionsProfileMap | null | undefined,
  moduleKey: string,
  actionKey: string
): boolean {
  if (!role) return false;
  const normalizedRole = role.trim().toUpperCase() as AppRole;

  // Agency Owner has full authority for agency operations
  if (normalizedRole === "AGENCY_OWNER") {
    return true;
  }

  // Platform Owner is restricted from agency operations
  if (normalizedRole === "PLATFORM_OWNER") {
    return false;
  }

  const normalizedModule = moduleKey.toUpperCase();
  const normalizedAction = actionKey.toLowerCase();

  // INVARIANT 1: Immutable owner-only modules are NEVER accessible to staff
  if (IMMUTABLE_OWNER_ONLY_MODULES.has(normalizedModule)) {
    return false;
  }

  // INVARIANT 2: Deletion check: only delegable modules can ever be deleted by staff
  if (normalizedAction === "delete") {
    if (!DELEGABLE_STAFF_DELETE_MODULES.has(normalizedModule)) {
      return false; // Not delegable to staff (e.g. Payments, Finance, Invoices)
    }
  }

  // INVARIANT 3: Role ceiling check
  const domainKey = mapModuleToDomain(moduleKey);
  const actionEnum = mapActionToEnum(actionKey);
  if (domainKey && actionEnum) {
    const roleAllowed = hasPermission("AGENCY_STAFF", domainKey, actionEnum);
    if (!roleAllowed) {
      return false; // Role ceiling blocked
    }
  }

  // If no staff grants provided, fail closed
  if (!staffGrants || typeof staffGrants !== "object") {
    return false;
  }

  const modulePerms = staffGrants[normalizedModule];
  if (!modulePerms || typeof modulePerms !== "object") {
    return false; // Fail closed
  }

  // INVARIANT 4: View prerequisite
  if (normalizedAction !== "view") {
    if (!modulePerms.view) {
      return false; // View is disabled; child action cannot be performed
    }
  }

  const matchedKey = Object.keys(modulePerms).find(
    (k) => k.toLowerCase() === normalizedAction
  );
  return Boolean(matchedKey ? modulePerms[matchedKey] : modulePerms[actionKey]);
}

/**
 * Sensitive financial field names that must never be exposed to AGENCY_STAFF.
 */
export const SENSITIVE_FINANCIAL_KEYS = new Set([
  "supplierCost",
  "supplierCostCurrency",
  "netRate",
  "netCost",
  "costPrice",
  "markupPercent",
  "markupPercentage",
  "markupAmount",
  "grossMargin",
  "marginPercent",
  "profitAmount",
  "grossProfit",
  "grossMarginPercent",
  "totalGrossProfit",
  "overallMarginPercent",
  "totalSupplierPayable",
  "supplierPayable",
  "supplierPaid",
  "supplierOutstanding",
  "supplierBalance",
  "supplierCostPlanned",
  "supplierCostActual",
  "profitMarginPercent",
  "netCashPosition",
  "supplierPayables",
  "supplierPayments",
  "operationalExpenses",
  "expenses",
  "agencyMargin",
  "internalNotes",
]);

/**
 * Recursively redacts internal costs, net rates, markups, and margins from payloads
 * before returning them to an AGENCY_STAFF caller.
 * Preserves customer selling prices, quotation totals, and operational details.
 */
export function redactStaffFinancials<T>(data: T, role: string | null | undefined): T {
  if (!role || canAccessFinancialMargins(role)) {
    return data;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactStaffFinancials(item, role)) as unknown as T;
  }

  if (typeof data === "object" && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (SENSITIVE_FINANCIAL_KEYS.has(key)) {
        // Redact sensitive commercial field
        continue;
      }
      sanitized[key] = redactStaffFinancials(value, role);
    }
    return sanitized as T;
  }

  return data;
}

/**
 * Explicit safe field selection DTO transformer for Quotations when viewed by AGENCY_STAFF.
 * Explicitly strips sensitive markup percentages, markup amounts, internal notes,
 * and per-item supplier cost prices while retaining customer selling prices and proposal metadata.
 */
export function toStaffSafeQuotationDTO<T extends Record<string, any>>(quotation: T): T {
  if (!quotation || typeof quotation !== "object") return quotation;

  const {
    markupPercentage,
    markupAmount,
    internalNotes,
    ...safeFields
  } = quotation;

  // If quotation has items, sanitize item costPrice
  if (Array.isArray((safeFields as any).items)) {
    (safeFields as any).items = (safeFields as any).items.map((item: any) => {
      if (item && typeof item === "object") {
        const { costPrice, supplierCost, netRate, markupPercent, ...safeItem } = item;
        return safeItem;
      }
      return item;
    });
  }

  return safeFields as T;
}

/**
 * Explicit DTO transformer for an array of Quotations for AGENCY_STAFF.
 */
export function toStaffSafeQuotationListDTO<T extends Record<string, any>>(quotations: T[]): T[] {
  if (!Array.isArray(quotations)) return quotations;
  return quotations.map(toStaffSafeQuotationDTO);
}
`;

fs.writeFileSync(targetPath, updatedContent.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log('Successfully updated src/lib/auth/permissions.ts');

