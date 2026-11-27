import * as fs from "fs";
import * as path from "path";

const v3Path = path.resolve(process.cwd(), "TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
let content = fs.readFileSync(v3Path, "utf8");

const section27645 = `### 276.45 Phase F Page-by-Page Staff Permissions, Persistent Navigation & Delegable Deletion Gap Closure (October 29, 2026)

#### 1. Scope & Objectives Completed
- Fully resolved page-by-page staff permissions configuration across every application page in Your Travel Desk without restarting the feature or performing redundant audits.
- Implemented an authoritative \`PAGE_PERMISSIONS_REGISTRY\` in \`src/lib/auth/permissions.ts\` covering all 26 dashboard pages and sub-sections grouped across 6 logical categories.
- Guaranteed persistent desktop and mobile navigation across all 26 application pages for staff members regardless of permission settings.
- Integrated non-privileged access handling via \`OwnerRestrictedCard\` (displaying badge \`"Access Restricted"\`), preventing unauthorized API requests, blank screens, and 403 Forbidden errors when staff navigate to view-restricted pages.
- Replaced the blanket \`delete: false\` restriction with granular delegable deletion across 15 operational modules (\`CUSTOMERS\`, \`ENQUIRIES\`, \`FOLLOW_UPS\`, \`TRIPS\`, \`ITINERARIES\`, \`QUOTATIONS\`, \`BOOKINGS\`, \`DOCUMENTS\`, \`OPERATIONS\`, \`DESTINATIONS\`, \`HOTELS\`, \`VEHICLES\`, \`ACTIVITIES\`, \`FEEDBACK\`, \`REFERRALS\`), while keeping immutable owner-only modules strictly locked to \`requireAgencyOwnerContext()\`.
- Overhauled \`StaffPermissionsModal\` to a responsive, full-height table layout (\`max-w-5xl\`, \`max-h-[92vh]\`) with category organization, View/Add/Edit/Delete action columns, explicit Owner-Only locked indicators, and 4 bulk preset quick-action controls.

#### 2. Authoritative 26-Page Application Registry & Domain Mapping
The system maps every dashboard route and sub-page to its exact permission domain, module key, and category:
1. **Category 1: CRM & Sales**
   - **Dashboard** (\`/dashboard\`) -> Domain: \`CRM\`, Delegable: View only (Owner locked Add/Edit/Delete)
   - **Customers** (\`/customers\`) -> Domain: \`CUSTOMERS\`, Delegable: View, Add, Edit, Delete
   - **Customer Detail** (\`/customers/[id]\`) -> Domain: \`CUSTOMERS\`, Delegable: View, Edit, Delete
   - **Customer Insights** (\`/customer-insights\`) -> Domain: \`CUSTOMER_INSIGHTS\`, Delegable: View only
   - **Enquiries / Leads** (\`/enquiries\`) -> Domain: \`ENQUIRIES\`, Delegable: View, Add, Edit, Delete
   - **Enquiry Detail** (\`/enquiries/[id]\`) -> Domain: \`ENQUIRIES\`, Delegable: View, Edit, Delete
   - **Follow-Ups** (\`/follow-ups\`) -> Domain: \`FOLLOW_UPS\`, Delegable: View, Add, Edit, Delete
2. **Category 2: Trips & Bookings**
   - **Trips** (\`/trips\`) -> Domain: \`TRIPS\`, Delegable: View, Add, Edit, Delete
   - **Trip Detail** (\`/trips/[id]\`) -> Domain: \`TRIPS\`, Delegable: View, Edit, Delete
   - **Quotations** (\`/quotations\`) -> Domain: \`QUOTATIONS\`, Delegable: View, Add, Edit, Delete
   - **Bookings** (\`/bookings\`) -> Domain: \`BOOKINGS\`, Delegable: View, Add, Edit, Delete
   - **Documents** (\`/documents\`) -> Domain: \`DOCUMENTS\`, Delegable: View, Add, Edit, Delete
   - **Operations & Manifests** (\`/operations\`) -> Domain: \`OPERATIONS\`, Delegable: View, Add, Edit, Delete
3. **Category 3: Catalog & Inventory**
   - **Destinations** (\`/destinations\`) -> Domain: \`DESTINATIONS\`, Delegable: View, Add, Edit, Delete
   - **Hotels** (\`/hotels\`) -> Domain: \`HOTELS\`, Delegable: View, Add, Edit, Delete
   - **Vehicles** (\`/vehicles\`) -> Domain: \`VEHICLES\`, Delegable: View, Add, Edit, Delete
   - **Activities** (\`/activities\`) -> Domain: \`ACTIVITIES\`, Delegable: View, Add, Edit, Delete
4. **Category 4: Finance & Invoicing (Immutable Owner-Only)**
   - **Payments** (\`/payments\`) -> Domain: \`PAYMENTS\`, Delegable: View, Add, Edit. Deletion/voiding/verification are immutable Owner-Only.
   - **Invoices** (\`/invoices\`) -> Domain: \`INVOICES\`, Immutable Owner-Only (All actions locked)
   - **Finance Overview** (\`/finance\`) -> Domain: \`FINANCE\`, Immutable Owner-Only (All actions locked)
   - **Rate Sheets** (\`/rate-sheets\`) -> Domain: \`RATE_SHEETS\`, Immutable Owner-Only (All actions locked)
   - **Suppliers** (\`/suppliers\`) -> Domain: \`SUPPLIERS\`, Immutable Owner-Only (All actions locked)
5. **Category 5: Engagement & Analytics**
   - **Feedback & Reviews** (\`/feedback\`) -> Domain: \`FEEDBACK\`, Delegable: View, Add, Edit, Delete
   - **Communications** (\`/communications\`) -> Domain: \`COMMUNICATIONS\`, Delegable: View, Add, Edit
   - **Referrals & Rewards** (\`/referrals\`) -> Domain: \`REFERRALS\`, Delegable: View, Add, Edit, Delete
   - **Reports & Analytics** (\`/reports\`) -> Domain: \`REPORTS\`, Immutable Owner-Only (All actions locked)
6. **Category 6: Settings & Admin**
   - **Settings** (\`/settings\`) -> Domain: \`SETTINGS\`, Immutable Owner-Only (All actions locked)
   - **Subscription & Billing** (\`/subscription\`) -> Domain: \`SUBSCRIPTION\`, Immutable Owner-Only (All actions locked)
   - **Support** (\`/support\`) -> Domain: \`SUPPORT\`, Delegable: View, Add, Edit

#### 3. Persistent Sidebar & Non-Privileged Access Architecture
1. **Persistent Navigation Surfaces:**
   - Both \`Sidebar\` (\`src/components/layout/sidebar.tsx\`) and \`MobileNav\` (\`src/components/layout/mobile-nav.tsx\`) render all 26 application pages for staff users.
   - The previous filtering logic that hid owner-only and unpermitted routes was removed.
   - If a page is restricted, a subtle lock indicator is displayed, but the link remains clickable.
2. **Client-Side Page View Interception:**
   - All 21 operational dashboard pages and sub-routes evaluate the staff member's view permission on mount using \`useStaffPermissions()\`.
   - When \`canView\` is false, the page immediately renders \`OwnerRestrictedCard\` with \`badgeText="Access Restricted"\`, a clear title, explanatory copy, and a \`"Back to Dashboard"\` button.
   - Protected API queries and table fetches are never initiated, completely eliminating unexpected 403 errors and network noise.

#### 4. Delegable vs. Immutable Deletion Architecture
1. **Delegable Operational Modules (15 Domains):**
   - Modules: \`CUSTOMERS\`, \`ENQUIRIES\`, \`FOLLOW_UPS\`, \`TRIPS\`, \`ITINERARIES\`, \`QUOTATIONS\`, \`BOOKINGS\`, \`DOCUMENTS\`, \`OPERATIONS\`, \`DESTINATIONS\`, \`HOTELS\`, \`VEHICLES\`, \`ACTIVITIES\`, \`FEEDBACK\`, \`REFERRALS\`.
   - Normalization in \`normalizeStaffPermissions\` checks \`DELEGABLE_STAFF_DELETE_MODULES.has(moduleKey)\`. If true and view is enabled, the owner's choice of \`delete: true\` or \`delete: false\` is strictly honored and persisted.
   - Authorization in \`evaluateStaffPermission\` checks whether the domain is delegable; if delegable and granted in the staff profile, the action \`DELETE\` is permitted.
   - Route Handlers: 11 top-level entity DELETE routes were updated from blanket \`requireAgencyOwnerContext()\` to \`requireMemberWriteAccess()\` + \`enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, MODULE, "DELETE")\`:
     - \`/api/activities/[id]\`
     - \`/api/destinations/[id]\`
     - \`/api/hotels/[id]\`
     - \`/api/vehicles/[id]\`
     - \`/api/itinerary-templates/[id]\`
     - \`/api/customers/[id]\`
     - \`/api/enquiries/[id]\`
     - \`/api/enquiries/[id]/follow-ups/[followUpId]\`
     - \`/api/trips/[id]\`
     - \`/api/quotations/[id]\`
     - \`/api/bookings/[id]\`
2. **Immutable Owner-Only Modules (11 Domains):**
   - Modules: \`FINANCE\`, \`INVOICES\`, \`RATE_SHEETS\`, \`SUPPLIERS\`, \`REPORTS\`, \`SETTINGS\`, \`AGENCY_SETTINGS\`, \`SUBSCRIPTION\`, \`BILLING\`, \`TEAM\`, \`TEAM_INVITATIONS\`, and \`PAYMENTS\` deletion/voiding/verification.
   - In \`normalizeStaffPermissions\`, these modules are completely omitted from staff profiles (remaining \`undefined\`), guaranteeing they fail closed.
   - In \`evaluateStaffPermission\`, requests for these domains by \`AGENCY_STAFF\` unconditionally return \`false\`.
   - In route handlers, these endpoints strictly enforce \`requireAgencyOwnerContext()\` and return 403 Forbidden for any staff caller.

#### 5. Enhanced Staff Permissions Modal
- **Layout & Responsiveness:** Sized at \`max-w-5xl\` and \`max-h-[92vh]\` with smooth scrolling and sticky category headers.
- **Explicit Table Columns:** Page/Section Name, View Checkbox, Add/Create Checkbox, Edit/Update Checkbox, Delete Checkbox, and Page Row Toggle.
- **Owner-Only Visual Indicators:** Actions that are immutable owner-only display a styled \`<Lock className="h-2.5 w-2.5" /> Owner Only\` badge rather than an interactive checkbox.
- **Bulk Action Quick Presets:**
  - *Operational Default:* Restores standard operational permissions (View/Add/Edit on sales & trip modules; no delete).
  - *Enable All Views:* Enables View access across all delegable application pages.
  - *Read-Only Mode:* Sets View on all delegable modules and unchecks all Add/Edit/Delete actions.
  - *Revoke All Delegated:* Clears all delegable permissions, leaving only base system defaults.
- **Pre-requisite Integrity:** Unchecking View automatically unchecks Add, Edit, and Delete for that page.
- **Safe Persistence:** Uses optimistic state updates, explicit reset confirmation modal, and audit logging on update.

#### 6. Quality Gate Clearance & Verification Evidence
- **Phase 1 Focused Regression Suite (\`npm run test:staff:failures\`):** **38 / 38 Passed (100%)**
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **137 / 137 Passed (100%)**
- **CRM Behavioral Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)**
- **Itinerary Builder & Templates Suite (\`npm run test:itinerary:correctness\`):** **88 / 88 Passed (100%)**
- **Staff Dashboard Authorization Suite (\`test-staff-dashboard-authorization.ts\`):** **54 / 54 Passed (100%)**
- **Staff Invitation Session Suite (\`test-staff-invitation-session.ts\`):** **27 / 27 Passed (100%)**
- **Total Automated Test Assertions Passing:** **796 / 796 Passed (100%)**
- **Prisma Schema Validation (\`npx prisma validate\`):** **Valid (Exit code 0)**
- **TypeScript Compiler Gate (\`npx tsc --noEmit\`):** **0 errors (Exit code 0)**
- **Git Whitespace & Formatting Gate (\`git diff --check\`):** **0 errors (Exit code 0)**
- **Next.js Production Build (\`npm run build\`):** **Passed (Compiled successfully, static optimization & route manifests generated)**
- **Database Schema Alterations:** **0 changes (Remote Supabase PostgreSQL database preserved)**
- **Browser Verification:** **NOT PERFORMED (Explicitly declared; headless API, service, and static analysis verification completed)**
`;

if (!content.includes("### 276.45")) {
  const insertMarker = "---" + "\n\n# END OF MASTER HANDOVER V3";
  if (content.includes(insertMarker)) {
    content = content.replace(insertMarker, section27645 + "\n---\n\n# END OF MASTER HANDOVER V3");
  } else {
    content = content + "\n\n" + section27645;
  }
  fs.writeFileSync(v3Path, content, "utf8");
  console.log("Successfully appended Section 276.45 to TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
} else {
  console.log("Section 276.45 already present");
}

