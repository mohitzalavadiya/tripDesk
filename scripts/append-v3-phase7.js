const fs = require('fs');

const sectionContent = `
---

### §276.63 — PHASE 7: FINANCE & BUSINESS MANAGEMENT IMPLEMENTATION & VERIFICATION

**Status:** Completed & Authoritative Baseline  
**Implementation Target:** Phase 7 (Sub-phases 7A through 7E)  
**Execution Pass:** Complete, Verified, Zero-Schema Migration Implementation  
**Quality Gates:** 66/66 Phase 7 Tests Passed | 33/33 Regression Tests Passed | \`prisma validate\` Valid | \`tsc --noEmit\` 0 Errors | \`npm run build\` Succeeded  

---

#### 1. Implemented Capabilities Summary

##### Phase 7A — Financial Overview & Visibility
- **Confirmed Booking Value:** Introduced \`confirmedBookingValue\` in executive finance dashboard and reporting services, strictly aggregating bookings with status \`CONFIRMED\`, \`ONGOING\`, and \`COMPLETED\` while explicitly separating them from \`DRAFT\` cohorts and excluding \`CANCELLED\` bookings.
- **Auditable Customer Receivables:** Replaced naive date-window arithmetic (\`totalSales - netReceived\`) with cumulative aggregation of active customer receivables items (\`customerReceivablesItems\`), eliminating artificial date-window distortion caused by cross-period payment collections.
- **Net Collections with Refund Handling:** Strict status isolation for received amounts: only payments with status \`COMPLETED\` and \`REFUNDED\` are counted, subtracting verified \`refundedAmount\` to yield true net cash collections. Non-collected payment records (\`PENDING\`, \`FAILED\`, \`CANCELLED\`, \`VOIDED\`) are strictly excluded from received revenue.

##### Phase 7B — Payment Tracking, Reconciliation & Idempotency
- **Duplicate Payment Prevention (Idempotency):** Enhanced \`paymentService.createPayment\` to enforce idempotency when a non-empty \`referenceNumber\` is provided. Attempting to record a duplicate reference number against active payments within the same agency throws a descriptive \`ConflictError\`. Reference numbers from \`VOIDED\` payments can be safely re-used.
- **Refund Net Paid Balance Recalculation:** Updated both \`financeService.recalculateBookingBalances\` and \`bookingService.recalculateBookingPaymentTotals\` to query \`status: { in: [COMPLETED, REFUNDED] }\`. Fully refunded payments restore the booking status to \`UNPAID\` with full balance due. Partial refunds correctly reduce net paid and update booking status to \`PARTIALLY_PAID\`.
- **Payments Page Metric Integrity:** Fixed \`payments/page.tsx\` \`summaryMetrics\` ledger calculation. Filtered customer payment collections strictly to \`COMPLETED\` and \`REFUNDED\` net of refunds, preventing unverified staff-entered \`PENDING\`, \`FAILED\`, or \`VOIDED\` payments from inflating reported cash receipts. Disbursements strictly require completed settlement.

##### Phase 7C — Supplier Payables & Settlement Visibility
- **Operational & Booking Traceability:** Confirmed full two-way linkage between \`SupplierPayable\`, \`SupplierPayment\`, \`Supplier\`, \`Booking\`, and \`TripOperation\`.
- **Payment History Deletion Protection:** Enforced safety guard in \`financeService.deleteSupplierPayable\`: payables with active recorded disbursements cannot be deleted and throw a descriptive validation error directing users to adjust or cancel payments first.
- **Finalized Operation Immutability Lock:** Added operational immutability verification (\`verifyOperationNotFinalized\`) to payable deletion workflows. Payables associated with an operation in \`OPERATION_FINALIZED\` state cannot be modified or deleted without an explicit audit reopening reason.
- **Audit-Safe Soft Deletion:** Unencumbered payables undergo soft deletion with \`archivedAt\` timestamps, status updated to \`CANCELLED\`, and reason appended to notes with operational event logging.

##### Phase 7D — Booking-Wise Financial Performance
- **Commercial Breakdown:** Enhanced \`financeService.getBookingFinanceBreakdown\` to include linked \`Quotation\` (\`quotedAmount\` via \`finalAmount\` or \`subtotal\`) and active issued \`Invoices\` (\`invoicedAmount\`, \`balanceAmount\`, \`invoiceNumber\`).
- **Gross Margin vs Net Profit Distinction:** Calculated \`grossMargin\` as \`Confirmed Booking Value − Verified Supplier Costs − Direct Operational Expenses\`. Added prominent accounting disclaimers in UI and API contracts explicitly clarifying that Gross Margin reflects commercial contribution before fixed agency overheads and net income taxes.
- **Cost Completeness Flag:** Introduced \`isCostComplete\` boolean and \`costCompletenessReason\` in breakdown DTOs. When supplier payables exist, margin is marked "Definitive Cost Base"; when supplier costs are unrecorded, UI displays "Incomplete Supplier Cost Base" to prevent deceptive profit assertions.
- **Booking Detail Dossier UI:** Implemented the Commercial & Financial Performance Breakdown card in \`bookings/[id]/page.tsx\`, presenting Quoted Amount, Confirmed Value, Invoiced Total, Verified Received, Customer Balance, Supplier Cost Base, Settled to Suppliers, Payable Balance, and Calculated Gross Margin with completeness badges.

##### Phase 7E — Financial Reporting, Redaction & Security
- **Multi-Tenant Server Scoping:** All financial operations, queries, exports, and dashboards derive \`agencyId\` strictly from authenticated server-side session context. Client-supplied tenant parameters are never trusted.
- **Granular Staff Financial Redaction:** Enforced \`redactStaffFinancials\` across all financial endpoints and UI views. When viewed by \`AGENCY_STAFF\`, internal purchase costs, supplier payables, supplier payments, direct expenses, gross profit, gross margin, profit margin percentages, and net cash position are recursively stripped. Selling prices, quotations, customer invoices, and received receipts remain accessible to authorized consultants.
- **Platform Owner Tenant Privacy:** Maintained architectural invariant where \`PLATFORM_OWNER\` has no access to private tenant commercial margins (\`FINANCIAL_MARGINS: []\`), reserving margin visibility exclusively to \`AGENCY_OWNER\`.

---

#### 2. Modified & Extended Files

| Component / Layer | File Path | Scope of Enhancement |
|:---|:---|:---|
| **Finance Service** | \`src/lib/services/finance-service.ts\` | Added \`confirmedBookingValue\` KPI; fixed \`customerOutstanding\` receivables aggregation; updated \`recalculateBookingBalances\` to query \`[COMPLETED, REFUNDED]\`; added \`verifyOperationNotFinalized\` to payable deletion; enriched \`getBookingFinanceBreakdown\` with quotation, invoice, gross margin, and cost completeness. |
| **Booking Service** | \`src/lib/services/booking-service.ts\` | Updated \`recalculateBookingPaymentTotals\` to query \`status: { in: ["COMPLETED", "REFUNDED"] }\` with net refund subtraction. |
| **Payment Service** | \`src/lib/services/payment-service.ts\` | Added reference-number idempotency check (\`ConflictError\`); updated real-time active payments query to include \`REFUNDED\` status net of refunds. |
| **UI Ledger Page** | \`src/app/(dashboard)/payments/page.tsx\` | Updated \`UnifiedPaymentItem\` with \`refundedAmount\`; fixed \`summaryMetrics\` to strictly filter received collections to completed/refunded net of refunds. |
| **UI Booking Detail** | \`src/app/(dashboard)/bookings/[id]/page.tsx\` | Integrated \`financeClient.getBookingFinanceBreakdown\`; added Commercial & Financial Performance Breakdown card with waterfall stats, gross margin badges, and staff redaction fallback. |
| **Verification Suite** | \`prisma/test-phase7-finance.ts\` | Comprehensive 66-test verification suite covering Phase 7A through 7E business rules, idempotency, refund calculations, payable deletion guards, and staff redaction. |

---

#### 3. Financial Calculation Definitions & Invariants

| Financial Metric | Authoritative Calculation Definition | Status Filters Applied |
|:---|:---|:---|
| **Total Booking Cohort** | \`SUM(booking.totalAmount)\` | \`status != CANCELLED\` |
| **Confirmed Booking Value** | \`SUM(booking.totalAmount)\` | \`status IN [CONFIRMED, ONGOING, COMPLETED]\` |
| **Verified Gross Collections** | \`SUM(payment.amount)\` | \`status IN [COMPLETED, REFUNDED]\` and \`archivedAt IS NULL\` |
| **Net Customer Received** | \`MAX(0, SUM(payment.amount - payment.refundedAmount))\` | \`status IN [COMPLETED, REFUNDED]\` |
| **Customer Outstanding Due** | \`SUM(booking.balanceAmount)\` across active receivables items | \`status != CANCELLED\` and \`balanceAmount > 0\` |
| **Supplier Cost Obligation** | \`SUM(payable.actualAmount ?? payable.plannedAmount)\` | \`status != CANCELLED\` and \`archivedAt IS NULL\` |
| **Supplier Disbursements** | \`SUM(supplierPayment.amount)\` | \`status == COMPLETED\` and \`archivedAt IS NULL\` |
| **Remaining Supplier Payable** | \`MAX(0, SupplierCost - SupplierDisbursements)\` | \`status != CANCELLED\` |
| **Calculated Gross Margin** | \`ConfirmedBookingValue - SupplierCostActual - DirectExpenses\` | Pre-fixed overheads; requires \`isCostComplete == true\` for definitive status |

---

#### 4. Verification & Quality Gates Matrix

| Verification Suite / Quality Gate | Target Command | Result | Pass Rate |
|:---|:---|:---:|:---:|
| **Phase 7 Comprehensive Finance Suite** | \`npx tsx prisma/test-phase7-finance.ts\` | **66 / 66 Passed** | **100%** |
| **Phases 4, 5 & 6 Unified Regression Suite** | \`npx tsx prisma/test-phase4-5-6.ts\` | **33 / 33 Passed** | **100%** |
| **Prisma Schema Validation** | \`npx prisma validate\` | **Schema Valid 🚀** | **100%** |
| **TypeScript Typecheck** | \`npx tsc --noEmit\` | **0 Errors** | **100%** |
| **Git Working-Tree Cleanliness** | \`git diff --check\` | **0 Whitespace / Conflict Errors** | **100%** |
| **Next.js Production Build** | \`npm run build\` | **130+ Routes Compiled Cleanly** | **100%** |

---

#### 5. Deferred Scope Invariants
The following accounting capabilities remain strictly deferred per project rules:
- GST credit note generation and statutory tax adjustment schedules.
- Automated payment gateway webhooks and live payment provider reconciliation.
- Automated bank API feed ingestion and automatic bank reconciliation.
- Automated customer refund disbursement through banking rails.
- Supplementary debit/credit invoice adjustment modules (historical invoice immutability preserved).
`;

const filePath = 'TRIPDESK_MASTER_CONTEXT_FINAL_V3.md';
let content = fs.readFileSync(filePath, 'utf8').trimEnd();
content += '\n' + sectionContent.trim() + '\n';
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully appended Section §276.63 to TRIPDESK_MASTER_CONTEXT_FINAL_V3.md');
