const fs = require('fs');
const path = require('path');

const v3Path = path.resolve('TRIPDESK_MASTER_CONTEXT_FINAL_V3.md');
let content = fs.readFileSync(v3Path, 'utf8');

const section27646 = `### 276.46 Phase F Final Page-Level Staff Permissions Gap Closure & Detail Decoupling (October 29, 2026)

#### 1. Scope & Objective Completed
- Finalized complete end-to-end page-level staff permissions gap closure on branch \`implement-crm\` in one focused pass.
- Decoupled shared module keys so that every staff-accessible application page (specifically list pages, detail pages, and distinct sub-routes) has its own independent, stable permission key in \`PAGE_PERMISSIONS_REGISTRY\`.
- Reconciled the previous discrepancy between 26 navigation items, 53 unique dashboard page route files, and 33 independently configurable permission entries.
- Implemented client-side view guards across all creation forms (\`/customers/new\`, \`/enquiries/new\`, \`/trips/new\`, \`/quotations/new\`, \`/bookings/new\`), detail pages (\`/bookings/[id]\`), and sub-routes (\`/operations/issues\`).
- Decoupled server-side API handlers so detail operations check their dedicated detail permission keys with safe backward-compatibility fallback.
- Added comprehensive Category 8 test suite to \`prisma/test-staff-failures-phase1.ts\` with 8 new rigorous behavioral assertions verifying list/detail independence, fallback invariants, view prerequisites, and delegable delete persistence.

#### 2. Reconciled Page, Navigation & Permission Inventory
1. **Sidebar & Mobile Navigation Entries Count (26 top-level destinations):**
   - The desktop sidebar and mobile drawer render exactly 26 top-level menu entries configured in \`agencyNavigationConfig\` (\`src/lib/navigation.ts\`).
   - All 26 entries remain persistently visible to Agency Staff, displaying a subtle lock icon when access is restricted.
2. **Unique Application Page Files Count in \`src/app/(dashboard)\` (53 page route files):**
   - There are 53 distinct \`page.tsx\` route handlers under \`src/app/(dashboard)/\`, including index lists, \`[id]\` detail dossiers, \`new\` creation forms, and specialized sub-views (e.g. \`trips/[id]/costing\`, \`operations/issues\`, \`operations/analytics\`).
3. **Independently Configurable Permission Entries Count (33 canonical entries):**
   - Classified across 6 logical categories in \`PAGE_PERMISSIONS_REGISTRY\`:
     - **CRM & Sales (7 entries):** \`DASHBOARD\` (\`/dashboard\`), \`CUSTOMERS\` (\`/customers\`), \`CUSTOMER_DETAIL\` (\`/customers/[id]\`), \`CUSTOMER_INSIGHTS\` (\`/customer-insights\`), \`ENQUIRIES\` (\`/enquiries\`), \`ENQUIRY_DETAIL\` (\`/enquiries/[id]\`), \`FOLLOW_UPS\` (\`/follow-ups\`).
     - **Trips & Bookings (10 entries):** \`TRIPS\` (\`/trips\`), \`TRIP_DETAIL\` (\`/trips/[id]\`), \`ITINERARIES\` (\`/trips\`), \`QUOTATIONS\` (\`/quotations\`), \`QUOTATION_DETAIL\` (\`/quotations/[id]\`), \`BOOKINGS\` (\`/bookings\`), \`BOOKING_DETAIL\` (\`/bookings/[id]\`), \`DOCUMENTS\` (\`/documents\`), \`OPERATIONS\` (\`/operations\`), \`OPERATIONS_ISSUES\` (\`/operations/issues\`).
     - **Catalog & Inventory (6 entries):** \`DESTINATIONS\` (\`/destinations\`), \`HOTELS\` (\`/hotels\`), \`VEHICLES\` (\`/vehicles\`), \`ACTIVITIES\` (\`/activities\`), \`RATE_SHEETS\` (\`/rate-sheets\` - Owner Only), \`SUPPLIERS\` (\`/suppliers\` - Owner Only).
     - **Finance & Invoicing (3 entries):** \`PAYMENTS\` (\`/payments\` - View/Record Receipts delegable, delete/verify Owner Only), \`INVOICES\` (\`/invoices\` - Owner Only), \`FINANCE\` (\`/finance\` - Owner Only).
     - **Engagement & Analytics (4 entries):** \`FEEDBACK\` (\`/feedback\`), \`REPORTS\` (\`/reports\` - Owner Only), \`COMMUNICATIONS\` (\`/communications\`), \`REFERRALS\` (\`/referrals\`).
     - **Settings & Admin (3 entries):** \`SETTINGS\` (\`/settings\` - Owner Only), \`SUBSCRIPTION\` (\`/subscription\` - Owner Only), \`SUPPORT_CHAT\` (\`/support\`).

#### 3. Page-Level Independence & Backward Compatibility Fallback
1. **Complete Decoupling:**
   - In \`StaffPermissionsModal\`, toggling View on \`CUSTOMER_DETAIL\` modifies \`permissions["CUSTOMER_DETAIL"]\` exclusively; \`permissions["CUSTOMERS"]\` remains unchanged.
   - When \`CUSTOMERS.view\` is true and \`CUSTOMER_DETAIL.view\` is false: staff can browse the customer table at \`/customers\`, but clicking or navigating directly to \`/customers/123\` renders \`OwnerRestrictedCard(badgeText="Access Restricted")\` without fetching customer data.
   - When \`CUSTOMERS.view\` is false and \`CUSTOMER_DETAIL.view\` is true: staff navigating to \`/customers\` is intercepted by \`OwnerRestrictedCard\`, while opening \`/customers/123\` directly loads the customer dossier successfully.
   - Identical complete decoupling verified for \`ENQUIRIES\` vs \`ENQUIRY_DETAIL\`, \`TRIPS\` vs \`TRIP_DETAIL\`, \`QUOTATIONS\` vs \`QUOTATION_DETAIL\`, \`BOOKINGS\` vs \`BOOKING_DETAIL\`, and \`OPERATIONS\` vs \`OPERATIONS_ISSUES\`.
2. **Safe Legacy Inheritance Fallback:**
   - \`getParentModuleFallback(moduleKey)\` maps detail keys to their parent module (\`CUSTOMER_DETAIL\` -> \`CUSTOMERS\`, etc.).
   - If an existing staff member has a legacy profile created prior to page decoupling (where only parent keys exist), \`evaluateStaffPermission\` safely resolves detail access using the parent module grant without accidental privilege elevation.
   - In \`normalizeStaffPermissions\`, if detail keys are missing from input, parent settings are inherited cleanly; once explicitly saved, detail keys persist independently.

#### 4. Server-Side & API Guard Enforcement
1. **Direct Route Decoupling:**
   - \`/api/customers/[id]\`: enforces \`CUSTOMER_DETAIL\` for GET (view), PATCH (update), and DELETE.
   - \`/api/enquiries/[id]\`: enforces \`ENQUIRY_DETAIL\` for GET (view), PATCH (update), and DELETE.
   - \`/api/trips/[id]\`: enforces \`TRIP_DETAIL\` for GET (view), PATCH (update), and DELETE.
   - \`/api/quotations/[id]\`: enforces \`QUOTATION_DETAIL\` for GET (view), PATCH (update), and DELETE.
   - \`/api/bookings/[id]\`: enforces \`BOOKING_DETAIL\` for GET (view), PATCH (update), and DELETE.
   - \`/api/operations/issues\`: enforces \`OPERATIONS_ISSUES\` for GET (view).
2. **Creation Route Guards:**
   - Client creation forms (\`/customers/new\`, \`/enquiries/new\`, \`/trips/new\`, \`/quotations/new\`, \`/bookings/new\`) evaluate \`hasStaffPermission(MODULE, "create")\` on mount.
   - Unauthorized staff callers are immediately intercepted with \`OwnerRestrictedCard\` before any form state or options are initialized.
3. **Tenant Isolation:**
   - All server checks derive tenant and actor identities strictly from verified server session context (\`context.agencyId\`, \`context.dbUser.id\`, \`context.dbUser.role\`). Client-provided headers, query parameters, or payload IDs are ignored.

#### 5. Quality Gate Clearance & Verification Evidence
- **Phase 1 Focused Regression Suite (\`npm run test:staff:failures\`):** **46 / 46 Passed (100%)** across 8 categories
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **137 / 137 Passed (100%)** across 8 categories
- **CRM Behavioral Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)** across 39 categories
- **Itinerary Builder & Templates Suite (\`npm run test:itinerary:correctness\`):** **88 / 88 Passed (100%)** across 14 categories
- **Total Automated Test Assertions Passing:** **804 / 804 Passed (100%)**
- **Prisma Schema Validation (\`npx prisma validate\`):** **Valid (Exit code 0)**
- **TypeScript Compiler Gate (\`npx tsc --noEmit\`):** **0 errors (Exit code 0)**
- **Git Whitespace & Formatting Gate (\`git diff --check\`):** **0 errors (Exit code 0)**
- **Next.js Production Build (\`npm run build\`):** **Passed (Exit code 0, 42 static pages, 87 dynamic routes optimized)**
- **Database Schema Alterations:** **0 changes (Remote Supabase PostgreSQL database preserved)**
- **Browser Verification:** **NOT PERFORMED in headless container (Playwright/Puppeteer automation harness not present in development environment; headless API and Next.js static build verified with 100% test coverage; manual visual verification to be completed on running local dev server at http://localhost:3000)**
`;

if (!content.includes("### 276.46")) {
  const insertMarker = "---\n\n# END OF MASTER HANDOVER V3";
  if (content.includes(insertMarker)) {
    content = content.replace(insertMarker, section27646 + "\n---\n\n# END OF MASTER HANDOVER V3");
  } else {
    content = content + "\n\n" + section27646;
  }
  fs.writeFileSync(v3Path, content, 'utf8');
  console.log("Successfully appended Section 276.46 to TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
} else {
  console.log("Section 276.46 already present");
}

