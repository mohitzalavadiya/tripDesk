# TRIPDESK — PHASE 21-F PRE-IMPLEMENTATION AUDIT
**Agency Communication Center & Customer Notification Engine**

**Date:** September 01, 2026  
**Environment:** Production-like (`localhost:3001` / Neon Cloud PostgreSQL / Supabase Auth)  
**Branch:** `phase-21`  
**Baseline:** Phase 21-E COMPLETE & CERTIFIED  

---

## 1. Executive Summary

TripDesk has certified core travel management workflows (Customers, Enquiries, Rate Sheets, Quotations, Bookings, Finance, Documents, Operations, and Customer Feedback). Currently, customer communications and notifications are handled through disjointed mechanisms.

Phase 21-F introduces a unified **Agency Communication Center (`/communications`)** for Agency Owners and a **Customer Notification Engine** embedded into the secure Customer Portal (`/trip/[secureToken]`), powered by the existing `CustomerNotification` and `AgencyCommunicationSetting` database schema.

---

## 2. Database Schema & Reusability Audit

Audit of `prisma/schema.prisma` confirms that dedicated models and enums are already present in PostgreSQL:

| Model / Enum | Location in Schema | Purpose & Scope | Reusability in Phase 21-F |
| :--- | :--- | :--- | :--- |
| `CustomerNotification` | Lines 1728–1775 | Stores customer notifications (`id`, `agencyId`, `customerId`, `tripId`, `bookingId`, `quotationId`, `type`, `title`, `message`, `channel`, `status`, `idempotencyKey`, `linkUrl`, `readAt`, `sentAt`) | **100% Reused** (Zero schema modifications needed) |
| `CustomerNotificationPreference` | Lines 1777–1804 | Per-customer channel & category opt-in/opt-out preferences (`emailEnabled`, `whatsappEnabled`, `smsEnabled`, `tripUpdates`, etc.) | **100% Reused** |
| `AgencyCommunicationSetting` | Lines 1806–1832 | Agency-wide communication toggles, sender names/emails, automated reminder intervals | **100% Reused** |
| `CustomerNotificationType` | Lines 165–195 | Canonical notification event types (`BOOKING_CONFIRMED`, `PAYMENT_RECEIVED`, `TRIP_CONFIRMED`, `TRIP_COMPLETED`, `FEEDBACK_REQUEST`, etc.) | **100% Reused** |
| `NotificationChannel` | Lines 197–202 | Supported channels: `IN_APP`, `EMAIL`, `SMS`, `WHATSAPP` | **100% Reused** |
| `NotificationDeliveryStatus` | Lines 204–212 | Delivery states: `QUEUED`, `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`, `CANCELLED` | **100% Reused** |

### Audit Conclusion on Database:
**ZERO destructive migrations or new database tables are required.** The existing PostgreSQL schema natively contains all indexes and relations required for Phase 21-F.

---

## 3. Existing Services & Codebase Assets

1. **`CustomerNotificationService` (`src/lib/services/customer-notification-service.ts`)**:
   - Implements notification dispatching, customer preference checks, deterministic idempotency checks (`@@unique([agencyId, idempotencyKey])`), and helper methods for booking, payment, and trip status notifications.
2. **`CommunicationService` (`src/lib/services/communication-service.ts`)**:
   - Implements centralized log listing, filtering, detail retrieval, template rendering (Email & WhatsApp), and automated reminder sweeps (`runPaymentReminders`, `runTravelReminders`).
3. **`communication-schema.ts` (`src/lib/validation/communication-schema.ts`)**:
   - Contains Zod validation schemas for listing logs, manual message composition, and agency settings.
4. **`public-client.ts` & `communication-client.ts` (`src/lib/api-client/`)**:
   - Provides SDK fetch functions for frontend components.
5. **Auth Middleware (`src/lib/supabase/middleware.ts`)**:
   - Certified in Phase 21-E to permit public token endpoints (`/api/trips/public/*`, `/api/quotations/public/*`, `/api/bookings/public/*`).

---

## 4. Gaps to Be Implemented for Phase 21-F

1. **Standardized API Routes for Agency Communications**:
   - Provide direct endpoints at `/api/communications` (`GET` list, `POST` manual message) and `/api/communications/[id]` (`GET` detail) mapped cleanly to `CommunicationService`.
2. **Customer Public Notification Endpoints**:
   - `GET /api/trips/public/[token]/notifications`: Resolves public token and retrieves relevant customer notifications.
   - `POST /api/trips/public/[token]/notifications/[id]/read`: Marks a notification as read safely within token context.
3. **Agency Owner Communication Center UI (`src/app/(dashboard)/communications/page.tsx`)**:
   - Responsive dashboard featuring:
     - 4 KPI Scorecards (Total Communications, Delivered / Sent, Pending / Queued, Delivery Issues).
     - Search & Multi-Filter Bar (Channel, Event Type, Delivery Status).
     - Communication History Table with status pills and quick actions.
     - "Send Customer Message" modal (recipient search, channel selector, template preview).
     - Detail view modal displaying payload, recipient, and delivery timestamps.
4. **Navigation Integration (`src/lib/navigation.ts`)**:
   - Add `"Communications"` under `TRAVEL MANAGEMENT` or `FINANCE & RETENTION` in the sidebar.
5. **Customer Portal Notification Tray (`src/app/trip/[secureToken]/page.tsx`)**:
   - Bell icon / unread indicator in floating header.
   - Notification cards displaying safe alerts (`Booking Confirmed`, `Payment Received`, `Trip Starting Soon`, `Tour Completed`, `Feedback Requested`).
   - Click to mark read interaction.

---

## 5. Security & Multi-Tenant Invariants

1. **Server-Derived Tenant Identity**: `requireAgencyOwnerContext()` guarantees that `agencyId` is strictly derived from the authenticated session.
2. **Token Security**: Public customer endpoints derive `agencyId`, `customerId`, and `tripId` exclusively from the validated `PublicShareLink.tokenHash`.
3. **Commercial Data Redaction**: Public notification payloads never expose supplier costs, buy prices, gross margins, supplier payables, or internal agency remarks.
4. **Idempotency Defense**: Automated triggers utilize deterministic keys (`booking-conf-${id}`, `pay-rcvd-${id}`, `trip-status-${id}-${status}`) to prevent duplicate notification bursts.

---

## 6. Implementation Steps

- **Step 1**: Finalize validation schemas in `src/lib/validation/communication-schema.ts`.
- **Step 2**: Enhance service layer in `src/lib/services/communication-service.ts` and `src/lib/services/customer-notification-service.ts` for token-scoped notifications.
- **Step 3**: Implement API routes (`/api/communications`, `/api/communications/[id]`, `/api/trips/public/[token]/notifications`, `/api/trips/public/[token]/notifications/[id]/read`).
- **Step 4**: Wire client SDK in `src/lib/api-client/communication-client.ts` and `src/lib/api-client/public-client.ts`.
- **Step 5**: Build `/communications` Agency Owner UI and add navigation item.
- **Step 6**: Integrate Customer Notification tray into `/trip/[secureToken]/page.tsx`.
- **Step 7**: Author automated test suite `prisma/test-phase21f-communications.ts` covering 11 testing groups.
- **Step 8**: Run regression suites, `tsc --noEmit`, `npm run build`, and browser QA.
