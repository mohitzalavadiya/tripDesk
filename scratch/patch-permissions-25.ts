import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../src/lib/auth/permissions.ts');
let content = fs.readFileSync(file, 'utf-8');

const targetDefaults = `export const DEFAULT_STAFF_PERMISSIONS: StaffPermissionsProfileMap = {
  CUSTOMERS: { view: true, create: true, update: true, delete: false },
  ENQUIRIES: { view: true, create: true, update: true, delete: false },
  FOLLOW_UPS: { view: true, create: true, update: true, delete: false, logInteraction: true },
  CUSTOMER_INSIGHTS: { view: false, delete: false },
  TRIPS: { view: true, create: true, update: true, delete: false },
  ITINERARIES: { view: true, create: true, update: true, delete: false },
  QUOTATIONS: { view: true, create: true, update: true, delete: false },
  BOOKINGS: { view: true, create: true, update: true, delete: false },
  DOCUMENTS: { view: true, create: true, update: true, delete: false },
  OPERATIONS: { view: true, create: false, update: true, delete: false },
  DESTINATIONS: { view: true, create: false, update: false, delete: false },
  HOTELS: { view: true, create: false, update: false, delete: false },
  VEHICLES: { view: true, create: false, update: false, delete: false },
  ACTIVITIES: { view: true, create: false, update: false, delete: false },
  RATE_SHEETS: { view: false, delete: false },
  SUPPLIERS: { view: false, delete: false },
  PAYMENTS: { view: true, recordReceipt: false, delete: false }, // Staff receipt recording is OFF by default until enabled
  FEEDBACK: { view: true, update: false, delete: false },
  COMMUNICATIONS: { view: true, create: true, delete: false },
  SUPPORT_CHAT: { view: true, create: true, delete: false },
};`;

const replaceDefaults = `export const DEFAULT_STAFF_PERMISSIONS: StaffPermissionsProfileMap = {
  CUSTOMERS: { view: true, create: true, update: true, delete: false },
  ENQUIRIES: { view: true, create: true, update: true, delete: false },
  FOLLOW_UPS: { view: true, create: true, update: true, delete: false, logInteraction: true },
  CUSTOMER_INSIGHTS: { view: false, delete: false },
  TRIPS: { view: true, create: true, update: true, delete: false },
  ITINERARIES: { view: true, create: true, update: true, delete: false },
  QUOTATIONS: { view: true, create: true, update: true, delete: false },
  BOOKINGS: { view: true, create: true, update: true, delete: false },
  DOCUMENTS: { view: true, create: true, update: true, delete: false },
  OPERATIONS: { view: true, create: false, update: true, delete: false },
  DESTINATIONS: { view: true, create: false, update: false, delete: false },
  HOTELS: { view: true, create: false, update: false, delete: false },
  VEHICLES: { view: true, create: false, update: false, delete: false },
  ACTIVITIES: { view: true, create: false, update: false, delete: false },
  RATE_SHEETS: { view: false, create: false, update: false, delete: false },
  SUPPLIERS: { view: false, create: false, update: false, delete: false },
  FINANCE: { view: false, create: false, update: false, delete: false },
  PAYMENTS: { view: true, recordReceipt: false, delete: false }, // Staff receipt recording is OFF by default until enabled
  FEEDBACK: { view: true, create: false, update: false, delete: false },
  REPORTS: { view: false, create: false, update: false, delete: false },
  COMMUNICATIONS: { view: true, create: true, update: false, delete: false },
  SETTINGS: { view: false, create: false, update: false, delete: false },
  TEAM: { view: false, create: false, update: false, delete: false },
  SUBSCRIPTION: { view: false, create: false, update: false, delete: false },
  SUPPORT_CHAT: { view: true, create: true, update: false, delete: false },
};

/**
 * Normalizes, validates, and enforces strict security invariants on staff permission profiles.
 * Invariants:
 * 1. Delete is permanently forced to false (Agency Owner-only across all modules).
 * 2. Permanent owner-only modules (FINANCE, RATE_SHEETS, SUPPLIERS, REPORTS, SETTINGS, TEAM, SUBSCRIPTION) are forced to false.
 * 3. View is a strict prerequisite: if view is false, child actions (create, update, recordReceipt) are forced false.
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

    // Owner-only domains can never be delegated to staff
    if (["FINANCE", "RATE_SHEETS", "SUPPLIERS", "REPORTS", "SETTINGS", "AGENCY_SETTINGS", "TEAM", "SUBSCRIPTION", "BILLING"].includes(cleanKey)) {
      normalized[cleanKey] = { view: false, create: false, update: false, delete: false };
      continue;
    }

    const valObj = val as Record<string, any>;
    const viewAllowed = Boolean(valObj.view);

    normalized[cleanKey] = {
      view: viewAllowed,
      create: viewAllowed ? Boolean(valObj.create) : false,
      update: viewAllowed ? Boolean(valObj.update) : false,
      delete: false, // Strict Invariant: Staff can NEVER be granted delete
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
}`;

const targetCeiling = `  // Special role ceiling for sensitive domains:
  const normalizedModule = moduleKey.toUpperCase();
  if (["FINANCE", "RATE_SHEETS", "SUPPLIERS", "REPORTS", "SETTINGS", "TEAM", "SUBSCRIPTION"].includes(normalizedModule)) {
    return false;
  }`;

const replaceCeiling = `  // Special role ceiling for sensitive domains:
  const normalizedModule = moduleKey.toUpperCase();
  if (["FINANCE", "RATE_SHEETS", "SUPPLIERS", "REPORTS", "SETTINGS", "AGENCY_SETTINGS", "TEAM", "SUBSCRIPTION", "BILLING"].includes(normalizedModule)) {
    return false;
  }`;

const normalizedContent = content.replace(/\r\n/g, '\n');
if (!normalizedContent.includes(targetDefaults)) {
  console.error('Target defaults not found!');
  process.exit(1);
}
if (!normalizedContent.includes(targetCeiling)) {
  console.error('Target ceiling not found!');
  process.exit(1);
}

const updated = normalizedContent.replace(targetDefaults, replaceDefaults).replace(targetCeiling, replaceCeiling);
const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated permissions.ts!');

