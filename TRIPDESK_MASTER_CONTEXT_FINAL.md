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
