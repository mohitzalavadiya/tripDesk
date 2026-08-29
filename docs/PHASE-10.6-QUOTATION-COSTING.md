# PHASE 10.6 — QUOTATION & TRIP COSTING MODULE ARCHITECTURE

## 1. Executive Summary
Phase 10.6 delivers the complete database-backed **Quotation & Trip Costing** system for TripDesk SaaS. It unifies live trip resource assignments (Hotels, Vehicles, Activities, and custom items) into an aggregation engine, providing versioned immutable snapshot proposals, granular line items, commercial markup/discount/tax rules, multi-tenant isolation, subscription write-protection, PDF previewing, and public customer share links.

---

## 2. Database Schema Extensions
- **`Quotation` model**:
  - `agencyId`: Multi-tenant boundary.
  - `quotationNumber`: Sequential `QT-YYYY-XXXXX` format.
  - `version`: Monotonically incrementing integer per trip.
  - `title`, `currency`, `subtotal`, `markupPercentage`, `markupAmount`, `discountPercentage`, `discountAmount`, `taxPercentage`, `taxAmount`, `finalAmount`.
  - `terms`, `customerMessage`, `internalNotes`, `shareToken`, `viewedAt`.
  - Enum `QuotationStatus`: `DRAFT`, `SENT`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`.
- **`QuotationItem` model**:
  - `type`, `category`, `sourceType`, `sourceId`, `name`, `description`.
  - `quantity`, `unit`, `unitPrice`, `costPrice`, `markupPercentage`, `sellingPrice`, `totalPrice`, `discount`, `tax`, `isOptional`, `sortOrder`, `notes`.

---

## 3. Core Engine & Services

### `tripCostingService` (`src/lib/services/trip-costing-service.ts`)
- Computes live trip resource costs from database records:
  - **Hotels**: `rooms * nights * nightlyRate` or `totalAmount`.
  - **Vehicles**: `ratePerKm * estimatedKm` or `totalRate`.
  - **Activities**: `adultPrice * adults + childPrice * children` or `totalPrice`.
  - Generates subtotal and supplier cost aggregation.

### `quotationService` (`src/lib/services/quotation-service.ts`)
- **Numbering Engine**: Generates atomic `QT-YYYY-XXXXX` sequence per agency per year.
- **Snapshot Generator**: Takes a snapshot of live trip costing and creates `Quotation` and `QuotationItem` records in a single Prisma transaction.
- **Recalculation Engine**: Computes subtotal, markups, discounts, taxes, and final pricing with Decimal-safe arithmetic.
- **Public Share & Tracking**: Provides sanitized public DTOs and marks quotations as `VIEWED` on customer access.

---

## 4. REST API Endpoints
1. `GET /api/quotations`: Paginated list with search, status filters, and sorting.
2. `POST /api/quotations`: Create manual proposal.
3. `GET /api/quotations/[id]`: Full proposal detail with line items.
4. `PATCH /api/quotations/[id]`: Update fields, pricing parameters, or status.
5. `DELETE /api/quotations/[id]`: Soft delete/archive.
6. `GET /api/quotations/[id]/items`: List line items.
7. `POST /api/quotations/[id]/items`: Add custom/supplement line item.
8. `PATCH /api/quotations/[id]/items/[itemId]`: Update line item and trigger quote recalculation.
9. `DELETE /api/quotations/[id]/items/[itemId]`: Remove line item and trigger quote recalculation.
10. `GET /api/trips/[id]/quotation`: Trip live costing + existing quotation proposals.
11. `POST /api/trips/[id]/quotation`: Generate snapshot proposal from trip resources.
12. `GET /api/quotations/public/[token]`: Public sanitized quotation retrieval.
13. `POST /api/quotations/public/[token]`: Track customer view event.

---

## 5. Frontend Pages & Workspaces
- **`/quotations`**: Master directory with search debounce (300ms), status tabs, pagination, soft archive, and share link modal.
- **`/quotations/new`**: Proposal creation wizard with live trip selection and pricing margin inputs.
- **`/trips/[id]/quotation`**: Interactive quotation builder inside trip workspace with line items table, custom item dialogs, pricing summary, version selector, and status controls.
- **`/trips/[id]/quotation/preview`**: Proposal preview with viewport switcher (desktop, tablet, mobile), PDF printing, and live share link.
- **`/trips/[id]/costing`**: Dedicated supplier cost aggregation sheet with stay, fleet, and excursion breakdown.
- **`/q/[shareToken]`**: Public interactive customer proposal page with branding, WhatsApp confirmation button, and print styling.

---

## 6. Security & Multi-Tenancy Guarantees
- **Tenant Scoping**: `agencyId` strictly resolved from server session context (`requireReadAccess()` / `requireWriteAccess()`).
- **Subscription Enforcement**: Expired / cancelled subscriptions retain `GET` (200), while mutating operations (`POST`, `PATCH`, `DELETE`) return `403 READ_ONLY_ACCESS`.
- **404 Not Found**: Cross-tenant requests to foreign quotations, trips, or customers consistently return 404 NOT_FOUND.
- **Zero Mock Contamination**: Unmigrated mock domains (`Bookings`, `Payments`, `Enquiries`, `Rate Sheets`) remain safely isolated while Quotation/Costing runs on real PostgreSQL.
