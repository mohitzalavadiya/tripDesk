/**
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
    REPORTS_ANALYTICS: [], // Strictly forbidden in base matrix: NO reports or exports
    AGENCY_SETTINGS_BILLING: [], // Strictly forbidden: NO subscription, invoice, or tax settings access
    TEAM_INVITATIONS: [], // Strictly forbidden in base matrix: NO staff management or invitation privileges
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
export function canAccessFinancialMargins(
  role: string | null | undefined,
  staffGrants?: StaffPermissionsProfileMap | null
): boolean {
  if (hasPermission(role, "FINANCIAL_MARGINS", "VIEW")) return true;
  if (staffGrants) {
    return (
      evaluateStaffPermission(role, staffGrants, "FINANCE", "view") ||
      evaluateStaffPermission(role, staffGrants, "FINANCE", "commercialMargins") ||
      evaluateStaffPermission(role, staffGrants, "QUOTATIONS", "commercialMargins")
    );
  }
  return false;
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
  "DASHBOARD",
  "CUSTOMERS",
  "CUSTOMER_DETAIL",
  "CUSTOMER_INSIGHTS",
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
  "TRIP_COSTING",
  "DESTINATIONS",
  "HOTELS",
  "VEHICLES",
  "ACTIVITIES",
  "INVOICES",
  "PAYMENTS",
  "FINANCE",
  "RATE_SHEETS",
  "SUPPLIERS",
  "FEEDBACK",
  "REPORTS",
  "COMMUNICATIONS",
  "REFERRALS",
  "SETTINGS",
  "SUBSCRIPTION",
  "TEAM",
  "SUPPORT_CHAT",
]);

/**
 * Modules where capabilities are permanently restricted to the Agency Owner.
 * Empty: Agency Owners may delegate any agency-level module to staff.
 */
export const IMMUTABLE_OWNER_ONLY_MODULES = new Set<string>([]);

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
    name: "Dashboard Overview",
    description: "Operational overview, consultant tasks, and pipeline summary",
    route: "/dashboard",
    category: "CRM & Sales",
    isOwnerOnly: false,
    delegableActions: ["view", "export"],
    ownerOnlyActions: [],
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
    delegableActions: ["view", "export"],
    ownerOnlyActions: [],
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
    description: "Pricing proposals, line items, and commercial quotes",
    route: "/quotations",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete", "commercialMargins"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: true, update: true, delete: false },
  },
  {
    moduleKey: "QUOTATION_DETAIL",
    name: "Quotation Builder (Detail)",
    description: "Proposal line items, pricing tiers, and presentation preview",
    route: "/quotations/[id]",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete", "commercialMargins"],
    ownerOnlyActions: [],
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
    delegableActions: ["view", "update", "delete", "export"],
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

  {
    moduleKey: "TRIP_COSTING",
    name: "Trip Costing Studio",
    description: "Trip itinerary resource costing calculations and pricing review",
    route: "/trips/[id]/costing",
    category: "Trips & Bookings",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "commercialMargins"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, update: false },
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
    description: "Supplier contract rates & seasonal tariffs (commercial net margins redacted)",
    route: "/rate-sheets",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "SUPPLIERS",
    name: "Suppliers Directory",
    description: "Supplier contacts, directory profiles, and service listings (unredacted ledger is Owner Only)",
    route: "/suppliers",
    category: "Catalog & Inventory",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },

  // 4. Finance & Invoicing
  {
    moduleKey: "PAYMENTS",
    name: "Payments & Receipts",
    description: "Customer receipts, payment verification, voiding, and refunds",
    route: "/payments",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "recordReceipt", "update", "verify", "void", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, recordReceipt: false, verify: false, void: false, delete: false },
  },
  {
    moduleKey: "INVOICES",
    name: "Invoices",
    description: "Client tax invoices, credit notes, and booking billing records",
    route: "/invoices",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "FINANCE",
    name: "Financial Margins & Ledger",
    description: "Financial ledger, tour expenses, supplier payables, and commercial margins",
    route: "/finance",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete", "commercialMargins", "supplierDisbursements"],
    ownerOnlyActions: [],
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
    delegableActions: ["view", "create", "update", "delete"],
    ownerOnlyActions: [],
    defaultPermissions: { view: true, create: false, update: false, delete: false },
  },
  {
    moduleKey: "REPORTS",
    name: "Reports & Analytics",
    description: "Operational performance, sales reports, and business analytics",
    route: "/reports",
    category: "Engagement & Analytics",
    isOwnerOnly: false,
    delegableActions: ["view", "export"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, export: false },
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
    description: "Company profile, communication templates, branding, and GST/tax settings",
    route: "/settings",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "update", "delete", "legalTaxProfile"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "SUBSCRIPTION",
    name: "Subscription & Billing",
    description: "Plan tiers, usage entitlements, billing renewals, and payment requests",
    route: "/subscription",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete", "purchaseUpgrade", "manage"],
    ownerOnlyActions: [],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },
  {
    moduleKey: "TEAM",
    name: "Team & Staff Management",
    description: "Agency staff directory, onboarding invitations, and staff permission administration",
    route: "/settings?tab=team",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "create", "update", "delete", "managePermissions"],
    ownerOnlyActions: [],
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
    if (!page.isOwnerOnly) {
      acc[page.moduleKey] = { ...page.defaultPermissions };
    }
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
export function normalizeStaffPermissions(input: unknown): StaffPermissionsProfileMap {
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

    const valObj = val as Record<string, unknown>;
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

  // Backward compatibility: If detail pages are not explicitly specified in input,
  // but their parent module is present, inherit the parent module's settings.
  const parentMappings: Array<[string, string]> = [
    ["CUSTOMER_DETAIL", "CUSTOMERS"],
    ["ENQUIRY_DETAIL", "ENQUIRIES"],
    ["TRIP_DETAIL", "TRIPS"],
    ["QUOTATION_DETAIL", "QUOTATIONS"],
    ["BOOKING_DETAIL", "BOOKINGS"],
    ["OPERATIONS_ISSUES", "OPERATIONS"],
  ];

  for (const [detailKey, parentKey] of parentMappings) {
    if (normalized[detailKey] === undefined && normalized[parentKey] !== undefined) {
      const parent = normalized[parentKey];
      normalized[detailKey] = {
        view: parent.view,
        create: false,
        update: parent.update,
        delete: parent.delete,
      };
    }
  }

  return normalized;
}

/**
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
    case "TRIP_COSTING":
      return "TRIPS";
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

  // INVARIANT 3: Page registry check (all agency-level actions in delegableActions are delegable)
  const pageConfig = PAGE_PERMISSIONS_REGISTRY.find(
    (p) => p.moduleKey === normalizedModule
  );

  if (pageConfig) {
    const lowerDelegable = pageConfig.delegableActions.map((a) => a.toLowerCase());
    if (!lowerDelegable.includes(normalizedAction)) {
      return false;
    }
  }

  // If no staff grants provided, fail closed
  if (!staffGrants || typeof staffGrants !== "object") {
    return false;
  }

  let modulePerms = staffGrants[normalizedModule];
  if (!modulePerms || typeof modulePerms !== "object") {
    // Check fallback for detail pages to parent module if detail key is not explicitly set in profile
    const parentFallback = getParentModuleFallback(normalizedModule);
    if (parentFallback && staffGrants[parentFallback] && typeof staffGrants[parentFallback] === "object") {
      modulePerms = staffGrants[parentFallback];
    } else {
      return false; // Fail closed
    }
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
  "payables",
  "payments",
  "financialSummary",
  "bankDetails",
  "operationalExpenses",
  "expenses",
  "agencyMargin",
  "internalNotes",
  "isCostComplete",
  "costCompletenessReason",
  "financialReconciliation",
  "plannedCost",
  "actualCost",
  "varianceAmount",
  "totalPlannedCost",
  "totalActualCost",
  "totalVariance",
  "averageVariancePercent",
  "overBudgetOperations",
  "savingsOperations",
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
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
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

const STAFF_REDACTED_QUOTATION_KEYS = new Set(["markupPercentage", "markupAmount", "internalNotes"]);
const STAFF_REDACTED_QUOTATION_ITEM_KEYS = new Set(["costPrice", "supplierCost", "netRate", "markupPercent"]);

/**
 * Explicit safe field selection DTO transformer for Quotations when viewed by AGENCY_STAFF.
 * Explicitly strips sensitive markup percentages, markup amounts, internal notes,
 * and per-item supplier cost prices while retaining customer selling prices and proposal metadata.
 */
export function toStaffSafeQuotationDTO<T extends Record<string, unknown>>(quotation: T): T {
  if (!quotation || typeof quotation !== "object") return quotation;

  const safeFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(quotation)) {
    if (!STAFF_REDACTED_QUOTATION_KEYS.has(key)) {
      safeFields[key] = value;
    }
  }

  // If quotation has items, sanitize item costPrice
  if (Array.isArray(safeFields.items)) {
    safeFields.items = safeFields.items.map((item: unknown) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const safeItem: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          if (!STAFF_REDACTED_QUOTATION_ITEM_KEYS.has(k)) {
            safeItem[k] = v;
          }
        }
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
export function toStaffSafeQuotationListDTO<T extends Record<string, unknown>>(quotations: T[]): T[] {
  if (!Array.isArray(quotations)) return quotations;
  return quotations.map(toStaffSafeQuotationDTO);
}
