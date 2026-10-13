# TRIPDESK — PHASE 21-E PRE-IMPLEMENTATION AUDIT

## CUSTOMER PORTAL FEEDBACK & POST-TRIP EXPERIENCE

**Date:** September 1, 2026  
**Environment:** Production (`localhost:3001` / Neon Cloud PostgreSQL / Supabase Auth)  
**Branch:** `phase-21`  
**Baseline:** Phase 21-D COMPLETE & CERTIFIED

---

## 1. AUDIT OF CUSTOMER PORTAL & SECURE TOKEN ARCHITECTURE

### 1.1 Secure Token Routing & Resolution
- **Customer Public Portal Route**: `/trip/[secureToken]` (and `/b/[secureToken]`).
- **Resolution Strategy**:
  - `src/lib/services/trip-public-service.ts` (`tripPublicService.getPublicTripByToken(token)`) first queries `prisma.publicShareLink.findFirst({ where: { tokenHash: token, status: "ACTIVE", revokedAt: null } })`.
  - Fallback: Direct lookup by `tripId` or `tripNumber` for internal routing.
- **Customer Context (`src/lib/auth/customer-auth.ts`)**:
  - `getAuthenticatedCustomer(request)` supports header tokens (`x-customer-token`), session cookies (`tripdesk_customer_session`), and PublicShareLink resolution.
- **Commercial Data Safety**:
  - `PublicTripPayload` strictly excludes internal supplier costs, buy prices, supplier payables, gross margins, and operational internal notes.

### 1.2 Existing Customer Portal UI (`src/app/trip/[secureToken]/page.tsx`)
- Renders:
  1. Sticky top bar with Agency branding, Print Itinerary, and "Contact Advisor" WhatsApp modal.
  2. Hero status card (`LIVE ON TOUR`, `TOUR COMPLETED`, `CONFIRMED BOOKING`, `PLANNED ITINERARY`).
  3. Payment Statement (if booking exists).
  4. Day-by-Day Schedule, Hotel Accommodations, Private Transport, Sightseeing & Activities.
- **Gap Identified**: When `trip.status === "COMPLETED"`, there is no feedback submission card or review modal integrated into the page.

---

## 2. AUDIT OF FEEDBACK SYSTEM & PERSISTENCE

### 2.1 Existing Model (`prisma/schema.prisma` -> `CustomerFeedback`)
`CustomerFeedback` is fully defined and active in PostgreSQL:
- `id` (cuid)
- `agencyId` (String, indexed)
- `customerId` (String, indexed)
- `tripId` (String, indexed)
- `bookingId` (String?, indexed)
- `rating` (Int 1-5, default 5)
- `serviceRating`, `hotelRating`, `vehicleRating`, `driverRating`, `activityRating`, `supportRating` (Int? 1-5)
- `positiveComment`, `improvementComment`, `travelAgain`, `comments` (String?)
- `serviceRecoveryStatus` (String, default "Not Needed")
- `serviceRecoveryNotes` (String?)
- `source` (String, default "PORTAL")
- `createdAt`, `updatedAt` (DateTime)

**Conclusion:** **ZERO database schema modifications are required.** The existing model natively supports all Phase 21-E requirements.

### 2.2 Existing Feedback Service (`src/lib/services/feedback-service.ts`)
- Implemented in Phase 21-C:
  - `listFeedbacks(agencyId, filter)`: Calculates KPI summary stats, average ratings by category, positive % (>= 4★), attention count (<= 3★), and tabbed listing.
  - `getFeedback(agencyId, feedbackId)`: Single feedback retrieval with tenant isolation.
  - `createFeedback(agencyId, input)`: Agency manual feedback creation.
  - `updateServiceRecovery(agencyId, feedbackId, input)`: Workflow state transitions (`Not Needed`, `Follow-up Required`, `Contacted`, `Resolved`).

---

## 3. BUSINESS RULES & ELIGIBILITY AUDIT

1. **Eligibility Rule**:
   - Feedback is allowed ONLY when `Trip.status === "COMPLETED"`.
   - If `Trip.status` is `DRAFT`, `PLANNING`, `QUOTED`, `BOOKED`, `ONGOING`, or `CANCELLED`, the server MUST reject submission with a 400 error.
2. **Authoritative Resolution**:
   - Client-provided `agencyId`, `customerId`, or `tripId` MUST NOT be trusted.
   - The server derives all identities solely from the validated `secureToken`.
3. **Duplicate Prevention & Idempotency**:
   - Check if `CustomerFeedback` already exists for the resolved `customerId` and `tripId`.
   - If it exists, update the existing record (or return existing) without generating duplicate records.
4. **Service Recovery Automation**:
   - `rating <= 3` -> `serviceRecoveryStatus = "Follow-up Required"`.
   - `rating >= 4` -> `serviceRecoveryStatus = "Not Needed"`.
5. **Operational Audit Event**:
   - When feedback is submitted and `TripOperation` exists, create `OperationEvent` (`eventType: "CUSTOMER_FEEDBACK"`).

---

## 4. IMPLEMENTATION PLAN SUMMARY

1. **Validation Schema**:
   - Extend `src/lib/validation/feedback-schema.ts` with `customerPublicFeedbackSchema`.
2. **Service Layer**:
   - Add `getPublicFeedbackStatus(token)` and `submitPublicFeedback(token, input)` in `src/lib/services/feedback-service.ts`.
3. **REST API Endpoints**:
   - Create `src/app/api/trips/public/[token]/feedback/route.ts` supporting `GET` (check status/existing review) and `POST` (submit review).
4. **Client API SDK**:
   - Add `getFeedback(token)` and `submitFeedback(token, data)` to `tripPublicClient` in `src/lib/api-client/public-client.ts`.
5. **UI Enhancement**:
   - Update `src/app/trip/[secureToken]/page.tsx` with a mobile-first, accessible Post-Trip Feedback card and interactive review modal/form when `isCompleted` is true.
6. **Automated Testing & Regression**:
   - Create `prisma/test-phase21e-feedback.ts` testing all 9 requirement groups.
   - Run regression suites (21-D, 21-C, 21-B, 18, 12, `tsc`, `npm run build`).
   - Conduct real browser QA on `/trip/[secureToken]`.
