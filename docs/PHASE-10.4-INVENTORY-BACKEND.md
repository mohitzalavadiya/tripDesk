# TripDesk — Phase 10.4: Hotels, Vehicles & Activities Backend Foundation

**Status**: Completed  
**Milestone**: Phase 10.4 — Inventory & Trip Assignment Backend Foundation  
**Target Scope**: Server-only Services, Zod Validation, REST Route Handlers, Tenant-Isolated Security, and Frontend-Safe API Clients for Master Inventory (Hotels, Vehicles, Activities) and Trip-Specific Assignments (Trip Hotels, Trip Vehicles, Trip Activities)  
**Reference Architecture**: Conforms 100% to `docs/MODULE_STANDARD.md`

---

## 1. Objective

Build the backend foundation for attaching travel inventory to Trip workspaces in TripDesk:
```text
Trip
 ├── Hotels (TripHotel)
 ├── Vehicles (TripVehicle)
 └── Activities (TripActivity)
```
Every inventory master and trip-specific assignment is strictly scoped to the authenticated agency tenant, verified against database state, protected by subscription access controls, and defended against cross-tenant attacks with safe HTTP 404 responses.

---

## 2. Existing Schema Audit & Smallest Safe Changes

1. **Hotel (`Hotel`)**:
   - Master entity already present in `prisma/schema.prisma` (`id`, `agencyId`, `name`, `category`, `address`, `city`, `state`, `country`, `phone`, `email`, `website`, `notes`, `archivedAt`, `createdAt`, `updatedAt`).
2. **Vehicle (`Vehicle`)**:
   - Master entity introduced to represent agency-scoped vehicles (`id`, `agencyId`, `name`, `type`, `capacity`, `registrationNumber`, `driverName`, `driverPhone`, `pricingType`, `baseRate`, `ratePerKm`, `notes`, `archivedAt`, `createdAt`, `updatedAt`).
3. **Activity (`Activity`)**:
   - Master entity introduced to represent agency-scoped experiences & sightseeing (`id`, `agencyId`, `name`, `location`, `description`, `duration`, `type`, `adultPrice`, `childPrice`, `price`, `notes`, `archivedAt`, `createdAt`, `updatedAt`).
4. **Trip-Hotel (`TripHotel`)**:
   - Enhanced with optional historical pricing snapshot fields: `mealPlan`, `nightlyRate`, `totalAmount`.
5. **Trip-Vehicle (`TripVehicle`)**:
   - Enhanced with optional master link `vehicleId`, `startDate`, `endDate`, `pickupLocation`, `dropLocation`.
6. **Trip-Activity (`TripActivity`)**:
   - Enhanced with optional master link `activityId`, `time`, `numberOfParticipants`.

---

## 3. Master Inventory REST APIs

### 3.1. Hotels Master API
- `GET /api/hotels`: Paginated hotel list with `search`, `city`, and `includeArchived` filters.
- `POST /api/hotels`: Creates a hotel master record under authenticated `agencyId`.
- `GET /api/hotels/[id]`: Returns single hotel (404 on foreign/missing).
- `PATCH /api/hotels/[id]`: Updates hotel properties.
- `DELETE /api/hotels/[id]`: Soft-deletes hotel by setting `archivedAt = now()`.

### 3.2. Vehicles Master API
- `GET /api/vehicles`: Paginated vehicle list with `search`, `type`, and `includeArchived` filters.
- `POST /api/vehicles`: Creates a vehicle master record under authenticated `agencyId`.
- `GET /api/vehicles/[id]`: Returns single vehicle (404 on foreign/missing).
- `PATCH /api/vehicles/[id]`: Updates vehicle properties.
- `DELETE /api/vehicles/[id]`: Soft-deletes vehicle by setting `archivedAt = now()`.

### 3.3. Activities Master API
- `GET /api/activities`: Paginated activity list with `search`, `location`, `type`, and `includeArchived` filters.
- `POST /api/activities`: Creates an activity master record under authenticated `agencyId`.
- `GET /api/activities/[id]`: Returns single activity (404 on foreign/missing).
- `PATCH /api/activities/[id]`: Updates activity properties.
- `DELETE /api/activities/[id]`: Soft-deletes activity by setting `archivedAt = now()`.

---

## 4. Trip Assignment REST APIs

### 4.1. Trip-Hotel Assignments
- `GET /api/trips/[id]/hotels`: Lists all hotel reservations for the trip.
- `POST /api/trips/[id]/hotels`: Assigns a hotel to the trip. Verifies trip & hotel belong to authenticated agency and are not archived.
- `GET /api/trips/[id]/hotels/[hotelId]`: Returns a single assignment.
- `PATCH /api/trips/[id]/hotels/[hotelId]`: Updates assignment details (dates, room count, rates, notes).
- `DELETE /api/trips/[id]/hotels/[hotelId]`: Removes hotel reservation from trip.

### 4.2. Trip-Vehicle Assignments
- `GET /api/trips/[id]/vehicles`: Lists all vehicle assignments for the trip.
- `POST /api/trips/[id]/vehicles`: Assigns a vehicle to the trip. Verifies trip & vehicle belong to authenticated agency.
- `GET /api/trips/[id]/vehicles/[vehicleId]`: Returns a single vehicle assignment.
- `PATCH /api/trips/[id]/vehicles/[vehicleId]`: Updates vehicle assignment details.
- `DELETE /api/trips/[id]/vehicles/[vehicleId]`: Removes vehicle assignment from trip.

### 4.3. Trip-Activity Assignments
- `GET /api/trips/[id]/activities`: Lists all activity assignments for the trip.
- `POST /api/trips/[id]/activities`: Assigns an activity to the trip. Verifies trip & activity belong to authenticated agency.
- `GET /api/trips/[id]/activities/[activityId]`: Returns a single activity assignment.
- `PATCH /api/trips/[id]/activities/[activityId]`: Updates activity assignment details.
- `DELETE /api/trips/[id]/activities/[activityId]`: Removes activity assignment from trip.

---

## 5. Security & Isolation Matrix

1. **Authentication**: All endpoints require active session cookies (`401 UNAUTHORIZED` on missing auth).
2. **Multi-Tenant Isolation**:
   - `agencyId` is derived exclusively from verified server session context.
   - Any query attempting to access another agency's hotel, vehicle, activity, or trip returns **HTTP 404 NOT_FOUND**.
3. **Cross-Tenant Attachment Defense**:
   - Attempting to attach a foreign agency's hotel, vehicle, or activity to a trip throws `NotFoundError` (404).
   - Attempting to attach any inventory to an archived trip throws `NotFoundError` (404).
4. **Subscription Write Enforcement**:
   - Expired or cancelled subscriptions can execute `GET` queries (200), but `POST`, `PATCH`, and `DELETE` queries are rejected with **HTTP 403 READ_ONLY_ACCESS**.
5. **Historical Pricing Safety**:
   - Assignment records store snapshot fields (`nightlyRate`, `totalAmount`, `ratePerKm`, `totalRate`, `adultPrice`, `childPrice`, `totalPrice`) to protect existing quotations and trip costing sheets from future changes to master inventory pricing.
6. **Soft Deletion Integrity**:
   - Deleting a master hotel, vehicle, or activity marks `archivedAt: new Date()` in PostgreSQL.
   - Historical trip assignments reference the master records without cascade deletion.

---

## 6. Build & Test Verification

- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npx prisma db push`: **PASS** (database synchronized with Supabase PostgreSQL)
- `npm run build`: **PASS** (all 66 routes compiled cleanly with 0 TypeScript/build errors)
