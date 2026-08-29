# TripDesk — Phase 10.5: Inventory Frontend & Trip Resource Assignment UI Integration

**Status**: Completed  
**Milestone**: Phase 10.5 — Inventory Frontend & Trip Resource Assignment UI Integration  
**Target Scope**: Connecting Hotel, Vehicle, Activity Directories & Trip Workspace Resource Assignment Tabs to Real Database APIs via Frontend API Clients  
**Reference Architecture**: Conforms 100% to `docs/MODULE_STANDARD.md`

---

## 1. Objective

Connect the Phase 10.4 backend APIs to the frontend:
```text
Inventory UI
      ↓
hotelClient / vehicleClient / activityClient
      ↓
Phase 10.4 API routes
      ↓
Server authentication/context
      ↓
Agency tenant isolation
      ↓
Prisma / PostgreSQL
```

And for Trip resource assignments:
```text
Trip Workspace (/trips/[id])
      ↓
tripHotelClient / tripVehicleClient / tripActivityClient
      ↓
Phase 10.4 assignment APIs
      ↓
Server authentication/context
      ↓
Tenant validation
      ↓
PostgreSQL
```

---

## 2. Existing Inventory UI Audited

1. **Hotel Directory & Modals**:
   - `/hotels`: Paginated hotel list, multi-column search, summary badges, action dropdowns.
   - `/hotels/new`: Hotel creation form with property details, location, and contact points.
   - `/hotels/[id]`: Hotel profile, edit dialog, and archive dialog.
2. **Vehicle Directory & Modals**:
   - `/vehicles`: Paginated vehicle list, category badges, driver contact display.
   - `/vehicles/new`: Vehicle creation form with capacity, registration, pricing model.
   - `/vehicles/[id]`: Vehicle profile, edit dialog, and archive dialog.
3. **Activity Directory & Modals**:
   - `/activities`: Paginated activity list, type categorization, duration, tariffs.
   - `/activities/new`: Activity creation form with type, location, adult/child tariffs.
   - `/activities/[id]`: Activity profile, edit dialog, and archive dialog.
4. **Trip Detail Workspace (`/trips/[id]`)**:
   - Integrated real PostgreSQL data for Hotels, Vehicles, and Activities tabs.
   - Provided modal selectors populated dynamically from master inventories.

---

## 3. Hotel Frontend Migration

* Replaced mock context dependencies in `/hotels`, `/hotels/new`, and `/hotels/[id]` with `hotelClient`.
* **Search & Filter**: Implemented 300ms debounced search to avoid spamming the backend API.
* **Pagination**: Server-side pagination with limit = 20, next/prev navigation, and total count display.
* **Creation**: Formik + Yup validation ensuring clean name, category, location, phone, email, and notes inputs.
* **Editing**: In-place modal dialog updating database state via `hotelClient.updateHotel(id, values)`.
* **Archiving**: Soft-deletes hotel record via `hotelClient.archiveHotel(id)` and returns to list.

---

## 4. Vehicle Frontend Migration

* Replaced mock context dependencies in `/vehicles`, `/vehicles/new`, and `/vehicles/[id]` with `vehicleClient`.
* **Search & Filter**: Debounced search across model name, type, registration number, and driver.
* **Creation**: Formik + Yup validation with seating capacity, registration, driver phone, and pricing models (`PER_KM`, `PER_DAY`, `FIXED`, `INCLUDED`).
* **Editing**: Modal dialog updating vehicle details via `vehicleClient.updateVehicle(id, values)`.
* **Archiving**: Soft-deletes vehicle record via `vehicleClient.archiveVehicle(id)`.

---

## 5. Activity Frontend Migration

* Replaced mock context dependencies in `/activities`, `/activities/new`, and `/activities/[id]` with `activityClient`.
* **Search & Filter**: Debounced search across title, location, category, duration.
* **Creation**: Formik + Yup validation with `ActivityType` enum, adult price, child price, and flat rate.
* **Editing**: Modal dialog updating excursion specifications via `activityClient.updateActivity(id, values)`.
* **Archiving**: Soft-deletes activity record via `activityClient.archiveActivity(id)`.

---

## 6. Trip Hotel Integration

* **Endpoints**: `tripHotelClient.getTripHotels(tripId)`, `createTripHotel(tripId, ...)`, `updateTripHotel(tripId, hotelId, ...)`, `deleteTripHotel(tripId, hotelId)`.
* **UI**:
  - Displays room category, reservation check-in and check-out dates, room count, meal plan, nightly rate, total tariff, and special notes.
  - "Attach Hotel" dialog pulls from active agency master hotels, snapshots nightly rates, and creates the reservation.
  - "Edit Reservation" dialog updates date ranges, room count, and notes without modifying master hotel data.
  - "Remove" action deletes the trip assignment safely.

---

## 7. Trip Vehicle Integration

* **Endpoints**: `tripVehicleClient.getTripVehicles(tripId)`, `createTripVehicle(tripId, ...)`, `updateTripVehicle(tripId, vehicleId, ...)`, `deleteTripVehicle(tripId, vehicleId)`.
* **UI**:
  - Displays vehicle model, category, capacity, date range, pickup/drop points, chauffeur name & phone, and total tariff.
  - "Assign Vehicle" dialog allows selecting an agency fleet model or manually entering custom transfer specs, snapshotting tariffs into the trip record.
  - "Edit Vehicle Assignment" dialog updates transfer specifics and dates.
  - "Remove" action deletes the vehicle assignment safely.

---

## 8. Trip Activity Integration

* **Endpoints**: `tripActivityClient.getTripActivities(tripId)`, `createTripActivity(tripId, ...)`, `updateTripActivity(tripId, activityId, ...)`, `deleteTripActivity(tripId, activityId)`.
* **UI**:
  - Displays activity category, name, scheduled date & time slot, location, passenger count, adult tariff, and total price.
  - "Assign Activity" dialog allows selecting an excursion from agency inventory or entering custom sightseeing specs.
  - "Edit Activity Assignment" dialog updates schedule times and participant counts.
  - "Remove" action deletes the activity assignment safely.

---

## 9. Inventory Selection Integration

* When attaching inventory to trips, dropdown selectors fetch the agency's registered properties, fleet vehicles, and excursion packages with `limit: 100`.
* Only active, non-archived inventory belonging to the authenticated agency is presented.
* Selecting a master item auto-fills default specifications and rates while allowing trip-specific customisation.

---

## 10. Historical Pricing Behavior

* The Trip assignment records store immutable snapshot pricing fields (`nightlyRate`, `totalAmount`, `ratePerKm`, `totalRate`, `adultPrice`, `childPrice`, `totalPrice`).
* Any future changes to master inventory pricing do not alter existing trip assignment tariffs or historical costing sheets.

---

## 11. Mock Dependency Cleanup

* Cleaned up mock inventory dependencies (`useInventory` hotel/vehicle/activity mock hooks) in all migrated pages (`/hotels`, `/hotels/new`, `/hotels/[id]`, `/vehicles`, `/vehicles/new`, `/vehicles/[id]`, `/activities`, `/activities/new`, `/activities/[id]`, and `/trips/[id]`).
* Preserved shared mock data required by unmigrated modules (`Enquiries`, `Quotations`, `Bookings`, `Payments`).

---

## 12. Read-Only Subscription UX

* Integrated `ReadOnlyBanner` on all inventory and trip workspace pages.
* When subscription status is `EXPIRED` or `CANCELLED`, all `Create`, `Edit`, `Archive`, and `Assign` buttons are disabled, and mutations are prevented on the client side while being authoritatively rejected with HTTP 403 on the server side.

---

## 13. Security Verification

* **Authentication**: All API client calls require valid session cookies.
* **Tenant Isolation**: Client cannot specify or override `agencyId`. All database queries are filtered by server-context `agencyId`.
* **Cross-Tenant Defense**: Accessing or attaching foreign inventory throws HTTP 404 NOT_FOUND.
* **Archived Protection**: Archived master inventory and archived trips cannot receive new assignments.
* **Subscription Enforcement**: Mutations rejected with HTTP 403 when subscription is expired.

---

## 14. Verification & Build Results

* `npx prisma validate`: **PASS**
* `npx prisma generate`: **PASS**
* `npm run build`: **PASS** (Compiled cleanly across all 66 routes with 0 TypeScript/build errors).
