-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_OWNER', 'AGENCY_OWNER');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNING', 'QUOTED', 'BOOKED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelerType" AS ENUM ('ADULT', 'CHILD');

-- CreateEnum
CREATE TYPE "VehiclePricingType" AS ENUM ('PER_KM', 'TOTAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('INCLUDED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "status" "AgencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENCY_OWNER',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travelers" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TravelerType" NOT NULL DEFAULT 'ADULT',
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "idPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travelers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_hotels" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "roomType" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_items" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_vehicles" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacity" INTEGER,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "pricingType" "VehiclePricingType" NOT NULL DEFAULT 'TOTAL',
    "ratePerKm" DECIMAL(10,2),
    "estimatedKm" DECIMAL(10,2),
    "totalRate" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activities" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "location" TEXT,
    "type" "ActivityType" NOT NULL DEFAULT 'INCLUDED',
    "adultPrice" DECIMAL(10,2),
    "childPrice" DECIMAL(10,2),
    "totalPrice" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customerMessage" TEXT,
    "internalNotes" TEXT,
    "sharedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markupPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_share_links" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "quotationId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "ShareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "public_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_agencyId_idx" ON "users"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscriptions_agencyId_idx" ON "subscriptions"("agencyId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "customers_agencyId_idx" ON "customers"("agencyId");

-- CreateIndex
CREATE INDEX "customers_agencyId_phone_idx" ON "customers"("agencyId", "phone");

-- CreateIndex
CREATE INDEX "trips_agencyId_idx" ON "trips"("agencyId");

-- CreateIndex
CREATE INDEX "trips_customerId_idx" ON "trips"("customerId");

-- CreateIndex
CREATE INDEX "trips_agencyId_status_idx" ON "trips"("agencyId", "status");

-- CreateIndex
CREATE INDEX "trips_agencyId_startDate_idx" ON "trips"("agencyId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "trips_agencyId_tripNumber_key" ON "trips"("agencyId", "tripNumber");

-- CreateIndex
CREATE INDEX "travelers_tripId_idx" ON "travelers"("tripId");

-- CreateIndex
CREATE INDEX "hotels_agencyId_idx" ON "hotels"("agencyId");

-- CreateIndex
CREATE INDEX "hotels_agencyId_city_idx" ON "hotels"("agencyId", "city");

-- CreateIndex
CREATE INDEX "trip_hotels_tripId_idx" ON "trip_hotels"("tripId");

-- CreateIndex
CREATE INDEX "trip_hotels_hotelId_idx" ON "trip_hotels"("hotelId");

-- CreateIndex
CREATE INDEX "itinerary_items_tripId_idx" ON "itinerary_items"("tripId");

-- CreateIndex
CREATE INDEX "itinerary_items_tripId_dayNumber_idx" ON "itinerary_items"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "trip_vehicles_tripId_idx" ON "trip_vehicles"("tripId");

-- CreateIndex
CREATE INDEX "trip_activities_tripId_idx" ON "trip_activities"("tripId");

-- CreateIndex
CREATE INDEX "quotations_agencyId_idx" ON "quotations"("agencyId");

-- CreateIndex
CREATE INDEX "quotations_tripId_idx" ON "quotations"("tripId");

-- CreateIndex
CREATE INDEX "quotations_customerId_idx" ON "quotations"("customerId");

-- CreateIndex
CREATE INDEX "quotations_agencyId_status_idx" ON "quotations"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_agencyId_quotationNumber_version_key" ON "quotations"("agencyId", "quotationNumber", "version");

-- CreateIndex
CREATE INDEX "quotation_items_quotationId_idx" ON "quotation_items"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_quotationId_key" ON "bookings"("quotationId");

-- CreateIndex
CREATE INDEX "bookings_agencyId_idx" ON "bookings"("agencyId");

-- CreateIndex
CREATE INDEX "bookings_tripId_idx" ON "bookings"("tripId");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_agencyId_status_idx" ON "bookings"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_agencyId_bookingNumber_key" ON "bookings"("agencyId", "bookingNumber");

-- CreateIndex
CREATE INDEX "payments_agencyId_idx" ON "payments"("agencyId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_agencyId_paymentDate_idx" ON "payments"("agencyId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "public_share_links_tokenHash_key" ON "public_share_links"("tokenHash");

-- CreateIndex
CREATE INDEX "public_share_links_agencyId_idx" ON "public_share_links"("agencyId");

-- CreateIndex
CREATE INDEX "public_share_links_tripId_idx" ON "public_share_links"("tripId");

-- CreateIndex
CREATE INDEX "public_share_links_tokenHash_idx" ON "public_share_links"("tokenHash");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_hotels" ADD CONSTRAINT "trip_hotels_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_hotels" ADD CONSTRAINT "trip_hotels_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
