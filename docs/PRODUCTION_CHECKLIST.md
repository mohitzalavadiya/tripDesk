# TripDesk — Production Release Readiness Checklist

This checklist must be reviewed and signed off prior to deploying TripDesk to production.

---

## 1. Security & Authentication Audit

- [x] **Two-Role Internal Role Architecture Verified**:
  - `PLATFORM_OWNER` and `AGENCY_OWNER` are the only internal system roles.
  - No customer internal user accounts exist.
- [x] **Platform Owner Singleton Boundary**:
  - Exactly one `PLATFORM_OWNER` account exists with `agencyId = null`.
  - Public signup strictly creates `AGENCY_OWNER` with a dedicated new `Agency` tenant record.
- [x] **Multi-Tenant Isolation & IDOR Protection**:
  - All agency data access enforces `agencyId` scoping derived exclusively from the authenticated session context (`requireReadAccess()` / `requireWriteAccess()`).
  - Cross-tenant mutations are strictly rejected with `403 Forbidden` or `404 Not Found`.
- [x] **Admin Route Protection**:
  - All `/admin` pages and `/api/admin/*` endpoints strictly enforce `requirePlatformOwner()`.
  - Unauthorized callers receive `401 Unauthorized` or redirect to `/login`.
  - Non-Platform-Owners receive `403 Forbidden` or redirect to `/dashboard`.
- [x] **Customer Portal Token Isolation**:
  - Customers access proposals, vouchers, and itinerary portals via high-entropy UUIDs / cryptographic tokens (`/q/[token]`, `/trip/[id]`, `/b/[token]`).
  - No commercial supplier cost or margin data is exposed to public/customer views.
- [x] **HTTP Security Headers Configured**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Powered-By` header disabled in `next.config.ts`.
- [x] **Automation & Webhook Protection**:
  - Automation endpoint `/api/communication/automation/run` requires valid `CRON_SECRET` or active authenticated Agency session with write access.
  - Webhook endpoint `/api/webhooks/communication` validates webhook signatures when `COMMUNICATION_WEBHOOK_SECRET` is set.

---

## 2. Database & Data Integrity

- [x] **Prisma Schema Consistency**:
  - Prisma Client generated cleanly (`npx prisma generate`).
  - Schema synchronized with PostgreSQL database (`npx prisma db push`).
- [x] **Indexes & Performance Optimization**:
  - Multi-column indexes configured for frequent query paths (`[agencyId, status]`, `[agencyId, createdAt]`, `[actorUserId, createdAt]`, `[startAt, endAt]`).
  - Foreign key constraints maintain referential integrity with appropriate cascading rules.
- [x] **Financial Ledger Separation**:
  - SaaS Subscription revenue records (`Subscription`, `SubscriptionPayment`, `SubscriptionPlan`) are completely isolated from agency booking revenue (`Booking`, `PaymentRecord`, `SupplierLedgerEntry`).
  - Historical payment records and commercial ledger entries are immutable.

---

## 3. Application & Code Quality

- [x] **Zero TypeScript Errors**:
  - Clean production build (`npm run build`) completed with 0 errors.
- [x] **Standardized Error Handling**:
  - All API routes utilize `handleApiError(error)` to sanitize exceptions and prevent database connection details or stack traces from leaking to clients.
- [x] **Structured Production Logging**:
  - `src/lib/logger.ts` logs structured JSON in production with automatic recursive redaction of secrets, passwords, tokens, and database URLs.
- [x] **Graceful Fallbacks**:
  - Email and WhatsApp communication providers degrade gracefully to simulated in-memory delivery when third-party provider credentials are unset in development/staging.

---

## 4. Operational & Deployment Readiness

- [x] **Environment Variable Template**:
  - `.env.example` contains complete, documented configurations for development, staging, and production environments.
- [x] **Bootstrap Scripts Tested**:
  - `npm run bootstrap:owner` cleanly initializes the Platform Owner.
  - `npm run bootstrap:agency-owner` initializes test agency owners for staging validation.
- [x] **Automated Test Coverage**:
  - Automated test suites (Phases 11 through 19) pass 100% with 0 regressions.
- [x] **Rollback Runbook Documented**:
  - Instant rollback procedure and zero-downtime database migration guidelines documented in `docs/PRODUCTION_DEPLOYMENT.md`.

---

## Sign-off Status: **READY FOR PRODUCTION (GO)**
