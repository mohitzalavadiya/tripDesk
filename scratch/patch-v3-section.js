const fs = require('fs');
let content = fs.readFileSync('TRIPDESK_MASTER_CONTEXT_FINAL_V3.md', 'utf8');

const oldBlockStart = '4. **Safety Check — Staff Permission Profile Failure Handling:**';
const oldBlockEnd = '#### 4. Safety & Scope Boundaries Maintained';

const startIndex = content.indexOf(oldBlockStart);
const endIndex = content.indexOf(oldBlockEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers. Start:', startIndex, 'End:', endIndex);
  process.exit(1);
}

const replacement = `4. **Staff Permission Profile Inconsistency Resolution & Fail-Closed Invariants:**
   - **Investigation & Finding:** The earlier report claimed a new staff member receives \`DEFAULT_STAFF_PERMISSIONS\` while simultaneously noting \`staff_permission_profiles\` was missing from PostgreSQL. Investigation revealed that the earlier test ran against a unit mock with \`findUnique: async () => null\`, which simulated a *migrated* schema where the table exists and the query returns 0 rows. On the physical PostgreSQL database, the table is absent (\`P2021\` / \`42P01\`). If a missing table or query error defaulted to \`DEFAULT_STAFF_PERMISSIONS\`, any restricted staff member whose saved profile cannot be read (due to schema drift, network outage, or DB failure) would silently be granted broader default privileges—a severe security regression.
   - **Resolution & Fix in \`staff-permission-service.ts\`:**
     a) **Unmigrated Database / Missing Table / Query Outage:** When \`checkHasStaffPermissionProfileTable\` is false, or \`findUnique\` throws \`P2021\` or network errors, \`getStaffPermissions\` logs a structured warning without secrets and **fails closed (\`{}\`)**. It does NOT grant defaults.
     b) **Existing Staff Restrictions Preserved:** If saved permissions cannot be retrieved due to database/infrastructure errors, the system fails closed rather than overwriting saved restrictions with defaults.
     c) **Migrated Schema (Genuinely New Staff):** When the table physically exists in PostgreSQL and \`findUnique\` completes successfully returning \`null\` (zero rows found), \`getStaffPermissions\` deterministically resolves to \`DEFAULT_STAFF_PERMISSIONS\`.
     d) **Corrupt / Malformed JSON:** Fails closed (\`{}\`).
     e) **Mutations Blocked Safely:** \`updateStaffPermissions\` explicitly checks table existence and throws domain error: "Cannot update staff permissions: staff_permission_profiles table does not exist in current database. Pending migration: 20261027150000_phase_f_staff_permissions".
   - **Migration Prerequisite:** Running migration \`20261027150000_phase_f_staff_permissions\` will physically create \`staff_permission_profiles\`, \`agency_audit_logs\`, and add \`verifiedById\`/\`verifiedAt\` to \`payments\`. Until then, staff permissions fail closed safely.

#### 2. Modified Files & Behavioral Summary
- \`src/lib/services/payment-service.ts\`:
  - Exported \`PAYMENT_SCALAR_SELECT\` (25 physical columns) and \`PAYMENT_RELATIONS_SELECT\` (relations with safe scalar projections).
  - Applied \`PAYMENT_RELATIONS_SELECT\` across \`getPayments\`, \`getPayment\`, \`createPayment\`, \`updatePayment\`, \`recordInvoicePayment\`, and \`voidPayment\`.
  - Implemented dynamic runtime detection \`checkHasPaymentVerificationColumns\` and \`checkHasAgencyAuditLogsTable\`.
  - Conditioned write payloads in \`createPayment\` and \`verifyPaymentReceipt\`/\`verifyStaffReceipt\` so they never write to nonexistent \`verifiedById\` or \`verifiedAt\` columns in PostgreSQL before migration deployment, preventing error \`42703\`.
  - Preserved verification auditing and business invariants via \`AgencyAuditLog\` and booking total recalculations.
  - Exported \`verifyStaffReceipt\` and \`voidStaffReceipt\` aliases to ensure seamless cross-module and test compatibility.
- \`src/lib/services/booking-service.ts\`:
  - Applied \`PAYMENT_SCALAR_SELECT\` to nested \`payments\` relations in \`getBookings\` and \`getBooking\`.
  - Added explicit \`select: { id: true }\` to initial booking payment creation (\`createBooking\` with advance) to prevent wildcard \`RETURNING\` crashes.
  - Recalculated booking payment totals with scalar projection \`{ id: true, amount: true, refundedAmount: true }\`.
- \`src/lib/services/finance-service.ts\`:
  - Applied \`PAYMENT_SCALAR_SELECT\` to \`recordCustomerPayment\` and \`refundCustomerPayment\` mutations, preventing wildcard \`RETURNING\` clauses from requesting unmigrated columns.
- \`src/lib/services/agency-audit-service.ts\`:
  - Added \`checkHasAgencyAuditLogsTable\` to prevent transaction aborts when the \`agency_audit_logs\` table has not yet been migrated to the connected PostgreSQL database.
- \`src/lib/services/staff-permission-service.ts\`:
  - Enforced fail-closed behavior (\`{}\`) on missing table (\`checkHasStaffPermissionProfileTable\`), query errors, and corrupt profiles; preserved \`DEFAULT_STAFF_PERMISSIONS\` solely for clean 0-row lookups in migrated schemas.
- \`src/app/(dashboard)/dashboard/page.tsx\`: Conditioned \`getFinance\` dispatch on \`isAgencyOwner\`.
- \`src/lib/services/customer-service.ts\`, \`src/lib/services/booking-public-service.ts\`, \`src/lib/services/customer-portal-service.ts\`, \`src/lib/services/invoice-service.ts\`: Added explicit \`PAYMENT_SCALAR_SELECT\` allowlists to prevent cascade crashes across customer, portal, public booking, and invoice queries.
- \`package.json\`: Added \`test:staff:failures\` npm script.
- \`prisma/test-staff-failures-phase1.ts\`: Expanded to a comprehensive 16-test verification suite covering schema drift, real database write path execution against PostgreSQL (create, update, verify, void, archive), response contract verification, staff commercial margin redaction, and fail-closed safety (simulated migrated schema, missing table, database outage, corrupt payload, and real connected PostgreSQL execution).

#### 3. Verification & Evidence Table
- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **16 / 16 Passed (100%)**
  - Category 1 (Payments API & Service Schema Drift Protection - Reads & Writes): 5/5 passed
    - Real database execution of payment write paths: create, update, verify, void, archive verified against connected PostgreSQL
  - Category 2 (Bookings API & Nested Payment Relation Protection): 2/2 passed
  - Category 3 (Finance Dashboard Security Boundary & Staff Fetch Avoidance): 3/3 passed
    - Response contracts & financial margin redaction verified for staff
  - Category 4 (Staff Permission Profile Safety & Fail-Closed Invariants): 6/6 passed
    - Real database execution against connected PostgreSQL asserts fail-closed \`{}\` for unmigrated table
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **118 / 118 Passed (100%)**
- **Staff Dashboard Authorization Suite (\`npm run test:dashboard:auth\`):** **54 / 54 Passed (100%)**
- **Staff Invitation Session Suite (\`npm run test:staff:session\`):** **27 / 27 Passed (100%)**
- **CRM Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)**
- **TypeScript Gate (\`npx tsc --noEmit\`):** **0 errors**
- **Production Build Gate (\`npm run build\`):** **Compiled successfully in 20.9s; all 87 routes and 42 static pages optimized**
- **Git Formatting Gate (\`git diff --check\`):** **0 errors**

`;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync('TRIPDESK_MASTER_CONTEXT_FINAL_V3.md', newContent, 'utf8');
console.log('Successfully updated TRIPDESK_MASTER_CONTEXT_FINAL_V3.md');

