# Phase 10.10 — Rate Sheets & Supplier Rate Management System

## Overview
Phase 10.10 implements a production-grade **Rate Sheets & Supplier Rate Management System** in TripDesk SaaS. It establishes the commercial foundation connecting B2B suppliers, contracted seasonal purchase rates, the automated costing engine, and customer quotations.

---

## Key Features Implemented

### 1. Database Schema & Architecture (`prisma/schema.prisma`)
- **`Supplier` Model**:
  - Sequential Code: `SUP-YYYY-XXXXX`
  - Multi-tenant Scoping: `agencyId` foreign key with indexed compound lookups.
  - Profile & Location: `name`, `type`, `contactPerson`, `phone`, `alternatePhone`, `email`, `address`, `city`, `state`, `country`, `postalCode`.
  - Financial & Legal: `gstNumber`, `panNumber`, `paymentTerms`, `bankDetails`.
  - Operational Relations: Linked `hotels`, `vehicles`, `activities`, and `rateSheets`.
  - Lifecycle: `status` (`ACTIVE` | `INACTIVE`), `archivedAt`, `createdAt`, `updatedAt`.
- **`RateSheet` Model**:
  - Sequential Number: `RAT-YYYY-XXXXX`
  - Inventory Linkage: `inventoryType` (`HOTEL` | `VEHICLE` | `ACTIVITY`), `hotelId`, `vehicleId`, `activityId`.
  - Hotel Rate Specifics: `roomType`, `mealPlan` (`EP`, `CP`, `MAP`, `AP`), `costPrice` (per room/night), `extraAdultRate`, `extraChildRate`.
  - Vehicle Rate Specifics: `vehiclePricingType` (`PER_KM`, `TOTAL`), `ratePerKm`, `minimumKm`, `totalRate`, `extraKmRate`, `driverAllowance`, `nightAllowance`, `tollIncluded`, `parkingIncluded`.
  - Activity Rate Specifics: `adultCost`, `childCost`, `infantCost`.
  - Season & Validity: `seasonName`, `validFrom`, `validTo`, `taxPercentage`, `priority` (integer weight for conflict resolution).
  - Lifecycle: `status` (`DRAFT` | `ACTIVE` | `INACTIVE` | `EXPIRED`), `sourceType`, `archivedAt`.

### 2. Rate Lookup Engine & Deterministic Priority Resolution
- Implemented in `src/lib/services/rate-sheet-service.ts`:
  - `getApplicableHotelRate(agencyId, hotelId, date, roomType?, mealPlan?)`
  - `getApplicableVehicleRate(agencyId, vehicleId, date, pricingType?)`
  - `getApplicableActivityRate(agencyId, activityId, date)`
- **Deterministic Resolution Hierarchy**:
  1. Exact category / room type / meal plan match (+2,000 / +1,000 score bonus)
  2. Higher priority integer value (`priority * 10,000`)
  3. Narrower validity date window (favors specific seasonal promotions over year-long base rates)
  4. Most recently created active rate (`createdAt: desc`)

### 3. Automated Trip Costing Engine Integration
- Upgraded `src/lib/services/trip-costing-service.ts`:
  - Dynamically queries the Rate Sheet Engine for each hotel, vehicle, and activity assigned to a trip.
  - If a contracted rate matches, flags `rateSource: "RATE_SHEET"` and records `rateSheetId`, `rateSheetNumber`, `supplierName`, `seasonName`.
  - If no contracted rate exists, smoothly falls back to the manual snapshot price with `rateSource: "TRIP_SNAPSHOT"`.
  - Multi-traveler adult and child costing calculations with Decimal precision.

### 4. REST API Handlers
- `/api/suppliers` (`GET`, `POST`): Paginated listing, multi-field search, vendor creation with sequential numbering.
- `/api/suppliers/[id]` (`GET`, `PATCH`, `DELETE`): Supplier 360 profile, update, soft archive.
- `/api/rate-sheets` (`GET`, `POST`): Filtered tariff directory, overlap validation.
- `/api/rate-sheets/[id]` (`GET`, `PATCH`, `DELETE`): Rate sheet inspection, update, soft archive.
- `/api/rate-sheets/lookup` (`GET`): Rate preview and testing endpoint.

### 5. Frontend Pages
- `/suppliers`: Master vendor directory with KPI cards, multi-field search, filter toolbar, desktop table, mobile cards, pagination.
- `/suppliers/new`: Vendor onboarding form with contact, location, tax, bank wire, and payment terms.
- `/suppliers/[id]`: Supplier 360 profile with tabs for Commercial Profile, Active Rate Sheets, Expired Tariffs, Contracted Hotels, Fleet, and Activities, plus Edit Modal.
- `/rate-sheets`: Master tariff directory with category tabs (`ALL`, `HOTEL`, `VEHICLE`, `ACTIVITY`), KPI metrics, priority badges, and status indicators.
- `/rate-sheets/new`: Dynamic tariff creation form adapting inputs to Hotel, Vehicle, or Activity.
- `/rate-sheets/[id]`: Tariff inspector with pricing breakdowns, validity ranges, supplier links, and Edit Modal.

---

## Verification & Status
- Next.js 16.3.2 Turbopack Build: **104 routes successfully compiled with 0 errors**.
- Database Migration: **PostgreSQL schema synchronized and active**.
