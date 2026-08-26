# TRIPDESK — PHASE 10.8 DOCUMENTATION

## Enquiry & CRM Backend + Frontend Integration

---

## 1. Executive Summary

Phase 10.8 transitioned the **Enquiries & CRM** module in TripDesk from mock/in-memory state to a production-ready PostgreSQL + Prisma + REST API architecture.

Key capabilities delivered:
1. **Prisma Database Schema Extensions**: Full `Enquiry` and `EnquiryFollowUp` models with multi-tenant isolation, travel specification fields, status/priority/source enums, soft delete support (`archivedAt`), and foreign keys across `Customer`, `Trip`, `Quotation`, and `Agency`.
2. **Sequential Numbering Engines**: Automatic generation of `ENQ-YYYY-XXXXX` scoped per agency per year.
3. **CRM Follow-Up & Timeline System**: Full interaction tracking (`CALL`, `WHATSAPP`, `EMAIL`, `MEETING`, `OTHER`) with scheduled touchpoint tracking (`scheduledAt`, `completedAt`) and next follow-up date calculation.
4. **Enquiry → Trip Conversion Workflow**: Transactional, idempotent conversion of qualified customer leads into active Trip workspaces (`POST /api/enquiries/[id]/convert`) with traveler matrix generation and quotation pipeline support.
5. **Typed REST APIs & Client SDKs**: Full CRUD operations with multi-tenant validation, subscription read-only enforcement, and Zod input validation.
6. **Frontend Dashboards & Workspaces**:
   - `/enquiries` (Master CRM directory with Table and Kanban Pipeline view modes, search debouncing, status/priority/source filters, and pagination)
   - `/enquiries/new` (Creation workspace with existing customer picker and quick-add customer)
   - `/enquiries/[id]` (Comprehensive enquiry workspace with travel specifications, follow-up timeline, and conversion actions)

---

## 2. Architecture & Data Flow

```text
PostgreSQL (Supabase Pooler)
    ↓
Prisma ORM (Enquiry & EnquiryFollowUp Models)
    ↓
Zod Schemas (enquiry-schema.ts)
    ↓
Server Services (enquiry-service.ts)
    ↓
Next.js 16 API Routes (/api/enquiries, /api/enquiries/[id], /api/enquiries/[id]/convert, /api/enquiries/[id]/follow-ups)
    ↓
Typed API Clients (enquiryClient)
    ↓
React / Next.js UI (/enquiries, /enquiries/new, /enquiries/[id])
```

---

## 3. Database Schema Reference

```prisma
enum EnquiryStatus {
  NEW
  CONTACTED
  QUALIFIED
  FOLLOW_UP
  QUOTATION_SENT
  NEGOTIATION
  CONVERTED
  LOST
  CANCELLED
}

enum EnquiryPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum EnquirySource {
  WEBSITE
  INSTAGRAM
  FACEBOOK
  WHATSAPP
  PHONE
  EMAIL
  REFERRAL
  WALK_IN
  AGENT
  OTHER
}

enum FollowUpType {
  CALL
  WHATSAPP
  EMAIL
  MEETING
  OTHER
}

enum FollowUpStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model Enquiry {
  id                  String          @id @default(cuid())
  agencyId            String
  customerId          String
  enquiryNumber       String
  title               String
  destination         String
  origin              String?
  startDate           DateTime?
  endDate             DateTime?
  adults              Int             @default(1)
  children            Int             @default(0)
  infants             Int             @default(0)
  budget              Decimal?        @db.Decimal(12, 2)
  budgetType          String?         @default("total")
  currency            String          @default("INR")
  hotelCategory       String?
  mealPlan            String?
  vehiclePreference   String?
  transportRequired   Boolean         @default(false)
  source              EnquirySource   @default(WHATSAPP)
  priority            EnquiryPriority @default(MEDIUM)
  status              EnquiryStatus   @default(NEW)
  specialRequirements String?
  notes               String?
  internalNotes       String?
  assignedTo          String?
  nextFollowUpAt      DateTime?
  convertedTripId     String?
  convertedQuotationId String?
  lostReason          String?
  closedAt            DateTime?
  archivedAt          DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  agency             Agency            @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  customer           Customer          @relation(fields: [customerId], references: [id], onDelete: Restrict)
  convertedTrip      Trip?             @relation(fields: [convertedTripId], references: [id], onDelete: SetNull)
  convertedQuotation Quotation?        @relation(fields: [convertedQuotationId], references: [id], onDelete: SetNull)
  followUps          EnquiryFollowUp[]

  @@unique([agencyId, enquiryNumber])
  @@index([agencyId])
  @@index([customerId])
  @@index([convertedTripId])
  @@index([convertedQuotationId])
  @@index([agencyId, status])
  @@index([agencyId, priority])
  @@index([agencyId, source])
  @@index([agencyId, nextFollowUpAt])
  @@index([agencyId, createdAt])
  @@map("enquiries")
}

model EnquiryFollowUp {
  id          String         @id @default(cuid())
  agencyId    String
  enquiryId   String
  type        FollowUpType   @default(CALL)
  status      FollowUpStatus @default(PENDING)
  scheduledAt DateTime
  notes       String?
  completedAt DateTime?
  archivedAt  DateTime?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  agency  Agency  @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  enquiry Enquiry @relation(fields: [enquiryId], references: [id], onDelete: Cascade)

  @@index([agencyId])
  @@index([enquiryId])
  @@index([agencyId, scheduledAt])
  @@index([agencyId, status])
  @@map("enquiry_follow_ups")
}
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/enquiries` | List enquiries with search, status/priority/source filters, and pagination | Read |
| `POST` | `/api/enquiries` | Create customer travel enquiry | Write |
| `GET` | `/api/enquiries/[id]` | Get single enquiry with customer, converted trip/quotation, and follow-ups | Read |
| `PATCH` | `/api/enquiries/[id]` | Update enquiry status, priority, dates, passenger count, or remarks | Write |
| `DELETE` | `/api/enquiries/[id]` | Soft delete / archive enquiry | Write |
| `POST` | `/api/enquiries/[id]/convert` | Convert qualified enquiry into a Trip workspace | Write |
| `GET` | `/api/enquiries/[id]/follow-ups` | List follow-up timeline interactions | Read |
| `POST` | `/api/enquiries/[id]/follow-ups` | Schedule follow-up task | Write |
| `PATCH` | `/api/enquiries/[id]/follow-ups/[followUpId]` | Update / complete follow-up task | Write |
| `DELETE` | `/api/enquiries/[id]/follow-ups/[followUpId]` | Soft delete follow-up task | Write |

---

## 5. Verification & Build Results

- **Prisma Schema Validation**: `npx prisma validate` passed.
- **Database Schema Migration**: `npx prisma db push` succeeded on PostgreSQL.
- **Client Generation**: `npx prisma generate` generated Prisma Client v7.9.1.
- **Production Compilation**: `npm run build` compiled 97 static and dynamic routes with **0 TypeScript and 0 linting errors**.
