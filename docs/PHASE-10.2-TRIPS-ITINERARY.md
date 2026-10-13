# TripDesk — Phase 10.2: Trips & Itinerary Module

**Status**: Completed  
**Milestone**: Phase 10.2 — Backend, REST API, Zod Validation, Tenancy & Security Foundation  
**Module Coverage**: Trips, Travelers, Itinerary Items  
**Architecture Reference**: Conforms 100% to `docs/MODULE_STANDARD.md`

---

## 1. Module Overview

The **Trips & Itinerary Module** provides the core travel planning foundation for TripDesk. It establishes a multi-tenant hierarchy where an authenticated travel agency manages trips associated with agency customers, with nested sub-resources for travelers and day-by-day itinerary items.

### Domain Hierarchy
```
Agency (Active Tenant from Session)
  ├── Customer (Owner of the booking/inquiry)
  │     └── Trip (Trip details, schedule, notes, status)
  │           ├── Travelers (Adults & children traveling)
  │           └── Itinerary Items (Day-by-day scheduled activities & events)
```

---

## 2. API Endpoints Specification

### 2.1. Trip Endpoints (`/api/trips`)

| Method | Endpoint | Access Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trips` | `requireReadAccess()` | List paginated, filtered trips for authenticated agency |
| `POST` | `/api/trips` | `requireWriteAccess()` | Create a new trip (validates active agency customer) |
| `GET` | `/api/trips/[id]` | `requireReadAccess()` | Retrieve single trip with customer, travelers, itinerary |
| `PATCH` | `/api/trips/[id]` | `requireWriteAccess()` | Update trip details (cannot modify archived trips) |
| `DELETE` | `/api/trips/[id]` | `requireWriteAccess()` | Soft-delete (archive) trip by setting `archivedAt` |

### 2.2. Traveler Sub-Resource Endpoints (`/api/trips/[id]/travelers`)

| Method | Endpoint | Access Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trips/[id]/travelers` | `requireReadAccess()` | List all travelers associated with the trip |
| `POST` | `/api/trips/[id]/travelers` | `requireWriteAccess()` | Add a new traveler (adult/child) to the trip |
| `GET` | `/api/trips/[id]/travelers/[travelerId]` | `requireReadAccess()` | Retrieve single traveler details |
| `PATCH` | `/api/trips/[id]/travelers/[travelerId]` | `requireWriteAccess()` | Update traveler information |
| `DELETE` | `/api/trips/[id]/travelers/[travelerId]` | `requireWriteAccess()` | Remove traveler from the trip |

### 2.3. Itinerary Sub-Resource Endpoints (`/api/trips/[id]/itinerary`)

| Method | Endpoint | Access Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trips/[id]/itinerary` | `requireReadAccess()` | List all itinerary items ordered by day and sort order |
| `POST` | `/api/trips/[id]/itinerary` | `requireWriteAccess()` | Create day itinerary item |
| `GET` | `/api/trips/[id]/itinerary/[itemId]` | `requireReadAccess()` | Retrieve single itinerary item |
| `PATCH` | `/api/trips/[id]/itinerary/[itemId]` | `requireWriteAccess()` | Update itinerary item |
| `DELETE` | `/api/trips/[id]/itinerary/[itemId]` | `requireWriteAccess()` | Remove itinerary item |

---

## 3. Security, Tenancy & Subscription Matrix

### 3.1. Tenancy Enforcement
- **Derived Identity**: `agencyId` is **NEVER** accepted from request bodies, query strings, URL parameters, or client state.
- **Context Extraction**: Extracted strictly via `getRequestContext()` from the verified Supabase Auth session and TripDesk PostgreSQL `User` record.
- **Cross-Tenant Isolation (Anti-Harvesting)**: Attempting to access or reference a trip, traveler, or itinerary item belonging to another agency immediately returns **HTTP 404 NOT_FOUND** (never 403) via `NotFoundError`.
- **Customer Ownership Verification**: Creating or updating a trip to attach a `customerId` verifies that the Customer belongs to the authenticated agency and is active (`archivedAt == null`). Cross-tenant customer linking fails with 404.

### 3.2. Subscription Permission Matrix
- **`TRIAL` (Active, $\ge$ 1 day)**: Full read/write access.
- **`ACTIVE` (Paid Subscription)**: Full read/write access.
- **`EXPIRED` / `CANCELLED`**: Read-only access. Mutation requests (`POST`, `PATCH`, `DELETE`) are rejected with `403 READ_ONLY_ACCESS`.

---

## 4. Request & Response Examples

### 4.1. Create Trip (`POST /api/trips`)
**Request Body:**
```json
{
  "customerId": "cm71...",
  "title": "7-Day Golden Triangle Tour",
  "startDate": "2026-10-15T00:00:00.000Z",
  "endDate": "2026-10-22T00:00:00.000Z",
  "status": "PLANNING",
  "notes": "Includes private chauffeur and 4-star heritage hotels."
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "cm72...",
    "agencyId": "cm70...",
    "customerId": "cm71...",
    "tripNumber": "TRP-202608-4821",
    "title": "7-Day Golden Triangle Tour",
    "startDate": "2026-10-15T00:00:00.000Z",
    "endDate": "2026-10-22T00:00:00.000Z",
    "status": "PLANNING",
    "notes": "Includes private chauffeur and 4-star heritage hotels.",
    "archivedAt": null,
    "createdAt": "2026-08-25T10:44:00.000Z",
    "updatedAt": "2026-08-25T10:44:00.000Z",
    "customer": {
      "id": "cm71...",
      "name": "Rajesh Sharma",
      "phone": "+919876543210"
    }
  }
}
```

### 4.2. Add Traveler (`POST /api/trips/[id]/travelers`)
**Request Body:**
```json
{
  "name": "Pooja Sharma",
  "type": "ADULT",
  "gender": "Female",
  "phone": "+919876543211",
  "email": "pooja@example.com"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "cm73...",
    "tripId": "cm72...",
    "name": "Pooja Sharma",
    "type": "ADULT",
    "dateOfBirth": null,
    "gender": "Female",
    "phone": "+919876543211",
    "email": "pooja@example.com",
    "idPhotoUrl": null,
    "createdAt": "2026-08-25T10:44:30.000Z",
    "updatedAt": "2026-08-25T10:44:30.000Z"
  }
}
```

---

## 5. File Architecture

```
src/
├── app/api/trips/
│   ├── route.ts                                  # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts                              # GET (details), PATCH (update), DELETE (archive)
│   │   ├── travelers/
│   │   │   ├── route.ts                          # GET (list), POST (create)
│   │   │   └── [travelerId]/
│   │   │       └── route.ts                      # GET, PATCH, DELETE
│   │   └── itinerary/
│   │       ├── route.ts                          # GET (list), POST (create)
│   │       └── [itemId]/
│   │           └── route.ts                      # GET, PATCH, DELETE
├── lib/
│   ├── api-client/
│   │   ├── trip-client.ts                        # Frontend Trip API Client
│   │   ├── traveler-client.ts                    # Frontend Traveler API Client
│   │   ├── itinerary-client.ts                   # Frontend Itinerary API Client
│   │   └── index.ts                              # Export index
│   ├── services/
│   │   ├── trip-service.ts                       # Server-only Trip database service
│   │   ├── traveler-service.ts                   # Server-only Traveler database service
│   │   └── itinerary-service.ts                  # Server-only Itinerary database service
│   └── validation/
│       ├── trip-schema.ts                        # Zod schemas for Trip
│       ├── traveler-schema.ts                    # Zod schemas for Traveler
│       └── itinerary-schema.ts                   # Zod schemas for ItineraryItem
```
