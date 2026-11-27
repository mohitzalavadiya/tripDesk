import * as fs from "fs";
import * as path from "path";

const filePath = path.resolve("TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
let content = fs.readFileSync(filePath, "utf-8");
const isCRLF = content.includes("\r\n");
content = content.replace(/\r\n/g, "\n");

const target = `#### 2. Modified Files & Behavioral Summary
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
- **Git Formatting Gate (\`git diff --check\`):** **0 errors**`;

const replacement = `#### 2. Modified Files & Behavioral Summary
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
  - Enforced fail-closed behavior on database/schema errors and corrupt profiles; preserved \`DEFAULT_STAFF_PERMISSIONS\` for new staff records.
- \`src/app/(dashboard)/dashboard/page.tsx\`: Conditioned \`getFinance\` dispatch on \`isAgencyOwner\`.
- \`src/lib/services/customer-service.ts\`, \`src/lib/services/booking-public-service.ts\`, \`src/lib/services/customer-portal-service.ts\`, \`src/lib/services/invoice-service.ts\`: Added explicit \`PAYMENT_SCALAR_SELECT\` allowlists to prevent cascade crashes across customer, portal, public booking, and invoice queries.
- \`package.json\`: Added \`test:staff:failures\` npm script.
- \`prisma/test-staff-failures-phase1.ts\`: Expanded to a comprehensive 14-test verification suite covering schema drift, real database write path execution against PostgreSQL (create, update, verify, void, archive), response contract verification, staff commercial margin redaction, and fail-closed safety.

#### 3. Verification & Evidence Table
- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **14 / 14 Passed (100%)**
  - Category 1 (Payments API & Service Schema Drift Protection - Reads & Writes): 5/5 passed
    - Real database execution of payment write paths: create, update, verify, void, archive verified against connected PostgreSQL
  - Category 2 (Bookings API & Nested Payment Relation Protection): 2/2 passed
  - Category 3 (Finance Dashboard Security Boundary & Staff Fetch Avoidance): 3/3 passed
    - Response contracts & financial margin redaction verified for staff
  - Category 4 (Staff Permission Profile Safety & Fail-Closed Invariants): 4/4 passed
- **Application-Wide Staff Authorization Suite (\`npm run test:staff:app-wide\`):** **118 / 118 Passed (100%)**
- **Staff Dashboard Authorization Suite (\`npm run test:dashboard:auth\`):** **54 / 54 Passed (100%)**
- **Staff Invitation Session Suite (\`npm run test:staff:session\`):** **27 / 27 Passed (100%)**
- **CRM Correctness Suite (\`npm run test:crm:correctness\`):** **452 / 452 Passed (100%)**
- **TypeScript Gate (\`npx tsc --noEmit\`):** **0 errors**
- **Production Build Gate (\`npm run build\`):** **Compiled successfully in 28.9s; all 87 routes and 42 static pages optimized**
- **Git Formatting Gate (\`git diff --check\`):** **0 errors**`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  if (isCRLF) content = content.replace(/\n/g, "\r\n");
  fs.writeFileSync(filePath, content, "utf-8");
  console.log("Successfully updated TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
} else {
  console.error("FAILED to match target in TRIPDESK_MASTER_CONTEXT_FINAL_V3.md");
}

