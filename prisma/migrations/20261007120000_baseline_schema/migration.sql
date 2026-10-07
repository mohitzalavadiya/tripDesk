-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_OWNER', 'AGENCY_OWNER');

-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONVERTED', 'REWARDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DestinationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNING', 'QUOTED', 'BOOKED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelerType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "VehiclePricingType" AS ENUM ('PER_KM', 'TOTAL', 'FIXED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('INCLUDED', 'EXCLUDED', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'PARTIAL', 'FINAL', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('EXCLUSIVE', 'INCLUSIVE');

-- CreateEnum
CREATE TYPE "GstTreatment" AS ENUM ('INTRA_STATE', 'INTER_STATE', 'NON_GST_EXEMPT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierPayableStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TOLL', 'PARKING', 'FUEL', 'DRIVER_ALLOWANCE', 'MEALS', 'EMERGENCY', 'ACTIVITY', 'MISCELLANEOUS');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'QUOTATION_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerNotificationType" AS ENUM ('ENQUIRY_CREATED', 'QUOTATION_CREATED', 'QUOTATION_SENT', 'QUOTATION_VIEWED', 'QUOTATION_ACCEPTED', 'BOOKING_CONFIRMED', 'TRIP_CONFIRMED', 'TRIP_UPDATED', 'HOTEL_CONFIRMED', 'HOTEL_AMENDED', 'HOTEL_CANCELLED', 'VEHICLE_ASSIGNED', 'VEHICLE_UPDATED', 'ACTIVITY_CONFIRMED', 'ACTIVITY_AMENDED', 'ACTIVITY_CANCELLED', 'DOCUMENT_READY', 'PAYMENT_RECEIVED', 'PAYMENT_DUE', 'PAYMENT_REFUNDED', 'TRIP_UPCOMING', 'TRIP_DEPARTING', 'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED', 'TRIP_DELAY', 'OPERATIONS_ALERT', 'FEEDBACK_REQUEST', 'REVIEW_REQUEST');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelDocumentType" AS ENUM ('HOTEL_VOUCHER', 'VEHICLE_VOUCHER', 'ACTIVITY_VOUCHER', 'CUSTOMER_ITINERARY', 'BOOKING_CONFIRMATION', 'PAYMENT_RECEIPT', 'TRAVEL_SUMMARY', 'SUPPLIER_VOUCHER');

-- CreateEnum
CREATE TYPE "TravelDocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'ISSUED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EnquiryPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WEBSITE', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'PHONE', 'EMAIL', 'REFERRAL', 'WALK_IN', 'AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "UserNotificationType" AS ENUM ('AGENCY_SIGNUP', 'SUBSCRIPTION_PAYMENT_SUBMITTED', 'SUBSCRIPTION_PAYMENT_VERIFIED', 'SUBSCRIPTION_PAYMENT_REJECTED', 'AGENCY_STATUS_CHANGED', 'QUOTATION_ACCEPTED', 'QUOTATION_CHANGE_REQUESTED', 'BOOKING_CREATED', 'PAYMENT_RECEIVED', 'CUSTOMER_ENQUIRY_CREATED', 'PLATFORM_ANNOUNCEMENT', 'PLATFORM_CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RateInventoryType" AS ENUM ('HOTEL');

-- CreateEnum
CREATE TYPE "RateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProposalItemType" AS ENUM ('INCLUSION', 'EXCLUSION', 'IMPORTANT_NOTE');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'REQUESTED', 'CONFIRMED', 'AMENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'ASSIGNED', 'CONFIRMED', 'ON_DUTY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

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
    "passwordHash" TEXT,
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
    "yearlyPrice" DECIMAL(10,2),
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "features" JSONB,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_feature_entitlements" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "limit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_usage_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billingCycle" TEXT DEFAULT 'MONTHLY',
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT,
    "billingCycle" TEXT DEFAULT 'MONTHLY',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paymentReference" TEXT,
    "utrNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerNumber" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "postalCode" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
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
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "idPhotoUrl" TEXT,
    "specialRequirements" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travelers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT,
    "cityArea" TEXT,
    "status" "DestinationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_destinations" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "destinationId" TEXT,
    "hotelCode" TEXT,
    "supplierId" TEXT,
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
    "tripDestinationId" TEXT,
    "hotelId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "roomType" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "mealPlan" TEXT,
    "nightlyRate" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
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
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "registrationNumber" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_vehicles" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleName" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacity" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "pickupLocation" TEXT,
    "dropLocation" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "pricingType" "VehiclePricingType" NOT NULL DEFAULT 'FIXED',
    "ratePerKm" DECIMAL(10,2),
    "estimatedKm" DECIMAL(10,2),
    "actualKm" DECIMAL(10,2),
    "totalRate" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "destinationId" TEXT,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "duration" TEXT,
    "type" "ActivityType" NOT NULL DEFAULT 'INCLUDED',
    "adultPrice" DECIMAL(10,2),
    "childPrice" DECIMAL(10,2),
    "price" DECIMAL(10,2),
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activities" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripDestinationId" TEXT,
    "activityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "location" TEXT,
    "numberOfParticipants" INTEGER DEFAULT 1,
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
    "title" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markupPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "markupAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) DEFAULT 0,
    "taxRate" DECIMAL(5,2) DEFAULT 0,
    "taxMode" "TaxMode" DEFAULT 'EXCLUSIVE',
    "gstTreatment" "GstTreatment" DEFAULT 'INTRA_STATE',
    "cgstAmount" DECIMAL(12,2) DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) DEFAULT 0,
    "igstAmount" DECIMAL(12,2) DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "proposalSubtitle" TEXT,
    "customerMessage" TEXT,
    "inclusionsIntro" TEXT,
    "exclusionsIntro" TEXT,
    "paymentTerms" TEXT,
    "cancellationPolicy" TEXT,
    "importantNotes" TEXT,
    "customerFeedback" TEXT,
    "customerFeedbackAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "terms" TEXT,
    "privacyPolicy" TEXT,
    "shareToken" TEXT,
    "sharedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "tier" TEXT NOT NULL DEFAULT 'Deluxe',
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
    "category" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markupPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_proposal_items" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "type" "ProposalItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_proposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_payment_milestones" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "percentage" DECIMAL(5,2),
    "amount" DECIMAL(12,2),
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_payment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationId" TEXT,
    "packageOptionName" TEXT,
    "bookingNumber" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "travelStartDate" TIMESTAMP(3),
    "travelEndDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2),
    "taxAmount" DECIMAL(12,2),
    "taxRate" DECIMAL(5,2),
    "taxMode" "TaxMode",
    "gstTreatment" "GstTreatment",
    "cgstAmount" DECIMAL(12,2),
    "sgstAmount" DECIMAL(12,2),
    "igstAmount" DECIMAL(12,2),
    "notes" TEXT,
    "internalNotes" TEXT,
    "cancellationReason" TEXT,
    "confirmedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "tripId" TEXT,
    "customerId" TEXT,
    "paymentNumber" TEXT NOT NULL DEFAULT '',
    "paymentType" "PaymentType" NOT NULL DEFAULT 'PARTIAL',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "referenceNumber" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "receivedBy" TEXT,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2),
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(12,2) DEFAULT 0,
    "taxAmount" DECIMAL(12,2) DEFAULT 0,
    "taxRate" DECIMAL(5,2) DEFAULT 0,
    "taxMode" "TaxMode" DEFAULT 'EXCLUSIVE',
    "gstTreatment" "GstTreatment" DEFAULT 'INTRA_STATE',
    "cgstAmount" DECIMAL(12,2) DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) DEFAULT 0,
    "igstAmount" DECIMAL(12,2) DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "customerSnapshot" JSONB,
    "bookingSnapshot" JSONB,
    "agencySnapshot" JSONB,
    "notes" TEXT,
    "paymentInstructions" TEXT,
    "internalNotes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "replacedByInvoiceId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "enquiryNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "origin" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(12,2),
    "budgetType" TEXT DEFAULT 'total',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "hotelCategory" TEXT,
    "mealPlan" TEXT,
    "vehiclePreference" TEXT,
    "transportRequired" BOOLEAN NOT NULL DEFAULT false,
    "source" "EnquirySource" NOT NULL DEFAULT 'WHATSAPP',
    "priority" "EnquiryPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "specialRequirements" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "assignedTo" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "convertedTripId" TEXT,
    "convertedQuotationId" TEXT,
    "lostReason" TEXT,
    "lostExplanation" TEXT,
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiry_follow_ups" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL DEFAULT 'CALL',
    "priority" "EnquiryPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiry_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "supplierCode" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'Hotel Supplier',
    "contactPerson" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "postalCode" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "paymentTerms" TEXT,
    "bankDetails" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_sheets" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "rateSheetNumber" TEXT,
    "name" TEXT NOT NULL,
    "inventoryType" "RateInventoryType" NOT NULL DEFAULT 'HOTEL',
    "hotelId" TEXT,
    "roomType" TEXT,
    "mealPlan" TEXT,
    "seasonName" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "extraAdultRate" DECIMAL(12,2),
    "extraChildRate" DECIMAL(12,2),
    "taxPercentage" DECIMAL(5,2) DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "RateStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" TEXT DEFAULT 'MANUAL',
    "notes" TEXT,
    "internalNotes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_operations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "coordinatorId" TEXT,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "operationStartDate" TIMESTAMP(3),
    "operationEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_confirmations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT NOT NULL,
    "tripHotelId" TEXT,
    "supplierId" TEXT,
    "confirmationNumber" TEXT,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "roomDetails" TEXT,
    "mealPlan" TEXT,
    "supplierNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_dispatches" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT NOT NULL,
    "tripVehicleId" TEXT,
    "vehicleId" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicleNumber" TEXT,
    "pickupDate" TIMESTAMP(3),
    "pickupTime" TEXT,
    "pickupLocation" TEXT,
    "dropLocation" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_confirmations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT NOT NULL,
    "tripActivityId" TEXT,
    "activityId" TEXT,
    "confirmationNumber" TEXT,
    "ticketNumber" TEXT,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "supplierNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_issues" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "reportedBy" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_events" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payables" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "payeeName" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "bookingId" TEXT,
    "tripOperationId" TEXT,
    "tripId" TEXT,
    "payableNumber" TEXT NOT NULL DEFAULT '',
    "serviceType" TEXT NOT NULL DEFAULT 'HOTEL',
    "serviceReferenceId" TEXT,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "plannedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "SupplierPayableStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "supplierId" TEXT,
    "payeeName" TEXT,
    "payableId" TEXT,
    "bookingId" TEXT,
    "paymentNumber" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "paidBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_expenses" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripOperationId" TEXT,
    "tripId" TEXT,
    "bookingId" TEXT,
    "expenseNumber" TEXT NOT NULL DEFAULT '',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'MISCELLANEOUS',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "receiptUrl" TEXT,
    "paidBy" TEXT,
    "createdBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_feedbacks" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "serviceRating" INTEGER DEFAULT 5,
    "hotelRating" INTEGER DEFAULT 5,
    "vehicleRating" INTEGER DEFAULT 5,
    "driverRating" INTEGER DEFAULT 5,
    "activityRating" INTEGER DEFAULT 5,
    "supportRating" INTEGER DEFAULT 5,
    "positiveComment" TEXT,
    "improvementComment" TEXT,
    "travelAgain" TEXT DEFAULT 'Yes',
    "serviceRecoveryStatus" TEXT DEFAULT 'Not Needed',
    "serviceRecoveryNotes" TEXT,
    "comments" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PORTAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "referrerCustomerId" TEXT NOT NULL,
    "referredName" TEXT NOT NULL,
    "referredEmail" TEXT,
    "referredPhone" TEXT,
    "referralCode" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardAmount" DECIMAL(10,2),
    "notes" TEXT,
    "convertedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notifications" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tripId" TEXT,
    "bookingId" TEXT,
    "quotationId" TEXT,
    "enquiryId" TEXT,
    "type" "CustomerNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'SENT',
    "recipient" TEXT,
    "subject" TEXT,
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "linkUrl" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notification_preferences" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tripUpdates" BOOLEAN NOT NULL DEFAULT true,
    "paymentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "documentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "serviceUpdates" BOOLEAN NOT NULL DEFAULT true,
    "marketingMessages" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_communication_settings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultSenderName" TEXT,
    "defaultSenderEmail" TEXT,
    "autoQuotationSent" BOOLEAN NOT NULL DEFAULT true,
    "autoBookingConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "autoPaymentReminders" BOOLEAN NOT NULL DEFAULT true,
    "autoTravelReminders" BOOLEAN NOT NULL DEFAULT true,
    "autoFeedbackRequests" BOOLEAN NOT NULL DEFAULT true,
    "paymentReminderDays" INTEGER NOT NULL DEFAULT 3,
    "travelReminderDays" INTEGER NOT NULL DEFAULT 3,
    "whatsappProvider" TEXT NOT NULL DEFAULT 'MOCK',
    "emailProvider" TEXT NOT NULL DEFAULT 'MOCK',
    "googleReviewUrl" TEXT,
    "tripAdvisorReviewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_communication_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_documents" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "tripId" TEXT,
    "customerId" TEXT NOT NULL,
    "paymentId" TEXT,
    "supplierId" TEXT,
    "hotelConfirmationId" TEXT,
    "vehicleDispatchId" TEXT,
    "activityConfirmationId" TEXT,
    "documentNumber" TEXT NOT NULL,
    "documentType" "TravelDocumentType" NOT NULL,
    "status" "TravelDocumentStatus" NOT NULL DEFAULT 'GENERATED',
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "supersedesDocumentId" TEXT,
    "recipient" TEXT,
    "channel" "NotificationChannel",
    "metadata" JSONB,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "agencyId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_tax_profiles" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "isGstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "gstin" TEXT,
    "legalBusinessName" TEXT,
    "registeredAddress" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "defaultTaxMode" "TaxMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "defaultGstRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "defaultGstTreatment" "GstTreatment" NOT NULL DEFAULT 'INTRA_STATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "role" "UserRole" NOT NULL,
    "type" "UserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_billing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "upiId" TEXT,
    "upiDisplayName" TEXT,
    "accountHolder" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "branchName" TEXT,
    "qrCodeUrl" TEXT,
    "qrStoragePath" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_chat_conversations" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageSnippet" TEXT,
    "lastMessageSenderRole" "UserRole",
    "agencyLastReadAt" TIMESTAMP(3),
    "platformLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "messageText" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_agencyId_idx" ON "users"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "plan_feature_entitlements_planId_idx" ON "plan_feature_entitlements"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_entitlements_planId_featureKey_key" ON "plan_feature_entitlements"("planId", "featureKey");

-- CreateIndex
CREATE INDEX "plan_usage_limits_planId_idx" ON "plan_usage_limits"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usage_limits_planId_resourceKey_key" ON "plan_usage_limits"("planId", "resourceKey");

-- CreateIndex
CREATE INDEX "subscriptions_agencyId_idx" ON "subscriptions"("agencyId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_agencyId_idx" ON "subscription_payments"("agencyId");

-- CreateIndex
CREATE INDEX "subscription_payments_subscriptionId_idx" ON "subscription_payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_utrNumber_idx" ON "subscription_payments"("utrNumber");

-- CreateIndex
CREATE INDEX "subscription_payments_paymentDate_idx" ON "subscription_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "customers_agencyId_idx" ON "customers"("agencyId");

-- CreateIndex
CREATE INDEX "customers_agencyId_customerNumber_idx" ON "customers"("agencyId", "customerNumber");

-- CreateIndex
CREATE INDEX "customers_agencyId_phone_idx" ON "customers"("agencyId", "phone");

-- CreateIndex
CREATE INDEX "customers_agencyId_email_idx" ON "customers"("agencyId", "email");

-- CreateIndex
CREATE INDEX "customers_agencyId_city_idx" ON "customers"("agencyId", "city");

-- CreateIndex
CREATE INDEX "trips_agencyId_idx" ON "trips"("agencyId");

-- CreateIndex
CREATE INDEX "trips_customerId_idx" ON "trips"("customerId");

-- CreateIndex
CREATE INDEX "trips_agencyId_status_idx" ON "trips"("agencyId", "status");

-- CreateIndex
CREATE INDEX "trips_agencyId_startDate_idx" ON "trips"("agencyId", "startDate");

-- CreateIndex
CREATE INDEX "trips_agencyId_createdAt_idx" ON "trips"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trips_agencyId_tripNumber_key" ON "trips"("agencyId", "tripNumber");

-- CreateIndex
CREATE INDEX "travelers_tripId_idx" ON "travelers"("tripId");

-- CreateIndex
CREATE INDEX "destinations_agencyId_idx" ON "destinations"("agencyId");

-- CreateIndex
CREATE INDEX "destinations_agencyId_status_idx" ON "destinations"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "destinations_agencyId_name_key" ON "destinations"("agencyId", "name");

-- CreateIndex
CREATE INDEX "trip_destinations_tripId_idx" ON "trip_destinations"("tripId");

-- CreateIndex
CREATE INDEX "trip_destinations_destinationId_idx" ON "trip_destinations"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_destinations_tripId_sequence_key" ON "trip_destinations"("tripId", "sequence");

-- CreateIndex
CREATE INDEX "hotels_agencyId_idx" ON "hotels"("agencyId");

-- CreateIndex
CREATE INDEX "hotels_destinationId_idx" ON "hotels"("destinationId");

-- CreateIndex
CREATE INDEX "hotels_agencyId_hotelCode_idx" ON "hotels"("agencyId", "hotelCode");

-- CreateIndex
CREATE INDEX "hotels_supplierId_idx" ON "hotels"("supplierId");

-- CreateIndex
CREATE INDEX "hotels_agencyId_city_idx" ON "hotels"("agencyId", "city");

-- CreateIndex
CREATE INDEX "trip_hotels_tripId_idx" ON "trip_hotels"("tripId");

-- CreateIndex
CREATE INDEX "trip_hotels_tripDestinationId_idx" ON "trip_hotels"("tripDestinationId");

-- CreateIndex
CREATE INDEX "trip_hotels_hotelId_idx" ON "trip_hotels"("hotelId");

-- CreateIndex
CREATE INDEX "itinerary_items_tripId_idx" ON "itinerary_items"("tripId");

-- CreateIndex
CREATE INDEX "itinerary_items_tripId_dayNumber_idx" ON "itinerary_items"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "vehicles_agencyId_idx" ON "vehicles"("agencyId");

-- CreateIndex
CREATE INDEX "vehicles_supplierId_idx" ON "vehicles"("supplierId");

-- CreateIndex
CREATE INDEX "vehicles_agencyId_type_idx" ON "vehicles"("agencyId", "type");

-- CreateIndex
CREATE INDEX "trip_vehicles_tripId_idx" ON "trip_vehicles"("tripId");

-- CreateIndex
CREATE INDEX "trip_vehicles_vehicleId_idx" ON "trip_vehicles"("vehicleId");

-- CreateIndex
CREATE INDEX "activities_agencyId_idx" ON "activities"("agencyId");

-- CreateIndex
CREATE INDEX "activities_destinationId_idx" ON "activities"("destinationId");

-- CreateIndex
CREATE INDEX "activities_supplierId_idx" ON "activities"("supplierId");

-- CreateIndex
CREATE INDEX "activities_agencyId_location_idx" ON "activities"("agencyId", "location");

-- CreateIndex
CREATE INDEX "trip_activities_tripId_idx" ON "trip_activities"("tripId");

-- CreateIndex
CREATE INDEX "trip_activities_tripDestinationId_idx" ON "trip_activities"("tripDestinationId");

-- CreateIndex
CREATE INDEX "trip_activities_activityId_idx" ON "trip_activities"("activityId");

-- CreateIndex
CREATE INDEX "quotations_agencyId_idx" ON "quotations"("agencyId");

-- CreateIndex
CREATE INDEX "quotations_tripId_idx" ON "quotations"("tripId");

-- CreateIndex
CREATE INDEX "quotations_customerId_idx" ON "quotations"("customerId");

-- CreateIndex
CREATE INDEX "quotations_shareToken_idx" ON "quotations"("shareToken");

-- CreateIndex
CREATE INDEX "quotations_agencyId_status_idx" ON "quotations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "quotations_agencyId_createdAt_idx" ON "quotations"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_agencyId_quotationNumber_version_key" ON "quotations"("agencyId", "quotationNumber", "version");

-- CreateIndex
CREATE INDEX "quotation_items_quotationId_idx" ON "quotation_items"("quotationId");

-- CreateIndex
CREATE INDEX "quotation_proposal_items_quotationId_idx" ON "quotation_proposal_items"("quotationId");

-- CreateIndex
CREATE INDEX "quotation_proposal_items_quotationId_type_idx" ON "quotation_proposal_items"("quotationId", "type");

-- CreateIndex
CREATE INDEX "quotation_payment_milestones_quotationId_idx" ON "quotation_payment_milestones"("quotationId");

-- CreateIndex
CREATE INDEX "bookings_agencyId_idx" ON "bookings"("agencyId");

-- CreateIndex
CREATE INDEX "bookings_tripId_idx" ON "bookings"("tripId");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_quotationId_idx" ON "bookings"("quotationId");

-- CreateIndex
CREATE INDEX "bookings_agencyId_status_idx" ON "bookings"("agencyId", "status");

-- CreateIndex
CREATE INDEX "bookings_agencyId_paymentStatus_idx" ON "bookings"("agencyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "bookings_agencyId_createdAt_idx" ON "bookings"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_agencyId_bookingNumber_key" ON "bookings"("agencyId", "bookingNumber");

-- CreateIndex
CREATE INDEX "payments_agencyId_idx" ON "payments"("agencyId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_tripId_idx" ON "payments"("tripId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_agencyId_paymentNumber_idx" ON "payments"("agencyId", "paymentNumber");

-- CreateIndex
CREATE INDEX "payments_agencyId_status_idx" ON "payments"("agencyId", "status");

-- CreateIndex
CREATE INDEX "payments_agencyId_paymentDate_idx" ON "payments"("agencyId", "paymentDate");

-- CreateIndex
CREATE INDEX "invoices_agencyId_idx" ON "invoices"("agencyId");

-- CreateIndex
CREATE INDEX "invoices_agencyId_status_idx" ON "invoices"("agencyId", "status");

-- CreateIndex
CREATE INDEX "invoices_bookingId_idx" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "invoices_agencyId_invoiceDate_idx" ON "invoices"("agencyId", "invoiceDate");

-- CreateIndex
CREATE INDEX "invoices_agencyId_dueDate_idx" ON "invoices"("agencyId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_agencyId_invoiceNumber_key" ON "invoices"("agencyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_agencyId_bookingId_key" ON "invoices"("agencyId", "bookingId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_agencyId_key" ON "invoice_sequences"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "public_share_links_tokenHash_key" ON "public_share_links"("tokenHash");

-- CreateIndex
CREATE INDEX "public_share_links_agencyId_idx" ON "public_share_links"("agencyId");

-- CreateIndex
CREATE INDEX "public_share_links_tripId_idx" ON "public_share_links"("tripId");

-- CreateIndex
CREATE INDEX "public_share_links_tokenHash_idx" ON "public_share_links"("tokenHash");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_idx" ON "enquiries"("agencyId");

-- CreateIndex
CREATE INDEX "enquiries_customerId_idx" ON "enquiries"("customerId");

-- CreateIndex
CREATE INDEX "enquiries_convertedTripId_idx" ON "enquiries"("convertedTripId");

-- CreateIndex
CREATE INDEX "enquiries_convertedQuotationId_idx" ON "enquiries"("convertedQuotationId");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_status_idx" ON "enquiries"("agencyId", "status");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_priority_idx" ON "enquiries"("agencyId", "priority");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_source_idx" ON "enquiries"("agencyId", "source");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_nextFollowUpAt_idx" ON "enquiries"("agencyId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "enquiries_agencyId_createdAt_idx" ON "enquiries"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "enquiries_agencyId_enquiryNumber_key" ON "enquiries"("agencyId", "enquiryNumber");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_agencyId_idx" ON "enquiry_follow_ups"("agencyId");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_enquiryId_idx" ON "enquiry_follow_ups"("enquiryId");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_agencyId_scheduledAt_idx" ON "enquiry_follow_ups"("agencyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_agencyId_status_idx" ON "enquiry_follow_ups"("agencyId", "status");

-- CreateIndex
CREATE INDEX "enquiry_follow_ups_agencyId_status_scheduledAt_idx" ON "enquiry_follow_ups"("agencyId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "suppliers_agencyId_idx" ON "suppliers"("agencyId");

-- CreateIndex
CREATE INDEX "suppliers_agencyId_supplierCode_idx" ON "suppliers"("agencyId", "supplierCode");

-- CreateIndex
CREATE INDEX "suppliers_agencyId_name_idx" ON "suppliers"("agencyId", "name");

-- CreateIndex
CREATE INDEX "suppliers_agencyId_city_idx" ON "suppliers"("agencyId", "city");

-- CreateIndex
CREATE INDEX "suppliers_agencyId_status_idx" ON "suppliers"("agencyId", "status");

-- CreateIndex
CREATE INDEX "rate_sheets_agencyId_idx" ON "rate_sheets"("agencyId");

-- CreateIndex
CREATE INDEX "rate_sheets_supplierId_idx" ON "rate_sheets"("supplierId");

-- CreateIndex
CREATE INDEX "rate_sheets_hotelId_idx" ON "rate_sheets"("hotelId");

-- CreateIndex
CREATE INDEX "rate_sheets_agencyId_inventoryType_idx" ON "rate_sheets"("agencyId", "inventoryType");

-- CreateIndex
CREATE INDEX "rate_sheets_agencyId_status_idx" ON "rate_sheets"("agencyId", "status");

-- CreateIndex
CREATE INDEX "rate_sheets_agencyId_validFrom_validTo_idx" ON "rate_sheets"("agencyId", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "trip_operations_tripId_key" ON "trip_operations"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_operations_bookingId_key" ON "trip_operations"("bookingId");

-- CreateIndex
CREATE INDEX "trip_operations_agencyId_idx" ON "trip_operations"("agencyId");

-- CreateIndex
CREATE INDEX "trip_operations_agencyId_status_idx" ON "trip_operations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "trip_operations_agencyId_tripId_idx" ON "trip_operations"("agencyId", "tripId");

-- CreateIndex
CREATE INDEX "trip_operations_agencyId_bookingId_idx" ON "trip_operations"("agencyId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_operations_agencyId_tripId_key" ON "trip_operations"("agencyId", "tripId");

-- CreateIndex
CREATE INDEX "hotel_confirmations_agencyId_idx" ON "hotel_confirmations"("agencyId");

-- CreateIndex
CREATE INDEX "hotel_confirmations_tripOperationId_idx" ON "hotel_confirmations"("tripOperationId");

-- CreateIndex
CREATE INDEX "hotel_confirmations_agencyId_tripOperationId_idx" ON "hotel_confirmations"("agencyId", "tripOperationId");

-- CreateIndex
CREATE INDEX "hotel_confirmations_agencyId_tripHotelId_idx" ON "hotel_confirmations"("agencyId", "tripHotelId");

-- CreateIndex
CREATE INDEX "hotel_confirmations_agencyId_status_idx" ON "hotel_confirmations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "vehicle_dispatches_agencyId_idx" ON "vehicle_dispatches"("agencyId");

-- CreateIndex
CREATE INDEX "vehicle_dispatches_tripOperationId_idx" ON "vehicle_dispatches"("tripOperationId");

-- CreateIndex
CREATE INDEX "vehicle_dispatches_agencyId_tripOperationId_idx" ON "vehicle_dispatches"("agencyId", "tripOperationId");

-- CreateIndex
CREATE INDEX "vehicle_dispatches_agencyId_tripVehicleId_idx" ON "vehicle_dispatches"("agencyId", "tripVehicleId");

-- CreateIndex
CREATE INDEX "vehicle_dispatches_agencyId_status_idx" ON "vehicle_dispatches"("agencyId", "status");

-- CreateIndex
CREATE INDEX "activity_confirmations_agencyId_idx" ON "activity_confirmations"("agencyId");

-- CreateIndex
CREATE INDEX "activity_confirmations_tripOperationId_idx" ON "activity_confirmations"("tripOperationId");

-- CreateIndex
CREATE INDEX "activity_confirmations_agencyId_tripOperationId_idx" ON "activity_confirmations"("agencyId", "tripOperationId");

-- CreateIndex
CREATE INDEX "activity_confirmations_agencyId_tripActivityId_idx" ON "activity_confirmations"("agencyId", "tripActivityId");

-- CreateIndex
CREATE INDEX "activity_confirmations_agencyId_status_idx" ON "activity_confirmations"("agencyId", "status");

-- CreateIndex
CREATE INDEX "operational_issues_agencyId_idx" ON "operational_issues"("agencyId");

-- CreateIndex
CREATE INDEX "operational_issues_tripOperationId_idx" ON "operational_issues"("tripOperationId");

-- CreateIndex
CREATE INDEX "operational_issues_agencyId_tripOperationId_idx" ON "operational_issues"("agencyId", "tripOperationId");

-- CreateIndex
CREATE INDEX "operational_issues_agencyId_status_idx" ON "operational_issues"("agencyId", "status");

-- CreateIndex
CREATE INDEX "operational_issues_agencyId_priority_idx" ON "operational_issues"("agencyId", "priority");

-- CreateIndex
CREATE INDEX "operation_events_agencyId_idx" ON "operation_events"("agencyId");

-- CreateIndex
CREATE INDEX "operation_events_tripOperationId_idx" ON "operation_events"("tripOperationId");

-- CreateIndex
CREATE INDEX "operation_events_agencyId_tripOperationId_idx" ON "operation_events"("agencyId", "tripOperationId");

-- CreateIndex
CREATE INDEX "operation_events_agencyId_createdAt_idx" ON "operation_events"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "supplier_payables_agencyId_idx" ON "supplier_payables"("agencyId");

-- CreateIndex
CREATE INDEX "supplier_payables_supplierId_idx" ON "supplier_payables"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payables_bookingId_idx" ON "supplier_payables"("bookingId");

-- CreateIndex
CREATE INDEX "supplier_payables_tripOperationId_idx" ON "supplier_payables"("tripOperationId");

-- CreateIndex
CREATE INDEX "supplier_payables_tripId_idx" ON "supplier_payables"("tripId");

-- CreateIndex
CREATE INDEX "supplier_payables_agencyId_status_idx" ON "supplier_payables"("agencyId", "status");

-- CreateIndex
CREATE INDEX "supplier_payables_agencyId_dueDate_idx" ON "supplier_payables"("agencyId", "dueDate");

-- CreateIndex
CREATE INDEX "supplier_payments_agencyId_idx" ON "supplier_payments"("agencyId");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payments_payableId_idx" ON "supplier_payments"("payableId");

-- CreateIndex
CREATE INDEX "supplier_payments_bookingId_idx" ON "supplier_payments"("bookingId");

-- CreateIndex
CREATE INDEX "supplier_payments_agencyId_paymentDate_idx" ON "supplier_payments"("agencyId", "paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payments_agencyId_status_idx" ON "supplier_payments"("agencyId", "status");

-- CreateIndex
CREATE INDEX "operational_expenses_agencyId_idx" ON "operational_expenses"("agencyId");

-- CreateIndex
CREATE INDEX "operational_expenses_tripOperationId_idx" ON "operational_expenses"("tripOperationId");

-- CreateIndex
CREATE INDEX "operational_expenses_tripId_idx" ON "operational_expenses"("tripId");

-- CreateIndex
CREATE INDEX "operational_expenses_bookingId_idx" ON "operational_expenses"("bookingId");

-- CreateIndex
CREATE INDEX "operational_expenses_agencyId_category_idx" ON "operational_expenses"("agencyId", "category");

-- CreateIndex
CREATE INDEX "operational_expenses_agencyId_expenseDate_idx" ON "operational_expenses"("agencyId", "expenseDate");

-- CreateIndex
CREATE INDEX "customer_feedbacks_agencyId_idx" ON "customer_feedbacks"("agencyId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_customerId_idx" ON "customer_feedbacks"("customerId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_tripId_idx" ON "customer_feedbacks"("tripId");

-- CreateIndex
CREATE INDEX "customer_feedbacks_bookingId_idx" ON "customer_feedbacks"("bookingId");

-- CreateIndex
CREATE INDEX "referrals_agencyId_idx" ON "referrals"("agencyId");

-- CreateIndex
CREATE INDEX "referrals_referrerCustomerId_idx" ON "referrals"("referrerCustomerId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_agencyId_referralCode_key" ON "referrals"("agencyId", "referralCode");

-- CreateIndex
CREATE INDEX "customer_notifications_agencyId_idx" ON "customer_notifications"("agencyId");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_idx" ON "customer_notifications"("customerId");

-- CreateIndex
CREATE INDEX "customer_notifications_tripId_idx" ON "customer_notifications"("tripId");

-- CreateIndex
CREATE INDEX "customer_notifications_bookingId_idx" ON "customer_notifications"("bookingId");

-- CreateIndex
CREATE INDEX "customer_notifications_quotationId_idx" ON "customer_notifications"("quotationId");

-- CreateIndex
CREATE INDEX "customer_notifications_enquiryId_idx" ON "customer_notifications"("enquiryId");

-- CreateIndex
CREATE INDEX "customer_notifications_providerMessageId_idx" ON "customer_notifications"("providerMessageId");

-- CreateIndex
CREATE INDEX "customer_notifications_agencyId_customerId_status_idx" ON "customer_notifications"("agencyId", "customerId", "status");

-- CreateIndex
CREATE INDEX "customer_notifications_agencyId_customerId_createdAt_idx" ON "customer_notifications"("agencyId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notifications_agencyId_idempotencyKey_key" ON "customer_notifications"("agencyId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_customerId_key" ON "customer_notification_preferences"("customerId");

-- CreateIndex
CREATE INDEX "customer_notification_preferences_agencyId_idx" ON "customer_notification_preferences"("agencyId");

-- CreateIndex
CREATE INDEX "customer_notification_preferences_customerId_idx" ON "customer_notification_preferences"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_notification_preferences_agencyId_customerId_key" ON "customer_notification_preferences"("agencyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "agency_communication_settings_agencyId_key" ON "agency_communication_settings"("agencyId");

-- CreateIndex
CREATE INDEX "travel_documents_agencyId_idx" ON "travel_documents"("agencyId");

-- CreateIndex
CREATE INDEX "travel_documents_bookingId_idx" ON "travel_documents"("bookingId");

-- CreateIndex
CREATE INDEX "travel_documents_tripId_idx" ON "travel_documents"("tripId");

-- CreateIndex
CREATE INDEX "travel_documents_customerId_idx" ON "travel_documents"("customerId");

-- CreateIndex
CREATE INDEX "travel_documents_paymentId_idx" ON "travel_documents"("paymentId");

-- CreateIndex
CREATE INDEX "travel_documents_supplierId_idx" ON "travel_documents"("supplierId");

-- CreateIndex
CREATE INDEX "travel_documents_hotelConfirmationId_idx" ON "travel_documents"("hotelConfirmationId");

-- CreateIndex
CREATE INDEX "travel_documents_vehicleDispatchId_idx" ON "travel_documents"("vehicleDispatchId");

-- CreateIndex
CREATE INDEX "travel_documents_activityConfirmationId_idx" ON "travel_documents"("activityConfirmationId");

-- CreateIndex
CREATE INDEX "travel_documents_documentType_idx" ON "travel_documents"("documentType");

-- CreateIndex
CREATE INDEX "travel_documents_status_idx" ON "travel_documents"("status");

-- CreateIndex
CREATE INDEX "travel_documents_agencyId_isLatest_idx" ON "travel_documents"("agencyId", "isLatest");

-- CreateIndex
CREATE INDEX "travel_documents_agencyId_documentNumber_idx" ON "travel_documents"("agencyId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "travel_documents_agencyId_documentNumber_version_key" ON "travel_documents"("agencyId", "documentNumber", "version");

-- CreateIndex
CREATE INDEX "platform_audit_logs_actorUserId_idx" ON "platform_audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");

-- CreateIndex
CREATE INDEX "platform_audit_logs_agencyId_idx" ON "platform_audit_logs"("agencyId");

-- CreateIndex
CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "platform_audit_logs_entityType_entityId_idx" ON "platform_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "platform_announcements_status_idx" ON "platform_announcements"("status");

-- CreateIndex
CREATE INDEX "platform_announcements_startAt_endAt_idx" ON "platform_announcements"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "agency_tax_profiles_agencyId_key" ON "agency_tax_profiles"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_rate_key" ON "tax_rates"("rate");

-- CreateIndex
CREATE INDEX "user_notifications_userId_isRead_createdAt_idx" ON "user_notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "user_notifications_agencyId_isRead_createdAt_idx" ON "user_notifications"("agencyId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_userId_idempotencyKey_key" ON "user_notifications"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "platform_chat_conversations_agencyId_key" ON "platform_chat_conversations"("agencyId");

-- CreateIndex
CREATE INDEX "platform_chat_conversations_agencyId_idx" ON "platform_chat_conversations"("agencyId");

-- CreateIndex
CREATE INDEX "platform_chat_conversations_lastMessageAt_idx" ON "platform_chat_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "platform_chat_messages_conversationId_createdAt_idx" ON "platform_chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_chat_messages_agencyId_createdAt_idx" ON "platform_chat_messages"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_chat_messages_senderUserId_idx" ON "platform_chat_messages"("senderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_chat_messages_conversationId_clientMessageId_key" ON "platform_chat_messages"("conversationId", "clientMessageId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature_entitlements" ADD CONSTRAINT "plan_feature_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_limits" ADD CONSTRAINT "plan_usage_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_destinations" ADD CONSTRAINT "trip_destinations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_destinations" ADD CONSTRAINT "trip_destinations_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_hotels" ADD CONSTRAINT "trip_hotels_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_hotels" ADD CONSTRAINT "trip_hotels_tripDestinationId_fkey" FOREIGN KEY ("tripDestinationId") REFERENCES "trip_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_hotels" ADD CONSTRAINT "trip_hotels_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_tripDestinationId_fkey" FOREIGN KEY ("tripDestinationId") REFERENCES "trip_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities" ADD CONSTRAINT "trip_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_proposal_items" ADD CONSTRAINT "quotation_proposal_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_payment_milestones" ADD CONSTRAINT "quotation_payment_milestones_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_share_links" ADD CONSTRAINT "public_share_links_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_convertedTripId_fkey" FOREIGN KEY ("convertedTripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_convertedQuotationId_fkey" FOREIGN KEY ("convertedQuotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_follow_ups" ADD CONSTRAINT "enquiry_follow_ups_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiry_follow_ups" ADD CONSTRAINT "enquiry_follow_ups_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_sheets" ADD CONSTRAINT "rate_sheets_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_sheets" ADD CONSTRAINT "rate_sheets_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_sheets" ADD CONSTRAINT "rate_sheets_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_operations" ADD CONSTRAINT "trip_operations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_operations" ADD CONSTRAINT "trip_operations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_operations" ADD CONSTRAINT "trip_operations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_confirmations" ADD CONSTRAINT "hotel_confirmations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_confirmations" ADD CONSTRAINT "hotel_confirmations_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_confirmations" ADD CONSTRAINT "hotel_confirmations_tripHotelId_fkey" FOREIGN KEY ("tripHotelId") REFERENCES "trip_hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_confirmations" ADD CONSTRAINT "hotel_confirmations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_dispatches" ADD CONSTRAINT "vehicle_dispatches_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_dispatches" ADD CONSTRAINT "vehicle_dispatches_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_dispatches" ADD CONSTRAINT "vehicle_dispatches_tripVehicleId_fkey" FOREIGN KEY ("tripVehicleId") REFERENCES "trip_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_dispatches" ADD CONSTRAINT "vehicle_dispatches_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_confirmations" ADD CONSTRAINT "activity_confirmations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_confirmations" ADD CONSTRAINT "activity_confirmations_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_confirmations" ADD CONSTRAINT "activity_confirmations_tripActivityId_fkey" FOREIGN KEY ("tripActivityId") REFERENCES "trip_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_confirmations" ADD CONSTRAINT "activity_confirmations_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_issues" ADD CONSTRAINT "operational_issues_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_issues" ADD CONSTRAINT "operational_issues_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_events" ADD CONSTRAINT "operation_events_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_events" ADD CONSTRAINT "operation_events_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payables" ADD CONSTRAINT "supplier_payables_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "supplier_payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_expenses" ADD CONSTRAINT "operational_expenses_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_expenses" ADD CONSTRAINT "operational_expenses_tripOperationId_fkey" FOREIGN KEY ("tripOperationId") REFERENCES "trip_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_expenses" ADD CONSTRAINT "operational_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_expenses" ADD CONSTRAINT "operational_expenses_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_convertedBookingId_fkey" FOREIGN KEY ("convertedBookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_communication_settings" ADD CONSTRAINT "agency_communication_settings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_hotelConfirmationId_fkey" FOREIGN KEY ("hotelConfirmationId") REFERENCES "hotel_confirmations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_vehicleDispatchId_fkey" FOREIGN KEY ("vehicleDispatchId") REFERENCES "vehicle_dispatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_activityConfirmationId_fkey" FOREIGN KEY ("activityConfirmationId") REFERENCES "activity_confirmations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_documents" ADD CONSTRAINT "travel_documents_supersedesDocumentId_fkey" FOREIGN KEY ("supersedesDocumentId") REFERENCES "travel_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_tax_profiles" ADD CONSTRAINT "agency_tax_profiles_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_conversations" ADD CONSTRAINT "platform_chat_conversations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "platform_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_chat_messages" ADD CONSTRAINT "platform_chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
