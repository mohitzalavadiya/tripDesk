const fs = require("fs");

const filePath = "TRIPDESK_MASTER_CONTEXT_FINAL_V3.md";
let content = fs.readFileSync(filePath, "utf8");
const isCrlf = content.includes("\r\n");
let normalized = content.replace(/\r\n/g, "\n");

const target = `---

# END OF MASTER HANDOVER V3

**Final filename:** \`TRIPDESK_MASTER_CONTEXT_FINAL_V3.md\``;

const sectionContent = `---
### 276.44 Phase F Staff Permissions Final Gap Closure & Sub-Route Hardening (October 29, 2026)

#### 1. Scope & Objective Completed
- Finalized and hardened all remaining staff authorization entry points across the application without restarting the feature or repeating completed audits.
- Preserved all user changes, active migrations, and existing V3 architectural decisions. Zero commits, zero pushes, and zero destructive database operations performed.
- Audited 100% of application routes (92 route files, 353 total endpoints), verified deletion ceiling, and closed all discovered capability gaps on nested sub-routes.

#### 2. Exact Phase 1 Failure-to-Test Mapping Proving the Fixes
Every original staff failure is backed by explicit, reproducible regression tests in \`prisma/test-staff-failures-phase1.ts\`:

1. **Failure 1 (\`GET /api/payments?limit=100&sortBy=paymentDate&sortOrder=desc\` returning 500):**
   - **Root Cause:** Prisma query tried to select unmigrated columns (\`verifiedById\`, \`verifiedAt\`) from \`public.payments\`.
   - **Fix Implemented:** Replaced implicit select with \`PAYMENT_SCALAR_SELECT\` defining the 25 physical columns and dynamic column existence checks.
   - **Proving Tests in \`prisma/test-staff-failures-phase1.ts\`:**
     - \`PAYMENT_SCALAR_SELECT contains all 25 physical columns and omits verifiedById/verifiedAt\`
     - \`paymentService.getPayments executes safely against connected database without 500 error\`
     - \`checkHasPaymentVerificationColumns accurately detects runtime schema status on connected PostgreSQL database\`

2. **Failure 2 (\`GET /api/bookings?page=1&limit=20&sortBy=createdAt&sortOrder=desc\` returning 500):**
   - **Root Cause:** \`bookingService.getBookings\` and recalculation paths selected nested \`payments\` relation without scalar restrictions, triggering column-not-found errors.
   - **Fix Implemented:** Bound nested payments select to \`PAYMENT_RELATIONS_SELECT\` omitting unmigrated columns.
   - **Proving Tests in \`prisma/test-staff-failures-phase1.ts\`:**
     - \`bookingService.getBookings executes safely against connected database with nested payments relation\`
     - \`bookingService.recalculateBookingPaymentTotals recalculates paid & balance amounts without selecting unmigrated columns\`

3. **Failure 3 (\`GET /api/dashboard/finance?preset=THIS_MONTH\` returning 403 & unnecessary client fetch):**
   - **Root Cause:** Dashboard client indiscriminately fetched owner-only financial metrics on load regardless of staff role, triggering 403 Forbidden.
   - **Fix Implemented:** Added role check in dashboard page to suppress \`getFinance\` fetch for \`AGENCY_STAFF\` callers; hardened \`canAccessFinancialMargins\` boundary.
   - **Proving Tests in \`prisma/test-staff-failures-phase1.ts\`:**
     - \`canAccessFinancialMargins strictly rejects AGENCY_STAFF and permits AGENCY_OWNER\`
     - \`Staff response contracts & financial redaction: confidential supplier costs, profit margins, and private notes are redacted\`
     - \`Dashboard page fetch logic conditionally queries getFinance ONLY for Agency Owner\`

#### 3. Deletion Ceiling Across All 25 Domains & Sub-Item Mutation Protection
1. **Normalization Invariant:**
   - \`normalizeStaffPermissions\` unconditionally forces \`delete: false\` across all 25 domains even when malicious or erroneous input passes \`delete: true\`.
   - Verified by test: \`Normalization Level: delete: false is strictly enforced across all 25 modules even when input specifies delete: true\`.
2. **Role Engine Authorization:**
   - \`evaluateStaffPermission\` and \`hasStaffPermission\` unconditionally reject any request with action \`DELETE\` for \`AGENCY_STAFF\`, while permitting legitimate \`AGENCY_OWNER\` deletion.
   - Verified by test: \`Role Engine Level: evaluateStaffPermission rejects DELETE for AGENCY_STAFF across all 25 domains while permitting AGENCY_OWNER\`.
3. **Top-Level Entity Deletion Gate:**
   - All 18 top-level entity deletion routes strictly enforce \`requireAgencyOwnerContext()\` (rejecting \`AGENCY_STAFF\` with HTTP 403 Forbidden):
     \`/api/activities/[id]\`, \`/api/agency/logo\`, \`/api/bookings/[id]\`, \`/api/customers/[id]\`, \`/api/destinations/[id]\`, \`/api/enquiries/[id]\`, \`/api/enquiries/[id]/follow-ups/[followUpId]\`, \`/api/finance/expenses/[id]\`, \`/api/finance/supplier-payables/[id]\`, \`/api/hotels/[id]\`, \`/api/invoices/[id]\`, \`/api/itinerary-templates/[id]\`, \`/api/payments/[id]\`, \`/api/quotations/[id]\`, \`/api/rate-sheets/[id]\`, \`/api/suppliers/[id]\`, \`/api/trips/[id]\`, \`/api/vehicles/[id]\`.
   - Verified by test: \`Top-Level Entity Deletion Ceiling: All 18 DELETE routes enforce requireAgencyOwnerContext and reject staff\`.
4. **Sub-Item Mutation & Deletion Protection:**
   - Sub-items inside draft entities (itinerary items, trip activities, hotels, vehicles, destinations, travelers, quotation line items, proposal items, milestones) are guarded by \`enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, DOMAIN, "UPDATE")\`. Staff lacking \`UPDATE\` permission cannot add, edit, or delete draft sub-items.
   - Verified by test: \`Sub-Item Mutation Protection: Staff lacking UPDATE capability cannot modify or delete sub-items\`.
5. **Detail Endpoint Protection:**
   - Single entity reads (\`GET /api/quotations/[id]\`, \`GET /api/trips/[id]\`, etc.) are guarded by \`enforceStaffPermission(..., DOMAIN, "VIEW")\`.
   - Verified by test: \`Detail Endpoint Protection: Staff lacking VIEW capability cannot access single quotation or trip detail\`.

#### 4. Reconciled Unguarded Sub-Routes & Endpoint Inventory
All 92 route files in \`src/app/api\` (353 individual HTTP handlers) are now 100% guarded with server-derived tenancy and explicit staff capability checks:
- **Quotations:** \`/api/quotations/[id]\` (VIEW on GET, UPDATE on PATCH), \`/api/quotations/[id]/items\` (VIEW on GET, UPDATE on POST), \`/api/quotations/[id]/items/[itemId]\` (UPDATE on PATCH/DELETE), \`/api/quotations/[id]/proposal-items\` (VIEW on GET, UPDATE on POST), \`/api/quotations/[id]/proposal-items/[itemId]\` (UPDATE on PATCH/DELETE), \`/api/quotations/[id]/proposal-items/reorder\` (UPDATE on POST), \`/api/quotations/[id]/payment-milestones\` (VIEW on GET, UPDATE on POST), \`/api/quotations/[id]/payment-milestones/[milestoneId]\` (UPDATE on PATCH/DELETE), \`/api/quotations/[id]/payment-milestones/generate-default\` (UPDATE on POST), \`/api/quotations/[id]/version\` (CREATE on POST).
- **Bookings:** \`/api/bookings/from-quotation\` (CREATE on POST), \`/api/bookings/[id]/cancel\` (UPDATE on POST).
- **Customers:** \`/api/customers/resolve-or-create\` (CREATE on POST).
- **Enquiries:** \`/api/enquiries/[id]/stage\` (UPDATE on POST), \`/api/enquiries/[id]/lost\` (UPDATE on POST), \`/api/enquiries/[id]/convert\` (CREATE on TRIPS & UPDATE on ENQUIRIES).
- **Trips & Sub-Items:** \`/api/trips/[id]/quotation\` (VIEW on GET, CREATE on POST), \`/api/trips/[id]/share-link\` (UPDATE on POST), \`/api/trips/[id]/activities\` (VIEW on GET, UPDATE on POST), \`/api/trips/[id]/activities/[activityId]\` (VIEW on GET, UPDATE on PATCH/DELETE), \`/api/trips/[id]/hotels\` (VIEW on GET, UPDATE on POST), \`/api/trips/[id]/hotels/[hotelId]\` (VIEW on GET, UPDATE on PATCH/DELETE), \`/api/trips/[id]/vehicles\` (VIEW on GET, UPDATE on POST), \`/api/trips/[id]/vehicles/[vehicleId]\` (VIEW on GET, UPDATE on PATCH/DELETE), \`/api/trips/[id]/destinations\` (VIEW on GET, UPDATE on POST), \`/api/trips/[id]/destinations/[destinationId]\` (VIEW on GET, UPDATE on DELETE), \`/api/trips/[id]/destinations/reorder\` (UPDATE on POST), \`/api/trips/[id]/travelers\` (VIEW on GET, UPDATE on POST), \`/api/trips/[id]/travelers/[travelerId]\` (VIEW on GET, UPDATE on PATCH/DELETE).
- **Itineraries & Templates:** \`/api/trips/[id]/itinerary\` (VIEW on GET, CREATE on POST), \`/api/trips/[id]/itinerary/[itemId]\` (VIEW on GET, UPDATE on PATCH/DELETE), \`/api/trips/[id]/itinerary/reorder-item\` (UPDATE on POST), \`/api/trips/[id]/itinerary/reorder-day\` (UPDATE on POST), \`/api/trips/[id]/itinerary/duplicate-day\` (CREATE on POST), \`/api/trips/[id]/itinerary/apply-day-template\` (CREATE on POST), \`/api/trips/[id]/itinerary/apply-package-template\` (CREATE on POST), \`/api/trips/[id]/itinerary/save-as-template\` (CREATE on POST).

#### 5. Quality Gate Clearance & Verification Evidence
- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **38 / 38 Passed (100%)** across 7 categories
- **CRM Behavioral Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)** across 39 categories
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **118 / 118 Passed (100%)** across 8 categories
- **Itinerary Builder & Templates Suite (\`npm run test:itinerary:correctness\`):** **88 / 88 Passed (100%)** across 14 categories
- **Staff Dashboard Authorization Suite (\`test-staff-dashboard-authorization.ts\`):** **54 / 54 Passed (100%)** across 5 categories
- **Staff Invitation Session Suite (\`test-staff-invitation-session.ts\`):** **27 / 27 Passed (100%)** across 6 categories
- **Total Automated Test Assertions Passing:** **777 / 777 Passed (100%)**
- **Prisma Schema Validation (\`npx prisma validate\`):** **Valid (Exit code 0)**
- **TypeScript Compiler Gate (\`npx tsc --noEmit\`):** **0 errors (Exit code 0)**
- **Git Whitespace & Formatting Gate (\`git diff --check\`):** **0 errors (Exit code 0)**
- **Next.js Production Build (\`npm run build\`):** **Exit code 0 (Compiled successfully in 42s, all 42 static pages and 87 dynamic routes optimized)**
- **Database Schema Alterations:** **0 changes (Remote database preserved; Phase F migration already applied)**
- **Browser Verification:** **NOT PERFORMED (Headless API/service verification completed; manual browser checks deferred)**

---

# END OF MASTER HANDOVER V3

**Final filename:** \`TRIPDESK_MASTER_CONTEXT_FINAL_V3.md\``;

if (!normalized.includes(target)) {
  console.error("Target footer not found in", filePath);
  process.exit(1);
}

normalized = normalized.replace(target, sectionContent);
const finalContent = isCrlf ? normalized.replace(/\n/g, "\r\n") : normalized;
fs.writeFileSync(filePath, finalContent, "utf8");
console.log("Successfully appended Section 276.44 to", filePath);

