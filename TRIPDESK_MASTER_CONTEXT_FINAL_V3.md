# TRIPDESK — MASTER PROJECT CONTEXT FINAL V3
## CURRENT AUTHORITATIVE HANDOFF — SEPTEMBER 2026

> **Document Version:** V3 — FINAL HANDOFF AUDITED THROUGH DEV-05 QA PREPARATION
>
> **Important:** Sections **98 onward** are the authoritative current-state update layer and supersede any earlier section that conflicts with them. Older sections are intentionally retained as historical reference so project history is not lost.

> **IMPORTANT:** This V2 document is based on the uploaded `TRIPDESK_MASTER_CONTEXT_FINAL.md` plus the subsequent TripDesk development/QA decisions and implementation state available in the current conversation.
>
> **Supersession rule:** Sections 98 onward are the authoritative V3 update layer. If any earlier section says Subscription V2, DEV-01, DEV-02, DEV-03, DEV-04, or related work is planned/pending, or otherwise conflicts with Sections 98+, the later V3 section wins. The older sections are retained below so historical context is not lost.
>
> **Source-of-truth priority:** actual current codebase > FINAL decisions in this document > latest confirmed discussion > older discussion > ideas/examples.
>
> **Do not restart TripDesk. Continue from the current codebase and accepted QA baseline.**

---

# 61. V2 CURRENT STATE — EXECUTIVE SNAPSHOT

## 61.1 Current Product

TripDesk is a multi-tenant Travel Agency SaaS / Travel Agency Operating System built for travel agencies.

Current production-like architecture:

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL on Supabase
- Prisma 7
- Supabase Auth
- `@supabase/supabase-js`
- `@supabase/ssr`
- SSR cookie/session handling
- server-side service layer
- Zod validation
- multi-tenant `agencyId` isolation
- Tailwind/UI component system
- PDFKit for document generation
- structured production logging

## 61.2 Current Internal Roles — FINAL

Exactly two internal authenticated roles exist:

1. `PLATFORM_OWNER`
2. `AGENCY_OWNER`

Customer is NOT an internal role.

There must be no reintroduction of:

- Travel Agent
- Sales Agent
- Sub-Agent
- Customer `User`
- Customer Supabase Auth account

## 61.3 Customer Architecture — FINAL

Customer is a business/customer record.

Customer:

- exists in `Customer`
- belongs to an agency
- can access customer-facing information through secure public token routes
- is not an internal `User`
- has no password in TripDesk's database
- has no customer role
- has no customer signup flow

Preserve:

- `/customer/*`
- `/api/customer/*`
- `/q/*`
- `/trip/*`
- `/b/*`

The `/customer/login` experience is a guest-access gateway, not customer account authentication.

The customer portal uses booking/reference/token verification and a temporary HTTP-only `tripdesk_customer_session` cookie where applicable.

---

# 62. IMPORTANT CURRENT CHANGE: SUBSCRIPTION V2 IS IMPLEMENTED

The previous V1 master context said Subscription V2 was only planned. That is now obsolete.

## 62.1 Current Status

**Subscription V2 / Beta Subscription Management: IMPLEMENTED + VERIFIED**

The implementation was completed against the existing Phase 21-B subscription architecture.

It was not replaced with a second subscription architecture.

## 62.2 Verified capabilities

The current implementation includes the agreed beta subscription lifecycle:

- automatic 7-day free trial
- dynamic plan catalog from PostgreSQL / `SubscriptionPlan`
- Monthly billing cycle
- Yearly billing cycle
- plan selection
- manual UPI / bank payment flow
- UTR / transaction-reference submission
- payment verification state
- Platform Owner approval
- Platform Owner rejection
- rejection reason handling
- paid-plan activation only after approval
- plan configuration management
- plan activation/deactivation behavior
- historical purchased-price protection
- tenant isolation
- subscription lifecycle handling
- responsive Subscription UI
- regression testing

## 62.3 Subscription V2 test state

A dedicated lifecycle + tenant-isolation validation set reported:

- **46 automated lifecycle / tenant-isolation tests**
- **118 automated assertions**
- **100% passed**

The implementation also went through the later beta-hardening regression process.

At the end of the accepted beta-hardening baseline:

- TypeScript check: PASS
- production build: PASS
- subscription regression: PASS
- tenant isolation: PASS

## 62.4 Historical TypeScript issue

During Subscription V2 work there was one low-risk TypeScript typing gap:

- file: `src/lib/services/subscription-service.ts`
- interface: `AgencySubscriptionOverview`
- missing property: `availablePlans`

This caused `npx tsc --noEmit` to fail at that intermediate point.

**Current status: FIXED.**

Later beta-hardening verification reported TypeScript passing.

Do not reintroduce this omission.

## 62.5 Subscription business rules — FINAL

### New agency

```text
Signup
  ↓
Supabase Auth user
  ↓
Agency
  ↓
AGENCY_OWNER User
  ↓
7-day TRIAL Subscription
  ↓
Dashboard
```

No paid plan is required during signup.

### Trial

- duration = 7 days
- `trialStart` recorded
- `trialEnd` recorded
- status = `TRIAL`
- paid plans visible from Day 1
- agency may purchase before trial ends
- trial is not replaced merely by selecting a plan

### Paid purchase

```text
TRIAL
  ↓
Subscription page
  ↓
Choose plan
  ↓
Choose Monthly / Yearly
  ↓
Confirm price
  ↓
UPI / Bank Transfer
  ↓
Enter UTR
  ↓
Submit
  ↓
PENDING
  ↓
Platform Owner review
  ├── APPROVE → ACTIVE paid subscription
  └── REJECT → rejected state + reason / resubmission path
```

### Activation rule

**Selecting a plan does not activate it.**

Only approved payment activates the paid subscription.

### Historical price rule

If a plan price changes later, existing purchased subscriptions/payments retain the original purchased amount.

Example:

```text
Purchased at ₹49,999
Later plan price = ₹59,999

Historical purchase remains ₹49,999.
```

### Plan deletion

Referenced plans must not be hard-deleted.

Use active/inactive/deactivated behavior.

### Beta payment rules

Do not introduce:

- Stripe recurring billing
- Razorpay recurring billing
- automatic gateway billing
- automatic proration
- automatic refund/proration engine

Manual UPI/bank + UTR + Platform Owner verification remains the beta model.

---

# 63. BETA HARDENING — COMPLETED BASELINE

The project subsequently moved through a dedicated beta-hardening program.

## 63.1 Hardening phases

```text
BH-00  Baseline & Scope Freeze              CLOSED
BH-01  Full Functional Regression           CLOSED
BH-02  Edge & Error Hardening               CLOSED — PASS WITH CONDITIONS
BH-03  Performance & Network Hardening      CLOSED — PASS WITH CONDITIONS
BH-04  UI / Responsive / Browser Hardening  CLOSED — PASS WITH CONDITIONS
BH-05  Data Integrity Track                 CLOSED — PASS
BH-06  Production Readiness Track           CLOSED — PASS WITH CONDITIONS
BH-07  Final Beta Readiness Audit           CLOSED — CONDITIONAL GO
```

## 63.2 BH-00 — Baseline & Scope Freeze

Purpose:

- freeze the accepted product baseline
- prevent scope drift
- establish the current code/feature/security baseline

Status:

**CLOSED**

## 63.3 BH-01 — Full Functional Regression

Purpose:

- verify existing business modules after the Phase 21 feature set and Subscription V2 work
- catch regressions before release

Status:

**CLOSED**

## 63.4 BH-02 — Edge & Error Hardening

Status:

**CLOSED — PASS WITH CONDITIONS**

The phase focused on:

- edge cases
- invalid inputs
- error handling
- business-rule boundaries
- public access edge cases
- customer flows

### BH-02B accepted fix

Issue:

**Customer portal booking-number lookup could collide across agencies.**

Affected file:

`src/lib/services/customer-portal-service.ts`

The accepted implementation changed the lookup so candidate bookings are considered with agency-safe customer verification rather than trusting a booking number globally.

Focused verification reported:

- 10/10 focused regression assertions
- 33/33 customer-architecture assertions
- TypeScript/build passing

An accidental revert was detected and the accepted fix was restored and re-QA'd.

Status:

**FIXED + VERIFIED**

Do not revert this protection.

## 63.5 BH-03 — Performance & Network Hardening

Status:

**CLOSED — PASS WITH CONDITIONS**

### Accepted performance fix

Files:

- `src/lib/services/rate-sheet-service.ts`
- `src/lib/services/trip-costing-service.ts`

A batch rate lookup approach was added to reduce repeated rate queries.

Representative query-count improvements:

```text
3 hotels / 2 vehicles / 2 activities:
8 queries → 4

5 hotels / 3 vehicles / 4 activities:
13 queries → 4
```

Targeted verification:

- 24/24 assertions passed
- customer architecture 33/33
- TypeScript/build passed
- tenant isolation passed

No unrelated changes were accepted.

### Important limitation

Historic performance concerns still require real-world monitoring during beta.

Do not assume every performance concern in the old QA-05 audit is permanently solved merely because the hardening phase passed.

## 63.6 BH-04 — UI / Responsive / Browser Hardening

Status:

**CLOSED — PASS WITH CONDITIONS**

Accepted fixes:

1. `/enquiries/new`
   - customer dropdown now presents human-readable customer identity:
     `{customer.name} ({customer.phone}) • {customer.email}`
   - underlying CUID remains the actual submitted value

2. `/quotations/new`
   - markup / discount / tax controls changed from fixed desktop-only `grid-cols-3` behavior to:
     `grid-cols-1 sm:grid-cols-3`

3. `src/components/shared/global-search.tsx`
   - mobile compact icon-only search below 640px

4. `/referrals`
   - customer label presentation aligned with the same resolver/presentation approach

Additional observations such as table-action UX and some feedback empty-state presentation were treated as non-blocking/deferred observations.

## 63.7 BH-04C / BH-04D

These were follow-up verification/closure work.

Status:

**CLOSED**

The accepted UI changes were independently re-verified.

## 63.8 BH-05 — Data Integrity

Status:

**CLOSED — PASS**

Focused on preserving database/business-data integrity during beta hardening.

## 63.9 BH-06 — Production Readiness

Status:

**CLOSED — PASS WITH CONDITIONS**

The application-level readiness work passed, while deployment/operational prerequisites remained outside the code-change scope.

## 63.10 BH-07 — Final Beta Readiness Audit

Status:

**CLOSED — CONDITIONAL GO**

Final result:

- application-level beta readiness audit completed
- no confirmed P0/P1/P2 application blockers
- TypeScript PASS
- production build PASS
- Git baseline preserved
- deployment NOT performed as part of this audit
- beta launch NOT performed as part of this audit
- feature development was not considered complete merely because the application passed the audit

Remaining conditions were operational/deployment prerequisites:

1. hosting environment
2. production environment variables
3. custom domain/DNS/HTTPS
4. Supabase Auth Site URL / Redirect URLs
5. backup/PITR verification
6. SMTP/WhatsApp credentials if those integrations are enabled

Deferred non-blocking items:

- rate limiting
- APM/advanced application monitoring
- middleware → proxy naming migration

These do not justify redesigning the core architecture.

---

# 64. ACCEPTED GIT BASELINE AFTER BETA HARDENING

At the end of the accepted hardening baseline, the following working-tree modifications were explicitly accepted:

```text
 M UPCOMING_FEATURE.md
 M src/app/(dashboard)/enquiries/new/page.tsx
 M src/app/(dashboard)/quotations/new/page.tsx
 M src/app/(dashboard)/referrals/page.tsx
 M src/components/shared/global-search.tsx
 M src/lib/services/customer-portal-service.ts
 M src/lib/services/rate-sheet-service.ts
 M src/lib/services/trip-costing-service.ts
```

These changes must NOT be casually reverted.

`UPCOMING_FEATURE.md` is intentional.

Other files represent accepted QA/hardening fixes.

If the actual current Git state differs, inspect the repository before changing anything.

---

# 65. CURRENT HOTEL / RATE SHEET ARCHITECTURE — VERIFIED

This section supersedes any earlier speculative Room Type design.

## 65.1 Critical final decision

**Do NOT create a standalone `RoomType` model for the current TripDesk architecture.**

There is no current Prisma `RoomType` model.

Do not create:

- `RoomType` table
- `TripRoomType`
- separate Room Types master
- separate Room Types Excel sheet

unless a future explicit product decision changes the architecture.

## 65.2 Current Hotel model

Current verified `Hotel` model:

```prisma
model Hotel {
  id         String    @id @default(cuid())
  agencyId   String
  supplierId String?
  name       String
  category   String?
  address    String?
  city       String?
  state      String?
  country    String?   @default("India")
  phone      String?
  email      String?
  website    String?
  notes      String?
  archivedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  agency     Agency      @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  supplier   Supplier?   @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  tripHotels TripHotel[]
  rateSheets RateSheet[]

  @@index([agencyId])
  @@index([supplierId])
  @@index([agencyId, city])
  @@map("hotels")
}
```

## 65.3 Current TripHotel model

```prisma
model TripHotel {
  id          String    @id @default(cuid())
  tripId      String
  hotelId     String
  checkIn     DateTime
  checkOut    DateTime
  roomType    String
  rooms       Int       @default(1)
  mealPlan    String?
  nightlyRate Decimal?  @db.Decimal(10, 2)
  totalAmount Decimal?  @db.Decimal(10, 2)
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  trip               Trip                @relation(fields: [tripId], references: [id], onDelete: Cascade)
  hotel              Hotel               @relation(fields: [hotelId], references: [id], onDelete: Restrict)
  hotelConfirmations HotelConfirmation[]

  @@index([tripId])
  @@index([hotelId])
  @@map("trip_hotels")
}
```

## 65.4 Current RateSheet model

Current verified RateSheet structure includes:

```prisma
model RateSheet {
  id                 String              @id @default(cuid())
  agencyId           String
  supplierId         String?
  rateSheetNumber    String?
  name               String
  inventoryType      RateInventoryType

  hotelId            String?
  vehicleId          String?
  activityId         String?

  roomType           String?
  mealPlan           String?

  seasonName         String?
  validFrom          DateTime
  validTo            DateTime

  currency            String              @default("INR")
  costPrice           Decimal             @default(0) @db.Decimal(12, 2)
  extraAdultRate      Decimal?            @db.Decimal(12, 2)
  extraChildRate      Decimal?            @db.Decimal(12, 2)

  vehiclePricingType  VehiclePricingType?
  ratePerKm           Decimal?            @db.Decimal(10, 2)
  minimumKm           Decimal?            @db.Decimal(10, 2)
  totalRate           Decimal?            @db.Decimal(12, 2)
  extraKmRate         Decimal?            @db.Decimal(10, 2)
  driverAllowance     Decimal?            @db.Decimal(10, 2)
  nightAllowance      Decimal?            @db.Decimal(10, 2)
  tollIncluded        Boolean             @default(false)
  parkingIncluded     Boolean             @default(false)

  adultCost           Decimal?            @db.Decimal(12, 2)
  childCost           Decimal?            @db.Decimal(12, 2)
  infantCost          Decimal?            @db.Decimal(12, 2)

  taxPercentage       Decimal?            @default(0) @db.Decimal(5, 2)
  priority            Int                 @default(0)
  status              RateStatus          @default(ACTIVE)
  sourceType          String?             @default("MANUAL")
  notes               String?
  internalNotes       String?
  archivedAt          DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  // Agency, Supplier, Hotel, Vehicle and Activity relations exist.
}
```

Important:

- `roomType` is a string
- `mealPlan` is a string
- `hotelId` links the rate to the Hotel master
- `TripHotel.hotelId` links the selected hotel to a trip
- there is no RoomType foreign key

## 65.5 Final conceptual relationship

```text
Hotel Master
    ↓
Hotel
    ↓ hotelId
RateSheet
    ├── roomType (string)
    ├── mealPlan
    ├── seasonName
    ├── validFrom / validTo
    ├── costPrice
    ├── extraAdultRate
    └── extraChildRate
    ↓
Trip creation
    ↓
TripHotel
    ├── hotelId
    ├── roomType
    ├── rooms
    ├── mealPlan
    ├── nightlyRate
    └── totalAmount
```

## 65.6 Occupancy rule

Current RateSheet has:

- `costPrice`
- `extraAdultRate`
- `extraChildRate`

It does NOT currently have explicit:

- base adult occupancy
- base child occupancy
- infant occupancy rules for hotel rates

Do not invent occupancy fields in the Hotel Rate Sheet import unless the database model is explicitly changed.

For the current architecture, `costPrice` represents the base room rate and extra adult/child fields represent additional occupant pricing.

---

# 66. HOTEL EXCEL IMPORT — APPROVED DESIGN, NOT YET IMPLEMENTED

The Hotel/Rate Sheet Excel feature is a new post-hardening development requirement.

Status:

**PROPOSED / APPROVED DIRECTION — NOT IMPLEMENTED**

## 66.1 Required user flow

```text
Download Template
      ↓
Fill Excel
      ↓
Upload .xlsx
      ↓
Validate file format
      ↓
Validate columns
      ↓
Validate rows/data types/business rules
      ↓
Preview changes
      ↓
Confirm Import
      ↓
Create / Update records
```

Never insert an uploaded spreadsheet directly without validation and preview.

Only the supported Excel format should be accepted.

## 66.2 Hotel Excel — final proposed responsibility

One row = one Hotel master record.

Suggested columns:

| Excel column | Current DB mapping |
|---|---|
| Hotel Code | import-only reference unless a DB field is explicitly added |
| Hotel Name | `Hotel.name` |
| Supplier | resolve to `supplierId` |
| Category | `Hotel.category` |
| Address | `Hotel.address` |
| City | `Hotel.city` |
| State | `Hotel.state` |
| Country | `Hotel.country` |
| Phone | `Hotel.phone` |
| Email | `Hotel.email` |
| Website | `Hotel.website` |
| Notes | `Hotel.notes` |

Do NOT add a Status column to the first exact template unless the current code is changed to support it. `Hotel` currently uses `archivedAt`; there is no Hotel `status` field.

## 66.3 Rate Sheet Excel — final proposed responsibility

One row = one hotel rate record.

Suggested columns:

| Excel column | Current DB mapping |
|---|---|
| Hotel Code | resolve to `hotelId` |
| Supplier | resolve to `supplierId` |
| Rate Sheet Number | `rateSheetNumber` |
| Rate Sheet Name | `name` |
| Inventory Type | `inventoryType`, must be HOTEL for this import |
| Room Type | `roomType` |
| Meal Plan | `mealPlan` |
| Season Name | `seasonName` |
| Valid From | `validFrom` |
| Valid To | `validTo` |
| Currency | `currency` |
| Cost Price | `costPrice` |
| Extra Adult Rate | `extraAdultRate` |
| Extra Child Rate | `extraChildRate` |
| Priority | `priority` |
| Notes | `notes` |
| Internal Notes | `internalNotes` |

`sourceType` should be automatically set to an import value such as `EXCEL_IMPORT` rather than being a normal user-entered column, if the current implementation supports that convention.

Vehicle/activity-specific fields are not part of the Hotel Rate Sheet import.

## 66.4 Tax rule

The existing RateSheet schema contains `taxPercentage`, but the product's finalized V1 direction says there is **no tax feature**.

Therefore:

- do not turn tax into a new feature through Excel import
- do not add GST/tax calculations
- do not add tax-specific UI just because a legacy DB field exists

If the current Rate Sheet UI already uses the existing field, inspect actual code before changing it.

## 66.5 Duplicate/update behavior

This still requires explicit implementation design before coding.

Status:

**NOT YET IMPLEMENTED / EXACT DUPLICATE POLICY NOT LOCKED**

The implementation must decide and document:

- how Hotel Code is resolved
- whether Hotel Name + Supplier can identify duplicates
- what happens when the same Hotel already exists
- whether RateSheet duplicates create new historical records or update an existing rate
- how overlapping validity periods are handled
- whether import is create-only, upsert, or explicit create/update per preview row

Do not guess these rules during implementation.

---

# 67. FORM VALIDATION / FORM UX — NEW PENDING REQUIREMENT

This requirement was raised after the certified hardening baseline.

Status:

**PENDING DEVELOPMENT**

## 67.1 Problem

Some forms use Formik/Yup validation but do not consistently display field-level validation errors.

Example discussed:

- `customers/new`

`trips/new` was treated as the desired UX/reference behavior.

## 67.2 Final desired behavior

Every form must:

- validate according to its existing schema
- show field-level errors next to the relevant field
- clearly distinguish touched/invalid fields
- prevent invalid submission
- show submit/loading state
- show server/API errors when applicable
- show a general form-level error when an error cannot be attached to a field
- preserve existing validation rules unless there is a real defect
- use consistent error presentation across the application

Do not weaken validation merely to hide UI problems.

## 67.3 Validation technology

Current architecture includes:

- Formik for form state/interaction where already used
- Yup for existing Formik schemas where already used
- Zod for server/API validation

Do not replace the entire validation architecture with a new library just to solve error rendering.

## 67.4 Planned development phase

Recommended:

**DEV-01 — Form UX Consistency**

Scope:

- audit all existing forms
- compare against `trips/new`
- fix missing Formik error rendering
- standardize error presentation
- preserve schemas/business rules
- test all affected forms

This phase must have its own QA before DEV-02.

---

# 68. TABLE SCROLLING — NEW PENDING REQUIREMENT

Status:

**PENDING DEVELOPMENT**

## Final requirement

When a table contains many rows/columns:

- scrolling should happen inside the table container
- the whole page should not become the primary horizontal/vertical table scroll surface
- table header behavior should remain usable where the current design supports it
- desktop and mobile behavior must be checked
- pagination/filter controls must remain usable
- no layout overflow should escape the intended container

This is a global UX consistency requirement.

Do not blindly apply a single CSS rule to every table. Audit table components/pages and preserve special cases.

Recommended phase:

**DEV-02 — Global UX Improvements**

---

# 69. PASSWORD SHOW / HIDE — NEW PENDING REQUIREMENT

Status:

**PENDING DEVELOPMENT**

## Final requirement

Every password input in the authenticated application should support:

- hidden password by default
- eye/visibility icon
- toggle to show password
- toggle back to hide password
- accessible button/label
- no password value leakage into URLs, logs, or browser-visible API responses

This is a presentation feature only.

## Critical security rule

The request to "show passwords for every agency in the database" was rejected.

**DO NOT store or display plaintext passwords.**

Passwords are managed by Supabase Auth.

TripDesk must never provide:

- plaintext agency passwords
- plaintext password database columns
- Platform Owner password listing
- password recovery by reading an old password

If a future admin feature is required, implement a secure password reset/set-password workflow through the supported authentication system without revealing the previous password.

---

# 70. PAGE SCROLL RESET — NEW PENDING REQUIREMENT

Status:

**PENDING DEVELOPMENT**

## Problem

User scrolls down one page, navigates to another page, and the next page can retain the previous scroll position.

## Final desired behavior

When navigating to a new route/page:

- new page should normally begin at the top
- intentional in-page navigation/anchor behavior should not be broken
- browser back/forward behavior should be considered separately
- do not introduce a hard reload just to reset scroll
- preserve the existing Next.js navigation architecture

Recommended implementation should use a safe global/page navigation scroll strategy rather than `window.location.reload()`.

---

# 71. INVOICE GENERATION — NEW PENDING FEATURE

Status:

**PROPOSED / APPROVED DIRECTION — NOT IMPLEMENTED**

## 71.1 Scope

Start with **Customer Invoice**, not supplier invoice.

Invoice should be tied to a Booking.

Conceptual flow:

```text
Booking
  ↓
Generate Invoice
  ↓
Invoice record
  ↓
PDF generation
  ↓
Download / Share
```

## 71.2 Invoice data

At minimum, design for:

- agency details
- customer details
- trip details
- booking details
- invoice number
- invoice date
- line items
- quantities/rates/amounts
- subtotal
- discount
- total
- amount paid
- balance due
- appropriate status/version information

## 71.3 Financial separation

Customer invoices are separate from:

- `SupplierPayable`
- `SupplierPayment`
- SaaS subscription payments

Do not merge these financial domains.

## 71.4 Tax/GST

Current V1 decision:

**No tax/GST feature.**

Do not introduce GST/tax calculations as part of the first invoice implementation unless a new explicit decision changes the product scope.

The architecture may remain extensible for future tax support.

## 71.5 Generation behavior

Recommended beta behavior:

- user-triggered invoice generation
- not automatic invoice creation on every booking unless explicitly decided later

## 71.6 Still requires design decisions

Before coding, explicitly decide:

- one invoice per booking vs multiple invoices
- revised invoice/versioning behavior
- invoice numbering format
- invoice status values
- whether invoice is visible in the customer portal
- whether invoice can be publicly shared
- whether invoice can be regenerated
- whether invoice is immutable after issue
- whether payment allocation is reflected live or snapshotted

Do not invent these during implementation.

Recommended phase:

**DEV-04 — Invoice System**

---

# 72. DEVELOPMENT ROADMAP — CURRENT

The recommended post-hardening roadmap is now:

```text
BH-07 CONDITIONAL GO BASELINE
        ↓
DEV-01 Form UX Consistency
        ↓
DEV-01 QA
        ↓
DEV-02 Global UX Improvements
        ↓
DEV-02 QA
        ↓
DEV-03 Excel Import Foundation
        ↓
DEV-03 QA
        ↓
DEV-04 Invoice System
        ↓
DEV-04 QA
        ↓
Pre-Beta Deployment / Operational Readiness
        ↓
Controlled Real-Agency Beta
```

## DEV-01

Form validation/error consistency.

## DEV-02

Global UX:

- table container scrolling
- password visibility
- page scroll reset
- related consistency fixes discovered during audit

## DEV-03

Excel:

- Hotel template
- Hotel import
- Rate Sheet template
- Rate Sheet import
- validation
- preview
- safe create/update behavior
- import QA

## DEV-04

Customer invoice:

- schema
- service
- API
- UI
- PDF
- numbering
- payment/balance
- share/download
- security
- QA

---

# 73. COMPLETE CURRENT DATABASE MODEL INVENTORY

The current database is a **45-model Prisma/PostgreSQL schema**.

The following model inventory is the current authoritative model set from the project state available in this conversation:

1. `Agency`
2. `User`
3. `SubscriptionPlan`
4. `Subscription`
5. `SubscriptionPayment`
6. `Customer`
7. `Trip`
8. `Traveler`
9. `Hotel`
10. `TripHotel`
11. `ItineraryItem`
12. `Vehicle`
13. `TripVehicle`
14. `Activity`
15. `TripActivity`
16. `Quotation`
17. `QuotationItem`
18. `QuotationProposalItem`
19. `QuotationPaymentMilestone`
20. `QuotationPackageOption`
21. `Booking`
22. `Payment`
23. `PublicShareLink`
24. `Enquiry`
25. `EnquiryFollowUp`
26. `Supplier`
27. `RateSheet`
28. `TripOperation`
29. `HotelConfirmation`
30. `VehicleDispatch`
31. `ActivityConfirmation`
32. `OperationalIssue`
33. `OperationEvent`
34. `SupplierPayable`
35. `SupplierPayment`
36. `OperationalExpense`
37. `CustomerFeedback`
38. `Referral`
39. `CustomerNotification`
40. `CustomerNotificationPreference`
41. `AgencyCommunicationSetting`
42. `TravelDocument`
43. `PlatformAuditLog`
44. `PlatformAnnouncement`
45. `PlatformSetting`

### Important note

The exact live Prisma schema remains code-authoritative. If the repository contains a model-name difference from a historic report, inspect `prisma/schema.prisma` before modifying it.

**No standalone `RoomType` model exists in the accepted current architecture.**

---

# 74. IMPORTANT DATABASE RELATIONSHIPS / CONSTRAINTS

## Tenant

Tenant business records are scoped by `agencyId`.

32 models are directly tenant-owned, 9 are parent-derived, 4 are global/platform-level, and there are no intentionally ambiguous tenant ownership models in the accepted audit result.

## User

- Supabase Auth UUID = Prisma `User.id`
- Agency Owner has non-null `agencyId`
- Platform Owner has `agencyId = null`

## Customer

- Customer belongs to Agency
- Customer is not a User

## Trip

- Trip belongs to Agency
- Trip is associated with Customer according to the current schema
- travelers/itinerary/inventory records connect to Trip

## Hotel

- Hotel belongs to Agency
- optional Supplier
- Hotel has many `TripHotel`
- Hotel has many `RateSheet`

## TripHotel

- Trip → Hotel
- contains selected room type as string
- contains meal plan
- stores trip-specific rate/amount

## RateSheet

- Agency-owned
- optional Supplier
- optional Hotel / Vehicle / Activity depending on `inventoryType`
- Hotel rate records use `hotelId`
- `roomType` is string
- `mealPlan` is string

## Quotation

- Agency-scoped
- quotation items/options/milestones
- public proposal access through secure sharing infrastructure

## Booking

- Agency-scoped
- connects Customer, Trip and optionally Quotation
- connects payments and operational workflow

## Communication

Important invariant:

```text
@@unique([agencyId, idempotencyKey])
```

or its equivalent current schema constraint must remain.

Do not remove deterministic communication idempotency.

## Important unique constraints

Known:

```text
Trip:
@@unique([agencyId, tripNumber])

Quotation:
@@unique([agencyId, quotationNumber, version])

Booking:
@@unique([agencyId, bookingNumber])

Enquiry:
@@unique([agencyId, enquiryNumber])

Referral:
@@unique([agencyId, referralCode])

CustomerNotification:
@@unique([agencyId, idempotencyKey])

TravelDocument:
@@unique([agencyId, documentNumber, version])

PublicShareLink:
tokenHash globally unique

User:
email globally unique
```

## Important indexes

Known high-value indexes include:

```text
Hotel:
@@index([agencyId])
@@index([supplierId])
@@index([agencyId, city])

TripHotel:
@@index([tripId])
@@index([hotelId])

RateSheet:
@@index([agencyId])
@@index([supplierId])
@@index([hotelId])
@@index([vehicleId])
@@index([activityId])
@@index([agencyId, inventoryType])
@@index([agencyId, status])
@@index([agencyId, validFrom, validTo])
```

Inspect the actual schema before adding duplicate indexes.

---

# 75. AUTHENTICATION / AUTHORIZATION — CURRENT

## Authentication

Supabase Auth.

Installed/used:

- `@supabase/supabase-js`
- `@supabase/ssr`

SSR cookies are used for session handling.

## Identity mapping

```text
Supabase Auth user.id
        =
Prisma User.id
```

This mapping is a critical invariant.

## Server-side guards

Important file:

`src/lib/auth/index.ts`

Known guards:

- `getCurrentUser`
- `requireAuth`
- `requirePlatformOwner`
- `requireAgencyOwner`

Tenant context must be derived server-side.

Never trust a client-supplied `agencyId`.

## Signup

`/signup`

Creates:

- Supabase Auth user
- Agency
- Prisma User with `AGENCY_OWNER`
- Trial Subscription

The operation is intended to be atomic at the application/database level.

## Login

`/login`

Uses Supabase `signInWithPassword`.

Then:

```text
PLATFORM_OWNER → /admin
AGENCY_OWNER   → /dashboard
```

## Email verification

Disabled for V1.

Do not silently enable it during unrelated feature development.

---

# 76. SECURITY BASELINE — CURRENT

The latest security posture remains a hard invariant.

## Database / Supabase

Latest accepted security work established:

- RLS enabled on all 46 public tables in the relevant security audit
- direct PostgREST business-data access blocked
- direct `anon` / `authenticated` table/sequence/routine privileges revoked
- browser `/rest/v1/*` business calls = 0
- browser `/auth/v1/*` is used for authentication
- Prisma → PostgreSQL direct access remains

Do not call PostgreSQL `postgres` a superuser in documentation. In this architecture it is the application database role/table owner with `BYPASSRLS`.

## Tenant isolation

Server-enforced.

Agency Owner:

- sees only own agency data
- cannot choose another agency by manipulating client data

## IDOR

No confirmed Critical/High IDOR issue remains from the audited baseline.

## Public security

Public token routes must:

- resolve identity server-side
- validate token/reference safely
- never trust client-provided agency/customer/trip identifiers
- expose only customer-safe information

## Commercial privacy

Never expose publicly:

- `supplierCost`
- `buyPrice`
- `grossProfit`
- `grossMargin`
- `supplierPayable`
- `internalNotes`

## Secrets

Never expose:

- database URLs
- service-role keys
- cron secrets
- API secrets
- passwords

## Passwords

Never store/display plaintext passwords.

---

# 77. ROUTE INVENTORY — CURRENT RECOVERABLE MAP

## Public/auth

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`

## Public secure-token routes

- `/q/*` — quotation/proposal access
- `/trip/*` — customer trip portal
- `/b/*` — public booking access
- `/customer/*` — guest customer portal/access

## Agency protected

- `/dashboard`
- `/customers/*`
- `/enquiries/*`
- `/suppliers/*`
- `/trips/*`
- `/hotels/*`
- `/quotations/*`
- `/bookings/*`
- `/payments/*`
- `/operations/*`
- `/documents/*`
- `/feedback/*`
- `/referrals/*`
- `/customer-insights/*`
- `/reports/*`
- `/communications/*`
- `/settings`
- `/subscription`

## Platform Owner

- `/admin`
- `/admin/agencies`
- `/admin/agencies/[agencyId]`
- `/admin/subscriptions`
- `/admin/plans`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/announcements`
- `/admin/settings`
- existing admin payment/subscription management routes from Phase 21-B

## API

Important API families include:

- `/api/customer/*`
- `/api/trips/public/[token]/*`
- `/api/suppliers/check-duplicate`
- `/api/suppliers/[id]/reactivate`
- `/api/feedback`
- `/api/feedback/[id]`
- `/api/customer-insights`
- `/api/reports`
- `/api/reports/export`
- `/api/reports/pdf`
- `/api/communications`
- `/api/communications/[id]`
- `/api/trips/public/[token]/notifications`
- `/api/trips/public/[token]/notifications/[id]/read`
- `/api/admin/subscription-payments`
- `/api/admin/subscription-payments/[id]`
- communication automation endpoints
- subscription APIs as implemented by the current repository

If an exact endpoint is uncertain, inspect the current repository instead of inventing one.

---

# 78. COMPLETE BUSINESS FLOW MAP

```text
PUBLIC WEBSITE
    ↓
SIGNUP
    ↓
AGENCY + AGENCY OWNER
    ↓
7-DAY FREE TRIAL
    ↓
DASHBOARD
    ↓
CUSTOMER
    ↓
ENQUIRY
    ↓
FOLLOW-UP / CRM
    ↓
TRIP + ITINERARY + COSTING
    ↓
HOTEL / VEHICLE / ACTIVITY
    ↓
QUOTATION
    ↓
PUBLIC PROPOSAL
    ↓
BOOKING
    ↓
CUSTOMER PAYMENTS
    ↓
SUPPLIER PAYABLES / PAYMENTS
    ↓
OPERATIONS
    ↓
TRAVEL DOCUMENTS
    ↓
CUSTOMER PORTAL
    ↓
NOTIFICATIONS
    ↓
TRIP COMPLETION
    ↓
FEEDBACK
    ↓
REPORTS / INSIGHTS
```

SaaS subscription is a separate financial domain:

```text
TRIAL
 ↓
PLAN SELECTION
 ↓
MONTHLY / YEARLY
 ↓
MANUAL PAYMENT
 ↓
UTR
 ↓
PLATFORM OWNER VERIFICATION
 ↓
ACTIVE PAID SUBSCRIPTION
```

---

# 79. QA HISTORY — AUTHORITATIVE CURRENT VIEW

## QA-01 — Authentication

**Status: COMPLETE**

Covered:

- signup
- login
- logout/session
- Supabase identity mapping
- password/reset
- role routing

## QA-02 — Authorization / Routing

**Status: COMPLETE**

Covered:

- role separation
- protected routes
- public bypasses
- redirects
- Platform Owner restrictions

## QA-03 — Functional Modules

**Status: COMPLETE**

Exact historical module-level report is not fully recoverable; do not invent details.

## QA-04 — Full Journey / UX / Security

**Status: COMPLETE**

Known issues fixed:

- public quotation commercial-data leak
- customer duplicate-detection weakness

Antigravity reported four total findings, but only two are independently recoverable with confidence. Do not invent the other two.

## QA-05 — Performance / API / Database

**Status: COMPLETE AS AUDIT**

Historic focus:

- API counts
- duplicate calls
- `/api/auth/me`
- Server vs Client Components
- `useEffect`
- rerenders
- `router.refresh()`
- hard navigation
- Prisma performance
- N+1
- indexes
- dashboard speed

Important:

Historic concerns require revalidation in beta.

## QA-05B — Real Browser Performance / Network

**Status: COMPLETE**

## QA-06A — UI/UX Responsive Read-Only

**Status: COMPLETE**

## QA-06B — UI/UX Follow-up

**Status: COMPLETE / HISTORICAL**

## QA-07A — Deep Security / Multi-Tenant Isolation

**Status: COMPLETE**

Reported:

- zero Critical/High vulnerabilities
- server-enforced tenancy
- sanitized public proposals
- cross-tenant isolation

---

# 80. PHASE 21 CERTIFICATION HISTORY

## Phase 21-B — SaaS Billing

Historically:

- 32/32 passed

Implemented:

- `SubscriptionPayment`
- status lifecycle
- payment requests
- verification/rejection
- activation workflow
- audit logging
- live admin payment UI

## Phase 21-C — Persistence / Mock Cleanup

Historically:

- 36/36 passed

Implemented:

- Feedback persistence
- Referral persistence
- Customer Insights persistence
- removed legacy `ExperienceProvider` after consumers were eliminated

## Phase 21-D — Agency BI / Reports

Historically:

- test count evolved from 47 to 59 as tests expanded
- use current repository result as authoritative

Implemented:

- reporting service
- validation
- reports API
- CSV/PDF export
- live reports UI
- tenant scoping
- CSV formula-injection protection

## Phase 21-E — Customer Portal Feedback

Implemented:

- completed-trip eligibility
- token-scoped resolution
- idempotent feedback update
- low-rating service recovery
- public feedback API
- customer trip portal feedback UI

## Phase 21-F — Communication Center

Historically:

- 47/47 automated assertions
- 28/28 browser scenarios
- 0 failed
- 0 blocked
- desktop/tablet/mobile tested
- 0 application console errors
- 0 hydration errors
- no duplicate request loops observed
- no P0/P1/P2 defects reported

Implemented:

- communication center
- notification tray
- notification APIs
- deterministic idempotency
- token-scoped public notifications

External SMS/WhatsApp provider delivery was simulated unless actual provider credentials/configuration are present. Do not claim live provider delivery without evidence.

---

# 81. PERFORMANCE CURRENT STATE

Accepted optimization:

- batch rate lookup in `rate-sheet-service.ts`
- trip costing refactor in `trip-costing-service.ts`

Representative reduction:

```text
8 → 4 queries
13 → 4 queries
```

Current rule:

- avoid N+1
- avoid unnecessary client components
- avoid duplicate fetches
- avoid unnecessary `router.refresh()`
- avoid unnecessary hard navigation
- select only needed Prisma fields where practical
- keep server-side business logic server-side

However:

**Performance is not considered permanently "done."**

Real beta data volumes can reveal new bottlenecks.

---

# 82. FRONTEND ARCHITECTURE — CURRENT

## Server Components

Use for:

- initial page data
- secure server-side data retrieval
- business logic orchestration where practical

## Client Components

Use where interaction requires them:

- forms
- modals
- filters
- toggles
- drawers
- popovers
- interactive tables/components

Avoid unnecessary `"use client"`.

## API

Next.js Route Handlers + service layer + Zod validation.

Do not bypass services unnecessarily.

## Forms

Existing architecture includes Formik/Yup in applicable forms.

Server/API validation uses Zod where established.

## UI

Tailwind and the project's existing UI component system.

Preserve established visual conventions.

---

# 83. CURRENT UI/UX REQUIREMENTS

The following are now explicit beta UX requirements:

1. validation errors visible on every form
2. consistent field-level error presentation
3. consistent submit/loading behavior
4. tables scroll within their intended container
5. password fields have show/hide visibility controls
6. new pages reset to top on navigation
7. responsive layouts
8. no fake/static business values
9. no `NaN`
10. no `undefined` presented as user-facing values
11. clear loading states
12. clear empty states
13. clear error states
14. mobile-safe controls
15. no unnecessary full-page refresh

---

# 84. CURRENT IMPLEMENTATION VS PENDING MATRIX

| Area | Current Status |
|---|---|
| Core authentication | IMPLEMENTED + VERIFIED |
| Two-role RBAC | IMPLEMENTED + VERIFIED |
| Multi-tenancy | IMPLEMENTED + VERIFIED |
| Customer guest/token architecture | IMPLEMENTED + VERIFIED |
| Customer duplicate detection | FIXED + VERIFIED |
| Public quotation redaction | FIXED + VERIFIED |
| Subscription V2 | IMPLEMENTED + VERIFIED |
| Subscription lifecycle tests | 46 tests / 118 assertions passed |
| Beta hardening BH-00 to BH-07 | COMPLETE |
| Hotel master | IMPLEMENTED |
| RateSheet | IMPLEMENTED |
| Standalone RoomType model | REJECTED / NOT IMPLEMENTED |
| Hotel Excel template/import | PROPOSED — NOT IMPLEMENTED |
| RateSheet Excel template/import | PROPOSED — NOT IMPLEMENTED |
| Form validation UI consistency | PENDING |
| Table container scrolling | PENDING |
| Password show/hide | PENDING |
| Plaintext password display | REJECTED |
| Page scroll reset | PENDING |
| Customer Invoice | PROPOSED — NOT IMPLEMENTED |
| Automatic Stripe/Razorpay billing | REJECTED/DEFERRED |
| Tax/GST engine | DEFERRED |
| AI assistant | FUTURE |
| Mobile-native app | FUTURE |
| Flight booking | REMOVED |
| Visa assistance | REMOVED |
| New internal roles | REMOVED |

---

# 85. BUG / ISSUE REGISTER

## FIXED

### Customer booking cross-agency collision

File:

`src/lib/services/customer-portal-service.ts`

Status:

**FIXED + VERIFIED**

### Public quotation commercial-data exposure

Status:

**FIXED + VERIFIED**

Sensitive supplier/agency-private fields are redacted from public payloads.

### Customer duplicate detection

Status:

**FIXED + VERIFIED**

### Rate-costing N+1 style query behavior

Files:

- `src/lib/services/rate-sheet-service.ts`
- `src/lib/services/trip-costing-service.ts`

Status:

**FIXED + VERIFIED**

### Subscription `availablePlans` TypeScript gap

File:

`src/lib/services/subscription-service.ts`

Status:

**FIXED**

## DEFERRED / NON-BLOCKING

- rate limiting
- APM
- middleware → proxy naming migration
- some table-action UX observations
- some feedback empty-state observations

## OPEN / PENDING DEVELOPMENT

- consistent Formik validation error display
- table internal scrolling
- password show/hide controls
- global page scroll reset
- Hotel Excel import
- Rate Sheet Excel import
- customer invoice system
- final deployment configuration
- real-world beta monitoring

---

# 86. DEPLOYMENT / RELEASE STATE

BH-07 reached:

**CONDITIONAL GO**

This does NOT mean TripDesk has been launched publicly.

At the end of the audit:

- deployment was not performed as part of BH-07
- controlled beta launch was not performed
- production environment configuration still needs verification

Before real agencies are onboarded, verify:

1. hosting
2. production environment variables
3. domain/DNS/HTTPS
4. Supabase Auth Site URL
5. Supabase Auth Redirect URLs
6. database backup/PITR
7. SMTP if needed
8. WhatsApp/SMS credentials/webhooks if enabled
9. operational monitoring

---

# 87. BUSINESS RULES — NON-NEGOTIABLE

1. Exactly two internal roles.
2. Customer is not an internal user.
3. Platform Owner is global and has `agencyId = null`.
4. Agency Owner belongs to one agency.
5. Tenant identity is derived server-side.
6. Client-supplied `agencyId` is never trusted.
7. Public customer access is token-scoped.
8. Public data is customer-safe.
9. Supplier cost/margin/internal notes never leak publicly.
10. New agency receives a 7-day trial.
11. Paid plan is not required at signup.
12. Paid plans are visible from Day 1.
13. Paid plans support Monthly and Yearly.
14. Manual UPI/bank + UTR is the beta payment method.
15. Platform Owner approves/rejects paid subscription requests.
16. Plan selection alone does not activate a subscription.
17. Historical purchased price must remain immutable.
18. Referenced plans must not be hard-deleted.
19. SaaS subscription payments are separate from customer travel payments.
20. Supplier payables are separate from customer invoices.
21. No tax/GST feature is part of the current V1 invoice scope.
22. No standalone RoomType model in the current architecture.
23. Hotel master contains hotel-level information.
24. RateSheet contains hotel room/meal/rate/validity information.
25. Do not duplicate hotel-level data unnecessarily in RateSheet.
26. Do not store plaintext passwords.
27. Do not create customer authentication.
28. Do not add removed roles.
29. Do not perform destructive database resets.
30. Do not replace existing subscription architecture with a duplicate system.
31. Preserve communication idempotency.
32. Preserve public token security.
33. Preserve tenant isolation.

---

# 88. FEATURES / DECISIONS THAT MUST NOT BE REINTRODUCED

## REJECTED / REMOVED

- Travel Agent role
- Sales Agent role
- Sub-Agent role
- internal Customer role
- Customer Supabase Auth account
- Customer password
- customer signup
- visa assistance
- flight booking module
- plaintext agency/customer passwords
- password listing in admin
- separate RoomType database model for current V1
- separate Room Types Excel sheet

## DEFERRED / FUTURE

- Stripe/Razorpay automatic recurring billing
- complex payment gateway automation
- proration
- usage-based billing
- coupons
- advanced SaaS tax/GST engine
- live multi-currency forex engine
- airline/GDS
- AI assistant
- broad automation platform
- mass marketing automation
- mobile-native app
- advanced team-seat billing
- enterprise integrations

## DO NOT SILENTLY ADD

Do not convert an approved beta enhancement into a larger architecture rewrite.

---

# 89. DEVELOPMENT RULES FOR THE NEXT CHAT

The next AI/developer must:

1. Read this entire master context before coding.
2. Inspect actual current code before changing anything.
3. Treat current code as the ultimate implementation authority.
4. Preserve final business decisions.
5. Never resurrect removed roles/features.
6. Never invent a database model when an existing model is sufficient.
7. Do not introduce `RoomType` as a new model for the current Hotel/RateSheet design.
8. Preserve Hotel Master vs RateSheet responsibility separation.
9. Preserve server-side tenant enforcement.
10. Preserve Supabase Auth ↔ Prisma UUID mapping.
11. Preserve Platform Owner `agencyId = null`.
12. Preserve public token security.
13. Preserve commercial-data redaction.
14. Preserve financial-domain separation.
15. Extend existing Phase 21-B subscription architecture.
16. Do not create duplicate subscription models/services.
17. Do not store/display plaintext passwords.
18. Use minimal, targeted changes.
19. Avoid unrelated refactors.
20. Verify existing service/API conventions before creating new ones.
21. Keep validation consistent.
22. Every form must visibly render validation errors.
23. Test responsive behavior.
24. Test table scrolling with realistic data volume.
25. Test password visibility without leaking secrets.
26. Test navigation scroll behavior without hard reloads.
27. Validate Excel files before import.
28. Never insert spreadsheet data without preview/confirmation.
29. Do not invent unresolved duplicate/update semantics for imports.
30. Keep invoice financial logic separate from supplier/SaaS payment logic.
31. Run TypeScript and production build after meaningful changes.
32. Run targeted tests for the changed module.
33. Run regression tests for affected shared/security areas.
34. Use browser QA for UI changes.
35. Stop and report if a proposed change requires architecture/business-rule modification.

---

# 90. SOURCE OF TRUTH FOR HOTEL / RATE SHEET DEVELOPMENT

For Hotel and Rate Sheet work, use this exact hierarchy:

```text
Current prisma/schema.prisma
        ↓
Current Hotel / RateSheet services
        ↓
Current Hotel / RateSheet UI
        ↓
This Master Context
        ↓
Earlier discussions
```

Do not create fields solely because they appeared in an old proposed Excel design.

---

# 91. CURRENT TEST / BUILD SNAPSHOT

Known verified results include:

### Subscription V2

- 46 lifecycle/tenant-isolation tests
- 118 assertions
- 100% passed

### BH-02B

- 10/10 focused regression
- 33/33 customer architecture

### BH-03B

- 24/24 targeted assertions
- customer architecture 33/33
- tenant isolation PASS
- TypeScript/build PASS

### Phase 21-F

- 47/47 automated communications assertions
- 28/28 browser scenarios
- 0 failed
- 0 blocked
- 0 application console errors
- 0 hydration errors
- no duplicate request loops observed

### BH-07

- TypeScript PASS
- production build PASS
- no P0/P1/P2 application blockers confirmed
- CONDITIONAL GO

Historical test counts from earlier phases remain useful evidence, but the current repository's test output is authoritative whenever counts have evolved.

---

# 92. CURRENT PROJECT STATUS DASHBOARD

## COMPLETED

- core architecture
- authentication
- authorization
- two-role RBAC
- multi-tenancy
- customer guest portal architecture
- customers
- enquiries/CRM
- suppliers
- hotels
- vehicles
- activities
- RateSheet
- trips
- itinerary
- costing
- quotations
- public proposals
- bookings
- customer payments
- supplier payables/payments
- operations
- documents/vouchers
- dashboard/analytics
- Platform Owner admin
- reports
- feedback
- referrals
- customer insights
- communication center
- customer notifications
- Subscription V2
- beta hardening BH-00 → BH-07

## IMPLEMENTED + VERIFIED

- Subscription V2 lifecycle
- tenant isolation
- customer duplicate protection
- public quotation redaction
- rate lookup performance remediation
- accepted responsive/UI fixes
- TypeScript/build at BH-07

## APPROVED BUT NOT IMPLEMENTED

- DEV-01 form error consistency
- DEV-02 table scrolling
- DEV-02 password visibility
- DEV-02 page scroll reset
- DEV-03 Hotel Excel import
- DEV-03 Rate Sheet Excel import
- DEV-04 customer invoice

## OPEN / OPERATIONAL

- deployment configuration
- production domain/DNS/HTTPS
- Supabase Auth redirect configuration
- backup/PITR verification
- integration credentials if enabled
- beta monitoring

## FUTURE

- AI
- deeper automation
- live payment gateway automation
- multi-currency
- enterprise integrations
- mobile-native app

---

# 93. EXACT CURRENT DEVELOPMENT STOPPING POINT

The project is **NOT** stopped at the old "Subscription V2 planned" state.

The current state is:

```text
Phase 21-F
   ↓
Subscription V2
   ↓
BH-00
   ↓
BH-01
   ↓
BH-02 / BH-02B
   ↓
BH-03 / BH-03B
   ↓
BH-04 / BH-04C / BH-04D
   ↓
BH-05
   ↓
BH-06
   ↓
BH-07
   ↓
CURRENT ACCEPTED BETA-HARDENED BASELINE
   ↓
NEXT: DEV-01
```

## Immediate next development task

**DEV-01 — Form UX Consistency**

Before writing code:

1. audit all Formik forms
2. identify fields where validation exists but errors are not rendered
3. use `trips/new` as the reference UX
4. preserve existing schemas
5. implement consistent error presentation
6. test all affected forms
7. run TypeScript/build
8. perform browser QA
9. stop and report before moving to DEV-02

---

# 94. NEW CHAT — START HERE

You are continuing an existing TripDesk project.

Do NOT restart architecture or redesign the product.

TripDesk is a multi-tenant Travel Agency SaaS / Travel Agency Operating System using:

- Next.js 16
- React 19
- TypeScript
- PostgreSQL/Supabase
- Prisma 7
- Supabase Auth + SSR cookies
- service-layer backend
- Zod
- Tailwind/UI
- PDFKit

There are exactly two internal roles:

- `PLATFORM_OWNER`
- `AGENCY_OWNER`

Customer is an external business record using secure token-based public access. Customer is not a `User`, not an auth role, and must never be converted into one.

The current database has 45 models. The Hotel architecture is:

```text
Hotel
  ↓
RateSheet
  ├─ roomType string
  ├─ mealPlan
  ├─ season
  ├─ validity
  └─ rates
```

There is **NO standalone RoomType model**.

Subscription V2 is already **IMPLEMENTED + VERIFIED**:

- 7-day trial
- dynamic plans
- Monthly/Yearly
- manual UPI/bank + UTR
- Platform Owner verification
- approval/rejection
- historical pricing protection
- tenant isolation
- 46 lifecycle/tenant tests
- 118 assertions
- all passed

The beta-hardening program BH-00 through BH-07 is complete.

BH-07 result:

**CONDITIONAL GO**

No confirmed P0/P1/P2 application blockers were found.

Important accepted fixes include:

- customer cross-agency booking lookup protection
- public quotation commercial-data redaction
- customer duplicate detection
- rate lookup batching/performance improvement
- responsive customer dropdown
- responsive quotation form grid
- mobile global search
- referral customer presentation

Current accepted Git changes are documented in Section 64.

### DO NOT CHANGE

- role architecture
- customer architecture
- tenant isolation
- public token security
- financial domain separation
- subscription architecture
- historical pricing behavior
- 7-day trial
- password security
- Hotel/RateSheet architecture

### CURRENT NEXT TASK

Start:

**DEV-01 — Form UX Consistency**

Goal:

Make validation errors consistently visible on every existing form, using `trips/new` as the UX reference.

After DEV-01:

```text
DEV-01 QA
→ DEV-02 Global UX
→ DEV-02 QA
→ DEV-03 Excel Import
→ DEV-03 QA
→ DEV-04 Invoice
→ DEV-04 QA
→ Deployment / Beta readiness
```

---

# 95. FINAL CONSISTENCY AUDIT — V2

## A. Final decisions

**PASS**

Current roles, customer model, subscription rules, Hotel/RateSheet architecture, security rules, beta-hardening state, and next development task are captured.

## B. Old decisions

**PASS WITH EXPLICIT SUPERSESSION**

The old master context remains below, but Sections 61+ explicitly supersede stale statements such as "Subscription V2 planned."

## C. Removed features

**PASS**

Removed roles/features and plaintext-password behavior are explicitly blocked.

## D. Implementation status

**PASS**

Implemented, verified, pending, deferred, rejected, and future work are separated.

## E. Database

**PASS AT RECOVERABLE PROJECT LEVEL**

45 current models are listed, key relationships/constraints/indexes are recorded, and actual `prisma/schema.prisma` remains authoritative.

## F. Routes

**PASS AT RECOVERABLE LEVEL**

Public, protected, admin, customer-token, and major API route families are recorded. Exact current repository routes remain authoritative.

## G. Authentication

**PASS**

Supabase Auth, SSR cookies, UUID mapping, guards, roles, and reset flows are documented.

## H. Tenancy

**PASS**

Server-derived `agencyId`, tenant isolation, IDOR protection, public token isolation, and commercial redaction are preserved.

## I. Subscription

**PASS**

Subscription V2 is correctly marked IMPLEMENTED + VERIFIED rather than planned.

## J. Hotel

**PASS**

Hotel Master, RateSheet, `roomType` string architecture, and the rejection of a standalone RoomType model are explicitly documented.

## K. Validation

**PASS**

The new Formik validation-error consistency requirement is recorded as DEV-01 pending work.

## L. QA

**PASS**

QA-01 through QA-07A, Phase 21-B through 21-F, and BH-00 through BH-07 are represented at the recoverable level.

## M. Bugs

**PASS**

Known fixed issues, deferred issues, and new pending UX/features are separated.

## N. Performance

**PASS**

Accepted rate lookup batching and the remaining need for real-world performance validation are recorded.

## O. Security

**PASS**

Tenant isolation, public redaction, Supabase security posture, IDOR protections, and plaintext password prohibition are recorded.

## P. Next step

**PASS**

The exact next development task is:

> **DEV-01 — Form UX Consistency**

---

# 96. V2 HANDOFF STATUS

**MASTER CONTEXT V2 STATUS: AUTHORITATIVE FOR THE CURRENT CONVERSATION STATE**

The project should continue from the BH-07 accepted baseline.

The next AI should not ask for a historical restart or re-decide finalized architecture.

If the actual repository contradicts a statement in this document, inspect the code/database and report the discrepancy before making changes.



---

# 97. PRESERVED PREVIOUS MASTER CONTEXT (HISTORICAL REFERENCE)

# TRIPDESK — MASTER PROJECT CONTEXT & HANDOVER DOCUMENT

**Document Version:** 1.1 — FINAL CONSISTENCY-AUDITED  
**Generated:** 2026-09-02  
**Purpose:** Complete handover from previous TripDesk development conversation to a new AI development conversation, with final consistency verification against the recoverable project history.

---

## 0. How to Use This Document

This file is the continuity source for the TripDesk project. It consolidates product decisions, architecture, implementation history, QA findings, release decisions, role rules, subscription rules, security invariants, current status, and the immediate next work.

Where an older idea conflicts with a later confirmed decision, the later confirmed decision wins. Where the exact historic phase number or exact implementation detail cannot be recovered from the available conversation, this document says so explicitly rather than inventing it.

The highest-priority continuation rule is:

> **Do not restart TripDesk. Continue from the current codebase and current certified baseline.**

---

# 1. PROJECT IDENTITY

## 1.1 Project Name

**TripDesk**

## 1.2 Product Type

Multi-tenant **Travel Agency SaaS / Travel Agency Operating System**.

TripDesk is intended to help travel agencies manage their business workflow from enquiry and customer management through quotation, booking, finance, trip operations, customer documents, customer portal access, post-trip feedback, analytics, subscription management, and communication.

## 1.3 Business Purpose

TripDesk is designed to replace fragmented workflows that travel agencies commonly manage through spreadsheets, WhatsApp, scattered documents, manual payment tracking, isolated quotation tools, and disconnected follow-up processes.

The long-term product vision discussed is a **complete travel agency operating system**, with future automation and AI features added only after the core product is proven with real users.

## 1.4 Target Users

### Internal authenticated users — FINAL
1. `PLATFORM_OWNER`
2. `AGENCY_OWNER`

There are **exactly two internal application roles**.

### External customer persona — FINAL
Customers are business/customer records and public-portal users. They are **NOT an internal authenticated `User` role**.

Customers use secure public token routes such as:

- `/q/[token]`
- `/trip/[token]`
- `/b/[token]`

The project intentionally maintains **zero customer accounts in the internal `User` table**.

## 1.5 Target Market

Travel agencies, initially focused on the Indian market and INR-based operations.

The product is entering a **controlled real-user testing / beta phase**. The current strategy is to give free or trial access to a small number of real travel agencies, observe real use, collect feedback, fix common bugs and UX problems, and only then expand feature scope.

## 1.6 Core Problem TripDesk Solves

TripDesk centralizes:

- customer and enquiry management
- itinerary/trip creation
- supplier/hotel/rate management
- quotation preparation and public proposal sharing
- booking conversion
- customer payments and supplier payables
- trip operations
- vouchers and travel documents
- public customer trip access
- feedback and service recovery
- agency reporting/BI
- customer communications
- SaaS subscription administration

## 1.7 Main Value Proposition

For the first testing release, the value proposition is not “every possible travel feature.”

It is:

> **A stable, smooth, fast, responsive travel-agency workflow where all functions already included through Phase 21 work reliably end to end.**

## 1.8 Current Product Vision — FINAL

The strongest long-term positioning discussed is:

> **TripDesk = Complete Travel Agency Operating System**

Conceptually:

```text
                     TRIPDESK
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      SALES         OPERATIONS         FINANCE
        │               │                │
      CRM           Bookings          Payments
      Enquiries     Suppliers         Receivables
      Quotations    Operations        Payables
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                CUSTOMER EXPERIENCE
                        │
             Portal / Notifications
            Communication / Feedback
                        ▼
                   AUTOMATION
                        ▼
                       AI
```

Automation and AI are **future roadmap areas**, not current beta-release requirements.

## 1.9 V1 / Beta Scope — CURRENT FINAL DIRECTION

For the first real-user testing release, TripDesk should include and stabilize functionality already implemented through Phase 21, including:

- authentication
- agency onboarding
- 7-day trial
- subscription management
- Platform Owner administration
- customer management
- enquiries / CRM / follow-ups
- suppliers
- hotels / vehicles / activities / rate sheets
- trips / itinerary / costing
- quotations and public proposals
- bookings
- payments / finance / supplier payables
- operations
- documents / vouchers
- customer portal
- feedback
- referrals
- customer insights
- reports / BI
- communications / notifications

The immediate beta goal is **quality hardening**, not uncontrolled feature expansion.

## 1.10 Intentionally Out of Scope for the Current Beta

The following were explicitly postponed, rejected for current V1, or discussed as future work:

- automatic Razorpay/Stripe recurring billing
- complex payment-gateway automation
- usage-based billing
- proration
- coupons
- advanced tax/GST billing engine for SaaS subscription
- multi-currency live forex engine
- airline/GDS integration
- advanced AI travel assistant
- large automation platform
- mass marketing automation
- WhatsApp Business API onboarding unless later configured
- SMS provider onboarding unless later configured
- new internal roles
- public customer login accounts
- advanced team-seat billing
- mobile-native app
- visa assistance
- flight booking module

## 1.11 Business Model

TripDesk is a SaaS product sold to travel agencies.

Current billing direction:

- every new agency automatically receives a **7-day free trial**
- no payment or plan selection is required during signup
- the agency can open Subscription from Day 1
- the agency can compare paid plans
- paid plans support **Monthly and Yearly** billing
- payment in beta is manual: **UPI / QR / Bank Transfer + UTR**
- Platform Owner verifies or rejects the payment
- only after approval does the selected paid plan become active
- Platform Owner can edit plan configuration/pricing
- current beta starts with two paid plans, historically named:
  - Starter
  - Professional

Exact plan prices/features must come from the current code/database configuration and must not be re-hardcoded from historic examples.

## 1.12 Current Product Maturity

TripDesk has moved beyond prototype status.

Current maturity:

- core SaaS architecture implemented
- multi-tenant security repeatedly audited
- public token routes implemented
- Phase 11–21 feature set largely built
- automated regression suites exist
- production-like browser QA has been performed
- database was cleaned and reinitialized for pilot use
- a controlled pilot agency workflow was created and verified
- Phase 21-F browser QA was certified
- next priority is beta-release hardening plus Subscription V2 completion

---

# 2. COMPLETE PROJECT HISTORY

This section uses only phase names/numbers recoverable from the available conversation. Earlier foundational development existed before Phase 10, but exact early phase numbering is not fully recoverable from the current history. Those foundations are documented by feature/architecture rather than invented phase numbers.

## 2.1 Early Foundation — Before the Recoverable Phase 10/11 Roadmap

### Objective
Build TripDesk as a travel-agency SaaS rather than a single-agency static website.

### Major decisions
- moved toward Next.js + TypeScript
- PostgreSQL via Supabase
- Prisma ORM
- Supabase Auth
- multi-tenant Agency model
- centralized server-side authorization
- unified signup onboarding
- 7-day agency trial
- Platform Owner bootstrap
- public customer token routes
- no internal customer role
- eventually reduced internal role model to only:
  - `PLATFORM_OWNER`
  - `AGENCY_OWNER`

### Important role evolution
Earlier ideas included:
- Owner
- Travel Agent / Sales
- Customer

Final model removed Travel Agent/Sales and internal Customer auth.

### Status
**COMPLETED / SUPERSEDED BY FINAL ARCHITECTURE**

---

## 2.2 Authentication & Onboarding Foundation

### Implemented
- `/signup`
- `/login`
- `/forgot-password`
- `/reset-password`
- Supabase SSR cookie/session integration
- Supabase Auth ID mapped 1:1 to Prisma `User.id`
- Agency creation + Agency Owner creation
- automatic Trial subscription
- role router:
  - `PLATFORM_OWNER` → `/admin`
  - `AGENCY_OWNER` → `/dashboard`
- private Platform Owner bootstrap script

### Email verification decision
**Disabled for V1**.

### Platform Owner
Singleton internal admin with:
- role `PLATFORM_OWNER`
- `agencyId = null`

### Status
**COMPLETED**

---

## 2.3 QA-01 — Authentication

### Scope
Authentication flow correctness.

### Areas
- signup
- login
- logout/session
- Supabase identity mapping
- password/reset flows
- role routing

### Status
**COMPLETED**

---

## 2.4 QA-02 — Authorization / Routing

### Scope
Protected routes and role-based access.

### Focus
- Platform Owner vs Agency Owner
- middleware
- public route bypasses
- redirect correctness

### Status
**COMPLETED**

---

## 2.5 QA-03 — Functional Modules

### Scope
Core business modules.

### Status
**COMPLETED**

Exact historical module-by-module report is not fully present in the available conversation, but this phase preceded full user-journey QA.

---

## 2.6 QA-04 — Complete User Journey / UX / Security

### Scope
End-to-end product usage plus UX and security.

### Important findings
Antigravity reportedly found and fixed four issues.

Known important findings included:
- a public quotation security leak
- customer duplicate-detection weakness

### Result
Issues were fixed during QA.

### Status
**COMPLETED**

---

## 2.7 QA-05 — Performance / API / Database

### Motivation
TripDesk felt slow in some areas, showed unusual API activity, and sometimes refreshed unnecessarily.

### Audit areas requested
- API call count per page
- duplicate API calls
- `/api/auth/me` calls
- Server Component vs Client Component usage
- `useEffect` dependency problems
- unnecessary rerenders
- `router.refresh()`
- hard navigation
- slow Prisma queries
- excessive data selection
- N+1 queries
- missing indexes
- dashboard loading time

### Status
**COMPLETED AS AUDIT / FOLLOWED BY 05B**

The exact disposition of every individual optimization item is not fully recoverable. Do not assume every historic concern is permanently solved; re-check in beta hardening.

---

## 2.8 QA-05B — Real Browser Performance & Network Verification

### Scope
Real-browser verification of network/performance behavior.

### Status
**COMPLETED**

---

## 2.9 QA-06A — UI/UX & Responsive Read-Only Audit

### Scope
Responsive layout, UI consistency, usability review.

### Status
**COMPLETED**

---

## 2.10 QA-06B — UI/UX Follow-up

### Scope
UI/UX improvement prompt/follow-up.

### Status
**COMPLETED / HISTORICAL**

---

## 2.11 QA-07A — Deep Security & Multi-Tenant Data Isolation Audit

### Findings
- zero Critical/High vulnerabilities reported
- server-enforced tenancy
- sanitized public proposals
- cross-tenant isolation validated

### Status
**COMPLETED**

---

# 3. KNOWN PHASE 10 SUB-PHASE HISTORY

The available reports reference these certified/previous suites:

## Phase 10.11D — Professional PDF Proposal
**Status:** COMPLETED  
**Known test result historically:** 32/32 in one run.

## Phase 10.13I — Operations Closure & Reconciliation
**Status:** COMPLETED

## Phase 10.13J — Operations Analytics & Insights
**Status:** COMPLETED

## Phase 10.14 — Finance & Ledger Integrity
**Status:** COMPLETED

## Phase 10.15A — Architecture & Security Audit
**Status:** COMPLETED

## Phase 10.15B — Customer Portal & Vouchers
**Status:** COMPLETED

## Phase 10.15C — Customer Notifications & Communications
**Status:** COMPLETED

## Phase 10.15 Customer Architecture Audit
**Status:** COMPLETED  
Verified:
- customer public/token architecture
- no Customer internal `User`
- IDOR protections

Exact implementation chronology before Phase 11 is not fully recoverable here; do not invent missing details.

---

# 4. PHASE 11 — BOOKING & OPERATIONS

## Objective
Production booking lifecycle and trip operations.

## Implemented
- quotation/booking conversion flows
- Booking model/workspace
- booking statuses
- payment linkage
- trip operations initialization
- readiness engine
- operational records
- confirmation/dispatch relationships

## Known test suite
`prisma/test-phase11-booking.ts`

Historical reported result:
- 33/33 passed

## Status
**COMPLETED & CERTIFIED**

---

# 5. PHASE 12 — PAYMENTS & FINANCE

## Objective
Agency-side financial operations.

## Implemented
- customer payments
- milestone allocation
- booking paid/balance recalculation
- supplier payables
- supplier payments
- finance/ledger integrity
- refunds/adjustments per existing implementation
- receivables and liabilities
- trip/operational expense integration

## Important invariant
**TripDesk SaaS subscription payments are separate from agency customer travel payments.**

## Known test suite
`prisma/test-phase12-finance.ts`

Historical reported result:
- 74/74 passed

## Status
**COMPLETED & CERTIFIED**

---

# 6. PHASE 13 — SUPPLIER MANAGEMENT

## Objective
Supplier 360, operational supplier relationships, commercial and payable visibility.

## Implemented
### Supplier 360
`src/lib/services/supplier-service.ts`

Aggregated:
- hotels
- vehicles
- activities
- rate sheets
- hotel confirmations
- payables
- payments

Computed:
- total payable
- paid
- outstanding
- pending payable counts
- operational confirmation counts

### Supplier UI
`src/app/(dashboard)/suppliers/[id]/page.tsx`

Included:
- KPI cards
- confirmations/tours tab
- payables/disbursements tab

### Duplicate detection
- normalized name
- phone digits
- email
- tenant isolated
- self-exclusion during edit

Endpoint:
- `GET /api/suppliers/check-duplicate`

### Reactivation
- `POST /api/suppliers/[id]/reactivate`

### Historical hard-delete protection
Permanent deletion blocked when historical links exist.

### Commercial privacy
No supplier buy-rate/payable leakage to customer public APIs.

## Test
`prisma/test-phase13-supplier.ts`
- 41/41 passed

## Status
**COMPLETED & CERTIFIED**

---

# 7. PHASE 14 — CRM & FOLLOW-UPS

## Objective
Lead/enquiry workflow, follow-ups, pipeline activity.

## Implemented
- enquiry pipeline
- follow-ups
- CRM activity
- stage/status workflows
- customer/enquiry linkage
- dashboard CRM telemetry

## Test
`prisma/test-phase14-crm.ts`
- 44/44 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 8. PLATFORM OWNER AUTHENTICATION RECOVERY INCIDENT

This was not a numbered product phase but is important operational history.

## Problem
Platform Owner login failed with:
- Supabase `signInWithPassword`
- HTTP 400
- `"Invalid login credentials"`

## Root causes
1. password stored in Supabase Auth did not match current configured/bootstrap password
2. bootstrap script returned early if Platform Owner already existed in Prisma
3. Platform Owner had an incorrect non-null `agencyId`

## Recovery
- Supabase Admin API used to synchronize password/metadata
- Prisma record corrected:
  - role `PLATFORM_OWNER`
  - `agencyId = null`
- identity UUID mapping preserved

## Future credential rule
Platform Owner credential changes must preserve:
- same UUID mapping between Supabase Auth and Prisma
- role
- `agencyId = null`

A temporary interactive password-reset script was created later, but the user decided **not to change the password yet**.

## Current known Platform Owner identity
Email used in project reports:
`mzpatel14@gmail.com`

The Master Context must never store the password.

## Status
**RECOVERED / STABLE**

---

# 9. PHASE 15 — WHATSAPP / EMAIL AUTOMATION

## Objective
Communication infrastructure and lifecycle messaging.

## Database
Extended communication data and added:
- `AgencyCommunicationSetting`
- richer `CustomerNotification` fields/enums

## Communication architecture
- email template engine
- WhatsApp template engine
- pluggable email provider
- pluggable WhatsApp provider
- central communication service
- deterministic idempotency
- customer preference checks
- retries
- manual messages
- lifecycle triggers
- scheduled automation scanners

## Lifecycle triggers
Known:
- enquiry created
- quotation sent
- quotation viewed with cooldown
- booking confirmed
- payment received

## Automation
Known scanners:
- payment reminders
- travel reminders
- feedback requests

## API surface included
Examples:
- `/api/communication/logs`
- `/api/communication/logs/[id]`
- resend
- send-manual
- settings
- automation/run
- communication webhook

## UI
- Settings/integrations communication controls
- Customer 360 communication tab

## Test
`prisma/test-phase15-communication.ts`
- 34/34 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 10. PHASE 16 — VOUCHERS & TRAVEL DOCUMENTS

## Objective
Official travel documents and customer-safe PDFs.

## Schema
Added:
- `TravelDocumentType`
- `TravelDocumentStatus`
- `TravelDocument`

Relations included:
- Agency
- Customer
- Trip
- Booking
- Payment
- Supplier
- HotelConfirmation
- VehicleDispatch
- ActivityConfirmation

## Document types
Known implemented types include:
- Hotel Voucher
- Vehicle/Transport Voucher
- Activity Pass
- Booking Confirmation
- Payment Receipt
- Customer Itinerary / Travel Kit equivalents

## Important behavior
- sequential year-scoped numbering
- state machine
- immutable versioning
- issue/revoke/supersede
- PDFKit rendering
- zero commercial leakage
- communication dispatch on document readiness

## UI
- `/documents`
- Booking detail document workspace
- customer portal access to issued documents

## Test
`prisma/test-phase16-documents.ts`
- 44/44 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 11. PHASE 17 — DASHBOARD & ANALYTICS

## Objective
Agency operational command center and financial/business telemetry.

## Validation
`src/lib/validation/dashboard-schema.ts`

Date presets known:
- TODAY
- THIS_WEEK
- THIS_MONTH
- LAST_MONTH
- THIS_QUARTER
- THIS_YEAR
- CUSTOM_RANGE

## Service
`src/lib/services/dashboard-service.ts`

Known analytics:
- dashboard summary
- sales funnel
- revenue/profit
- accounts receivable
- supplier payables
- upcoming departures/readiness
- CRM/follow-ups
- top destinations/customers
- CSV export

## UI components
Known:
- DateRangeFilter
- KpiCards
- SalesFunnelCard
- RevenueChart
- ReceivablesPayablesCard
- UpcomingTripsList
- CommunicationHealthCard
- TopDestinationsCustomersCard

## Status
**COMPLETED & CERTIFIED**

Reported Phase 17 assertion counts varied in different later regression reports as tests evolved. Treat the current repository test output as authoritative, not an old count.

---

# 12. PHASE 18 — SUPER ADMIN / SAAS PLATFORM MANAGEMENT

## Objective
Platform Owner control center.

## Added platform models
- `PlatformAuditLog`
- `PlatformAnnouncement`
- `PlatformSetting`

## Admin service
`src/lib/services/admin-service.ts`

Known capabilities:
- executive overview
- agency directory
- Agency 360
- trial extension
- suspension/reactivation
- plan management
- usage analytics
- audit logs
- announcements
- cross-tenant search
- platform settings

## Admin pages
Known:
- `/admin`
- `/admin/agencies`
- `/admin/agencies/[agencyId]`
- `/admin/subscriptions`
- `/admin/plans`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/announcements`
- `/admin/settings`

## Test
`prisma/test-phase18-admin.ts`
- 56/56 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 13. PHASE 19 — PRODUCTION DEPLOYMENT & RELEASE READINESS

## Objective
Production hardening and deployment documentation.

## Implemented
### Environment template
`.env.example`

### Structured logging
`src/lib/logger.ts`
- JSON structured logging
- recursive redaction
- masks credentials/tokens/DB URLs/API keys

### Security headers
`next.config.ts`
- `poweredByHeader: false`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- HSTS

### Cron security
`/api/communication/automation/run`
supports:
- protected cron bearer secret
- interactive authenticated invocation

### Docs
Known:
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/PRODUCTION_CHECKLIST.md`
- `docs/PHASE-19-PRODUCTION-READINESS-REPORT.md`

## Status
**COMPLETED**

---

# 14. PHASE 20 — FINAL SECURITY, UX & PERFORMANCE AUDIT

## Objective
Final release certification.

## Audit pillars
Known:
1. role/identity invariants
2. multi-tenant isolation / IDOR
3. public token security / commercial privacy
4. financial integrity
5. dashboard aggregation
6. travel document security
7. communication/activity trails
8. super-admin governance
9. logging/secret redaction

## Test
`prisma/test-phase20-final-audit.ts`
Historical report:
- 35/35 passed

## Build
`npm run build`
- clean

## Status
**COMPLETED & CERTIFIED**

---

# 15. POST-DEPLOYMENT VERIFICATION

## Objective
Verify deployed/production-like environment after Phase 20.

## Work
- environment checks
- cron secret setup
- smoke verification suite
- production release report

Known test:
`prisma/test-post-deployment-verification.ts`

Historical total reported across suites:
494/494 assertions.

## Important note
Historic reports used inconsistent infrastructure labels at different times (Supabase PostgreSQL / Neon Cloud). The **actual current environment variables/codebase are the source of truth**.

## Status
**COMPLETED**

---

# 16. PHASE 20.5 — PRODUCTION DATABASE CLEANUP & PILOT INITIALIZATION

## Objective
Remove synthetic QA/test data while preserving platform-level production data.

## Pre-cleanup audit
A read-only inventory identified:
- hundreds of test agencies
- test users
- customer/trip/quotation/booking/payment/supplier data
- operation events
- QA Supabase Auth users
- canonical platform data to preserve

## Backup
Local JSON snapshot plus hosted database backup were verified before destructive execution.

## Preserved
- singleton Platform Owner
- canonical active plans
- platform settings
- platform announcements (none at that time)
- Platform Owner Supabase Auth identity

## Important configuration correction
`defaultTrialDays` was corrected from **10** to **7** before cleanup.

## Destructive reset
Executed only after explicit confirmation:
`RESET_PILOT_DATABASE=CONFIRM`

## Post-cleanup verified baseline
- Users: 1 Platform Owner
- Agencies: 0
- tenant/business records: 0
- Subscription Plans: 2
- Platform Settings: 2
- Supabase Auth users: 1 Platform Owner

## Docs
- `docs/PILOT-DATABASE-INITIALIZATION-REPORT.md`
- pre-cleanup inventory report

## Status
**COMPLETED & VERIFIED**

---

# 17. PHASE 20.6 — FIRST PRODUCTION SMOKE TEST & PILOT ONBOARDING VERIFICATION

## Objective
Prove clean production environment could support a first pilot tenant.

## Important clarification
The original Phase 20.6 prompt was a production smoke/onboarding verification, not merely browser testing.

## Controlled pilot
Created one pilot tenant and minimal workflow data.

Known pilot identity from reports:
- Agency: `TripDesk Pilot Agency`
- Agency Owner: `pilot.owner@tripdesk.io`

This is QA/pilot data, not a general product requirement.

## Verified
- Platform Owner identity
- agency creation
- Agency Owner creation
- 7-day trial
- dashboard zero state
- one customer
- one enquiry
- one supplier
- one trip
- one quotation
- public proposal security
- booking
- payment
- financial calculations
- operations
- travel documents
- customer-facing routes
- dashboard metrics
- Supabase Auth reconciliation

## Test
`prisma/test-phase20.6-smoke.ts`

## Status
**COMPLETED & PASSED**

---

# 18. PHASE 20.6B — FULL REAL-BROWSER PRODUCTION QA

## Objective
Browser-based verification for Platform Owner, Agency Owner, public routes, responsive behavior, database consistency.

## Browser areas
### Platform Owner
- login → `/admin`
- agency directory
- subscriptions
- plans
- settings
- route protection
- logout

### Agency Owner
- login → `/dashboard`
- customer
- enquiry
- supplier
- trip
- quotation
- booking
- operations
- documents
- admin-route denial

### Public
- quotation
- trip
- booking
- invalid token behavior
- commercial-data redaction

## Result
Reported as **PASSED & CERTIFIED**.

## Status
**COMPLETED**

---

# 19. PHASE 21-A / POST-PHASE-20 GAP-PLANNING WORK — HISTORIC LABEL REQUIRES CODE/DOC CONFIRMATION

## Objective
Audit actual product after production certification to identify remaining incomplete/mock modules.

## Important findings
Core workflows were operational.

Legacy mock/context gaps identified:
- `/admin/payments` still used legacy `useSaaS()` context
- `/feedback`
- `/referrals`
- `/customer-insights`
used `useExperience()` legacy in-memory state
- `/reports` was a placeholder

## Phase 21 plan created
- 21-B Platform Owner SaaS Billing
- 21-C Agency persistence / mock cleanup
- 21-D Agency BI/reporting
- 21-E Customer portal feedback
- 21-F Communication center / notifications
- 21-G was originally discussed/intended as a final Phase 21 integration/regression workstream.

### 21-G status clarification
No independently verified implementation/report for a completed Phase 21-G is available in the current conversation record. Therefore:
- do not claim 21-G was completed;
- do not invent a 21-G scope;
- do not treat the project as missing a required feature solely because an old roadmap mentioned 21-G;
- the project formally moved to beta hardening after 21-F.

Later, after 21-F, project strategy shifted away from immediately adding more feature phases and toward beta hardening.

## Status
**COMPLETED**

---

# 20. PHASE 21-B — PLATFORM OWNER SAAS SUBSCRIPTION PAYMENT & BILLING RECONCILIATION

## Objective
Make TripDesk's own SaaS billing production-ready and replace mock admin payment UI.

## Important architecture decision
Agency travel/customer payments remain completely separate from SaaS subscription payments.

## Schema additions
Known:
- `SubscriptionPaymentStatus`
- `SubscriptionPayment`
- relations to Agency and Subscription

## Service
Extended `admin-service.ts` with:
- list subscription payments
- get payment
- create payment
- verify
- reject

## APIs
Known:
- `GET/POST /api/admin/subscription-payments`
- `GET /api/admin/subscription-payments/[id]`
- verify
- reject

## UI
`src/app/admin/payments/page.tsx`
rewritten to live database data.

## Features
- payment KPIs
- filter/search
- manual payment record
- verification/rejection
- activation workflow
- audit logging

## Test
`prisma/test-phase21b-saas-billing.ts`
- 32/32 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 21. PHASE 21-C — AGENCY OWNER PERSISTENCE & LEGACY MOCK CLEANUP

## Objective
Remove legacy `useExperience()` persistence islands.

## Feedback
Extended `CustomerFeedback` and created:
- `feedback-service.ts`
- `/api/feedback`
- `/api/feedback/[id]`
- live `/feedback` UI

Low ratings ≤3 automatically trigger service-recovery follow-up.

## Referrals
Added:
- `ReferralStatus`
- `Referral` model
- service
- APIs
- `/referrals` live UI

## Customer insights
Added:
- `customer-insights-service.ts`
- `/api/customer-insights`
- live `/customer-insights`

## Legacy context
Removed `ExperienceProvider` from dashboard layout after consumers were eliminated.

## Test
`prisma/test-phase21c-persistence.ts`
- 36/36 passed historically

## Status
**COMPLETED & CERTIFIED**

---

# 22. PHASE 21-D — AGENCY BI & EXPORTABLE ACCOUNTING REPORTS

## Objective
Replace placeholder `/reports` with live agency BI.

## Pre-audit finding
No schema changes required.

## Created
- `src/lib/validation/reporting-schema.ts`
- `src/lib/services/reporting-service.ts`
- `/api/reports`
- `/api/reports/export`
- `/api/reports/pdf`
- `src/lib/api-client/reporting-client.ts`
- full `/reports` UI

## Metrics
Known:
- Gross Booking Value
- Collections
- Receivables
- Supplier liabilities
- gross profit/margin
- CRM funnel
- destinations
- retention/LTV
- time-series
- CSV/PDF exports

## Formula rules
Examples:
- `GBV = sum(non-cancelled booking total)`
- `Collections = completed payments net of refunded amount`
- `Total Cost = supplier payables + operational expenses`
- `Gross Profit = GBV - Total Cost`
- `Gross Margin % = Gross Profit / GBV * 100`
- `Balance Due = Booking.totalAmount - Booking.paidAmount`

## Security
- tenant-scoped reports
- public routes remain cost-redacted
- CSV formula-injection protection

## Test
`prisma/test-phase21d-reports.ts`
Reported counts evolved (47 then 59) as tests expanded. Use current repository result.

## Status
**COMPLETED & CERTIFIED**

---

# 23. PHASE 21-E — CUSTOMER PORTAL FEEDBACK & POST-TRIP EXPERIENCE

## Objective
Allow customer feedback directly from the secure trip portal after completion.

## Existing model reused
`CustomerFeedback`

## Business rules
- only completed trips are eligible
- token resolves agency/customer/trip server-side
- duplicate feedback is updated/idempotent rather than duplicated
- rating ≤3 → `Follow-up Required`
- rating ≥4 → `Not Needed`
- operational audit event if TripOperation exists

## Created/updated
- public feedback validation
- feedback service token methods
- `GET/POST /api/trips/public/[token]/feedback`
- public client methods
- `/trip/[secureToken]` UI feedback card/modal

## Security
No client-provided `agencyId`, `customerId`, or `tripId` is trusted.

## Status
**COMPLETED & CERTIFIED**

---

# 24. PHASE 21-F — AGENCY COMMUNICATION CENTER & CUSTOMER NOTIFICATION ENGINE

## Objective
Provide live agency communication center plus customer notification tray.

## Important pre-audit finding
The required communication models already existed:
- `CustomerNotification`
- `CustomerNotificationPreference`
- `AgencyCommunicationSetting`
- notification enums

Therefore Phase 21-F reused existing schema rather than creating duplicate infrastructure.

## Added/updated
### Agency APIs
- `GET/POST /api/communications`
- `GET /api/communications/[id]`

### Public APIs
- `GET /api/trips/public/[token]/notifications`
- `POST /api/trips/public/[token]/notifications/[id]/read`

### Agency UI
- `/communications`
- KPI cards
- filters/search
- communication ledger
- send-customer-message modal
- detail modal

### Customer portal
- notification bell
- unread badge
- popover tray
- notification feed
- mark read

### Security
- server-derived tenant identity
- token isolation
- IDOR protection
- commercial-data redaction
- deterministic idempotency

## Automated test
`prisma/test-phase21f-communications.ts`
- 47/47 passed

## Multi-phase regression
Reported 332/332 in one certification run.

The reported certification breakdown was:
- Phase 21-F communications: 47/47
- Phase 21-E feedback: 28/28
- Phase 21-D reports: 59/59
- Phase 21-C persistence: 36/36
- Phase 21-B SaaS billing: 32/32
- Phase 18 admin: 56/56
- Phase 12 finance: 74/74

These are historical certification results; the current repository test output is authoritative if counts have evolved.

## External provider limitation
Phase 21-F communication delivery for external SMS/WhatsApp providers was locally simulated. Real provider delivery still requires provider credentials/webhooks/configuration. Do not describe external SMS/WhatsApp delivery as production-connected unless the current environment explicitly proves it.

## Browser QA
Final browser QA:
- 28 scenarios
- 28 passed
- 0 failed
- 0 blocked
- Desktop 1440×900
- Tablet 768×1024
- Mobile 390×844
- 0 application console errors
- 0 hydration errors
- no duplicate request loops observed
- no P0/P1/P2 defects reported

## Status
**COMPLETED, BROWSER-QA PASSED & CERTIFIED**

---

# 25. CURRENT STRATEGIC SHIFT — BETA RELEASE PREPARATION

After Phase 21-F, the project strategy changed.

The user explicitly stated:

- TripDesk should be released first in testing mode
- a small group of real users/agencies will receive free access temporarily
- their feedback will guide future development
- the first release does not need every future feature
- all functionality already included through Phase 21 must work
- site must be smooth and fast
- there should be no common UI bugs
- no broken layouts at any screen size
- full responsive behavior is required
- subscription, finance, hotels, travel, and all current operations must work

Therefore the near-term priority is **beta-release quality hardening**, not adding large new modules.

---

# 26. CURRENT SUBSCRIPTION V2 / BETA SUBSCRIPTION REDESIGN DISCUSSION

This is the immediate stopping point of the project.

## Problem observed
A screenshot of the Agency Subscription page showed:
- current subscription information that looked static/misleading
- a manual billing area
- sidebar badges that appeared static/hardcoded

Examples mentioned:
- Trips `9`
- Bookings `7`
- Operations `Live`
- Feedback `4.8★`
- Subscription `Active`

The user asked to first focus on Subscription flow/UI.

## FINAL subscription business direction agreed in discussion

### New signup
A new agency:
1. signs up
2. Agency + Agency Owner are created
3. automatic 7-day Free Trial is created
4. no paid-plan selection during signup
5. no payment required at signup
6. agency goes to dashboard

### Subscription page
During trial:
- Current Plan = Free Trial
- trial start/end/days remaining shown dynamically
- paid plans visible immediately from Day 1
- agency can buy a paid plan before trial ends

### Paid plans
Current beta uses two paid plans conceptually:
- Starter
- Professional

### Billing cycle
Both paid plans must support:
- Monthly
- Yearly

### Plan source of truth
Platform Owner can edit:
- plan name
- description
- monthly price
- yearly price
- features
- active/inactive status
- display order
- popular badge / marketing metadata if supported

Agency UI must load plan data dynamically.

### Purchase flow
```text
FREE TRIAL
   ↓
Choose Starter or Professional
   ↓
Choose Monthly or Yearly
   ↓
Confirm plan
   ↓
Manual payment instructions
   ↓
UPI / Bank Transfer
   ↓
Enter UTR / Transaction Reference
   ↓
Submit payment for verification
   ↓
PENDING
   ↓
Platform Owner review
   ├── APPROVE → paid plan becomes ACTIVE
   └── REJECT → agency sees rejection reason / can resubmit
```

### Critical activation rule
Choosing a plan **must not immediately replace the current subscription**.

The actual paid plan only becomes active after Platform Owner approval.

### Historical pricing rule — FINAL
If Platform Owner changes current plan pricing later, historical subscriptions/payment records must not be rewritten.

Example:
- agency purchased Professional yearly at ₹49,999
- plan later changes to ₹59,999
- historical purchased amount remains ₹49,999

Implementation must preserve a purchased-price snapshot or equivalent existing Phase 21-B mechanism.

### Plan deletion rule — FINAL
Do not hard-delete plans referenced by history.

Use active/inactive/deactivated behavior.

### Proration rule — BETA
Do not implement complex automatic proration/refunds in beta.

### Payment gateways — BETA
Do not add automatic Stripe/Razorpay recurring billing in this task.

Manual UPI/bank + UTR + owner approval remains the approved beta approach.

### Current plan states UI should clearly support
- FREE TRIAL
- ACTIVE
- PAYMENT VERIFICATION PENDING
- REJECTED
- EXPIRED
- CANCELLED where already meaningful in existing domain

### Subscription UI design direction
Professional modern SaaS billing UI:
- strong Current Plan summary
- Monthly/Yearly toggle
- dynamic plan cards
- clear CTA hierarchy
- payment status
- renewal information
- plan feature list
- responsive/mobile-safe
- no fake/static data
- no `NaN` / `undefined`
- loading/empty/error states

### Platform Owner
Existing Phase 21-B subscription/payment management must be **extended**, not replaced.

Recommended admin sections:
- Overview
- Payment Requests
- Plans & Pricing

### Sidebar
Subscription badge should reflect actual subscription state if shown.

Static/misleading sidebar badges should be audited during beta hardening. Broader sidebar cleanup has not yet been implemented in this conversation.

## Last prompt delivered
A full **“TRIPDESK — SUBSCRIPTION V2 / BETA SUBSCRIPTION MANAGEMENT”** implementation prompt was given.

That prompt instructed the development AI to:
- first audit Phase 21-B
- reuse/extend existing architecture
- support 7-day trial
- support dynamic active plans
- Monthly/Yearly billing
- manual payment request
- UTR
- Platform Owner approval/rejection
- plan editing
- historical price protection
- responsive browser QA
- regression testing
- no duplicate subscription architecture

## Current status
**PLANNED / PROMPT CREATED / IMPLEMENTATION RESULT NOT YET REPORTED IN THIS CHAT**

This is the current development stopping point.

---

# 27. CURRENT PROJECT STATUS

## Where did we start?
TripDesk started as a travel-agency project and evolved into a multi-tenant SaaS with role-based administration, public customer token access, operational modules, financial modules, documents, communication, analytics, and subscription governance.

## What has been completed?
The recoverable implementation history includes:
- core auth/onboarding/multi-tenancy
- QA-01 through QA-07A
- Phase 10 subphase suite referenced above
- Phase 11 through Phase 21-F
- production hardening
- production/pilot DB cleanup
- pilot onboarding smoke test
- real-browser production QA
- Phase 21-F browser QA

## What phase are we currently in?
There is no formally numbered new phase locked after 21-F.

The project is currently in a **Beta Release Preparation / Subscription V2 enhancement discussion**.

## Last completed phase
**Phase 21-F — Agency Communication Center & Customer Notification Engine**

## Last QA
**Phase 21-F Browser QA Verification — PASSED & CERTIFIED**

28/28 browser scenarios passed in the report supplied by the user.

## What should start next?
Immediate next development task:

> **Subscription V2 / Beta Subscription Management enhancement**

After that:

> **Beta Release Hardening across all existing modules**

## What is currently being implemented?
No implementation result has yet been supplied for Subscription V2 in this conversation. Only the implementation prompt has been prepared.

## What is still pending?
- execute/audit Subscription V2 changes against existing Phase 21-B architecture
- make Subscription page fully dynamic/professional
- Monthly/Yearly billing
- plan edit management by Platform Owner
- payment-request approval/rejection flow where gaps remain
- historical pricing protection if not already implemented
- audit sidebar static badges
- full beta-release hardening:
  - function-by-function
  - responsive
  - performance
  - error states
  - realistic data
  - browser QA
  - security
  - monitoring/feedback readiness

## What should NOT be changed?
- two internal roles only
- no internal Customer role
- Supabase Auth ↔ Prisma User UUID mapping
- Platform Owner `agencyId = null`
- server-side tenant isolation
- public cost redaction
- public token architecture
- certified financial domain separation
- existing Phase 21-B billing architecture should be extended, not replaced
- 7-day trial
- no automatic paid-plan selection at signup
- no destructive DB reset
- no unnecessary feature expansion before beta

---

# 28. PHASE STATUS TABLE

| Phase / Workstream | Status | Important Notes |
|---|---|---|
| Early Auth/Onboarding/Multi-Tenancy | COMPLETE | Final two-role architecture |
| QA-01 Authentication | COMPLETE | Auth flow verified |
| QA-02 Authorization/Routing | COMPLETE | Role and route protection |
| QA-03 Functional Modules | COMPLETE | Historic |
| QA-04 Journey/UX/Security | COMPLETE | Public quotation leak + duplicate detection issue addressed |
| QA-05 Performance/API/DB | COMPLETE as audit | Re-check in beta hardening |
| QA-05B Browser Performance/Network | COMPLETE | Historic |
| QA-06A Responsive UI Audit | COMPLETE | Historic |
| QA-06B UI/UX Follow-up | COMPLETE | Historic |
| QA-07A Deep Security/Tenancy | COMPLETE | Zero Critical/High reported |
| Phase 10.11D PDF Proposal | COMPLETE | Certified |
| Phase 10.13I Ops Closure | COMPLETE | Certified |
| Phase 10.13J Ops Analytics | COMPLETE | Certified |
| Phase 10.14 Finance/Ledger Integrity | COMPLETE | Certified |
| Phase 10.15A Architecture/Security | COMPLETE | Certified |
| Phase 10.15B Customer Portal/Vouchers | COMPLETE | Certified |
| Phase 10.15C Customer Notifications | COMPLETE | Certified |
| Phase 11 Booking & Operations | COMPLETE | 33/33 historically |
| Phase 12 Payments & Finance | COMPLETE | 74/74 historically |
| Phase 13 Supplier Management | COMPLETE | 41/41 |
| Phase 14 CRM & Follow-ups | COMPLETE | 44/44 |
| Phase 15 Communication Automation | COMPLETE | 34/34 |
| Phase 16 Vouchers & Documents | COMPLETE | 44/44 |
| Phase 17 Dashboard & Analytics | COMPLETE | Test suite evolved over time |
| Phase 18 Super Admin/SaaS | COMPLETE | 56/56 historically |
| Phase 19 Production Readiness | COMPLETE | Hardening/docs |
| Phase 20 Final Audit | COMPLETE | 35/35 historically |
| Phase 20.5 DB Cleanup | COMPLETE | Clean pilot baseline created |
| Phase 20.6 Production Smoke | COMPLETE | Pilot flow verified |
| Phase 20.6B Full Browser QA | COMPLETE | Browser certified |
| Phase 21-A Product Gap Audit | COMPLETE | Gap roadmap created |
| Phase 21-B SaaS Billing | COMPLETE | 32/32 historically |
| Phase 21-C Persistence Cleanup | COMPLETE | 36/36 |
| Phase 21-D Agency BI/Reports | COMPLETE | Live reports implemented |
| Phase 21-E Portal Feedback | COMPLETE | Public post-trip feedback |
| Phase 21-F Communications | COMPLETE | 47/47 + browser 28/28 |
| Subscription V2 / Beta Billing UX | PLANNED / NEXT | Prompt created; implementation result pending |
| Beta Release Hardening | PENDING | Primary pre-real-user quality gate |

---

# 29. PRODUCT / BUSINESS MODEL — FINAL

## Platform Owner
Singleton global SaaS administrator.

Responsibilities include:
- manage agencies
- manage trials/subscriptions
- verify SaaS subscription payments
- suspend/reactivate agencies
- manage plans
- platform settings
- announcements
- analytics
- audit logs

Platform Owner is not attached to an agency.

## Agency
Tenant boundary.

Every tenant business record must resolve to an `agencyId` where applicable.

## Agency Owner
Internal authenticated owner/operator for one agency.

Must have:
- role `AGENCY_OWNER`
- non-null `agencyId`

## Customer
External business entity / traveler.

Customer is:
- stored in Customer model
- associated with an agency
- accessed publicly via secure tokens where appropriate

Customer is **not**:
- a Supabase internal authenticated system role
- a `UserRole`
- an internal `User`

## Removed role
Travel Agent / Sales Agent was considered earlier.

**REMOVED — DO NOT REINTRODUCE unless a future explicit decision changes the role model.**

---

# 30. ROLE MATRIX

`CUSTOMER` below means the external customer persona using token-scoped public routes, **not an internal `UserRole`.**

| Feature | PLATFORM_OWNER | AGENCY_OWNER | CUSTOMER (public token) |
|---|---|---|---|
| Platform Admin `/admin/*` | YES | NO | NO |
| Agency Dashboard `/dashboard` | NO / redirect per current guards | YES | NO |
| Manage agencies | YES | NO | NO |
| Manage platform plans | YES | NO | NO |
| Verify SaaS subscription payments | YES | NO | NO |
| Manage own subscription | N/A / admin side | YES | NO |
| Customers CRUD | NO normal tenant mutation | YES own agency | NO |
| Enquiries / follow-ups | NO normal tenant mutation | YES own agency | NO |
| Suppliers / rate sheets | NO normal tenant mutation | YES own agency | NO |
| Trips / costing | NO normal tenant mutation | YES own agency | limited public trip view |
| Quotations | NO normal tenant mutation | YES own agency | public proposal by secure token |
| Bookings | NO normal tenant mutation | YES own agency | public booking view by secure token |
| Customer travel payments | NO normal tenant mutation | YES own agency | customer-visible balance/receipt data only |
| Supplier payables | NO normal tenant mutation | YES own agency | NEVER |
| Internal profitability | NO normal tenant mutation | YES own agency | NEVER |
| Operations | NO normal tenant mutation | YES own agency | customer-safe trip data only |
| Documents | NO normal tenant mutation | YES own agency | issued/customer-safe docs only |
| Reports | NO tenant use | YES own agency | NO |
| Communications | NO tenant mutation | YES own agency | notification view/read by token |
| Feedback | NO tenant mutation | YES manage own agency feedback | submit via valid completed-trip token |
| Platform audit logs | YES | NO | NO |

---

# 31. COMPLETE USER FLOWS

## 31.1 Public Website Flow

Known public routes:
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- public quotation
- public trip portal
- public booking route

A public marketing/pricing site exists conceptually and historically included Pricing → Signup flow, but current Subscription V2 final direction modifies the earlier idea of “Choose Plan before signup.”

### FINAL signup rule
**Do not require paid-plan selection during signup.**

New agency immediately receives a 7-day Free Trial.

---

## 31.2 Agency Signup Flow — FINAL

```text
Public Signup
   ↓
Agency Owner enters onboarding details
   ↓
Supabase Auth user created
   ↓
Agency created
   ↓
Prisma User created with role AGENCY_OWNER
   ↓
User.agencyId = Agency.id
   ↓
Subscription created with status TRIAL
   ↓
trialStart set
   ↓
trialEnd = 7 days later
   ↓
redirect /dashboard
```

No payment required.

No paid-plan activation required during signup.

---

## 31.3 Login Flow

```text
/login
  ↓
Supabase signInWithPassword
  ↓
SSR session cookie
  ↓
Prisma User lookup by Supabase UUID
  ↓
Role
  ├── PLATFORM_OWNER → /admin
  └── AGENCY_OWNER → /dashboard
```

Public customers do not use this login.

---

## 31.4 Trial Flow — FINAL

- automatic on signup
- duration: **7 days**
- track:
  - `trialStart`
  - `trialEnd`
  - `status = TRIAL`
- current Subscription page should show Free Trial
- paid plans visible from Day 1
- agency may choose paid plan before trial ends
- trial must not be replaced by a paid plan until payment is approved
- expired-trial data must never be deleted

Historic existing authorization includes a read-only approach via `requireWriteAccess()` after expired trial/subscription. This should be verified against current code before changing expiry UX.

---

## 31.5 Subscription Flow — CURRENT FINAL DESIGN

```text
FREE TRIAL
   ↓
Subscription page
   ↓
View active paid plans
   ↓
Toggle Monthly / Yearly
   ↓
Choose Starter or Professional
   ↓
Confirm plan + cycle + price
   ↓
UPI / Bank Transfer instructions
   ↓
Enter UTR
   ↓
Submit payment request
   ↓
PENDING VERIFICATION
   ↓
Platform Owner
   ├── APPROVE
   │      ↓
   │   selected paid plan becomes ACTIVE
   │      ↓
   │   start/end/renewal set
   └── REJECT
          ↓
       reason shown to agency
```

Plan management:
- Platform Owner editable
- no hardcoded Agency UI pricing
- monthly/yearly prices
- plan activation/deactivation
- features/marketing metadata if current schema supports
- historical purchased price preserved

---

## 31.6 Customer Business Journey

```text
Customer created
   ↓
Enquiry
   ↓
Follow-up / pipeline
   ↓
Trip / costing
   ↓
Quotation
   ↓
Public proposal
   ↓
Accepted / converted
   ↓
Booking
   ↓
Customer payment(s)
   ↓
Supplier payable(s)
   ↓
Trip Operations
   ↓
Travel Documents
   ↓
Customer Trip Portal
   ↓
Notifications
   ↓
Trip Completion
   ↓
Feedback
   ↓
Reports / Customer Insights
```

---

# 32. COMPLETE PRODUCT MODULE MAP

## 32.1 Dashboard
Purpose:
Agency operational/business overview.

Status:
**COMPLETE**

Includes:
- KPIs
- sales funnel
- revenue/profit
- receivables/payables
- upcoming trips
- CRM/follow-ups
- communication health
- top destinations/customers

Roles:
Agency Owner.

---

## 32.2 Customers
Purpose:
Customer 360.

Known capabilities:
- create
- edit
- list/search
- details
- financial/customer history
- duplicate detection
- communications tab
- feedback/referral/insight relationships

Status:
**COMPLETE**

---

## 32.3 Enquiries / CRM / Follow-ups
Purpose:
Lead management and sales pipeline.

Known:
- enquiry lifecycle
- follow-ups
- CRM stages
- source/priority
- customer linkage
- analytics

Status:
**COMPLETE**

---

## 32.4 Suppliers
Purpose:
Supplier directory and 360.

Known:
- supplier creation/edit
- duplicate detection
- status/reactivation
- hotels/vehicles/activities
- confirmations
- payables/payments
- hard-delete guards

Status:
**COMPLETE**

---

## 32.5 Hotels / Vehicles / Activities / Rate Sheets
Purpose:
Agency inventory/rate resources for costing/quotations.

Status:
**IMPLEMENTED / INCLUDED IN CURRENT BETA SCOPE**

Exact current UI behavior should be verified during beta hardening.

---

## 32.6 Trips / Itinerary / Costing
Purpose:
Travel product and itinerary construction.

Known:
- trip record
- dates/status
- traveler relationships
- itinerary items
- hotel/vehicle/activity relationships
- costing
- booking linkage
- operations linkage

Status:
**COMPLETE / CORE**

---

## 32.7 Quotations
Purpose:
Commercial proposal.

Known:
- quotation creation
- line items
- package options
- payment milestones
- public share token
- public proposal
- PDF proposal
- cost redaction
- status lifecycle

Status:
**COMPLETE**

---

## 32.8 Bookings
Purpose:
Confirmed travel business record.

Known:
- total/paid/balance
- customer/trip/quotation relationships
- payment status
- operations
- documents

Status:
**COMPLETE**

---

## 32.9 Payments / Finance
Purpose:
Agency travel accounting.

Includes:
- customer payments
- milestones
- receivables
- refunds/adjustments according to current implementation
- supplier payables
- supplier payments
- operational expenses
- profitability

Status:
**COMPLETE**

---

## 32.10 Operations
Purpose:
Trip delivery/dispatch/readiness/closure.

Known:
- TripOperation
- HotelConfirmation
- VehicleDispatch
- ActivityConfirmation
- OperationalIssue
- OperationEvent
- readiness and event timeline

Status:
**COMPLETE**

---

## 32.11 Travel Documents
Purpose:
Customer-safe official travel documents.

Known:
- generation
- PDF
- issue
- revoke
- supersede
- versioning
- public/customer portal access

Status:
**COMPLETE**

---

## 32.12 Feedback
Purpose:
Post-trip reviews and service recovery.

Status:
**COMPLETE**

---

## 32.13 Referrals
Purpose:
Referral/reward tracking.

Status:
**COMPLETE**

---

## 32.14 Customer Insights
Purpose:
Retention, LTV, destination and VIP insights.

Status:
**COMPLETE**

---

## 32.15 Reports
Purpose:
Agency BI/accounting reports.

Status:
**COMPLETE**

---

## 32.16 Communications
Purpose:
Agency communication ledger/manual messages plus customer notification center.

Status:
**COMPLETE & BROWSER-CERTIFIED**

---

## 32.17 Subscription
Purpose:
Agency's TripDesk SaaS billing.

Current status:
- Phase 21-B core billing implemented
- Subscription V2 professional agency-facing flow is **NEXT / PENDING EXECUTION**

---

## 32.18 Platform Admin
Purpose:
SaaS owner governance.

Status:
**COMPLETE**, with Subscription V2 enhancements pending.

---

# 33. ROUTE MAP

## 33.1 Public routes known

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/q/[token]`
- `/trip/[token]`
- `/b/[token]`
- `/api/health`
- `/api/auth/*`
- public token APIs under trips/quotations/bookings

## 33.2 Agency Owner protected routes known

Historically protected:
- `/dashboard`
- `/customers/*`
- `/trips/*`
- `/hotels/*`
- `/quotations/*`
- `/bookings/*`
- `/payments/*`
- `/operations/*`
- `/settings`
- `/suppliers/*`
- `/documents`
- `/feedback`
- `/referrals`
- `/customer-insights`
- `/reports`
- `/communications`
- subscription route/page in current app

The exact current route for Subscription must be inspected in code; recent screenshots/discussion refer to a Subscription page and the latest implementation prompt recommends `/subscription`. Do not assume `/subscription` exists until the current repository confirms it.

## 33.3 Platform Owner routes known

- `/admin`
- `/admin/agencies`
- `/admin/agencies/[agencyId]`
- `/admin/subscriptions`
- `/admin/plans`
- `/admin/payments`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/announcements`
- `/admin/settings`

Subscription V2 may extend current admin structure rather than creating duplicate routes.

## 33.4 API routes known from implemented phases

### Auth
- existing auth actions/routes

### Suppliers
- `/api/suppliers/check-duplicate`
- `/api/suppliers/[id]/reactivate`

### Communication Phase 15
- `/api/communication/logs`
- `/api/communication/logs/[id]`
- resend
- send-manual
- settings
- automation/run
- webhook

### Phase 21-F communication aliases
- `GET/POST /api/communications`
- `GET /api/communications/[id]`
- `GET /api/trips/public/[token]/notifications`
- `POST /api/trips/public/[token]/notifications/[id]/read`

### Admin subscription payments
- `GET/POST /api/admin/subscription-payments`
- `GET /api/admin/subscription-payments/[id]`
- verify
- reject

### Reports
- `GET /api/reports`
- `GET /api/reports/export`
- `GET /api/reports/pdf`

### Feedback
- `GET/POST /api/feedback`
- `GET/PATCH /api/feedback/[id]`
- `GET/POST /api/trips/public/[token]/feedback`

### Referrals
- `GET/POST /api/referrals`
- `GET/PATCH /api/referrals/[id]`

### Customer insights
- `/api/customer-insights`

### Documents
Document listing/detail/generation/issue/revoke/resend/preview/download routes exist under `/api/documents/...`.

This is not guaranteed to be a complete current API inventory. **Current codebase wins.**

---

# 34. ROUTE PROTECTION RULES

## Platform Owner
Admin routes/APIs require Platform Owner context.

## Agency Owner
Tenant routes derive agency from authenticated server session.

## Public
Known bypasses include:
- auth pages
- quotation token pages
- trip token pages
- booking token pages
- specific public APIs

Public token routes must never trust client-provided tenant IDs.

## Phase 21-F specific authorization
- `/communications` is Agency Owner-only and tenant-scoped.
- `/api/communications*` is Agency Owner-only and tenant-scoped.
- `/api/trips/public/[token]/notifications*` is public token-scoped and must resolve identity from the validated public token.

---

# 35. TECHNICAL ARCHITECTURE

## Framework
- Next.js 16.x App Router
- React 19
- TypeScript
- Turbopack in reported builds

## Styling/UI
- Tailwind CSS
- Shadcn-style component system was part of project direction
- Lucide icons
- Sonner toasts
- responsive dashboard UI

## Database
- PostgreSQL
- Prisma ORM 7.x
- `@prisma/adapter-pg` referenced in production reports

Hosting/provider naming in historic reports varied:
- Supabase managed PostgreSQL was the original/known architecture
- later Phase 21 reports say Neon Cloud PostgreSQL

**Do not rely on the old label. Inspect current `DATABASE_URL` host/config without exposing secrets.**

## Authentication
- Supabase Auth
- `@supabase/supabase-js`
- `@supabase/ssr`
- SSR cookie management

## Identity mapping
`Supabase Auth user.id === Prisma User.id`

## API architecture
- Next.js Route Handlers
- service layer
- Zod validation
- server-side request context/guards

## Server/client approach
Core business/security logic server-side.

Client components used for interactive:
- forms
- modals
- filters
- toggles
- dynamic drawers/popovers

Avoid unnecessary clientification.

## Deployment
- production-like Vercel/Next.js deployment architecture was documented
- managed PostgreSQL
- Supabase Auth
- protected cron endpoint
- structured logging

---

# 36. DATABASE ARCHITECTURE

The full exact schema must be read from `prisma/schema.prisma` in the new chat/codebase. The following models are explicitly recoverable from project reports.

## Platform / SaaS
- `Agency`
- `User`
- `SubscriptionPlan`
- `Subscription`
- `SubscriptionPayment`
- `PlatformAuditLog`
- `PlatformAnnouncement`
- `PlatformSetting`
- `AgencyCommunicationSetting`

## CRM / Customer
- `Customer`
- `Enquiry`
- `EnquiryFollowUp`
- enquiry activity model referenced historically
- `CustomerFeedback`
- `Referral`
- `CustomerNotification`
- `CustomerNotificationPreference`

## Trip
- `Trip`
- `Traveler` / `TripTraveler` naming varied in reports; inspect schema
- `ItineraryItem` / `TripItineraryItem` naming varied; inspect schema
- `TripHotel`
- `TripVehicle`
- `TripActivity`
- `Hotel`
- `Vehicle`
- `Activity`

## Quotation
- `Quotation`
- `QuotationItem`
- `QuotationProposalItem`
- `QuotationPackageOption`
- `QuotationPaymentMilestone`
- `PublicShareLink`

## Booking / Finance
- `Booking`
- `Payment`
- `Supplier`
- `RateSheet`
- `SupplierPayable`
- `SupplierPayment`
- `OperationalExpense`

## Operations
- `TripOperation`
- `HotelConfirmation`
- `VehicleDispatch`
- `ActivityConfirmation`
- `OperationEvent`
- `OperationalIssue`

## Documents
- `TravelDocument`

## Important database relationship rules

### User ↔ Auth
`User.id` is the Supabase Auth UUID.

### User → Agency
Agency Owner:
`User.agencyId = Agency.id`

Platform Owner:
`agencyId = null`

### Tenant data
Business data is scoped by `agencyId`.

### Subscription
Agency has subscription history/status.

### Customer
Customer belongs to Agency.

### Trip
Trip belongs to Agency and typically Customer.

### Booking
Booking relates Agency, Customer, Trip, and optionally Quotation according to current schema.

### PublicShareLink
Used to resolve customer-safe public access.

### CustomerNotification
Phase 21-F relies on tenant/customer/trip relations plus deterministic idempotency.

### Communication idempotency
The communication schema/service uses deterministic idempotency keys and an agency-scoped uniqueness rule equivalent to:
`@@unique([agencyId, idempotencyKey])`.
Do not remove this protection or create duplicate notification infrastructure.

---

# 37. IMPORTANT ENUMS / STATES RECOVERABLE

Exact enum names must be confirmed in schema.

## UserRole
- `PLATFORM_OWNER`
- `AGENCY_OWNER`

## SubscriptionStatus
Known:
- `TRIAL`
- `ACTIVE`
- `EXPIRED`
- `CANCELLED`

## SubscriptionPaymentStatus
Known from Phase 21-B:
- `PENDING`
- `VERIFIED`
- `REJECTED`
- `REFUNDED`

Subscription V2 discussion used “APPROVED” conceptually. Reuse existing actual enum (`VERIFIED`) unless code intentionally introduces a separate request-state abstraction.

## Trip status
Known examples:
- DRAFT
- PLANNING
- QUOTED
- BOOKED
- ONGOING
- COMPLETED
- CANCELLED

## Booking
Known:
- status lifecycle
- payment status such as PENDING / PARTIALLY_PAID / PAID equivalents

## Notification
Channels:
- IN_APP
- EMAIL
- SMS
- WHATSAPP

Delivery states:
- QUEUED
- PENDING
- SENT
- DELIVERED
- FAILED
- READ
- CANCELLED

---

# 38. AUTHENTICATION ARCHITECTURE

## Important files known

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`
- `src/lib/auth/index.ts`
- `src/lib/auth/customer-auth.ts`
- `src/lib/supabase/admin.ts`
- `src/actions/auth-actions.ts`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `prisma/bootstrap-owner.ts`

## Helpers known historically
- `getCurrentUser`
- `requireAuth`
- `requirePlatformOwner`
- `requireAgencyOwner`

Later API context uses equivalents such as:
- `requirePlatformOwnerContext()`
- `requireAgencyOwnerContext()`
- `requireWriteAccess()`

New code should reuse current helper names in repository.

## Signup
Supabase Auth user + Agency + Prisma User + Trial.

## Login
Supabase sign-in then role router.

## Email verification
Disabled for V1 historically.

## Platform Owner bootstrap
Private bootstrap script.

Important operational lesson:
bootstrap should not blindly assume an existing Prisma owner means Auth credentials are synchronized.

---

# 39. AUTHORIZATION & MULTI-TENANCY

This is a non-negotiable architecture invariant.

## Principle
**Agency identity is derived server-side.**

Never trust:
- `agencyId` from client body/query
- foreign customer/trip/booking IDs without tenant validation

## Agency Owner query pattern
Every service query/mutation must enforce the authenticated agency.

Conceptually:

```text
Supabase Session
   ↓
Prisma User
   ↓
User.agencyId
   ↓
where: { agencyId }
```

## Platform Owner
Global admin APIs use Platform Owner guard.

## Public tokens
Conceptually:

```text
token
  ↓
PublicShareLink / secure lookup
  ↓
Agency + Customer + Trip/Quotation/Booking
  ↓
customer-safe payload
```

## IDOR
Repeated audits verified:
- cross-tenant customer access denied
- cross-tenant quotation access denied
- cross-token notifications denied
- public invalid tokens fail safely

## Public notification identity resolution
Phase 21-F public notification APIs resolve agency/customer/trip identity from the validated `PublicShareLink` token hash. Client-provided `agencyId`, `customerId`, or `tripId` must not be trusted for public identity resolution.

## Customer-safe DTO rule
Public trip/notification/quotation/booking responses must be intentionally shaped for customer visibility. Never expose supplier cost, buy price, gross profit/margin, supplier payable, or internal agency remarks.

---

# 40. PUBLIC FEATURES & SECURITY

## `/q/[token]`
Public quotation/proposal.

Must expose customer-safe selling information.

Must never expose:
- supplier cost
- buy price
- gross margin
- supplier payable
- confidential supplier notes
- private agency operational notes

A public quotation leak was found in earlier QA and fixed.

## `/trip/[token]`
Public traveler portal.

Known content:
- agency branding
- trip status
- itinerary
- hotels
- transport
- activities
- payment/customer-safe booking info
- notifications
- feedback
- customer-safe documents

## `/b/[token]`
Public booking/customer confirmation route.

## Invalid tokens
Must:
- return 404/safe error
- not expose stack trace
- not expose Prisma/SQL details

## Revocation/expiry
Current token services support active/revoked logic in known Phase 21-E/F reports. Confirm exact implementation in code.

---

# 41. QA HISTORY SUMMARY

| QA | Scope | Important Outcome |
|---|---|---|
| QA-01 | Authentication | Completed |
| QA-02 | Authorization/Routing | Completed |
| QA-03 | Functional Modules | Completed |
| QA-04 | Full Journey/UX/Security | Public quote leak + duplicate detection issue addressed |
| QA-05 | Performance/API/DB | Duplicate calls, auth/me, useEffect, router.refresh, DB query concerns audited |
| QA-05B | Browser Performance/Network | Completed |
| QA-06A | Responsive/UI Read-only | Completed |
| QA-06B | UI/UX follow-up | Completed |
| QA-07A | Deep Security/Tenancy | Zero Critical/High reported |
| Phase 20 | Final certification | 9 audit pillars |
| Phase 20.6 | Production smoke | pilot workflow |
| Phase 20.6B | Full browser production QA | Platform + Agency + public routes |
| Phase 21-F Browser QA | Communication/customer notifications | 28/28 pass |

---

# 42. QA FINDINGS THAT MUST NOT BE LOST

## Public quotation security issue
Status:
**FIXED**

Rule:
Never re-expose internal quotation item cost/internal notes in public payload.

## Customer duplicate detection
Status:
**FIXED / dedicated duplicate logic exists**

Supplier duplicate detection also exists.

## Performance concerns
Historic concerns:
- duplicate API calls
- repeated `/api/auth/me`
- unnecessary `useEffect`
- rerenders
- `router.refresh()`
- hard navigation
- slow queries
- N+1
- excessive selections
- missing indexes

Status:
Some performance/browser verification was completed, and Phase 21-F specifically reported no duplicate loops. However beta hardening should **re-audit the full app** rather than assuming all pages are optimal.

## Responsive UI
Historic responsive audits passed, but user now explicitly wants a **full-screen-size beta audit** because real users will test the site.

## Multi-tenant isolation
Status:
Repeatedly **PASSED**.

Must remain non-negotiable.

---

# 43. UI/UX DESIGN SYSTEM / PRINCIPLES

No exact full token system is recoverable, but the project consistently uses a polished modern SaaS dashboard style.

## Patterns
- left sidebar
- dashboard top/header area
- cards
- KPI scorecards
- data tables
- filters/search
- modals/drawers
- badges
- toasts
- responsive grids
- customer public portal distinct from admin dashboard

## Subscription UI direction — CURRENT
Must look like a professional SaaS billing page:
- strong plan hierarchy
- clear current status
- Monthly/Yearly toggle
- clean plan cards
- clear “Choose Plan / Upgrade / Renew” primary CTA
- Contact TripDesk secondary
- payment verification status
- responsive

## Beta UX requirements
Every major page should handle:
- loading
- empty
- error
- success
- slow network
- long text
- large numbers
- mobile/tablet/desktop

## Target viewports for beta audits
At minimum:
- 1440×900
- 1366×768
- 1024×768
- 768×1024
- 430×932
- 390×844
- 375×812 / 360×800 where useful

## Common UI bugs to explicitly test
- horizontal overflow
- modal overflow
- clipped buttons
- broken tables
- bad text wrapping
- dropdown positioning
- sticky header/sidebar overlap
- bottom nav
- long customer/trip/hotel names
- empty/loading states
- error boundaries
- `NaN`
- `undefined`

---

# 44. PRICING & SUBSCRIPTION — DETAILED FINAL RULES

## Trial
- automatic
- 7 days
- no plan/payment required at signup
- current Subscription page should show Free Trial
- trial start/end are database-driven
- days remaining calculated dynamically

## Paid plan visibility
- active paid plans visible from Day 1
- agency may purchase immediately

## Paid plans
Two current conceptual plans:
- Starter
- Professional

Current code/database configuration is authoritative for exact prices/features.

## Billing cycles
Each plan must support:
- Monthly
- Yearly

## Plan administration
Platform Owner must be able to edit:
- plan name
- description
- monthly price
- yearly price
- features where supported
- active/inactive
- display order/popular badge if supported

## Payment
Beta:
- UPI / QR / bank transfer
- enter UTR
- submit for verification
- Platform Owner reviews
- no immediate activation

## Approval
On verification:
- activate selected paid plan
- correct cycle
- correct start/end
- preserve payment history
- prevent duplicate activation
- use transaction/idempotency

## Rejection
- reason stored
- agency can see rejection
- agency may submit new valid request

## Price history
Must preserve purchased price.

## Deactivation
Do not hard-delete referenced plans.

## Yearly savings
Only calculate dynamically:
`monthlyPrice * 12 - yearlyPrice`

Do not hardcode a “Save X%” claim.

## Subscription page states
At minimum:
- Free Trial
- Pending Verification
- Active Paid
- Rejected
- Expired
- Cancelled when meaningful

## Expiry policy
Existing code historically uses read-only/write restrictions after trial/subscription expiry. Before changing behavior, inspect current `requireWriteAccess()` implementation and existing product rules.

---

# 45. IMPORTANT FILES / FOLDER REFERENCES

## Prisma
- `prisma/schema.prisma`
- `prisma/bootstrap-owner.ts`
- `prisma/test-phase11-booking.ts`
- `prisma/test-phase12-finance.ts`
- `prisma/test-phase13-supplier.ts`
- `prisma/test-phase14-crm.ts`
- `prisma/test-phase15-communication.ts`
- `prisma/test-phase16-documents.ts`
- `prisma/test-phase17-dashboard.ts`
- `prisma/test-phase18-admin.ts`
- `prisma/test-phase20-final-audit.ts`
- `prisma/test-phase20.6-smoke.ts`
- `prisma/test-phase21b-saas-billing.ts`
- `prisma/test-phase21c-persistence.ts`
- `prisma/test-phase21d-reports.ts`
- `prisma/test-phase21e-feedback.ts`
- `prisma/test-phase21f-communications.ts`

## Auth/Supabase
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/admin.ts`
- `src/middleware.ts`
- `src/lib/auth/index.ts`
- `src/lib/auth/customer-auth.ts`
- `src/actions/auth-actions.ts`

## Services
Known:
- `src/lib/services/supplier-service.ts`
- `src/lib/services/quotation-service.ts`
- `src/lib/services/booking-service.ts`
- `src/lib/services/payment-service.ts`
- `src/lib/services/finance-service.ts`
- `src/lib/services/communication-service.ts`
- `src/lib/services/customer-notification-service.ts`
- `src/lib/services/travel-document-service.ts`
- `src/lib/services/document-pdf-service.ts`
- `src/lib/services/customer-portal-service.ts`
- `src/lib/services/trip-public-service.ts`
- `src/lib/services/dashboard-service.ts`
- `src/lib/services/admin-service.ts`
- `src/lib/services/feedback-service.ts`
- `src/lib/services/referral-service.ts`
- `src/lib/services/customer-insights-service.ts`
- `src/lib/services/reporting-service.ts`

## Validation
Known:
- `src/lib/validation/supplier-schema.ts`
- `src/lib/validation/communication-schema.ts`
- `src/lib/validation/document-schema.ts`
- `src/lib/validation/dashboard-schema.ts`
- `src/lib/validation/admin-schema.ts`
- `src/lib/validation/feedback-schema.ts`
- `src/lib/validation/referral-schema.ts`
- `src/lib/validation/reporting-schema.ts`

## API clients
Known:
- `src/lib/api-client/communication-client.ts`
- `src/lib/api-client/document-client.ts`
- `src/lib/api-client/dashboard-client.ts`
- `src/lib/api-client/admin-client.ts`
- `src/lib/api-client/experience-client.ts`
- `src/lib/api-client/reporting-client.ts`
- `src/lib/api-client/public-client.ts`

## Pages
Known:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/suppliers/...`
- `src/app/(dashboard)/documents/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/feedback/page.tsx`
- `src/app/(dashboard)/referrals/page.tsx`
- `src/app/(dashboard)/customer-insights/page.tsx`
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/communications/page.tsx`
- `src/app/trip/[secureToken]/page.tsx`
- admin pages listed above

## Navigation
- `src/lib/navigation.ts`
- sidebar/app-shell components

## Production
- `.env.example`
- `next.config.ts`
- `src/lib/logger.ts`
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/PRODUCTION_CHECKLIST.md`
- Phase reports in `docs/`

---

# 46. LATEST KNOWN PROJECT STRUCTURE (APPROXIMATE)

This is an architectural map, not a promise that every listed directory currently exists exactly as shown.

```text
tripdesk/
├── prisma/
│   ├── schema.prisma
│   ├── bootstrap-owner.ts
│   ├── seed.ts
│   ├── test-phase11-booking.ts
│   ├── test-phase12-finance.ts
│   ├── test-phase13-supplier.ts
│   ├── test-phase14-crm.ts
│   ├── test-phase15-communication.ts
│   ├── test-phase16-documents.ts
│   ├── test-phase17-dashboard.ts
│   ├── test-phase18-admin.ts
│   ├── test-phase20-final-audit.ts
│   ├── test-phase20.6-smoke.ts
│   ├── test-phase21b-saas-billing.ts
│   ├── test-phase21c-persistence.ts
│   ├── test-phase21d-reports.ts
│   ├── test-phase21e-feedback.ts
│   └── test-phase21f-communications.ts
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   ├── enquiries/
│   │   │   ├── suppliers/
│   │   │   ├── trips/
│   │   │   ├── quotations/
│   │   │   ├── bookings/
│   │   │   ├── payments/
│   │   │   ├── operations/
│   │   │   ├── documents/
│   │   │   ├── feedback/
│   │   │   ├── referrals/
│   │   │   ├── customer-insights/
│   │   │   ├── reports/
│   │   │   ├── communications/
│   │   │   └── settings/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── q/
│   │   ├── trip/
│   │   └── b/
│   ├── actions/
│   │   └── auth-actions.ts
│   ├── components/
│   │   ├── dashboard/
│   │   └── ...
│   └── lib/
│       ├── auth/
│       ├── api/
│       ├── api-client/
│       ├── services/
│       ├── supabase/
│       ├── validation/
│       ├── logger.ts
│       ├── navigation.ts
│       └── prisma.ts
├── docs/
├── .env.example
├── next.config.ts
├── prisma.config.ts
└── package.json
```

---

# 47. ENVIRONMENT / SETUP

Never store real secret values in this file.

## Environment variables known conceptually

```text
DATABASE_URL=<DATABASE_URL>
DIRECT_URL=<DIRECT_DATABASE_URL_IF_USED>
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>

BOOTSTRAP_OWNER_EMAIL=<PLATFORM_OWNER_EMAIL>
BOOTSTRAP_OWNER_PASSWORD=<PLATFORM_OWNER_PASSWORD>

CRON_SECRET=<HIGH_ENTROPY_CRON_SECRET>

# provider vars if enabled
SMTP_*=<...>
WHATSAPP_*=<...>
```

Use actual `.env.example` as source of truth.

## Prisma commands used
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma db push` during some additive development phases
- historic initial migration:
  `npx prisma migrate dev --name initial_tripdesk_schema`

For current/production work, do not use destructive schema reset.

## Build
- `npm run build`
- `npx tsc --noEmit`

## Dev
Use current `package.json` scripts.

---

# 48. IMPLEMENTED FEATURES CHECKLIST

## Completed
- [x] Supabase authentication
- [x] Agency signup/onboarding
- [x] Platform Owner bootstrap
- [x] two-role authorization
- [x] multi-tenancy
- [x] 7-day trial
- [x] Customer 360
- [x] CRM enquiries/follow-ups
- [x] Supplier 360
- [x] hotels/vehicles/activities/rate sheets
- [x] trips/itinerary/costing
- [x] quotations
- [x] public quotation
- [x] PDF proposals
- [x] bookings
- [x] customer payments
- [x] supplier payables/payments
- [x] finance
- [x] operations
- [x] vouchers/documents
- [x] customer portal
- [x] dashboard analytics
- [x] Platform Owner admin
- [x] production hardening
- [x] database cleanup/pilot baseline
- [x] pilot smoke test
- [x] full browser QA
- [x] SaaS subscription payment verification (Phase 21-B)
- [x] feedback persistence
- [x] referrals
- [x] customer insights
- [x] agency reports
- [x] public post-trip feedback
- [x] agency communication center
- [x] customer notification engine

## In Progress / Next
- [ ] Subscription V2 / Beta Subscription Management implementation

## Pending
- [ ] audit/fix static sidebar badges
- [ ] full Beta Release Hardening
- [ ] full responsive sweep on all existing screens
- [ ] performance sweep across all modules
- [ ] edge/error-state sweep
- [ ] realistic data-volume testing
- [ ] beta monitoring/feedback workflow
- [ ] controlled real-agency release

## Future
- [ ] automation engine
- [ ] deeper customer self-service
- [ ] AI assistant
- [ ] payment gateway automation
- [ ] multi-currency engine
- [ ] future enterprise integrations

---

# 49. UPCOMING DEVELOPMENT ROADMAP

The roadmap changed after Phase 21-F because the user prioritized releasing a stable beta rather than adding more feature modules.

## Next — Subscription V2 / Beta Subscription Management

### Objective
Make agency subscription experience fully dynamic, professional, Monthly/Yearly, and owner-managed.

### Required areas
- existing Phase 21-B audit
- Agency Subscription UI
- dynamic plan list/prices
- Monthly/Yearly toggle
- manual payment + UTR
- pending/approved/rejected states
- Platform Owner plan editing
- plan deactivation
- historical price snapshot
- renewal dates
- tenant security
- responsive QA
- regression

### Database
Only minimal safe changes if existing Phase 21-B schema lacks:
- separate monthly/yearly pricing
- purchased-price snapshot
- required metadata

Do not create duplicate Subscription/SubscriptionPayment models.

### Security
- agency can only access own subscription/payment requests
- Platform Owner only can edit plans/approve payments

### QA
- automated subscription tests
- existing Phase 21-B suite
- build/typecheck
- browser responsive test

---

## Following — Beta Release Hardening

This is the most important pre-real-user phase.

### Objective
Make every currently included function reliable, smooth, responsive, fast, and understandable.

### Scope
All current modules:
- auth
- signup
- trial/subscription
- admin
- customers
- enquiries
- suppliers
- hotels/rate sheets
- trips
- quotations
- bookings
- finance
- operations
- documents
- customer portal
- feedback
- referrals
- reports
- communications

### Workstreams recommended
1. Full functional E2E
2. UI stability/responsive
3. performance/network
4. loading/error/empty states
5. security revalidation
6. realistic data
7. beta monitoring/feedback

### Golden workflow
```text
Signup
 ↓
7-Day Trial
 ↓
Customer
 ↓
Enquiry
 ↓
Trip
 ↓
Rate Sheet / Supplier
 ↓
Quotation
 ↓
Public Proposal
 ↓
Booking
 ↓
Customer Payment
 ↓
Supplier Payable
 ↓
Operations
 ↓
Documents
 ↓
Communication
 ↓
Customer Portal
 ↓
Feedback
 ↓
Reports
```

This chain should work without common bugs.

---

## Controlled Beta Release

Recommended rollout discussed:
- Wave 1: 2–3 agencies
- Wave 2: 5–10 agencies
- larger beta after fixes

The user intends to provide temporary free access to real users for testing.

## Beta feedback loop
The beta is intentionally a validation phase:
1. onboard a small number of real agencies
2. observe real workflows
3. collect functional/UI/performance feedback
4. fix common or high-impact defects
5. re-test regressions
6. expand the beta only after the product remains stable

Do not interpret “beta” as permission to introduce broad new modules without evidence from tester feedback.

---

## Later Feature Expansion

Only after beta feedback:
- advanced automation
- customer self-service expansion
- AI
- external billing gateway
- larger enterprise integrations

---

# 50. CURRENT STOPPING POINT

## 1. What were we doing immediately before handover?
Discussing and defining a professional, dynamic Subscription flow/UI for the beta release.

## 2. Last completed work
Phase 21-F including browser QA.

Final browser report supplied:
- 28/28 scenarios passed
- 100%
- no defects
- responsive pass
- security pass

## 3. Last prompt/task given to AI
A full implementation prompt titled conceptually:

> **TRIPDESK — SUBSCRIPTION V2 / BETA SUBSCRIPTION MANAGEMENT**

It instructed Antigravity to first audit existing Phase 21-B, then implement Monthly/Yearly plan selection, owner-editable plans, UTR payment requests, approval/rejection, historical pricing, and professional responsive UI.

## 4. Expected next task
Run that Subscription V2 prompt in the development environment, then review its implementation/audit report.

## 5. Files/features expected to change next
Potentially:
- `prisma/schema.prisma` only if truly needed
- existing subscription service/admin service
- subscription validation
- subscription APIs
- admin subscription/payment APIs
- Agency Subscription page
- Platform Owner plan/payment pages
- navigation subscription badge
- subscription tests

Exact files must be determined by pre-audit.

## 6. Decisions already finalized
- 7-day automatic trial
- no paid selection at signup
- paid plans available from Day 1 on Subscription page
- Monthly + Yearly
- manual UPI/bank/UTR
- Platform Owner approval
- Platform Owner editable plans
- preserve historical purchased price
- no hard-deleting referenced plans
- no automatic gateway/proration for beta
- no duplicate billing architecture

## 7. What new chat should do first
1. Read this entire file.
2. Inspect current code, especially Phase 21-B subscription implementation.
3. Compare actual code against Subscription V2 rules.
4. Do not blindly create schema/routes.
5. Implement only missing gaps.
6. Run tests + browser QA.
7. Then move to full beta hardening.

---

# 51. IMPORTANT DECISION LOG

| ID | Decision | Final Status | Do Not Revert? |
|---|---|---|---|
| D-001 | Internal roles are only `PLATFORM_OWNER` and `AGENCY_OWNER` | FINAL | YES |
| D-002 | Customer is not an internal User/Auth role | FINAL | YES |
| D-003 | Platform Owner has `agencyId = null` | FINAL | YES |
| D-004 | Supabase Auth UUID maps 1:1 to Prisma `User.id` | FINAL | YES |
| D-005 | Agency Owner belongs to exactly one agency | FINAL | YES |
| D-006 | Tenant `agencyId` is derived server-side | FINAL | YES |
| D-007 | Public customer access is token-based | FINAL | YES |
| D-008 | Public payloads must redact supplier costs/margins/internal notes | FINAL | YES |
| D-009 | New agency gets automatic 7-day free trial | FINAL | YES |
| D-010 | Email verification disabled for V1 historically | FINAL unless intentionally revisited | CHECK BEFORE CHANGE |
| D-011 | No paid-plan selection/payment required during signup | FINAL | YES |
| D-012 | Paid plans visible from Day 1 in Subscription page | FINAL | YES |
| D-013 | Paid plans support Monthly and Yearly | FINAL | YES |
| D-014 | Platform Owner can edit plan pricing/config | FINAL | YES |
| D-015 | Beta SaaS payment = UPI/Bank/UTR + Platform Owner verification | FINAL | YES |
| D-016 | Plan becomes active only after approval | FINAL | YES |
| D-017 | Historical subscription price must not change when plan price changes | FINAL | YES |
| D-018 | Referenced plans should be deactivated, not hard-deleted | FINAL | YES |
| D-019 | No complex automatic proration in beta | FINAL | YES |
| D-020 | SaaS billing and agency travel payments are separate domains | FINAL | YES |
| D-021 | No automatic Stripe/Razorpay recurring billing in current beta | FINAL | YES |
| D-022 | Subscription V2 must extend Phase 21-B, not replace it | FINAL | YES |
| D-023 | Current goal is beta quality hardening, not uncontrolled feature expansion | FINAL | YES |
| D-024 | All features already included through Phase 21 should work in beta | FINAL | YES |
| D-025 | Full responsive + smooth/fast UI is a beta release requirement | FINAL | YES |
| D-026 | Static/misleading subscription/sidebar data must be removed or made dynamic | FINAL direction | YES |
| D-027 | No destructive production reset after pilot initialization | FINAL | YES |
| D-028 | Public quotation security fix must be preserved | FINAL | YES |
| D-029 | Phase 21-F is closed unless a real defect appears | FINAL | YES |

---

# 52. REJECTED / REMOVED / POSTPONED FEATURES

## REMOVED — DO NOT REIMPLEMENT
### Travel Agent / Sales Agent internal role
Not part of finalized role model.

### Internal Customer role
Do not create customer Auth/User accounts.

### Visa assistance
Removed from earlier related travel-agency business scope; not part of current TripDesk product plan.

### Flights
Removed from earlier travel-agency business scope/current V1.

---

## POSTPONED — NOT CURRENT BETA
- Razorpay/Stripe automated recurring billing
- complex SaaS tax/GST engine
- multi-currency live forex
- airline/GDS integration
- advanced AI assistant
- major automation engine
- marketing automation
- bulk campaigns
- SMS provider onboarding
- WhatsApp provider production onboarding unless later explicitly configured
- usage-based billing
- proration
- coupons
- seat-based billing

---

# 53. SECURITY DO-NOT-BREAK RULES

1. Never trust client `agencyId`.
2. Never query a tenant business record without tenant scope.
3. Never expose supplier cost to customer/public route.
4. Never expose gross margin/profit to customer/public route.
5. Never allow Agency Owner to access `/admin`.
6. Never allow public token to mutate unrelated customer data.
7. Never create Customer internal `User`.
8. Never attach Platform Owner to an agency.
9. Never expose service-role key/client-secret in browser.
10. Never log real passwords/tokens/DB credentials.
11. Keep public invalid-token responses safe.
12. Preserve IDOR protections.

---

# 54. PERFORMANCE DO-NOT-BREAK RULES

1. Avoid duplicate API calls.
2. Avoid repeated `/api/auth/me` calls if current architecture already solved them.
3. Avoid unnecessary `useEffect` data fetch loops.
4. Avoid unnecessary `router.refresh()`.
5. Avoid hard navigation where client/server transition is sufficient.
6. Avoid N+1 Prisma queries.
7. Use narrow `select` / aggregate/groupBy where practical.
8. Preserve indexes on tenant and relation keys.
9. Do not fetch entire ledgers if only counts are needed.
10. Use pagination for large histories.
11. Avoid converting server components to client components without need.

---

# 55. BETA RELEASE HARDENING RULES

Before real-user release, every existing module should be tested for:

## Functional
- create
- read
- update
- archive/delete/cancel where supported
- status transitions
- refresh/back/forward
- duplicate prevention

## Responsive
- desktop
- laptop
- tablet
- mobile

## States
- empty
- loading
- success
- error
- long text
- missing optional data
- large numbers

## Performance
- request count
- no loops
- no obvious slow queries
- smooth transitions

## Security
- cross-tenant
- public token
- role guards

## Realistic data
Test long real-world:
- customer names
- hotel names
- itinerary titles
- addresses
- quotation titles
- large INR values
- lists with many rows

---

# 56. DEVELOPMENT RULES FOR THE NEW AI

1. Read this context before coding.
2. Current codebase is more authoritative than any historic text.
3. Do not change finalized architecture silently.
4. Do not reintroduce removed roles.
5. Preserve tenant isolation.
6. Preserve public commercial redaction.
7. Reuse existing project patterns.
8. Audit before adding a Prisma model.
9. Audit before adding an API route.
10. Audit Phase 21-B before changing subscriptions.
11. Use server-side business logic.
12. Use Zod/established validation.
13. Keep API routes thin.
14. Keep secrets server-only.
15. Prefer minimal safe change over rewrite.
16. Do not claim browser QA unless browser QA actually ran.
17. Do not claim tests passed unless commands actually ran.
18. Do not run destructive DB cleanup scripts without explicit user confirmation.
19. Preserve pilot/real user data.
20. Do not seed large synthetic datasets into production-like DB.
21. Run `prisma validate`, typecheck, build, and relevant regression after major changes.
22. For UI changes, test desktop/tablet/mobile.
23. For public routes, inspect network payload for sensitive fields.
24. For finance/subscription changes, use atomic transaction where needed.
25. For approval/retry flows, design idempotently.
26. Document files changed, schema changes, security impact, QA, and remaining issues.

---

# 57. AI CONTINUATION PROTOCOL

## HOW THE NEW CHAT MUST WORK

This document is the continuity source of truth for TripDesk.

The future AI must:

1. Read the entire document before making project-wide recommendations.
2. Treat current codebase/actual implementation as highest authority.
3. Treat sections marked FINAL as binding unless the user explicitly changes them.
4. If the user request conflicts with a FINAL decision, explain the conflict before implementing.
5. Do not assume missing information.
6. Before implementing any feature, identify impact on:
   - database
   - services/business logic
   - authentication
   - authorization
   - tenant isolation
   - routes/APIs
   - UI
   - public security
   - tests
7. Reuse current architecture and utilities.
8. Avoid unnecessary rewrites.
9. Do not re-create functionality already present.
10. Keep customer/public payloads commercially safe.
11. Preserve two-role system.
12. Preserve real/pilot data.
13. Run appropriate QA.
14. After implementation report:
   - files created
   - files modified
   - database changes
   - APIs/routes
   - business rules
   - authorization/security impact
   - tests
   - browser QA
   - build/typecheck
   - known limitations
   - exact final status

The new AI should continue from the current state rather than starting the project again.

---

# 58. SOURCE OF TRUTH PRIORITY

If sources conflict, use this order:

1. **Current codebase / actual implementation**
2. **FINAL decisions in this Master Context**
3. **Latest confirmed project discussions**
4. **Earlier project discussions**
5. **Ideas / suggestions / examples**

A newer FINAL decision overrides an older idea.

---

# 59. FINAL PROJECT SNAPSHOT

## Project
**TripDesk**

## Product
**Travel Agency SaaS / Travel Agency Operating System**

## Current Architecture
- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL
- Prisma 7
- Supabase Auth
- Supabase SSR cookies
- service-layer business logic
- Zod validation
- multi-tenant `agencyId` isolation
- public token customer access
- Tailwind/UI component system
- PDFKit documents
- structured production logging

## Roles
Internal:
- `PLATFORM_OWNER`
- `AGENCY_OWNER`

External:
- Customer via secure public token, not internal User role

## Authentication
Supabase Auth with UUID mapped to Prisma `User.id`.

## Database
Multi-tenant PostgreSQL schema including:
- Agency/User
- SubscriptionPlan/Subscription/SubscriptionPayment
- Customer/Enquiry
- Trip/Quotation/Booking
- Payments/Payables
- Supplier/RateSheet
- Operations
- TravelDocument
- Feedback/Referral
- Notifications/Communication
- Platform admin models

## Current Phase
**Subscription V2 / Beta Subscription Management — NEXT IMPLEMENTATION TASK**

## Last Completed Phase
**Phase 21-F — Agency Communication Center & Customer Notification Engine**

## Last QA
**Phase 21-F Browser QA Verification — PASSED & CERTIFIED**
- 28/28 scenarios
- no defects reported

## Current Status
Core product functionality through Phase 21 is built and certified. Project strategy is now focused on **real-user beta readiness**, not adding broad new modules.

## Next Development
1. Execute Subscription V2 enhancement against existing Phase 21-B architecture.
2. Audit sidebar static/misleading badges.
3. Run full beta release hardening across every current module.

## Major Pending
- professional dynamic Subscription UI
- Monthly/Yearly subscription
- Platform Owner editable pricing
- historical price snapshots if needed
- end-to-end beta hardening
- responsive full-app sweep
- performance full-app sweep
- realistic user testing
- controlled beta rollout

## Major Known Issues / Concerns
No active P0/P1 issue is known from the latest Phase 21-F browser QA.

Known beta concerns:
- Subscription UI currently appears insufficiently dynamic/professional
- sidebar badges appear static/misleading and require audit
- full-app performance/responsive quality should be revalidated before real-user beta

## Important Do-Not-Break Rules
- two internal roles only
- customer is not internal User
- Platform Owner has `agencyId = null`
- server-derived tenant context
- zero public supplier-cost/margin leakage
- 7-day automatic trial
- no paid plan required at signup
- subscription activation only after verified payment
- preserve historical subscription prices
- no duplicate subscription architecture
- no destructive cleanup
- current focus = stable, fast, responsive beta

---


---

# 60. MASTER CONTEXT VERIFICATION

This section records the final consistency audit performed before using this document as the TripDesk handover/master context.

## Verification method

The document was checked against:
- the available prior TripDesk conversation history and recovered project decisions;
- the current Master Context content itself;
- the known Phase 21-B through 21-F implementation history;
- the latest QA/security/performance/UI findings available in the conversation record.

Where the historic conversation did not independently prove an exact phase number, exact schema field, exact route name, or exact implementation detail, this document deliberately preserves the uncertainty and instructs the next AI to inspect the current codebase rather than inventing facts.

## 1. FINAL decisions missing

### Result: MOSTLY COMPLETE — ADDITIONS MADE

The audit confirmed that the major final decisions were already present:
- exactly two internal roles;
- Customer is not an internal role;
- Platform Owner `agencyId = null`;
- Supabase Auth UUID = Prisma `User.id`;
- server-derived tenant isolation;
- secure public token architecture;
- public commercial-data redaction;
- automatic 7-day trial;
- no plan/payment required at signup;
- paid plans visible from Day 1;
- Monthly + Yearly;
- manual UPI/Bank/UTR beta billing;
- Platform Owner verification;
- paid activation only after verification;
- historical price preservation;
- referenced plans are deactivated, not hard-deleted;
- no complex proration;
- no automatic Stripe/Razorpay recurring billing;
- SaaS billing separated from agency travel finance;
- Subscription V2 extends Phase 21-B;
- beta hardening before broad feature expansion.

Additional preserved clarifications were added for:
- Phase 21-F provider simulation limitation;
- communication idempotency;
- public notification token identity resolution;
- explicit 21-G uncertainty/status;
- beta feedback-loop strategy.

## 2. Old decisions accidentally presented as current

### Result: NO MATERIAL CONFLICT REMAINS AFTER THIS AUDIT

Historic ideas that could be confused with current architecture are explicitly marked:
- Travel Agent / Sales Agent role = removed;
- internal Customer role = removed;
- paid-plan selection before signup = superseded by automatic 7-day trial;
- flights = removed;
- visa assistance = removed;
- automatic gateway/recurring billing = postponed;
- broad automation/AI = future;
- 21-G = historical intended workstream, not a verified completed phase.

## 3. Removed features that could be reintroduced

### Result: COVERED

The document explicitly blocks reintroduction of:
- Travel Agent / Sales Agent internal role;
- internal Customer User/Auth role;
- visa assistance;
- flight booking module.

Postponed capabilities are also explicitly listed and must not be silently added during beta.

## 4. Missing development phase

### Result: ONE HISTORIC LABEL REQUIRED CLARIFICATION

`21-G` was mentioned in the historic roadmap as an intended final integration/regression workstream, but no independently verified completed implementation report is available.

Resolution:
- 21-G is NOT claimed as completed;
- its exact scope is NOT invented;
- the project transition after 21-F to beta hardening is treated as the current direction.

The exact `21-A` label/scope is also not independently recoverable with enough confidence to invent additional deliverables. The document now treats the post-Phase-20 gap-planning work as historical planning context rather than asserting unverified scope.

## 5. Missing QA phase/finding

### Result: COVERED WITH KNOWN LIMITATIONS

Preserved QA history:
- QA-01 Authentication;
- QA-02 Authorization/Routing;
- QA-03 Functional Modules;
- QA-04 Full Journey/UX/Security;
- QA-05 Performance/API/Database;
- QA-05B Browser Performance/Network;
- QA-06A Responsive/UI;
- QA-06B UI/UX follow-up;
- QA-07A Deep Security/Tenancy;
- Phase 20 final audit;
- Phase 20.6 production smoke;
- Phase 20.6B full browser QA;
- Phase 21-B through 21-F regression/QA;
- Phase 21-F browser QA.

Important findings retained:
- public quotation commercial-data leak = fixed;
- customer duplicate detection weakness = fixed;
- supplier duplicate detection = implemented;
- historic performance concerns = must be re-audited;
- responsive quality = must be re-audited across the full app;
- multi-tenant isolation = repeatedly passed and remains non-negotiable.

The four total QA-04 issues are not all independently recoverable from the available conversation. Only the two specifically known findings are named; the other two are not invented.

## 6. Missing database model/relationship

### Result: COVERED AT THE RECOVERABLE LEVEL; EXACT SCHEMA REMAINS CODE-AUTHORITATIVE

The document already preserves the major recoverable model families and relationships, including:
- Agency/User;
- SubscriptionPlan/Subscription/SubscriptionPayment;
- Customer/Enquiry/FollowUp;
- Trip/travelers/itinerary/inventory links;
- Quotation/public share;
- Booking/Payment/SupplierPayable/SupplierPayment/OperationalExpense;
- Supplier/RateSheet;
- TripOperation/HotelConfirmation/VehicleDispatch/ActivityConfirmation/OperationEvent/OperationalIssue;
- TravelDocument;
- CustomerFeedback/Referral;
- CustomerNotification/CustomerNotificationPreference;
- AgencyCommunicationSetting;
- PlatformAuditLog/PlatformAnnouncement/PlatformSetting.

Phase 21-F deterministic communication idempotency is explicitly preserved.

Exact model names/field names that varied historically must still be confirmed against `prisma/schema.prisma`.

## 7. Missing route

### Result: COVERED AS A RECOVERABLE ROUTE MAP, WITH CODE-AUTHORITY WARNING

The document preserves:
- public auth routes;
- quotation/trip/booking token routes;
- agency dashboard/business routes;
- admin routes;
- supplier duplicate/reactivation;
- communication;
- feedback;
- referrals;
- customer insights;
- reports;
- documents;
- subscription/payment APIs.

Because exact route inventories changed during development, the document explicitly states that the current repository is authoritative and that the Subscription route must not be assumed without inspection.

## 8. Missing authentication/authorization rule

### Result: COVERED

The final rules now explicitly preserve:
- Supabase Auth;
- SSR cookies;
- UUID mapping;
- two internal roles;
- singleton Platform Owner;
- Platform Owner `agencyId = null`;
- Agency Owner non-null agency;
- server-derived tenant scope;
- Platform Owner-only admin operations;
- Agency Owner-only tenant operations;
- public token identity resolution;
- IDOR protection;
- public invalid-token safety;
- server-only secrets;
- public commercial redaction.

## 9. Missing subscription/trial rule

### Result: COMPLETE

The document now preserves:
- 7-day automatic trial;
- no plan/payment during signup;
- trial shown as current plan;
- dynamic trial dates/days;
- paid plans visible from Day 1;
- Monthly/Yearly;
- manual UPI/Bank/UTR;
- pending verification;
- Platform Owner approval/verification;
- rejection reason and resubmission;
- activation only after verified payment;
- historical purchased-price snapshot;
- no hard delete of referenced plans;
- no complex proration;
- no automatic Stripe/Razorpay recurring billing;
- dynamic yearly savings;
- expiry behavior must respect current `requireWriteAccess()` implementation.

## 10. Missing Customer role decision

### Result: COMPLETE

Customer is explicitly an external business/traveler persona, not:
- `UserRole`;
- Supabase internal auth role;
- internal `User`.

Customer access is through secure token-scoped public experiences where applicable.

## 11. Missing upcoming development phase

### Result: COMPLETE

Current next task:
1. Subscription V2 / Beta Subscription Management.

Then:
2. Sidebar dynamic/misleading badge audit.
3. Full Beta Release Hardening.
4. Controlled real-agency beta.
5. Post-beta feature expansion based on feedback.

## 12. Mismatch between current implementation and documented architecture

### Result: NO CONFIRMED ARCHITECTURE MISMATCH; IMPLEMENTATION MUST BE RE-INSPECTED

Known historic mismatches/mock gaps were already addressed in Phase 21:
- legacy admin SaaS payment UI → Phase 21-B live DB billing;
- `useExperience()` persistence islands → Phase 21-C removed;
- placeholder `/reports` → Phase 21-D live reporting;
- customer portal feedback → Phase 21-E;
- communications/notification center → Phase 21-F.

The document does NOT claim that every current UI detail is already perfect. Subscription UI and sidebar badges remain beta concerns.

## 13. Security issue previously found and fixed

### Result: COMPLETE

The public quotation security leak is explicitly marked fixed and must never regress.

The customer duplicate-detection weakness is also marked fixed.

The public-data security invariant remains:
- no supplier cost;
- no buy price;
- no gross profit/margin;
- no supplier payable;
- no internal agency remarks.

Phase 21-F additionally requires public notification identity to resolve from the validated token, not client-provided IDs.

## 14. Important performance issue

### Result: COMPLETE

Historic performance concerns remain documented:
- duplicate API calls;
- repeated `/api/auth/me`;
- unnecessary `useEffect`;
- rerenders;
- `router.refresh()`;
- hard navigation;
- slow Prisma queries;
- N+1;
- excessive selections;
- missing indexes;
- dashboard loading.

Phase 21-F had no duplicate request loops in its browser QA, but this does NOT certify the whole application as perfectly optimized. A full beta performance sweep remains required.

## 15. UI/UX decisions that must be preserved

### Result: COMPLETE

Preserved:
- polished modern SaaS dashboard style;
- sidebar + header;
- KPI cards;
- data tables;
- filters/search;
- modals/drawers;
- badges/toasts;
- responsive grids;
- separate customer portal experience;
- full loading/empty/error/success handling;
- long text/large number safety;
- no `NaN`/`undefined`;
- desktop/tablet/mobile validation;
- no horizontal overflow or clipped controls.

Subscription-specific:
- strong Current Plan;
- Monthly/Yearly toggle;
- dynamic plan cards;
- clear CTA;
- payment status;
- renewal information;
- feature list;
- mobile-safe;
- no fake/static values.

## Final audit conclusion

### Coverage: COMPLETE WITH EXPLICIT HISTORICAL UNCERTAINTIES

The Master Context now contains the important finalized architecture, business, subscription, security, QA, performance, UI/UX, route, database-family, and roadmap decisions recoverable from the project history.

The remaining uncertainties are intentionally documented rather than guessed:
- exact pre-Phase-10 chronology;
- exact full Prisma schema field/relationship inventory;
- exact current route inventory;
- exact current Subscription route;
- exact two additional QA-04 findings;
- exact formal `21-A` scope/label;
- whether any historically discussed 21-G integration work was ever implemented.

These uncertainties do not block continuation because the document explicitly directs the next AI to inspect the current codebase and reports before making changes.

## MASTER CONTEXT VERIFICATION

- **Coverage:** COMPLETE
- **Missing information:** No known material product decision is missing. Remaining uncertainties are explicitly identified above rather than fabricated.
- **Conflicting decisions found:** Historical conflicts existed around paid-plan selection at signup, internal roles, and future feature scope.
- **Resolved conflicts:** Final architecture now wins: two internal roles only; Customer is external/token-based; no plan/payment at signup; 7-day trial; beta hardening before expansion. Historic 21-G/21-A uncertainty is explicitly marked.
- **Current development starting point:** Phase 21-F is complete and certified; project is at Beta Release Preparation / Subscription V2.
- **Next task:** Audit the existing Phase 21-B subscription implementation and execute the approved Subscription V2 / Beta Subscription Management changes only where actual code gaps exist, followed by regression and responsive browser QA.

---

# END OF MASTER HANDOVER

**Recommended first action in the new chat:** inspect the current Phase 21-B subscription implementation and execute the approved Subscription V2/Beta Subscription Management changes only where gaps exist. This document has been final consistency-audited; do not restart or redesign the project.


---

# 98. V3 CURRENT AUTHORITATIVE STATE — SEPTEMBER 10, 2026

This section is the current handoff authority for all work completed after the older V2 stopping point.

## 98.1 Current stopping point

The project has progressed beyond Subscription V2 and the old DEV-01/DEV-02/DEV-03/DEV-04 pending roadmap.

Current sequence:

```text
BH-07 Conditional Go
  ↓
DEV-01 Form UX Consistency — COMPLETE
  ↓
DEV-01 QA — COMPLETE
  ↓
DEV-02A Global UX Audit — COMPLETE
  ↓
DEV-02B Global UX Implementation — COMPLETE
  ↓
DEV-02 Final Closeout — COMPLETE
  ↓
DEV-03A Final Decision Lock & Compatibility Audit — COMPLETE
  ↓
DEV-03B Excel Import — COMPLETE
  ↓
DEV-03 QA — PASS WITH LOW-RISK FINDINGS / CLOSED
  ↓
DEV-04B Invoice V1 Implementation — COMPLETE
  ↓
DEV-04 QA — PASS / CLOSED
  ↓
DEV-05A Global UX Consistency & Responsive Audit — COMPLETE
  ↓
DEV-05B Global UX Consistency, Professional Messaging & Responsive Implementation — COMPLETE per implementation report
  ↓
CURRENT: DEV-05 QA — OPEN
  ↓
Next: Global UI Consistency QA / controlled fixes if required
  ↓
Pre-Beta Deployment / Operational Readiness
  ↓
Controlled Real-Agency Beta
```

**No new feature implementation is authorized merely because DEV-05 QA identifies a visual inconsistency.** Audit first; implement only after the findings are reviewed and a controlled implementation task is explicitly started.

## 98.2 V3 authority rules

- Actual current codebase remains the ultimate implementation authority.
- Sections 98+ are the latest documented project state.
- Where a V2 section says a feature is pending but Sections 98+ say it is complete, the V3 status wins.
- Do not treat agent-reported implementation claims as independently code-verified unless the report explicitly includes executed verification or the current repository is inspected.
- No destructive DB reset.
- No unrelated refactor.
- No architecture restart.
- Preserve all final business/security decisions.
- Every successful implementation or QA phase must update this master context with the final result.

---

# 99. V2 → V3 GAP AUDIT

## 99.1 Missing from V2

The following important post-V2 work was missing or not represented as current:

1. **DEV-01 was implemented and QA-closed.** V2 still listed form UX consistency as pending.
2. **DEV-02A/02B and final closeout were completed.** V2 still listed table scrolling, password visibility, and page scroll reset as pending.
3. **DEV-03A/03B were completed.** V2 still described Hotel/Rate Sheet Excel import as proposed/not implemented.
4. **DEV-03 QA was completed:** PASS WITH LOW-RISK FINDINGS.
5. **Hotel Code behavior was finalized/implemented:** auto-generated stable code in the `HTL-0001` style, agency-scoped, immutable after creation.
6. **Hotel/Rate Sheet import validation/preview workflow was implemented.** Manual and Excel workflows share the supported business fields/validation direction.
7. **DEV-04B Invoice V1 was implemented.** V2 still described invoices as a proposed feature.
8. **DEV-04 QA was completed:** 60/60 Invoice matrix + 23/23 Excel regression, TypeScript PASS, production build PASS, 0 blocking defects.
9. **All 37 Invoice V1 decisions were finalized.** V2 contained only unresolved Invoice design questions and must no longer be treated as current.
10. **The Invoice/Payment financial snapshot and lifecycle architecture is now implemented and verified.**
11. **DEV-05A global UX consistency audit was completed.** It found 31 native confirmation-dialog usages across 15/20 reviewed page/component files, plus messaging/loading/header/status/responsive inconsistencies.
12. **DEV-05B was implemented per agent report.** Shared ConfirmDialog, StatusBadge, improved error extraction, standardized loading patterns, PageHeader reuse, responsive hardening, and global-search invoice entry were added.
13. **DEV-05 QA is now the current open phase.**
14. A new **Global UI Consistency finding** was identified during manual browser inspection: `/invoices` and `/documents` visibly use different page/header/filter/table/card/button patterns, and `/customers` provides another established pattern. This must be audited across the entire application before DEV-05 is closed.

## 99.2 Outdated in V2

These V2 statements are now stale and must not be used as current state:

- Subscription V2 = planned. **Current: implemented + verified.**
- DEV-01 = pending. **Current: complete + QA complete.**
- DEV-02 table scrolling/password visibility/page scroll = pending. **Current: implemented/closed through DEV-02.**
- DEV-03 Hotel/Rate Sheet Excel import = proposed/not implemented. **Current: implemented + QA closed.**
- DEV-04 Customer Invoice = proposed/not implemented. **Current: implemented + QA closed.**
- The old V2 roadmap ending at DEV-04 QA is obsolete.
- The old V2 current stopping point of Subscription V2 is obsolete.
- Old V2 statements that invoice design still required decisions are obsolete because all 37 Invoice V1 decisions are now locked.
- Old V2 statements that sidebar/static UI and broad UX were merely future concerns are superseded by DEV-05A/05B and the current DEV-05 QA findings.

## 99.3 Changed/currently clarified decisions

- Hotel/Rate Sheet Excel import moved from proposed to implemented.
- Hotel Code is an auto-generated stable agency-scoped identifier; exact persistence implementation must still be treated as code-authoritative.
- Invoice V1 is no longer a design exercise; its lifecycle, numbering, payments, PDF, cancellation, replacement, and security rules are locked.
- DEV-05 is now a global UI consistency and professional UX verification phase, not merely a native-dialog replacement exercise.
- The current product must be responsive down to **320px** for authenticated UI where practical; intentional table horizontal scrolling must remain contained inside the table region.

## 99.4 Newly completed development

### Subscription V2
- Dynamic DB-backed plan catalog.
- Monthly/Yearly.
- 7-day trial.
- Manual UPI/Bank + UTR.
- Platform Owner verification/rejection.
- Historical price snapshot protection.
- Tenant isolation.

### DEV-01
- Form validation error rendering consistency.
- Existing Formik/Yup patterns preserved.
- Zod server/API validation preserved.
- Loading/server/form-level errors standardized where required.

### DEV-02
- Table internal scrolling.
- Password visibility controls.
- Page scroll reset behavior.
- Related global UX fixes discovered during implementation.

### DEV-03
- Hotel Excel import.
- Hotel Rate Sheet Excel import.
- Strict file/column/row/business validation.
- Preview before confirmation.
- Safe create/update workflow.
- Sample Download retained on Hotel and Hotel Rate import screens with production-aligned columns/validation and realistic non-private sample data.
- Existing hotel records received stable generated Hotel Codes during implementation/backfill.

### DEV-04B
- Customer Invoice V1 lifecycle.
- Invoice snapshot model/workflow.
- Invoice numbering.
- Invoice line items/discounts.
- Due dates.
- Payment recording/partial payments/voiding.
- Status and overdue calculation.
- Cancellation/replacement.
- Invoice PDF.
- Search/filter/list/detail workspace.
- Operational history.
- Tenant/security enforcement.

### DEV-05B
Per the implementation report supplied during the conversation:
- Shared `ConfirmDialog` created at `src/components/shared/confirm-dialog.tsx`.
- Shared `StatusBadge` created at `src/components/shared/status-badge.tsx`.
- `getErrorMessage` enhanced in `src/lib/utils.ts` to avoid leaking raw Prisma/SQL/internal details.
- Native confirmation/alert/prompt usages reported at zero after implementation.
- List/table loading standardized with shared skeleton patterns.
- Button pending/loading states improved.
- Shared `PageHeader` reused across core modules.
- Error/empty states standardized using shared components where applicable.
- Global Search includes Invoices.
- TopBar and responsive controls hardened for small widths.
- Tables/toolbars/filters wrapped or scrolled safely for small screens.
- No DB migrations/schema changes/auth/RLS changes were reported for DEV-05B.

**Verification qualification:** DEV-05B implementation is currently **agent-reported**, not independently verified in this chat. DEV-05 QA must verify the actual code and browser behavior before the phase can close.

## 99.5 Newly completed QA

### DEV-03 QA
- Final verdict: **PASS WITH LOW-RISK FINDINGS / CLOSED**.
- 60-point automated Invoice-related suite was not part of DEV-03; the relevant DEV-03 Excel suite reported **23/23 passed**.
- TypeScript/build passed.
- Regression against relevant Phase 21-E/21-F functionality passed.
- Hotel Code backfill: 367 existing hotels reported with 0 null/malformed codes.
- Batch import performance improved from approximately 15.48s for 105 rows to approximately 925ms in the representative test.
- Low-risk finding: Hotel `hotelCode` had an application-level uniqueness/concurrency hardening consideration because the reported schema did not have a DB unique constraint; do not silently change the schema without code/schema verification and an explicit hardening decision.

### DEV-04 QA
- Final verdict: **PASS — 100% VERIFIED, 0 BLOCKING DEFECTS**.
- Invoice matrix: **60/60 passed**.
- DEV-03 Excel regression: **23/23 passed**.
- `npx tsc --noEmit`: PASS, 0 errors.
- `npm run build`: PASS.
- Business decision compliance: **37/37**.
- Security/tenant isolation: zero confirmed cross-tenant vulnerabilities / IDOR risks in the tested invoice scope.
- Parallel invoice issuance collision test passed with distinct sequential numbers and no observed sequence collision/gap in the tested scenario.
- PDF snapshot/watermark behavior verified.
- Public `/q/*`, `/trip/*`, `/b/*` routes audited with zero invoice exposure.
- Scope exclusions verified.
- One test-script TypeScript assertion issue involving a nullable `invoiceNumber` was fixed with a non-null assertion; final TypeScript result was clean.

### DEV-05A
- Read-only global UX consistency audit completed.
- Found **31 native `confirm()` / `window.confirm()` usages** across 15/20 reviewed page/component files before DEV-05B.
- Also identified inconsistent error messaging, loading presentation, page-header/container patterns, status badges, empty/error states, global search coverage, and 320px responsive risks.
- Verdict: **NEEDS UX POLISH**, with no critical functional/data-loss defects reported.

### DEV-05B
- Agent report: implementation **COMPLETE / PASS**.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- Invoice 60/60 regression: PASS.
- Excel 23/23 regression: PASS.
- Responsive code-level verification reported for 320, 360, 375, 390, 414, 768, 1024+.
- Browser-level DEV-05 QA is **NOT YET CLOSED**.

---

# 100. INVOICE V1 — FINAL 37-DECISION LOCK

This section supersedes the old V2 Invoice proposal/design sections.

## Decision #1 — Relationship
One Booking → one active Invoice → multiple Payments. Cancelled historical invoices may remain. One active invoice per booking.

## Decision #2 — Creation timing
A Confirmed Booking does not automatically create an invoice. Agency Owner manually creates the invoice.

## Decision #3 — Lifecycle / immutability
- `DRAFT` is editable.
- `ISSUED`, `PARTIALLY_PAID`, and `PAID` are immutable.
- `CANCELLED` is terminal.
- Correction = cancel old invoice + replacement.

## Decision #4 — Payment relationship
Every customer payment belongs to an Invoice. Partial/advance payments are allowed after invoice creation. No overpayment. No separate advance-payment architecture. No direct booking payment architecture for invoice V1.

## Decision #5 — Customer invoice access
Internal TripDesk + PDF only. No public invoice URL, customer invoice login, or online Pay Now in V1. Agency may manually send the PDF through its normal communication channels.

## Decision #6 — Invoice statuses
Exact business statuses:
- `DRAFT`
- `ISSUED`
- `PARTIALLY_PAID`
- `PAID`
- `CANCELLED`

No stored `UNPAID`. `OVERDUE` is calculated when balance > 0 and current date > due date.

## Decision #7 — Numbering
Agency-specific sequential numbers such as `INV-0001`. Number generated on issue, not draft. Unique within agency, immutable, never reused, concurrency-safe. No custom prefix/year in V1.

## Decision #8 — Financial snapshot
Invoice is an independent financial snapshot seeded from the confirmed booking/quotation. Draft can be edited. After issue, source changes do not silently change the invoice. `Subtotal − Discount = Total`. No GST/tax.

## Decision #9 — Due date
Agency Owner chooses due date. Required before issue. Due date ≥ invoice date. Same-day allowed. Due date may be after travel date; warning is acceptable. Immutable after issue.

## Decision #10 — Line items / discount
Multiple editable draft line items. Each line has Description, Quantity, Rate, Amount = Qty × Rate. Invoice-level discount only; fixed or percentage. No negative total. No line-level discount/tax/supplier margin/multi-currency.

## Decision #11 — Draft behavior
Invoice only from Confirmed Booking. If a draft already exists, continue it. Snapshot customer/booking/billing information. Draft can be edited and deleted. Deleting a draft consumes no number. Issue is explicit and transaction-safe.

## Decision #12 — Cancellation
Only Agency Owner. `ISSUED`/`PARTIALLY_PAID` can be cancelled; `PAID` cannot. Draft is deleted, not cancelled. Cancellation requires reason/timestamp/user. Payments remain retained. Booking is not auto-cancelled. Invoice cancellation does not auto-cancel booking. No credit-note/refund workflow.

## Decision #13 — Payment recording/correction
Only Agency Owner. Methods: Cash, UPI, Bank Transfer, Card, Other. Payment date defaults to today; future dates forbidden. Amount > 0 and ≤ remaining balance. Reference and notes optional. No new payment on cancelled invoice. Payments are immutable after creation. Correction uses `ACTIVE → VOIDED` with mandatory reason/user/timestamp. Voided payments are excluded from paid/balance/status and are not restorable.

## Decision #14 — Invoice PDF
PDF is generated from the stored invoice snapshot, not current booking financial values. Includes agency/customer/booking/invoice data, line items, discount, total, active paid amount, balance, active payment history, and branding/logo where supported. Draft PDF is marked `DRAFT — NOT AN ISSUED INVOICE` and has no invoice number. Issued PDF represents the immutable issued snapshot. Cancelled PDF is marked cancelled and includes cancellation metadata. Filename: `Invoice-{InvoiceNumber}.pdf`; draft uses a booking-based fallback. PDFKit is reused.

## Decision #15 — Notes/instructions
Optional customer-facing Invoice Notes and Payment Instructions. Internal Notes are separate and agency-only. Draft values are editable; issued values are immutable snapshots. Booking notes do not auto-sync. No new Payment Terms architecture. Reuse existing Agency Settings payment information where appropriate.

## Decision #16 — Access/actions
Dedicated `/invoices`. Booking links to current active invoice and cancelled history. List search: invoice number, customer name, customer phone, booking number. Filters: status, payment state, overdue, invoice date, due date. Detail is the billing workspace. Actions follow lifecycle: draft edit/preview/issue/delete; issued/partially paid download/print/record payment/cancel; paid download/print; cancelled download/print/create replacement.

## Decision #17 — Eligibility
**Invoice creation is permitted only from a Booking in the `CONFIRMED` status.** Pending/unconfirmed/cancelled bookings are rejected. The implementation must inspect the exact current Booking status enum before coding and must never invent or rename status values.

## Decision #18 — Snapshot fields
Final recommended snapshot content: invoice/agency/booking identifiers, invoice number/date/due date/status, customer name/phone/email/address, booking number/trip/package/travel dates, agency branding/contact data, subtotal/discount/total, customer-facing notes/payment instructions, and internal notes. Issued invoice remains correct after source changes.

## Decision #19 — Invoice date
Draft creation date by default. Agency Owner may edit in draft. Future invoice dates are forbidden. Immutable after issue.

## Decision #20 — Financial validation
Before issue: at least one line item; quantity > 0; rate ≥ 0; amount = qty × rate; subtotal correct; discount ≥ 0 and ≤ subtotal; valid non-negative total; due date exists; due date ≥ invoice date. Final server-side validation is authoritative.

## Decision #21 — Currency
INR only. Indian formatting. No conversion/multi-currency.

## Decision #22 — Booking changes
Booking changes do not automatically update an invoice draft or issued invoice. Booking UI may show a warning where supported.

## Decision #23 — Booking cancellation
Booking cancellation and invoice cancellation are independent lifecycles. Neither automatically cancels the other.

## Decision #24 — Number concurrency
Invoice numbering must be DB-safe and concurrency-safe, with no duplicate numbers/gaps/collisions under supported concurrent issuance. Cancelled invoice numbers remain consumed.

## Decision #25 — Payment status
- DRAFT → DRAFT.
- Issued + no active payment → ISSUED.
- Active payment < total → PARTIALLY_PAID.
- Active payment = total → PAID.
- Cancelled → CANCELLED.
Voided payments do not count.

## Decision #26 — Overdue
Balance > 0 AND current date > due date. UI may show `ISSUED · OVERDUE` or `PARTIALLY_PAID · OVERDUE`. No cron is required.

## Decision #27 — Deletion
Only DRAFT invoices are deletable. Issued, partially paid, paid, and cancelled invoices are not deletable.

## Decision #28 — Replacement
Cancelled invoice → replacement draft → new invoice ID → new issue number. Same booking. Old cancelled invoice remains history. Old number is never reused.

## Decision #29 — Audit history
Basic operational events: Draft Created, Updated, Issued, Payment Recorded, Payment Voided, Cancelled, Replacement Created. Include user/time/reason where applicable. This is not a full accounting audit ledger.

## Decision #30 — Permissions
`AGENCY_OWNER` performs normal invoice operations. `PLATFORM_OWNER` does not receive normal agency billing workflow. No new invoice-specific role.

## Decision #31 — Server security
Every invoice/payment operation must authenticate, authorize, derive agency server-side, validate booking agency ownership, validate invoice agency ownership, validate payment ownership, and never trust client-supplied `agencyId`.

## Decision #32 — Performance
Use server-side pagination/filter/search, minimal list fields, no list-level payment-history loading, no N+1, and justified indexes. Detail loads detailed data.

## Decision #33 — UX states
Invoice UI must support loading, empty/no-invoice, draft, error, permission denied, not found, payment submission, void, cancellation, PDF generation/download, and other applicable pending states using the established shared UI patterns.

## Decision #34 — Notifications
Use existing Sonner/toast patterns for invoice creation, issue, payment, void, cancellation, and draft deletion. Errors must be actionable. No automated email/WhatsApp invoice delivery in V1.

## Decision #35 — Search/filter
Search invoice number, customer name, customer phone, booking number. Filters: status, payment state, overdue, invoice date, due date. Sort: invoice date, due date, invoice number, amount. Server-side. No saved filters/reporting.

## Decision #36 — Reporting
No dedicated accounting reports. Optional operational totals: Total Invoices, Total Billed, Total Paid, Total Outstanding, filtered by current search/filter. No P&L, balance sheet, GST, supplier payables, ledger, or revenue recognition module added to Invoice V1.

## Decision #37 — Scope
Included: full invoice lifecycle, numbering, snapshot, line items, discount, due date, PDF, payments/partial/void, balances/statuses, overdue, cancellation/replacement, history, search/filter, security. Excluded: GST/tax, credit/debit notes, refund accounting, supplier invoices/payables, full accounting ledger, P&L, online customer payment, public invoice URL, customer invoice login, automated WhatsApp/email, multi-currency, payment gateway, recurring invoices, and using invoice records as SaaS subscription billing.

---

# 101. HOTEL / RATE SHEET EXCEL — CURRENT STATE

## Final architecture

- Hotel Master remains hotel-level data.
- RateSheet remains rate-level data.
- No standalone `RoomType` model.
- `roomType` remains a string in the existing architecture.
- Supplier is **ON HOLD** as a product concept for new redesign work. Existing supplier models/code/routes/data must not be deleted or refactored merely because Hotel/RateSheet flows can work without them.
- Do not create a Supplier-vs-Hotel split.

## Import workflow

```text
Download Template
  ↓
Fill Excel
  ↓
Upload .xlsx
  ↓
Validate file format
  ↓
Validate columns
  ↓
Validate rows/data types/business rules
  ↓
Preview
  ↓
User confirms
  ↓
Create / Update
```

Manual entry and Excel import must use the same supported business fields and business rules.

## Hotel import

- One row = one Hotel master record.
- Hotel Code is generated/stable in the application; import handling must not silently create conflicting codes.
- Sample Download must remain visible and use production-aligned columns/validation with realistic non-private sample data.

## Rate Sheet import

- One row = one hotel rate record.
- Hotel Code resolves to the Hotel master.
- Room Type and Meal Plan remain fields, not a RoomType relation.
- Vehicle/activity-only fields are not part of the Hotel Rate Sheet import.
- Do not introduce GST/tax behavior merely because a legacy RateSheet field exists.

## Current QA status

DEV-03 and its QA are complete. Any future Excel hardening must preserve strict validation, preview, confirmation, tenant isolation, and safe update/create behavior.

---

# 102. DEV-05 — CURRENT GLOBAL UI CONSISTENCY AUDIT

## 102.1 DEV-05A findings

Before DEV-05B, the read-only audit found:

- 31 native `confirm()` / `window.confirm()` instances across 15/20 reviewed page/component files.
- Generic/error messages that could be too technical or inconsistent.
- Some `toast.error(err.message || ...)` patterns with potential internal-error exposure.
- Inconsistent terminology in some modules.
- List pages often used centered spinners instead of shared table/page skeletons.
- Page headers/container widths differed between modules.
- Status badges were duplicated inline rather than consistently using a shared component.
- Some ad-hoc error banners existed instead of shared `ErrorState`.
- Global Search did not include Invoices.
- TopBar and KPI layouts had 320px crowding risks.
- Tables generally had horizontal scrolling, but responsive behavior required broader consistency review.

## 102.2 DEV-05B implementation report

Reported completed changes:

- `src/components/shared/confirm-dialog.tsx`
- `src/components/shared/status-badge.tsx`
- enhanced `src/lib/utils.ts` `getErrorMessage`
- shared loading/skeleton patterns
- PageHeader reuse
- shared ErrorState/EmptyState usage
- invoice global-search entry
- TopBar small-screen hardening
- toolbar/filter/table responsive improvements
- confirmation flows migrated across core modules

The implementation report claims zero user-facing native `confirm`, `window.confirm`, `alert`, `window.alert`, `prompt`, and `window.prompt` after the change.

## 102.3 NEW CURRENT FINDING — GLOBAL PAGE UI INCONSISTENCY

Manual browser inspection after DEV-05B found visible structural differences between `/invoices` and `/documents`, with `/customers` also showing another established list-page pattern.

Observed examples:

### `/documents`
- Large rounded PageHeader card.
- Breadcrumb/context row.
- Large title + description.
- Right-side `Refresh List` action.
- Separate search/filter card.
- Large empty-state card.

### `/invoices`
- Title/description directly on page background rather than the same large header-card pattern.
- Different title/icon structure.
- Dark primary `Create from Booking` button instead of the same apparent primary-button treatment used elsewhere.
- KPI cards before the search/filter area.
- Separate search/filter card and table card.

### `/customers`
- Large PageHeader card.
- KPI cards.
- Search integrated into the table workspace.
- Different but polished table/list structure.

### Interpretation

These differences are **not automatically defects** because different modules may legitimately have different information architecture. However, the application should share a consistent TripDesk design language and shared primitives. The current finding indicates that `/invoices`, `/documents`, and other list modules require a systematic consistency audit before DEV-05 can close.

## 102.4 DEV-05 QA required scope

Audit the entire authenticated application, not only `/invoices` and `/documents`.

Review at minimum:

- Dashboard
- Enquiries
- Customers
- Trips
- Quotations
- Bookings
- Invoices
- Documents
- Operations
- Hotels
- Rate Sheets
- Suppliers
- Vehicles
- Activities
- Finance
- Payments
- Follow-ups
- Feedback & Reviews
- Referrals & Rewards
- Settings
- Platform Owner/admin pages

Also inspect important create/edit/detail/nested routes.

### Consistency dimensions

- PageHeader structure
- breadcrumb/context treatment
- page title/subtitle hierarchy
- container/max-width/padding
- primary/secondary/destructive button styles
- button height/icon alignment/loading state
- search input dimensions/icon/placeholder
- filter/select dimensions and wrapping
- KPI cards
- ordinary cards
- tables
- table header/row/footer/pagination
- status badges
- action menus
- dialogs
- forms/field labels/errors
- empty states
- error states
- loading skeletons
- toast terminology
- typography
- spacing/radius/borders/shadows
- icon sizing/alignment
- responsive behavior
- terminology consistency

### Important principle

Do **not** force every page to have identical structure. Dashboard, detail, form, quotation-builder, invoice-billing, and document pages may legitimately differ. The objective is:

> **Different information architecture where necessary; one coherent TripDesk visual/design language everywhere.**

### Canonical-pattern rule

Do not assume `/invoices` is the canonical design and do not assume `/documents` is canonical. Inspect the existing shared components and strongest established patterns in the codebase before deciding which implementation should be reused.

## 102.5 DEV-05 QA is read-only unless explicitly authorized

For the current QA task:

- do not patch defects during the audit;
- do not refactor UI while measuring it;
- do not redesign the product;
- report exact route/file/component and severity for each inconsistency;
- if implementation is later authorized, make the smallest controlled change and regression-test it.

---

# 103. CURRENT BUG / ISSUE REGISTER

## FIXED + VERIFIED

1. Public quotation commercial-data exposure — fixed; preserve public DTO redaction.
2. Customer duplicate detection — fixed and verified.
3. Customer portal cross-agency booking-number collision — fixed and verified; do not revert agency-safe lookup.
4. Rate-costing N+1/repeated rate lookup behavior — fixed via batching; do not revert.
5. Subscription `availablePlans` TypeScript gap — fixed.
6. DEV-03 Excel import implementation defects — final QA passed with only low-risk findings.
7. Invoice lifecycle/numbering/payment/PDF/security defects covered by DEV-04 QA — 60/60 passed.
8. Native confirmation dialogs targeted by DEV-05B — implementation report claims zero remaining user-facing native dialogs.
9. Error extraction/security messaging improvements — implemented per DEV-05B report; final QA still required.

## LOW-RISK / OPEN HARDENING

1. Hotel Code DB-level uniqueness/concurrency hardening may remain a future low-risk concern depending on the exact current schema. **REQUIRES CODEBASE VERIFICATION** before any schema change.
2. Rate limiting.
3. APM/advanced monitoring.
4. Middleware → proxy naming migration.
5. Real-world beta performance monitoring.

## CURRENT OPEN UX QA FINDING

**Global UI consistency:** `/invoices`, `/documents`, `/customers`, and other modules may not share sufficiently consistent page/header/search/filter/table/card/button patterns.

Severity: **UX consistency / pre-beta quality**, not currently a known data-loss or security defect.

Status: **OPEN — DEV-05 QA**.

## Important runtime lesson — stale Prisma Client

A prior local development runtime issue caused `prisma.invoice` to be undefined and `/api/invoices`/summary to return 500. Root cause was a long-running Next.js dev process retaining a stale global Prisma client after the Invoice model was added. Fresh test/build processes passed. Restarting the dev server resolved the issue. No DB/code fix was required.

Do not misdiagnose this historic local HMR/global singleton issue as a current schema defect without reproducing it.

---

# 104. CURRENT TEST / BUILD BASELINE

## Subscription V2

- 46 lifecycle/tenant-isolation tests.
- 118 assertions.
- 100% passed.

## DEV-03 Excel

- 23/23 DEV-03 Excel assertions/tests reported passed.

## DEV-04 Invoice

- 60/60 Invoice matrix passed.
- 23/23 Excel regression passed.
- TypeScript 0 errors.
- Production build passed.
- 37/37 Invoice business decisions compliant.
- 0 blocking defects.

## DEV-05B

Agent-reported:
- TypeScript PASS.
- Production build PASS.
- Invoice 60/60 PASS.
- Excel 23/23 PASS.
- Code-level responsive review at 320/360/375/390/414/768/1024+.

**DEV-05 browser QA remains open.** Do not claim DEV-05 complete until actual browser verification is performed.

## Current rule

Historical test counts are evidence, not substitutes for current execution. The actual repository's executed test/build output is authoritative.

---

# 105. CURRENT DATABASE / SCHEMA STATUS AFTER DEV-04

The older V2 document's 45-model inventory predates Invoice V1 and therefore must not be treated as the exact current model count.

Invoice V1 added invoice-related persistence/sequence structures during DEV-04. The exact current Prisma model names/count and all relations must be obtained from the actual current `prisma/schema.prisma`.

**CURRENT EXACT MODEL COUNT: UNKNOWN — REQUIRES CODEBASE VERIFICATION.**

Known DEV-04 database/index facts from the final QA report include:

- Invoice indexes reported for `[agencyId,status]`, `[agencyId,invoiceNumber]`, `[agencyId,invoiceDate]`, `[agencyId,dueDate]`, and `[bookingId]`.
- Invoice sequence uniqueness reported as agency-scoped (`[agencyId]`).
- Payment invoice relation/index reported on `[invoiceId]`.

Do not infer additional invoice models/fields beyond what the current schema proves.

---

# 106. CURRENT ROUTE STATUS AFTER DEV-04/DEV-05

Known current application routes include:

- `/invoices`
- `/invoices/[id]`
- `/documents`
- `/customers`
- `/trips`
- `/quotations`
- `/bookings`
- `/payments`
- `/operations`
- `/hotels`
- `/rate-sheets`
- `/suppliers`
- `/vehicles`
- `/activities`
- `/enquiries`
- `/communications`
- `/reports`
- `/feedback`
- `/referrals`
- `/customer-insights`
- `/subscription`
- `/admin/*`

Exact route inventory and nested paths remain code-authoritative. **REQUIRES CODEBASE VERIFICATION** before creating or renaming routes.

Public families remain:

- `/q/*`
- `/trip/*`
- `/b/*`
- `/customer/*` where implemented

Invoice V1 specifically must not expose invoice data through those public routes.

---

# 107. FINAL FEATURE STATUS MATRIX — V3

| Area | Status | Notes |
|---|---|---|
| Authentication | COMPLETE | Supabase Auth + SSR |
| Authorization/RBAC | COMPLETE | Exactly two internal roles |
| Multi-tenancy | COMPLETE + VERIFIED | Server-derived agency scope |
| Customer architecture | COMPLETE + VERIFIED | External record, not User/Auth |
| Customer duplicate detection | FIXED + VERIFIED | Preserve |
| Public quotation security | FIXED + VERIFIED | Preserve commercial redaction |
| Subscription V2 | COMPLETE + VERIFIED | 46 tests / 118 assertions |
| BH-00 → BH-07 | COMPLETE | BH-07 Conditional Go |
| DEV-01 | COMPLETE | Form UX consistency |
| DEV-01 QA | COMPLETE | QA closed |
| DEV-02A | COMPLETE | Global UX audit |
| DEV-02B | COMPLETE | Global UX implementation |
| DEV-02 Closeout | COMPLETE | Closed |
| DEV-03A | COMPLETE | Decision/compatibility audit |
| DEV-03B | COMPLETE | Hotel/Rate Sheet Excel import |
| DEV-03 QA | COMPLETE | PASS WITH LOW-RISK FINDINGS |
| DEV-04B Invoice V1 | COMPLETE | Full lifecycle implemented |
| DEV-04 QA | COMPLETE | PASS, 60/60 + regressions |
| DEV-05A | COMPLETE | Global UX consistency audit |
| DEV-05B | COMPLETE per implementation report | Needs final QA verification |
| DEV-05 QA | **OPEN / CURRENT** | Global UI consistency + browser verification |
| Deployment readiness | NOT STARTED AS CURRENT PHASE | Only after DEV-05 QA closes |
| Controlled real-agency beta | NOT STARTED | After deployment readiness |

---

# 108. FINAL ROADMAP — V3

## Current phase

**DEV-05 QA — Global UI Consistency, Professional Messaging & Responsive Verification**

## Immediate QA objective

Verify that DEV-05B actually produced a coherent, professional TripDesk UI across all major pages, with special attention to the newly observed `/invoices` vs `/documents` vs `/customers` differences.

## Required sequence

```text
DEV-05 QA
  ↓
If PASS
  ↓
DEV-05 CLOSEOUT
  ↓
Pre-Beta Deployment / Operational Readiness
  ↓
Controlled Real-Agency Beta
```

If DEV-05 QA finds UI defects:

```text
DEV-05 QA
  ↓
Document findings
  ↓
Review/authorize controlled fixes
  ↓
DEV-05C / targeted UX implementation (name only after explicitly decided)
  ↓
Regression + browser QA
  ↓
DEV-05 Closeout
```

Do not create a new phase name merely by assumption.

## Deployment gate

Do not begin real-agency onboarding until:

- DEV-05 QA passes.
- TypeScript/build are clean after any fixes.
- Invoice/Excel regressions remain green.
- Core security/tenant isolation remains intact.
- Responsive/browser QA is acceptable at the required widths.
- Production hosting/environment/domain/Auth/backup/integration prerequisites are verified.

---

# 109. DO NOT REINTRODUCE — V3 COMPLETE LIST

The next AI must not reintroduce or resurrect any of the following without an explicit new product decision:

### Roles/auth
- Travel Agent role.
- Sales Agent role.
- Sub-Agent role.
- Internal Customer role.
- Customer Supabase Auth account.
- Customer password/customer signup.
- Plaintext passwords.

### Data architecture
- Standalone `RoomType` Prisma model for the current Hotel/RateSheet architecture.
- Separate Room Types master or separate Room Types Excel sheet.
- Supplier-vs-Hotel conceptual split that was rejected/on hold.
- Duplicate subscription architecture.
- Unnecessary duplicate payment architecture.

### Product scope
- GST/tax feature in Invoice V1.
- Lead-source tracking in V1 where it was explicitly excluded.
- Individual traveler profile system.
- Flight booking module.
- Visa assistance.
- Public invoice URL.
- Customer invoice login.
- Online customer invoice Pay Now.
- Automatic invoice creation on every booking.
- Credit/debit note workflow.
- Full invoice accounting ledger/P&L/GST module.
- Supplier invoice/payables inside Customer Invoice V1.
- Multi-currency invoice engine.
- Recurring invoices.
- Invoice as SaaS subscription billing mechanism.
- Automatic Stripe/Razorpay recurring SaaS billing in beta.
- Complex proration/refund engine.
- Usage-based billing/coupons/seat billing unless separately approved.
- AI assistant / broad automation / mobile-native app before beta evidence justifies them.

### Security/engineering
- Client-trusted `agencyId`.
- Cross-tenant lookup without server-side tenant validation.
- Public supplier cost/margin/internal notes.
- Service-role keys/secrets in browser.
- Destructive DB reset without explicit user authorization.
- Direct spreadsheet insertion without validation/preview/confirmation.
- Hard reloads used as a shortcut for application navigation/scroll fixes.
- Unrelated architecture rewrites.
- Silent schema changes.
- Invented enum/status names.
- Claims of browser QA/tests without actual execution.

### UX
- Do not force every module into an identical layout.
- Do not create one-off styling when a shared TripDesk component already exists without justification.
- Do not choose `/invoices` or `/documents` as the canonical design by assumption; inspect shared patterns first.
- Do not sacrifice mobile usability for desktop aesthetics.

---

# 110. CURRENT UNKNOWN / REQUIRES CODEBASE VERIFICATION

The following are intentionally not guessed:

1. Exact current Prisma model count after DEV-04 invoice schema additions.
2. Exact invoice-related Prisma model names/fields/relations beyond what DEV-04 QA explicitly reported.
3. Exact current route inventory, including all nested invoice/document/admin paths.
4. Exact current implementation of all DEV-05B changes.
5. Actual browser result of DEV-05 QA.
6. Whether every listed shared component is used consistently across every module.
7. Whether Hotel Code has a DB-level unique constraint in the current live schema.
8. Exact current Booking status enum spelling; use the codebase before any future invoice eligibility change.
9. Exact current Subscription route/API inventory.
10. Exact production environment/deployment state.

When any of these matters, inspect the current repository rather than inferring from this document.

---

# 111. CONTINUATION PROTOCOL — NEW CHAT

When this V3 file is uploaded into a new ChatGPT conversation, the AI must:

1. Read the entire file.
2. Treat Sections 98+ as the current authoritative update layer.
3. Inspect the actual current codebase before making implementation claims.
4. Understand that Subscription V2, DEV-01, DEV-02, DEV-03, and DEV-04 are already completed.
5. Understand that DEV-05B is reported complete but DEV-05 QA is still open.
6. Start with the **DEV-05 QA / Global UI Consistency** problem if asked to continue from the current stopping point.
7. Do not implement fixes during a read-only QA request unless explicitly authorized.
8. If a UI inconsistency is found, distinguish legitimate module-specific information architecture from inconsistent shared design primitives.
9. Preserve Invoice V1 Decisions #1–#37 exactly.
10. Preserve the rule: invoice creation only from `CONFIRMED` Booking status.
11. Preserve Hotel/RateSheet architecture and Excel import safety.
12. Preserve all security and tenant-isolation invariants.
13. Preserve the current two-role system.
14. Never expose or request secrets unnecessarily.
15. Do not perform destructive database operations.
16. After any authorized successful implementation or QA phase, update this master context with the new status and findings.

---

# 112. FINAL V3 CONSISTENCY AUDIT

## A. Missing post-V2 work
**COVERED.** DEV-01 through DEV-05B and their known QA states are added.

## B. Stale V2 states
**COVERED.** Subscription V2, DEV-01, DEV-02, DEV-03, and DEV-04 stale pending statements are explicitly superseded.

## C. Invoice decisions
**COMPLETE.** All 37 Invoice V1 decisions are captured with the confirmed-booking eligibility rule.

## D. Booking → Invoice
**COMPLETE.** Invoice creation requires Booking status `CONFIRMED`; exact enum must be code-verified before future changes.

## E. Excel import
**COMPLETE.** DEV-03 implementation and QA status are recorded, including the low-risk Hotel Code uniqueness concern.

## F. UI/UX
**CURRENT OPEN ITEM.** DEV-05B is recorded as implementation-complete by agent report, while DEV-05 QA remains open because actual cross-page UI consistency has not yet been certified.

## G. Security
**PRESERVED.** Two-role RBAC, server-derived tenant scope, public token security, commercial redaction, secret handling, and no plaintext passwords remain binding.

## H. Database
**SAFE WITH EXPLICIT UNCERTAINTY.** Known model/index facts are recorded without inventing invoice model names/count. Exact live schema remains authoritative.

## I. Routes
**SAFE WITH EXPLICIT UNCERTAINTY.** Major current routes are recorded, but exact inventory remains code-authoritative.

## J. Current roadmap
**CLEAR.** Current phase is DEV-05 QA. Deployment/beta is gated behind DEV-05 closure and operational readiness.

## K. No reintroduction
**COVERED.** Rejected roles, models, financial architecture, security shortcuts, and scope expansions are explicitly blocked.

## L. New-chat continuity
**PASS.** A new AI should understand the current project state without relying on the old conversation, provided it also respects the explicit codebase-verification rules for unknown exact implementation details.

---

# 113. V3 HANDOFF STATUS

**MASTER CONTEXT V3 STATUS: READY FOR NEW-CHAT HANDOFF — CURRENT DEVELOPMENT PHASE IS DEV-05 QA.**

The project is not ready to be called fully beta-ready solely from this document. The remaining application-level gate is the completion of DEV-05 QA, especially the global UI consistency/browser verification now prompted by the `/invoices` vs `/documents` vs `/customers` discrepancy.

The next ChatGPT should **not** restart the project, revisit finalized Invoice decisions, re-plan Subscription V2, or reimplement completed DEV-01/02/03/04 work.

### Exact next action

> **Run DEV-05 QA as a read-only global UI consistency + responsive/browser verification audit. Do not patch until findings are documented and explicitly authorized.**

---

# 114. DEV-05 FINAL CLOSEOUT — VERIFIED SEPTEMBER 2026

## 114.1 Final Certification Status
**DEV-05 STATUS: CLOSED (VERIFIED & CERTIFIED)**

DEV-05 (Global UI Consistency, Professional Messaging & Responsive Verification) has successfully completed independent final closeout QA following the controlled remediation of DEV05-QA-008.

- **Closeout Date:** 10 September 2026
- **Final Result:** PASS — DEV-05 CLOSED
- **Next Checkpoint:** PRE-BETA OPERATIONAL READINESS

## 114.2 Findings Verification Matrix
All 8 QA findings identified and remediated during DEV-05 have been independently verified in code and the live application:

| ID | Module / Area | Description | Status |
|---|---|---|---|
| DEV05-QA-001 | `src/components/shared/status-badge.tsx` | Standardized shared StatusBadge across `/documents`, `/invoices`, `/invoices/[id]` supporting all statuses (OVERDUE, REVOKED, SUPERSEDED, GENERATED, VOIDED, etc.) | **PASS / VERIFIED** |
| DEV05-QA-002 | `/invoices` | Standard workspace layout, Hero Command Card, Billing & Collections context, Receipt icon, 5 KPI cards, StatusBadge, search/filters | **PASS / VERIFIED** |
| DEV05-QA-003 | `/documents` | Standard workspace container boundaries matching canonical TripDesk workspace rhythm | **PASS / VERIFIED** |
| DEV05-QA-004 | `/trips`, `/documents`, `/invoices` | Uniform shared `TableSkeleton` for list view loading states replacing raw spinners | **PASS / VERIFIED** |
| DEV05-QA-005 | `src/lib/utils.ts` | Centralized `getErrorMessage()` sanitization suppressing raw Prisma/SQL/runtime error leaks | **PASS / VERIFIED** |
| DEV05-QA-006 | `GlobalSearch` | Placeholder updated to "Search customers, trips, invoices, bookings..." with Invoices quick-navigation link | **PASS / VERIFIED** |
| DEV05-QA-007 | `/invoices/[id]` | Invoice detail Hero Command Header, back navigation, Customer Invoice context, StatusBadge, Overdue indicator, ErrorState | **PASS / VERIFIED** |
| DEV05-QA-008 | `/documents` | PageHeader container nesting and spacing disconnect remediated; unified inside canonical `max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6` workspace | **PASS / RESOLVED** |

## 114.3 Automated Verification Results
- **TypeScript Compilation (`npx tsc --noEmit`):** PASS (0 errors)
- **Production Build (`npm run build`):** PASS (Exit code 0, all static & dynamic routes compiled cleanly)
- **DEV-04 Invoice Verification Matrix (`test-dev04-complete-matrix.ts`):** 60/60 PASSED (100%)
- **DEV-03 Excel Ingestion Matrix (`test-dev03-excel.ts`):** 23/23 PASSED (100%)
- **Native Dialog Audit (`confirm`, `alert`, `prompt`):** PASS (0 instances in `src/`)

## 114.4 Responsive & Browser Verification Matrix
Live browser inspection verified visual consistency across 1440px, 1280px, 390px, 375px, and 320px viewports:

| Area / Route | 1440px | 1280px | 390px | 375px | 320px | Overall Result |
|---|---|---|---|---|---|---|
| `/documents` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/invoices` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/invoices/[id]` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/trips` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| `/customers` | PASS | PASS | PASS | PASS | PASS | **PASS** |
| Global Search | PASS | PASS | PASS | PASS | PASS | **PASS** |

## 114.5 Security & Business Rule Invariants
- Two-role system (`PLATFORM_OWNER`, `AGENCY_OWNER`) preserved.
- Tenant isolation and server-side `agencyId` scoping verified.
- Invoice creation strictly enforced only for `CONFIRMED` Booking status.
- Zero Prisma schema changes, zero database migrations, zero API route contract changes.

## 114.6 Next Step
- **PRE-BETA OPERATIONAL READINESS**

---

# END OF MASTER HANDOVER V3

**Final filename:** `TRIPDESK_MASTER_CONTEXT_FINAL_V3.md`

