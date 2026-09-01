# TripDesk — Phase 20.5 Pre-Cleanup Database Inventory

**Date / Timestamp**: 2026-08-31T12:15:00Z  
**Database Target**: `aws-0-ap-northeast-1.pooler.supabase.com:6543` (Supabase PostgreSQL with PgBouncer)  
**Status**: 🔍 **PRE-CLEANUP AUDIT & BACKUP VERIFIED (READ-ONLY)**  
**Local Snapshot Backup**: `prisma/snapshots/pre-cleanup-snapshot-2026-08-31T12-09-48-236Z.json` (1.72 MB, 2,802 records)

---

## 1. System & Environment Summary

* **Database Engine**: PostgreSQL 15+ (Hosted on Supabase)
* **Connection Mode**: Transaction Pooler (`pgbouncer=true`, port 6543)
* **Prisma Client**: v7.9.1 with `@prisma/adapter-pg`
* **Internal System Roles**: Strict 2-role system (`PLATFORM_OWNER`, `AGENCY_OWNER`)
* **Customer Access Model**: External cryptographically signed token access (Zero internal customer user accounts)

---

## 2. Complete Model-by-Model Inventory

| Model Name | Total Records | Scope | Classification | Proposed Action | Preservation Justification / Notes |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **OperationEvent** | 563 | Tenant | Test | **DELETE** | Test audit & workflow state change events |
| **OperationalIssue** | 24 | Tenant | Test | **DELETE** | Test incident & operational disruption records |
| **HotelConfirmation** | 58 | Tenant | Test | **DELETE** | Test supplier hotel confirmations |
| **VehicleDispatch** | 48 | Tenant | Test | **DELETE** | Test vehicle allocation & driver assignments |
| **ActivityConfirmation** | 33 | Tenant | Test | **DELETE** | Test activity vouchers and bookings |
| **TripOperation** | 104 | Tenant | Test | **DELETE** | Test trip operations control hub records |
| **TravelDocument** | 18 | Tenant | Test | **DELETE** | Test PDF/HTML travel vouchers and itineraries |
| **CustomerNotification** | 53 | Tenant | Test | **DELETE** | Test automated WhatsApp & Email notification logs |
| **CustomerNotificationPreference** | 0 | Tenant | Test | **DELETE** | Customer communication preferences (empty) |
| **CustomerFeedback** | 0 | Tenant | Test | **DELETE** | Post-trip customer reviews & feedback (empty) |
| **AgencyCommunicationSetting** | 13 | Tenant | Test | **DELETE** | Test agency communication gateway credentials |
| **SupplierPayment** | 34 | Tenant | Test | **DELETE** | Test supplier disbursement payment records |
| **SupplierPayable** | 40 | Tenant | Test | **DELETE** | Test accounts payable ledger entries |
| **OperationalExpense** | 43 | Tenant | Test | **DELETE** | Test ad-hoc trip expenses (fuel, tolls, permits) |
| **RateSheet** | 6 | Tenant | Test | **DELETE** | Test supplier contracted rate sheet contracts |
| **Supplier** | 130 | Tenant | Test | **DELETE** | Test supplier contacts & vendor directory |
| **EnquiryFollowUp** | 8 | Tenant | Test | **DELETE** | Test CRM follow-up activity schedule |
| **Enquiry** | 12 | Tenant | Test | **DELETE** | Test sales leads and travel inquiries |
| **Payment** | 84 | Tenant | Test | **DELETE** | Test customer payment receipts |
| **QuotationItem** | 29 | Tenant | Test | **DELETE** | Test quotation line-item costings |
| **QuotationProposalItem** | 106 | Tenant | Test | **DELETE** | Test quotation inclusions, exclusions, and terms |
| **QuotationPaymentMilestone** | 93 | Tenant | Test | **DELETE** | Test payment milestone schedule definitions |
| **QuotationPackageOption** | 68 | Tenant | Test | **DELETE** | Test multi-option package pricing tiers |
| **PublicShareLink** | 0 | Tenant | Test | **DELETE** | Public share token links (empty) |
| **Booking** | 116 | Tenant | Test | **DELETE** | Test confirmed and completed customer bookings |
| **Quotation** | 76 | Tenant | Test | **DELETE** | Test quotations and proposals |
| **TripActivity** | 37 | Tenant | Test | **DELETE** | Test trip activity schedule attachments |
| **TripVehicle** | 51 | Tenant | Test | **DELETE** | Test trip vehicle allocations |
| **TripHotel** | 63 | Tenant | Test | **DELETE** | Test trip hotel stay bookings |
| **ItineraryItem** | 48 | Tenant | Test | **DELETE** | Test day-wise itinerary items |
| **Traveler** | 11 | Tenant | Test | **DELETE** | Test passenger and traveler records |
| **Activity** | 39 | Tenant | Test | **DELETE** | Test activity catalog items |
| **Vehicle** | 44 | Tenant | Test | **DELETE** | Test vehicle catalog items |
| **Hotel** | 60 | Tenant | Test | **DELETE** | Test hotel catalog items |
| **Trip** | 164 | Tenant | Test | **DELETE** | Test trip records |
| **Customer** | 203 | Tenant | Test | **DELETE** | Test customer master directory |
| **Subscription** | 20 | Tenant | Test | **DELETE** | Test agency subscriptions |
| **User (Test Users)** | 54 | System | Test | **DELETE** | Test agency owners and test platform owner IDs |
| **User (Platform Owner)** | **1** | System | Production | 🛡️ **PRESERVE** | Authoritative singleton Platform Owner (`mzpatel14@gmail.com`) |
| **Agency** | 235 | Tenant | Test | **DELETE** | All test agency workspaces |
| **PlatformAuditLog** | 3 | Platform | Test | **DELETE** | Test audit log entries from automated suites |
| **SubscriptionPlan (Canonical)** | **2** | Platform | Production | 🛡️ **PRESERVE** | `Starter` (₹1999) & `Professional` (₹4999) |
| **SubscriptionPlan (Test Tiers)** | 6 | Platform | Test | **DELETE** | Timestamped test plans created during test runs |
| **PlatformSetting** | **2** | Platform | Production | 🛡️ **PRESERVE** | `defaultTrialDays` (7) & `supportEmail` (`enterprise@tripdesk.io`) |
| **PlatformAnnouncement** | 0 | Platform | Production | 🛡️ **PRESERVE** | Zero records (Clean) |

---

## 3. Platform Owner & Supabase Auth Reconciliation

### 🛡️ Authoritative Platform Owner
* **User ID**: `de5c1377-0e7c-4747-b3ed-aaee8b7e32a9`
* **Email**: `mzpatel14@gmail.com`
* **Role**: `PLATFORM_OWNER`
* **Agency ID**: `null` (Detached from tenant workspaces, exclusive access to `/admin`)
* **Supabase Auth Status**: Validated 1:1 match with Supabase GoTrue account. **MUST PRESERVE.**

### 🧹 Supabase Auth Accounts for Cleanup (17 Accounts)
* **Confirmed Test Agency Account (1)**:
  * `9954d975-5725-4eaa-ab49-a009982e160c` (`test0001agency@gmail.com`)
* **Orphan QA Test Accounts (16)**:
  * `96b9e33a-77e5-46c8-b86d-4ae0562aa42a` (`qa_signup_agency_1788004286462@gmail.com`)
  * `7ffe1978-4a1e-47bf-85c8-9792b7f67f8f` (`qa_signup_agency_1787998955090@gmail.com`)
  * `ff1a3b51-77a0-4f4b-aaf7-ffaf9b0c7543` (`qa_signup_agency_1787997974083@gmail.com`)
  * `e0096cfc-fba6-49a6-a932-13fb76005ca8` (`qa_signup_agency_1787996566246@gmail.com`)
  * `734b9a2c-cb35-4dc7-8c77-98936beee4dc` (`qa_signup_agency_1787994992908@gmail.com`)
  * `6de7b328-efa7-45ec-9060-cd402e5fbcf1` (`qa_signup_agency_1787994579683@gmail.com`)
  * `74a0397e-d74c-4c25-a19e-524fc0081bd2` (`qa_signup_agency_1787987359665@gmail.com`)
  * `91fbf06a-1cce-48e4-876d-122b4ad0b74a` (`qa_signup_agency_1787983884466@gmail.com`)
  * `bbca666b-eed1-4fd3-8d06-89d63f8e6c7d` (`qa_signup_agency_1787835799269@gmail.com`)
  * `ad9936c7-939a-4de7-9816-921711c91390` (`qa_signup_agency_1787835613207@gmail.com`)
  * `bd9db1fe-8894-43d4-80df-bdcdcb2e736b` (`browser_e2e_agency_2026@gmail.com`)
  * `a536d74a-5554-406f-9750-f8d589bc60f7` (`qa_signup_agency_1787835105634@gmail.com`)
  * `867d5630-c645-42f7-8195-d102945433ea` (`qa_signup_agency_1787835086767@gmail.com`)
  * `9d24fa5c-8b9c-45c4-929b-8b1ac1d196a7` (`test001agency@gmail.com`)
  * `c18d821d-fcf1-46fb-8ca4-37a28da74c8c` (`test1agency@gmail.com`)
  * `d0d4b2a0-80f0-4041-8f54-54e282e42388` (`owner@tripdesk.io`)

---

## 4. Financial Zeroing Targets

| Financial Indicator | Current Pre-Cleanup | Target Post-Cleanup |
| :--- | :---: | :---: |
| **Gross Booking Volume (GMV)** | $14,038,533.00 | **$0.00** |
| **Customer Payments Collected** | $3,897,720.00 | **$0.00** |
| **Customer Receivables Outstanding** | $2,815,813.00 | **$0.00** |
| **Customer Payment Transactions** | 84 records | **0 records** |
| **Supplier Payables Ledger** | $1,539,800.00 (40 records) | **$0.00 (0 records)** |
| **Supplier Disbursements Paid** | $855,000.00 (34 records) | **$0.00 (0 records)** |
| **Operational Trip Expenses** | $120,500.00 (43 records) | **$0.00 (0 records)** |
| **Public Quotation Share Tokens** | 73 active tokens | **0 active tokens** |
| **Travel Vouchers / Documents** | 18 documents | **0 documents** |
