# TripDesk Business Module Architecture Standard (V1)

This document establishes the standardized, production-tested reference pattern derived from the **Customer Module** (Phase 10.1M-3A through 10.1M-5). All future business modules must adhere to this architecture.

---

## Architecture Flow

```
Frontend UI Component
       ↓ (1)
Browser API Client (`src/lib/api-client/<module>-client.ts`)
       ↓ (2) fetch('/api/<module>')
Next.js App Router Route Handler (`src/app/api/<module>/route.ts`)
       ↓ (3) Zod Validation (`validateJson`, `validateQueryParams`, `validateRouteParams`)
       ↓ (4) Auth Context & Role Guard (`requireAgencyOwnerContext()`)
       ↓ (5) Subscription Guard (`requireReadAccess()` or `requireWriteAccess()`)
Backend Service Layer (`src/lib/services/<module>-service.ts`)
       ↓ (6) Tenant Scoping (`where: { agencyId, ... }`)
Prisma 7.9 ORM Client (`src/lib/prisma.ts`)
       ↓ (7)
Supabase PostgreSQL Database
       ↓ (8)
Standardized Response (`apiSuccess()`, `apiCreated()`, `handleApiError()`)
```

---

## 1. Prisma Database Model Standard
- **Primary Key**: String CUID (`@id @default(cuid())`).
- **Tenant Key**: Required `agencyId String` with `@@index([agencyId])`.
- **Foreign Key Relation**: `agency Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)`.
- **Soft Deletion**: `archivedAt DateTime?` on all main business entities (preserve foreign key history for quotations, bookings, and trips).
- **Timestamps**: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.

---

## 2. Zod Validation Schema Standard (`src/lib/validation/<module>-schema.ts`)
- **Strict Tenant Hygiene**: Never allow `agencyId`, `role`, or `userId` in client input schemas.
- **Create Schema**: Validates required fields, trims strings, applies sensible character limits.
- **Update (PATCH) Schema**: Makes all editable fields optional; includes `.refine(data => Object.keys(data).length > 0)` to reject empty updates.
- **Query Schema**: Validates and coerces `search` (optional), `page` (int $\ge 1$, default 1), `limit` (int 1–100, default 20), `includeArchived` (boolean).
- **Route Params Schema**: Validates `{ id: z.string().trim().min(1) }`.

---

## 3. Backend Service Layer Standard (`src/lib/services/<module>-service.ts`)
- **Server-Only**: Must include `import "server-only";` at top.
- **Explicit Tenant Scoping**: Every function must accept `agencyId: string` as its first parameter derived solely from the server's authenticated context.
- **Query Scoping Pattern**:
  - List: `prisma.<model>.findMany({ where: { agencyId, archivedAt: null, ...searchFilter }, skip, take: limit })`
  - Get by ID: `prisma.<model>.findFirst({ where: { id, agencyId } })` $\to$ returns `null` or entity.
  - Create: `prisma.<model>.create({ data: { agencyId, ...data } })`
  - Update: Check `findFirst({ where: { id, agencyId } })`. If not found or `archivedAt` is set $\to$ throw `NotFoundError("<Entity>")`. Update via `prisma.<model>.update({ where: { id }, data })`.
  - Archive: Check `findFirst({ where: { id, agencyId } })`. Update `archivedAt: new Date()`.

---

## 4. API Route Handlers Standard (`src/app/api/<module>/...`)
- **Export Config**: `export const dynamic = "force-dynamic";`
- **GET (List & Single)**:
  ```ts
  const context = await requireReadAccess();
  // validate params -> call service -> return apiSuccess(data, 200, meta)
  ```
- **POST, PATCH, DELETE**:
  ```ts
  const context = await requireWriteAccess(); // Rejects expired/cancelled subscriptions with 403 ReadOnlyAccessError
  // validate body/params -> call service -> return apiCreated/apiSuccess
  ```
- **Centralized Error Wrapper**: Wrap every route in `try / catch` returning `handleApiError(error)`.

---

## 5. Frontend API Client Standard (`src/lib/api-client/<module>-client.ts`)
- Client-side fetch wrapper using standard `fetch()` with `cache: "no-store"`.
- Clean helper methods: `get<Entities>()`, `get<Entity>(id)`, `create<Entity>(data)`, `update<Entity>(id, data)`, `archive<Entity>(id)`.
- Standardized `handleResponse` extracting `error.code`, `error.statusCode`, `error.details`.
- Never accepts `agencyId`, `role`, or credentials from client code.

---

## 6. Frontend UI Integration Standard
- **Data Fetching**: Fetch real database records inside `useEffect` or React hooks via API client.
- **Search**: Apply 300ms debounce on search inputs and reset pagination to page 1 on keyword changes.
- **Pagination**: Use server-provided `page`, `limit`, `total`, `totalPages` with Prev/Next buttons.
- **Loading & Error States**: Provide loading spinner / skeleton, safe error banner with retry button, and clear empty state.
- **Targeted Refresh**: Refetch entity data after create, update, or archive rather than triggering full browser reloads.

---

## 7. Subscription Read-Only UX Standard
- **Banner Display**: Render `<ReadOnlyBanner moduleName="..." />` when `isReadOnly` is detected (via 403 response or session).
- **Control Disabling**: Disable Create, Edit, and Archive buttons when `isReadOnly` is true.
- **Security Boundary**: The backend `requireWriteAccess()` guard remains the definitive authority (returns HTTP 403 `READ_ONLY_ACCESS`).

---

## 8. Multi-Tenant Security & Isolation Standard
- `agencyId` is **never trusted** from request bodies, query strings, headers, route params, or localStorage.
- If a resource ID does not exist or belongs to another agency, the API must return **404 NOT_FOUND** (never 403), preventing cross-tenant existence enumeration.

---

## 9. Error Sanitization Standard
- All domain errors inherit from `ApiError` with specific status codes:
  - 401: `UNAUTHORIZED`
  - 403: `FORBIDDEN` or `READ_ONLY_ACCESS`
  - 404: `NOT_FOUND`
  - 400: `VALIDATION_ERROR`
  - 409: `CONFLICT`
  - 500: `INTERNAL_ERROR`
- Stack traces, Prisma internals, and connection strings are masked from responses.

---

## 10. Verification Matrix for Future Modules
Before completing any business module:
1. `npx prisma validate` passes with 0 errors.
2. `npm run build` passes with 0 TypeScript / build errors.
3. Unauthenticated access $\to$ 401.
4. Cross-tenant access $\to$ 404.
5. Expired subscription write $\to$ 403 `READ_ONLY_ACCESS`.
6. Soft deletion preserves record in database with `archivedAt`.
