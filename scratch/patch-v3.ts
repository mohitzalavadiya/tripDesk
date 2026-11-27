import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
let content = fs.readFileSync(filePath, "utf-8");

const target = `#### 5. Project Quality Gates
- \`npx prisma validate\`: Schema is valid.
- \`npx tsc --noEmit\`: 0 errors.
- \`npm run build\`: Next.js Turbopack production build succeeded.
- \`git diff --check\`: 0 errors.
- Hard Safety Boundaries: Zero database mutations; zero branch changes or commits; zero exposed secrets.

---

# END OF MASTER HANDOVER V3`;

const section276_41 = `#### 5. Project Quality Gates
- \`npx prisma validate\`: Schema is valid.
- \`npx tsc --noEmit\`: 0 errors.
- \`npm run build\`: Next.js Turbopack production build succeeded.
- \`git diff --check\`: 0 errors.
- Hard Safety Boundaries: Zero database mutations; zero branch changes or commits; zero exposed secrets.

---

### 276.41 Phase 1 Staff API Incident Resolution, Database Schema Drift Hardening & Production Verification (October 28, 2026)

#### 1. Concrete Root Cause & Technical Findings
1. **Failure 1 — GET /api/payments (500 Internal Server Error):**
   - **Root Cause:** In \`src/lib/services/payment-service.ts\`, \`prisma.payment.findMany\` omitted an explicit \`select\` projection. Prisma defaulted to selecting all scalar fields declared in \`prisma/schema.prisma\`, including \`verifiedById\` and \`verifiedAt\`. Direct catalog inspection of \`information_schema.columns\` confirmed that the physical \`payments\` table in PostgreSQL contains exactly 25 columns, missing \`verifiedById\` and \`verifiedAt\` because migration \`20261027150000_phase_f_staff_permissions\` has not yet been applied. PostgreSQL aborted the query with error code \`42703\` (\`column payments.verifiedById does not exist in the current database\`), returned as 500 by \`handleApiError\`.
   - **Fix:** Defined authoritative allowlist projection \`PAYMENT_SCALAR_SELECT\` (25 physical columns) in \`payment-service.ts\` matching the established \`BOOKING_SCALAR_SELECT\` pattern. Replaced wildcard queries in \`findMany\`, \`findFirst\`, \`findUnique\`, and \`archivePayment\` with explicit \`select: PAYMENT_SCALAR_SELECT\`.
2. **Failure 2 — GET /api/bookings (500 Internal Server Error):**
   - **Root Cause:** In \`src/lib/services/booking-service.ts\`, \`prisma.booking.findMany\` utilized \`BOOKING_SCALAR_SELECT\` for top-level booking columns, but included relation \`payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } }\` without an explicit nested \`select\`. Prisma generated SQL querying \`verifiedById\` on the related \`payments\` table, crashing PostgreSQL with the identical \`42703\` column error.
   - **Fix:** Added explicit \`select: PAYMENT_SCALAR_SELECT\` to the nested \`payments\` relation in \`getBookings\` and \`getBooking\`, and \`{ id: true, amount: true, refundedAmount: true }\` in \`recalculateBookingPaymentTotals\`. Extended identical protection to \`customer-service.ts\`, \`booking-public-service.ts\`, \`customer-portal-service.ts\`, \`finance-service.ts\`, and \`invoice-service.ts\`.
3. **Failure 3 — GET /api/dashboard/finance (403 Forbidden on mount):**
   - **Root Cause:** \`/api/dashboard/finance\` intentionally protects agency net margins and profit metrics with \`canAccessFinancialMargins(context.dbUser.role)\`. On the client dashboard, \`fetchDashboardData\` in \`src/app/(dashboard)/dashboard/page.tsx\` called \`dashboardClient.getFinance(filter)\` unconditionally inside \`Promise.allSettled\`, causing staff browsers to dispatch blocked 403 network requests on mount even though the financial ledger UI only renders for owners.
   - **Fix:** Guarded client invocation with \`isAgencyOwner ? dashboardClient.getFinance(filter) : Promise.resolve(null)\` with \`isAgencyOwner\` in the \`useCallback\` dependency array. Non-owner dashboard sessions resolve cleanly with zero 403 requests; owner dashboard continues to fetch and render the full financial ledger.
4. **Safety Check — Staff Permission Profile Failure Handling:**
   - Direct database inspection confirmed \`public.staff_permission_profiles\` does not exist in the connected PostgreSQL database.
   - Updated \`src/lib/services/staff-permission-service.ts\` to strictly distinguish:
     a) Genuinely new/legacy staff member (\`findUnique\` succeeds and returns \`null\`): resolves to \`DEFAULT_STAFF_PERMISSIONS\`.
     b) Database/schema failure or missing table (\`findUnique\` throws \`P2021\` or query error): logs safe structured error without secrets and fails closed (\`{}\`), ensuring protected actions fail closed rather than granting permissive access on infrastructure failures.
     c) Corrupt/malformed profile: logs structured warning and fails closed (\`{}\`).
   - Schema prerequisite: Running migration \`20261027150000_phase_f_staff_permissions\` will create \`staff_permission_profiles\`, \`agency_audit_logs\`, and add \`verifiedById\`/\`verifiedAt\` to \`payments\` when migration deployment is authorized by the user.

#### 2. Modified Files & Behavioral Summary
- \`src/lib/services/payment-service.ts\`: Exported \`PAYMENT_SCALAR_SELECT\` (25 physical columns); applied to all \`payment\` find queries.
- \`src/lib/services/booking-service.ts\`: Applied \`PAYMENT_SCALAR_SELECT\` to nested \`payments\` relations in \`getBookings\`, \`getBooking\`, and payment total recalculation.
- \`src/lib/services/staff-permission-service.ts\`: Enforced fail-closed behavior on database/schema errors and corrupt profiles; preserved \`DEFAULT_STAFF_PERMISSIONS\` for new staff records.
- \`src/app/(dashboard)/dashboard/page.tsx\`: Conditioned \`getFinance\` dispatch on \`isAgencyOwner\`.
- \`src/lib/services/customer-service.ts\`, \`src/lib/services/booking-public-service.ts\`, \`src/lib/services/customer-portal-service.ts\`, \`src/lib/services/finance-service.ts\`, \`src/lib/services/invoice-service.ts\`: Added explicit \`PAYMENT_SCALAR_SELECT\` allowlists to prevent cascade crashes across customer, portal, public booking, finance, and invoice queries.
- \`package.json\`: Added \`test:staff:failures\` npm script.
- \`prisma/test-staff-failures-phase1.ts\`: Dedicated 9-test verification suite covering schema drift, real database queries, owner finance boundary, and fail-closed safety.

#### 3. Verification & Evidence Table
- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **9 / 9 Passed (100%)**
  - Category 1 (Payments API & Service Schema Drift Protection): 2/2 passed
  - Category 2 (Bookings API & Nested Payment Relation Protection): 1/1 passed
  - Category 3 (Finance Dashboard Security Boundary & Staff Fetch Avoidance): 2/2 passed
  - Category 4 (Staff Permission Profile Safety & Fail-Closed Invariants): 4/4 passed
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **118 / 118 Passed (100%)**
- **Staff Dashboard Authorization Suite (\`npm run test:dashboard:auth\`):** **54 / 54 Passed (100%)**
- **Staff Invitation Session Suite (\`npm run test:staff:session\`):** **27 / 27 Passed (100%)**
- **CRM Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)**
- **TypeScript Gate (\`npx tsc --noEmit\`):** **0 errors**
- **Production Build Gate (\`npm run build\`):** **Compiled successfully in 44s; all 87 routes and 42 static pages optimized**
- **Git Formatting Gate (\`git diff --check\`):** **0 errors**

#### 4. Safety & Scope Boundaries Maintained
- Zero database migrations or schema mutations executed (\`prisma db push\` / \`prisma migrate deploy\` not run).
- Zero branch switches, commits, pushes, or resets performed.
- Zero secret, token, or session cookie exposure.
- Broader permission matrix redesign and UI modal remain unstarted pending separate approval.

---

# END OF MASTER HANDOVER V3`;

function replaceNormalized(src: string, t: string, r: string): string {
  const normTarget = t.replace(/\r\n/g, "\n");
  const normSrc = src.replace(/\r\n/g, "\n");
  if (!normSrc.includes(normTarget)) {
    throw new Error(`Target not found in V3: ${t.substring(0, 60)}...`);
  }
  const isCrlf = src.includes("\r\n");
  const replacedNorm = normSrc.replace(normTarget, r.replace(/\r\n/g, "\n"));
  return isCrlf ? replacedNorm.replace(/\n/g, "\r\n") : replacedNorm;
}

content = replaceNormalized(content, target, section276_41);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully appended Section 276.41 to TRIPDESK_MASTER_CONTEXT_FINAL_V3.md!");

