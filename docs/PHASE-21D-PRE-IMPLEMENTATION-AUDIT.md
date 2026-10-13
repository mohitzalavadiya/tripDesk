# TRIPDESK — PHASE 21-D PRE-IMPLEMENTATION AUDIT

## AGENCY BI & EXPORTABLE ACCOUNTING REPORTS

**Date:** September 1, 2026  
**Environment:** Production (`localhost:3001` / Neon Cloud PostgreSQL / Supabase Auth)  
**Branch:** `phase-21`  
**Baseline:** Phase 21-C COMPLETE & CERTIFIED

---

## 1. CURRENT STATE OF `/reports`

The existing `src/app/(dashboard)/reports/page.tsx` is a static placeholder returning an `<EmptyState>` component with the title *"Performance Reports coming soon"* and placeholder text referencing *"Phase 4"*.

There are currently no active subroutes, no real-time metrics, no interactive date filtering, and no data visualizations connected to `/reports`.

---

## 2. RELEVANT DATABASE MODELS & SCHEMA AUDIT

Audit of `prisma/schema.prisma` confirms that all necessary business models already exist in PostgreSQL with multi-tenant `agencyId` foreign keys and indexes:

| Domain | Model | Key Fields Used in Reporting | Tenant Isolation Key |
|---|---|---|---|
| **CRM / Sales** | `Enquiry` | `id`, `enquiryNumber`, `destination`, `budget`, `status` (`NEW`, `CONTACTED`, `QUALIFIED`, `FOLLOW_UP`, `QUOTATION_SENT`, `NEGOTIATION`, `CONVERTED`, `LOST`, `CANCELLED`), `source`, `priority`, `createdAt` | `agencyId` (indexed) |
| **Trips** | `Trip` | `id`, `tripNumber`, `title`, `startDate`, `endDate`, `status` (`DRAFT`, `PLANNING`, `QUOTED`, `BOOKED`, `ONGOING`, `COMPLETED`, `CANCELLED`), `createdAt` | `agencyId` (indexed) |
| **Bookings & Sales** | `Booking` | `id`, `bookingNumber`, `tripId`, `customerId`, `quotationId`, `status` (`DRAFT`, `CONFIRMED`, `ONGOING`, `COMPLETED`, `CANCELLED`), `paymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID`), `totalAmount`, `paidAmount`, `balanceAmount`, `bookingDate`, `travelStartDate`, `travelEndDate` | `agencyId` (indexed) |
| **Customer Payments** | `Payment` | `id`, `bookingId`, `amount`, `paymentType` (`ADVANCE`, `PARTIAL`, `FINAL`, `REFUND`, `ADJUSTMENT`), `status` (`COMPLETED`, `REFUNDED`), `paymentDate`, `paymentMethod`, `refundedAmount` | `agencyId` (indexed) |
| **Supplier Payables** | `SupplierPayable` | `id`, `supplierId`, `bookingId`, `tripId`, `serviceType`, `plannedAmount`, `actualAmount`, `paidAmount`, `outstandingAmount`, `dueDate`, `status` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`) | `agencyId` (indexed) |
| **Supplier Payments** | `SupplierPayment` | `id`, `supplierId`, `payableId`, `bookingId`, `amount`, `paymentDate`, `status` (`COMPLETED`) | `agencyId` (indexed) |
| **Trip Expenses** | `OperationalExpense` | `id`, `tripId`, `bookingId`, `category`, `amount`, `expenseDate` | `agencyId` (indexed) |
| **Quotations & Margin** | `Quotation`, `QuotationItem` | `subtotal` (buy cost), `markupAmount`, `taxAmount`, `finalAmount` (selling price), `costPrice`, `sellingPrice` | `agencyId` (indexed) |
| **Customer Analytics** | `Customer` | `id`, `name`, `phone`, `email`, `city`, `createdAt`, `trips`, `bookings` | `agencyId` (indexed) |
| **Feedback & NPS** | `CustomerFeedback` | `rating`, `serviceRating`, `hotelRating`, `driverRating`, `vehicleRating`, `activityRating`, `supportRating` | `agencyId` (indexed) |

**Conclusion:** **ZERO schema modifications are required.** The existing schema provides complete native support for all BI, sales funnel, destination, margin, receivable, payable, and customer metrics.

---

## 3. EXISTING SERVICES & REUSABLE ARCHITECTURE

1. **Authorization Context (`src/lib/api/context.ts`)**:
   - `requireAgencyOwnerContext()` guarantees tenant resolution on the server from Supabase auth session + PostgreSQL user records.
   - Client-provided `agencyId` will never be trusted.
2. **Costing & Financial Engine (`src/lib/costing-engine.ts`)**:
   - Canonical calculations:
     - `Selling Price - Buy Cost = Gross Profit`
     - `(Gross Profit / Selling Price) * 100 = Gross Margin %`
     - `Balance Due = Booking Total - Paid Amount`
   - `formatCurrency(amount, "INR")` for standard Indian Rupee notation (e.g. `₹1,25,000`).
3. **Date Filtering Utilities (`src/lib/validation/dashboard-schema.ts`)**:
   - `DashboardPreset`: `TODAY`, `THIS_WEEK`, `THIS_MONTH`, `LAST_MONTH`, `THIS_QUARTER`, `THIS_YEAR`, `CUSTOM_RANGE`.
   - `calculateDashboardDateRange(preset, start, end)` converts presets into UTC date boundary objects `{ startDate: Date, endDate: Date }`.
4. **PDF Generation (`pdfkit`)**:
   - `quotation-pdf-service.ts` and `operations-document-service.ts` establish the TripDesk PDF standard using `PDFDocument` with clean typography, tables, and branding.
5. **CSV Generation**:
   - Standard CSV generation with RFC 4180 escaping, sanitization against formula injection (`=`, `+`, `-`, `@`), and UTF-8 BOM headers.

---

## 4. MISSING FUNCTIONALITY TO BE IMPLEMENTED

1. **Reporting Service (`src/lib/services/reporting-service.ts`)**:
   - Dedicated service implementing server-authoritative calculations:
     - Executive KPI Cards (Sales, Trips, Bookings, Financial).
     - Revenue & Collections time-series (Daily/Weekly/Monthly aggregation).
     - Booking volume and conversion trends.
     - CRM Enquiry Funnel analytics (`NEW` → `QUALIFIED` → `QUOTATION_SENT` → `NEGOTIATION` → `CONVERTED` / `LOST`).
     - Destination performance (rankings by revenue, trip count, bookings, gross profit).
     - Profitability report (Selling Price vs Buy Cost vs Expenses vs Gross Margin).
     - Customer Receivables ledger & aging.
     - Supplier Payables breakdown by vendor and service type.
     - Customer retention & LTV distribution.
     - CSV and PDF export data builders.
2. **Validation Schema (`src/lib/validation/reporting-schema.ts`)**:
   - Zod validation for report query filters (`preset`, `startDate`, `endDate`, `tab`, `search`, `limit`).
3. **API Routes (`src/app/api/reports/route.ts`, `src/app/api/reports/export/route.ts`, `src/app/api/reports/pdf/route.ts`)**:
   - `GET /api/reports`: Returns JSON BI datasets.
   - `GET /api/reports/export`: Returns filtered CSV stream.
   - `GET /api/reports/pdf`: Returns executive summary PDF buffer.
4. **Client API SDK (`src/lib/api-client/reporting-client.ts`)**:
   - Type-safe fetch wrappers for reports queries and download URLs.
5. **UI BI Dashboard (`src/app/(dashboard)/reports/page.tsx`)**:
   - Date range selector & fast preset pills.
   - 6 Executive Summary KPI scorecards.
   - Interactive Visual Analytics:
     - Revenue & Collections Trend Chart.
     - CRM Enquiry Stage Funnel.
     - Top Travel Destinations ranking.
     - Profitability & Margin matrix.
     - Receivables & Overdue balance tables.
     - Supplier Payables & Vendor liability breakdown.
     - Customer Retention & Lifetime Value summary.
   - Instant CSV & PDF export action buttons.

---

## 5. SECURITY & PERFORMANCE CONSIDERATIONS

1. **Tenant Isolation**:
   - Every single Prisma query will be scoped with `where: { agencyId: ctx.agencyId }`.
   - No possibility of IDOR or cross-tenant data leakage.
2. **Financial Data Safety**:
   - Internal supplier costs, gross profits, and vendor payables remain exclusively accessible to authenticated Agency Owners on protected routes.
   - Public proposal routes (`/q/[shareToken]`, `/trip/[secureToken]`, `/b/[secureToken]`) remain strictly commercial-safe with zero supplier cost leakage.
3. **Query Optimization & Prevention of N+1**:
   - Use Prisma `aggregate`, `groupBy`, and batch queries.
   - Avoid iterative queries per destination/supplier.
4. **Formula Injection Defense**:
   - Sanitize all text fields in CSV output to prepend single quotes if strings start with `=,+,-,@,\t,\r`.

---

## 6. RECOMMENDED STEP-BY-STEP IMPLEMENTATION PLAN

1. **Step 1**: Create Zod validation schema in `src/lib/validation/reporting-schema.ts`.
2. **Step 2**: Create server-authoritative service in `src/lib/services/reporting-service.ts`.
3. **Step 3**: Implement REST API routes in `src/app/api/reports/route.ts`, `src/app/api/reports/export/route.ts`, `src/app/api/reports/pdf/route.ts`.
4. **Step 4**: Create client SDK in `src/lib/api-client/reporting-client.ts`.
5. **Step 5**: Build rich BI Reports UI in `src/app/(dashboard)/reports/page.tsx` adhering to TripDesk design tokens.
6. **Step 6**: Author automated test suite `prisma/test-phase21d-reports.ts` covering calculations, date filters, tenant isolation, empty states, CSV, and PDF generation.
7. **Step 7**: Run full regression test suite (Phase 21-D, 21-C, 21-B, 18, 12, `tsc`, and `npm run build`).
8. **Step 8**: Perform real browser QA and author documentation reports (`PHASE-21D-IMPLEMENTATION-REPORT.md`, `PHASE-21D-QA-REPORT.md`, `PHASE-21D-REGRESSION-REPORT.md`).
