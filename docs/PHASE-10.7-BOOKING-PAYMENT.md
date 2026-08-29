# TRIPDESK — PHASE 10.7 DOCUMENTATION

## Booking & Payment Backend + Frontend Integration

---

## 1. Executive Summary

Phase 10.7 transitioned the **Bookings** and **Payments** modules in TripDesk from mock/in-memory state to a production-ready PostgreSQL + Prisma + REST API architecture.

Key capabilities delivered:
1. **Prisma Database Schema Extensions**: Full `Booking` and `Payment` models with multi-tenant isolation, balance tracking, status enums, soft delete support (`archivedAt`), and foreign key relationships across `Trip`, `Customer`, `Quotation`, and `Agency`.
2. **Sequential Numbering Engines**: Automatic generation of `BK-YYYY-XXXXX` and `PAY-YYYY-XXXXX` scoped per agency per year.
3. **Decimal-Safe Financial Engine**: Atomic calculation of `paidAmount`, `balanceAmount`, and dynamic `paymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID`) using `Prisma.Decimal` and 2-decimal precision.
4. **Quotation Conversion Workflow**: Zero-friction conversion of accepted proposal quotations into confirmed booking reservations (`POST /api/quotations/[id]/booking`).
5. **Typed REST APIs & Client SDKs**: Full CRUD and ledger operations with multi-tenant validation, subscription read-only enforcement, and Zod input validation.
6. **Frontend Dashboards & Workspaces**:
   - `/bookings` (Master operations directory with search debouncing, status filters, and pagination)
   - `/bookings/new` (Creation workspace from proposals or direct trip workspaces)
   - `/bookings/[id]` (Comprehensive booking workspace with payment ledger and modals)
   - `/payments` (Master accounts ledger and revenue collection tracking)
   - `/trips/[id]/quotation` ("Convert to Booking" direct conversion action)

---

## 2. Architecture & Data Flow

```text
PostgreSQL (Supabase Pooler)
    ↓
Prisma ORM (Booking & Payment Models)
    ↓
Zod Schemas (booking-schema.ts & payment-schema.ts)
    ↓
Server Services (booking-service.ts & payment-service.ts)
    ↓
Next.js 16 API Routes (/api/bookings, /api/payments, /api/quotations/[id]/booking)
    ↓
Typed API Clients (bookingClient & paymentClient)
    ↓
React / Next.js Dashboard UI (bookings, bookings/new, bookings/[id], payments)
```

---

## 3. Database Schema Reference

```prisma
enum BookingStatus {
  DRAFT
  CONFIRMED
  ONGOING
  COMPLETED
  CANCELLED
}

enum BookingPaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}

enum PaymentMethod {
  UPI
  BANK_TRANSFER
  CASH
  CARD
  CHEQUE
  OTHER
}

model Booking {
  id                 String               @id @default(cuid())
  agencyId           String
  tripId             String
  customerId         String
  quotationId        String?
  bookingNumber      String
  status             BookingStatus        @default(CONFIRMED)
  paymentStatus      BookingPaymentStatus @default(UNPAID)
  bookingDate        DateTime             @default(now())
  travelStartDate    DateTime?
  travelEndDate      DateTime?
  currency           String               @default("INR")
  totalAmount        Decimal              @db.Decimal(12, 2)
  paidAmount         Decimal              @default(0) @db.Decimal(12, 2)
  balanceAmount      Decimal              @default(0) @db.Decimal(12, 2)
  notes              String?
  internalNotes      String?
  cancellationReason String?
  confirmedAt        DateTime?            @default(now())
  completedAt        DateTime?
  cancelledAt        DateTime?
  archivedAt         DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  agency    Agency     @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  trip      Trip       @relation(fields: [tripId], references: [id], onDelete: Restrict)
  quotation Quotation? @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  customer  Customer   @relation(fields: [customerId], references: [id], onDelete: Restrict)
  payments  Payment[]

  @@unique([agencyId, bookingNumber])
  @@index([agencyId])
  @@index([tripId])
  @@index([customerId])
  @@index([quotationId])
  @@index([agencyId, status])
  @@index([agencyId, paymentStatus])
  @@map("bookings")
}

model Payment {
  id              String        @id @default(cuid())
  agencyId        String
  bookingId       String
  tripId          String?
  customerId      String?
  paymentNumber   String        @default("")
  amount          Decimal       @db.Decimal(12, 2)
  currency        String        @default("INR")
  paymentMethod   PaymentMethod @default(UPI)
  paymentDate     DateTime      @default(now())
  status          PaymentStatus @default(COMPLETED)
  referenceNumber String?
  receiptNumber   String?
  notes           String?
  refundedAmount  Decimal       @default(0) @db.Decimal(12, 2)
  refundedAt      DateTime?
  archivedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  agency   Agency    @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  booking  Booking   @relation(fields: [bookingId], references: [id], onDelete: Restrict)
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  trip     Trip?     @relation(fields: [tripId], references: [id], onDelete: SetNull)

  @@index([agencyId])
  @@index([bookingId])
  @@index([tripId])
  @@index([customerId])
  @@index([agencyId, paymentNumber])
  @@index([agencyId, status])
  @@index([agencyId, paymentDate])
  @@map("payments")
}
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/bookings` | List bookings with search, status & paymentStatus filters, and pagination | Read |
| `POST` | `/api/bookings` | Create manual booking with customer, trip, and optional initial payment | Write |
| `GET` | `/api/bookings/[id]` | Get single booking with customer, trip, quotation, and payment ledger | Read |
| `PATCH` | `/api/bookings/[id]` | Update booking status, dates, contract amount, remarks, cancellation reason | Write |
| `DELETE` | `/api/bookings/[id]` | Soft delete / archive booking | Write |
| `POST` | `/api/quotations/[id]/booking` | Convert accepted quotation into a confirmed booking | Write |
| `GET` | `/api/payments` | List payments across agency with method/status filters & pagination | Read |
| `POST` | `/api/payments` | Log customer payment and recalculate booking balances | Write |
| `GET` | `/api/payments/[id]` | Get payment details with booking and customer info | Read |
| `PATCH` | `/api/payments/[id]` | Update payment details, status, or refund amount | Write |
| `DELETE` | `/api/payments/[id]` | Soft delete / archive payment and recalculate booking balances | Write |

---

## 5. Verification & Build Results

- **Prisma Schema Validation**: `npx prisma validate` passed.
- **Database Schema Migration**: `npx prisma db push` succeeded on PostgreSQL.
- **Client Generation**: `npx prisma generate` generated Prisma Client v7.9.1.
- **Production Compilation**: `npm run build` compiled 92 static and dynamic routes with **0 TypeScript and 0 linting errors**.
