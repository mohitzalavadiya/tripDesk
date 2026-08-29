# Phase 10.12 Repository Gap Audit

## 1. Executive Summary
This audit inspects all application workspaces, REST API routes, services, database models, and client-side contexts across `src/` to identify remaining mock data dependencies, hardcoded statistics, fake contexts, and simulated workflows before implementing production wire-up.

---

## 2. Page & Module Data Source Matrix

| Page / Module | Current Data Source | Expected Data Source | Mock / Live | Required Change in Phase 10.12 |
| :--- | :--- | :--- | :---: | :--- |
| **Dashboard (`/dashboard`)** | `useEnquiry()`, `useInventory()` in `kpi-cards.tsx`, `pipeline-view.tsx`, `revenue-chart.tsx`, `follow-ups-list.tsx`, `recent-enquiries-table.tsx`, `upcoming-trips-list.tsx` | `dashboardService` + `/api/dashboard/summary` | 🔴 **MOCK CONTEXT** | Wire to live PostgreSQL aggregation service & typed API client. Remove hardcoded trends and fake state. |
| **Secure Trip Portal (`/trip/[secureToken]`)** | `useBooking()`, `useOperations()`, `useExperience()` | `/api/trips/public/[token]` + `tripPublicService` | 🔴 **MOCK CONTEXT** | Wire to live sanitized PostgreSQL trip query by secure `shareToken` with zero commercial leakage. |
| **Secure Booking Portal (`/b/[secureToken]`)** | Re-exports `/trip/[secureToken]` using mock contexts | `/api/bookings/public/[token]` + `bookingPublicService` | 🔴 **MOCK CONTEXT** | Wire to live sanitized PostgreSQL booking query with traveler, itinerary, and financial balance breakdown. |
| **Enquiries (`/enquiries`, `/enquiries/[id]`)** | `enquiryClient` (`/api/enquiries`) | `enquiryClient` (`/api/enquiries`) | 🟢 **LIVE DATABASE** | Already live and database-backed (Phases 10.8 & 10.11). Retain. |
| **Customers (`/customers`, `/customers/[id]`)** | `customerClient` (`/api/customers`) | `customerClient` (`/api/customers`) | 🟢 **LIVE DATABASE** | Already live and database-backed (Phase 10.9). Retain. |
| **Trips (`/trips`, `/trips/[id]`)** | `tripClient` (`/api/trips`) | `tripClient` (`/api/trips`) | 🟢 **LIVE DATABASE** | Already live and database-backed (Phase 10.10). Retain. |
| **Quotation & Proposal (`/trips/[id]/quotation`, `/quotations`)** | `quotationClient` (`/api/quotations`) | `quotationClient` (`/api/quotations`) | 🟢 **LIVE DATABASE** | Already live with versioning and package tiers (Phases 10.11A–10.11D). Retain. |
| **Public Proposal Portal (`/q/[shareToken]`)** | `quotationClient` (`/api/quotations/public/[token]`) | `quotationClient` (`/api/quotations/public/[token]`) | 🟢 **LIVE DATABASE** | Live PostgreSQL query with sanitized payload (Phase 10.11C). Retain. |
| **Proposal PDF Export (`/api/quotations/[id]/pdf`)** | `quotationPdfService` | `quotationPdfService` (`pdfkit`) | 🟢 **LIVE DATABASE** | Live A4 PDF document generator (Phase 10.11D). Retain. |
| **Bookings (`/bookings`, `/bookings/[id]`)** | `bookingClient` (`/api/bookings`) | `bookingClient` (`/api/bookings`) | 🟢 **LIVE DATABASE** | Already live (Phase 10.7). Retain. |
| **Payments (`/payments`)** | `paymentClient` (`/api/payments`) | `paymentClient` (`/api/payments`) | 🟢 **LIVE DATABASE** | Already live (Phase 10.7). Retain. |
| **Suppliers (`/suppliers`)** | `supplierClient` (`/api/suppliers`) | `supplierClient` (`/api/suppliers`) | 🟢 **LIVE DATABASE** | Already live. Retain. |
| **Rate Sheets (`/rate-sheets`)** | `rateSheetClient` (`/api/rate-sheets`) | `rateSheetClient` (`/api/rate-sheets`) | 🟢 **LIVE DATABASE** | Already live. Retain. |
| **Hotels (`/hotels`)** | `hotelClient` (`/api/hotels`) | `hotelClient` (`/api/hotels`) | 🟢 **LIVE DATABASE** | Already live. Retain. |
| **Vehicles (`/vehicles`)** | `vehicleClient` (`/api/vehicles`) | `vehicleClient` (`/api/vehicles`) | 🟢 **LIVE DATABASE** | Already live. Retain. |
| **Activities (`/activities`)** | `activityClient` (`/api/activities`) | `activityClient` (`/api/activities`) | 🟢 **LIVE DATABASE** | Already live. Retain. |
| **Operations (`/operations`, `/operations/[tripId]`, `/operations/issues`)** | `useOperations()`, `useBooking()` | PostgreSQL `BookingSupplierConfirmation`, `TripVoucher`, `OperationalIssue` (Phase 10.13) | 🟡 **PROTOTYPE CONTEXT** | Isolate from production dashboard. Phase 10.13 will migrate this to PostgreSQL. |
| **Feedback & Referrals (`/feedback`, `/referrals`, `/customer-insights`)** | `useExperience()` | PostgreSQL reviews & feedback models (Phase 10.15) | 🟡 **PROTOTYPE CONTEXT** | Isolate from production dashboard. |
| **Reports (`/reports`)** | Static `EmptyState` component | `reportService` + SQL Aggregations (Phase 10.14) | 🟡 **EMPTY PLACEHOLDER** | Retain placeholder cleanly until Phase 10.14. |

---

## 3. Context Retention & Migration Plan

1. **`enquiry-context.tsx` & `inventory-context.tsx`**:
   - Consumers in `/dashboard` will be completely migrated to `dashboardClient` (`/api/dashboard/summary`).
   - The dashboard will no longer import or consume `useEnquiry` or `useInventory`.
2. **`booking-context.tsx` & `operations-context.tsx`**:
   - Consumers in `/trip/[secureToken]` and `/b/[secureToken]` will be completely migrated to live PostgreSQL public endpoints.
   - Operations views (`/operations/*`) will remain scoped to prototype context until Phase 10.13 backend is implemented.
3. **`auth-context.tsx` & `saas-context.tsx`**:
   - Authentication context is live-connected to Supabase session. Retained.

---

## 4. Key Actions for Phase 10.12
1. Create `dashboardService` in `src/lib/services/dashboard-service.ts` using Prisma aggregations (`count`, `aggregate`, `_sum`).
2. Create `/api/dashboard/summary` endpoint.
3. Create `dashboardClient` in `src/lib/api-client/dashboard-client.ts`.
4. Update `/dashboard/page.tsx` and all dashboard subcomponents to use live data.
5. Create `tripPublicService` & `bookingPublicService` and `/api/trips/public/[token]` & `/api/bookings/public/[token]`.
6. Update `/trip/[secureToken]` and `/b/[secureToken]` to fetch from live sanitized APIs.
7. Build and run comprehensive automated test suite `prisma/test-phase10-12.ts`.
