export type ContactMethod = "WhatsApp" | "Email" | "Phone" | "SMS";

export interface Customer {
  id: string;
  agencyId?: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  idPhoto?: string; // Private customer ID photo (strictly visible only to Agency Owner)
  preferredContactMethod?: ContactMethod;
  preferredHotelCategory?: string;
  preferredMealPlan?: string;
  preferredVehicle?: string;
  preferredDestination?: string;
  preferences?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EnquiryStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Quoted"
  | "Follow-up"
  | "Confirmed"
  | "Lost"
  | "Cancelled";

export type EnquirySource =
  | "WhatsApp"
  | "Instagram"
  | "Facebook"
  | "Website"
  | "Phone"
  | "Referral"
  | "Walk-in"
  | "Google"
  | "Other";

export interface Enquiry {
  id: string;
  customerId: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  budget?: number;
  budgetType?: "per_person" | "total";
  hotelCategory?: string;
  mealPlan?: string;
  vehiclePreference?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  notes?: string;
  internalNotes?: string;
  assignedTo?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

export type FollowUpStatus = "Upcoming" | "Due Today" | "Completed" | "Overdue";

export interface FollowUp {
  id: string;
  enquiryId: string;
  date: string;
  time: string;
  note: string;
  status: FollowUpStatus;
  createdAt: string;
}

// ─── Timeline / Activity Log ──────────────────────────────────────────
export type TimelineActivityType =
  | "ENQUIRY_CREATED"
  | "NOTE_ADDED"
  | "CUSTOMER_CONTACTED"
  | "STATUS_CHANGED"
  | "FOLLOW_UP_SCHEDULED"
  | "FOLLOW_UP_COMPLETED"
  | "CUSTOMER_UPDATED"
  | "TRIP_CREATED"
  | "TRIP_UPDATED"
  | "TRIP_NOTE_ADDED";

export interface TimelineActivity {
  id: string;
  enquiryId?: string;
  tripId?: string;
  type: TimelineActivityType;
  title: string;
  description: string;
  createdAt: string;
  agentName?: string;
}

// Alias for backwards compatibility
export type ActivityType = TimelineActivityType;

// Locked V1 Trip Statuses (with title-case aliases for UI display)
export type TripStatus =
  | "DRAFT"
  | "QUOTATION"
  | "CONFIRMED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "Planning"
  | "Quoting"
  | "Confirmed"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export interface Trip {
  id: string;
  agencyId?: string;
  enquiryId?: string;
  customerId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  budget?: number;
  status: TripStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryPlace {
  id: string;
  name: string;
  description?: string;
  visitTime?: string;
  notes?: string;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  title: string;
  description?: string;
  notes?: string;
  places: ItineraryPlace[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  content: string;
  createdAt: string;
}

export interface TripNote {
  id: string;
  tripId: string;
  content: string;
  createdAt: string;
}

// ═════════════════════════════════════════════════════════════════════
// PHASE 4: SUPPLIERS & TRAVEL INVENTORY TYPES
// ═════════════════════════════════════════════════════════════════════

// ─── Suppliers ────────────────────────────────────────────────────────
export type SupplierType =
  | "Hotel Supplier"
  | "Transport Supplier"
  | "Activity Supplier"
  | "DMC"
  | "Travel Partner"
  | "Other";

export type SupplierService = "Hotel" | "Vehicle" | "Activity";

export type SupplierStatus = "Active" | "Inactive";

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  website?: string;
  services: SupplierService[];
  status: SupplierStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Hotels ───────────────────────────────────────────────────────────
export type HotelStatus = "Active" | "Inactive" | "Archived";

export interface Hotel {
  id: string;
  supplierId?: string;
  name: string;
  destination: string;
  area?: string;
  address?: string;
  starCategory?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities: string[];
  description?: string;
  status: HotelStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomStatus = "Active" | "Inactive";

export interface HotelRoom {
  id: string;
  hotelId: string;
  name: string;
  maxAdults: number;
  maxChildren: number;
  bedType?: string;
  description?: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
}

export type MealPlan = "RO" | "CPAI" | "MAPAI" | "APAI";

export type RateStatus = "Draft" | "Active" | "Expired" | "Archived";

export type RateSourceType = "Manual" | "Excel" | "CSV";

export interface HotelRate {
  id: string;
  hotelId: string;
  roomId: string;
  rateSheetId?: string;
  mealPlan: MealPlan;
  currency: string;
  baseRate: number;
  occupancyAdults: number;
  occupancyChildren?: number;
  extraAdultRate?: number;
  childRate?: number;
  validFrom: string;
  validTo: string;
  status: RateStatus;
  sourceType?: RateSourceType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Rate Sheets ──────────────────────────────────────────────────────
export type RateSheetStatus = "Draft" | "Active" | "Expired" | "Archived";
export type RateSheetSourceType = "Manual" | "Excel" | "CSV";

export interface RateSheet {
  id: string;
  supplierId: string;
  name: string;
  description?: string;
  validFrom: string;
  validTo: string;
  status: RateSheetStatus;
  sourceType: RateSheetSourceType;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Vehicles ─────────────────────────────────────────────────────────
export type VehicleType =
  | "Sedan"
  | "SUV"
  | "MUV"
  | "Tempo Traveller"
  | "Mini Bus"
  | "Bus"
  | "Luxury"
  | "Other";

export type VehicleStatus = "Active" | "Inactive" | "Archived";

export interface Vehicle {
  id: string;
  supplierId?: string;
  name: string;
  vehicleType: VehicleType;
  seatingCapacity: number;
  luggageCapacity?: number;
  baseLocation?: string;
  ac: boolean;
  driverIncluded: boolean;
  model?: string;
  permitType?: string;
  status: VehicleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VehiclePricingType =
  | "PerDay"
  | "PerKM"
  | "PerTrip"
  | "PerTransfer"
  | "Package";

export interface VehicleRate {
  id: string;
  vehicleId: string;
  pricingType: VehiclePricingType;
  currency: string;
  baseRate: number;
  includedKm?: number;
  extraKmRate?: number;
  driverAllowance?: number;
  nightHalt?: number;
  tollIncluded?: boolean;
  parkingIncluded?: boolean;
  validFrom?: string;
  validTo?: string;
  status: RateStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Activities (Sightseeing & Experiences) ───────────────────────────
export type ActivityCategory =
  | "Sightseeing"
  | "Adventure"
  | "Water Activity"
  | "Wildlife"
  | "Cultural"
  | "Nature"
  | "Experience"
  | "Transfer"
  | "Other";

export type ActivityStatus = "Active" | "Inactive" | "Archived";

export interface Activity {
  id: string;
  supplierId?: string;
  name: string;
  destination: string;
  category: ActivityCategory;
  duration?: string;
  description?: string;
  ageRestrictions?: string;
  operatingDays?: string[];
  status: ActivityStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityPricingType =
  | "PerPerson"
  | "PerAdult"
  | "PerChild"
  | "PerGroup"
  | "PerVehicle"
  | "PerBooking";

export interface ActivityRate {
  id: string;
  activityId: string;
  pricingType: ActivityPricingType;
  currency: string;
  adultRate?: number;
  childRate?: number;
  groupRate?: number;
  vehicleRate?: number;
  bookingRate?: number;
  validFrom?: string;
  validTo?: string;
  status: RateStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Rate Snapshot & Trip Services ────────────────────────────────────
export interface RateSnapshot {
  name: string;
  supplierName?: string;
  supplierId?: string;
  baseRate: number;
  currency: string;
  rateType?: string;
  validity?: string;
  mealPlan?: string;
  roomName?: string;
  vehicleType?: string;
  rateSheetName?: string;
  sourceType?: string;
  details?: string;
}

export interface TripHotel {
  id: string;
  tripId: string;
  hotelId: string;
  roomId: string;
  rateId?: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  notes?: string;
  rateSnapshot?: RateSnapshot;
  createdAt: string;
}

export interface TripVehicle {
  id: string;
  tripId: string;
  vehicleId: string;
  rateId?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  rateSnapshot?: RateSnapshot;
  createdAt: string;
}

export interface TripActivity {
  id: string;
  tripId: string;
  activityId: string;
  rateId?: string;
  date?: string;
  adults: number;
  children: number;
  notes?: string;
  rateSnapshot?: RateSnapshot;
  createdAt: string;
}

// ═════════════════════════════════════════════════════════════════════
// PHASE 5: TRIP COSTING & PRICING ENGINE TYPES
// ═════════════════════════════════════════════════════════════════════

export type CostCategory =
  | "Hotel"
  | "Transport"
  | "Activity"
  | "Transfer"
  | "Meals"
  | "Guide"
  | "Driver"
  | "Permit"
  | "Toll"
  | "Parking"
  | "Entry Ticket"
  | "Houseboat"
  | "Flight"
  | "Train"
  | "Other"
  | "Internal Expense";

export type CostSourceType = "Inventory" | "Manual" | "Adjustment" | "Internal";

export type CostServiceType = "Hotel" | "Vehicle" | "Activity" | "Manual" | "Expense";

export interface CostItem {
  id: string;
  tripId: string;
  category: CostCategory;
  name: string;
  description?: string;
  supplierId?: string;
  supplierName?: string;
  serviceType?: CostServiceType;
  serviceId?: string;
  rateId?: string;
  quantity: number;
  unit?: string;
  duration?: number;
  unitCost: number;
  totalCost: number;
  currency: string;
  dateFrom?: string;
  dateTo?: string;
  sourceType: CostSourceType;
  notes?: string;
  rateSnapshot?: RateSnapshot;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InternalExpenseCategory =
  | "Payment Gateway Fee"
  | "Sales Commission"
  | "Agent Commission"
  | "Marketing Expense"
  | "Office Expense"
  | "Other";

export interface InternalExpense {
  id: string;
  tripId: string;
  category: InternalExpenseCategory;
  name: string;
  amount: number;
  currency: string;
  date?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkupRule {
  type: "percentage" | "fixed";
  value: number;
  scope: "trip" | "line-item";
}

export interface DiscountRule {
  type: "percentage" | "fixed";
  value: number;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  type: "percentage" | "fixed";
  enabled: boolean;
  description?: string;
}

export interface PricingSettings {
  markupType: "percentage" | "fixed";
  markupValue: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  pricingMode: "automatic" | "manual";
  manualSellingPrice?: number;
  taxRuleId?: string;
  customTaxRate?: number;
  lowMarginThreshold: number;
  roundPriceTo?: number; // e.g. 0, 100, 500
}

export type CostingStatus = "Draft" | "Calculated" | "Locked";

export interface CostingSummary {
  supplierCost: number;
  internalExpense: number;
  totalCost: number;
  markupAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  calculatedSellingPrice: number;
  sellingPrice: number;
  grossProfit: number;
  marginPercent: number;
  markupPercent: number;
}

export interface TripCosting {
  id: string;
  tripId: string;
  status: CostingStatus;
  settings: PricingSettings;
  summary: CostingSummary;
  lockedAt?: string;
  lockedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ═════════════════════════════════════════════════════════════════════
// PHASE 6: QUOTATION BUILDER TYPES
// ═════════════════════════════════════════════════════════════════════

export type QuotationStatus = "Draft" | "Ready" | "Sent" | "Viewed" | "Expired";

export type QuotationSectionType =
  | "cover"
  | "summary"
  | "itinerary"
  | "hotels"
  | "vehicle"
  | "activities"
  | "inclusions"
  | "exclusions"
  | "pricing"
  | "paymentTerms"
  | "cancellationPolicy"
  | "terms"
  | "contact";

export interface QuotationSection {
  id: string;
  type: QuotationSectionType;
  title: string;
  visible: boolean;
  order: number;
}

export interface CustomerSnapshot {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  travellersLabel: string;
}

export interface TripSnapshot {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationLabel: string;
  nights: number;
  days: number;
  adults: number;
  children: number;
  infants: number;
  vehiclePreference?: string;
  hotelCategory?: string;
}

export interface ItineraryDaySnapshot {
  dayNumber: number;
  date: string;
  title: string;
  description?: string;
  places: Array<{
    name: string;
    visitTime?: string;
    notes?: string;
  }>;
  overnightLocation?: string;
  mealsIncluded?: string;
}

export interface HotelSnapshot {
  id: string;
  hotelId: string;
  hotelName: string;
  destination: string;
  starCategory?: number;
  roomName: string;
  mealPlan: MealPlan | string;
  nights: number;
  checkIn?: string;
  checkOut?: string;
  roomsCount: number;
  description?: string;
  imageUrl?: string;
}

export interface VehicleSnapshot {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  seatingCapacity: number;
  ac: boolean;
  durationDays: number;
  pickupLocation?: string;
  dropLocation?: string;
  notes?: string;
}

export interface ActivitySnapshot {
  id: string;
  activityId: string;
  activityName: string;
  destination: string;
  category: string;
  date?: string;
  adults: number;
  children: number;
  duration?: string;
  description?: string;
}

export interface PricingSnapshot {
  sellingPrice: number;
  currency: string;
  perPersonPrice?: number;
  validUntil: string;
  priceNote?: string;
  totalTravellers: number;
}

export interface AgencyBranding {
  name: string;
  tagline?: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  logoUrl?: string;
  licenseNumber?: string;
  defaultPaymentTerms?: string;
  defaultCancellationPolicy?: string;
  defaultTerms?: string;
}

export interface Quotation {
  id: string;
  version: number;
  parentQuotationId?: string;
  tripId: string;
  customerId: string;
  quotationNumber: string;
  status: QuotationStatus;
  title: string;
  subtitle?: string;
  validUntil: string;
  currency: string;
  sellingPrice: number;
  templateId: string;
  shareToken: string;
  sections: QuotationSection[];

  // Immutable customer-safe snapshots
  customerSnapshot: CustomerSnapshot;
  tripSnapshot: TripSnapshot;
  itinerarySnapshot: ItineraryDaySnapshot[];
  hotelSnapshot: HotelSnapshot[];
  vehicleSnapshot?: VehicleSnapshot;
  activitySnapshot: ActivitySnapshot[];
  pricingSnapshot: PricingSnapshot;
  agencySnapshot: AgencyBranding;

  // Quotation-specific contents & overrides
  inclusions: string[];
  exclusions: string[];
  paymentTerms: string;
  cancellationPolicy: string;
  termsAndConditions: string;
  customNotes?: string;

  // Lifecycle Timestamps
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  expiredAt?: string;
}

export interface PublicQuotation {
  quotationNumber: string;
  shareToken: string;
  version: number;
  status: QuotationStatus;
  title: string;
  subtitle?: string;
  validUntil: string;
  currency: string;
  sellingPrice: number;
  isExpired: boolean;
  templateId: string;
  sections: QuotationSection[];

  customer: CustomerSnapshot;
  trip: TripSnapshot;
  itinerary: ItineraryDaySnapshot[];
  hotels: HotelSnapshot[];
  vehicle?: VehicleSnapshot;
  activities: ActivitySnapshot[];
  pricing: PricingSnapshot;
  agency: AgencyBranding;

  inclusions: string[];
  exclusions: string[];
  paymentTerms: string;
  cancellationPolicy: string;
  termsAndConditions: string;
  customNotes?: string;
}

// ─── PHASE 7: BOOKINGS & CONFIRMATION MANAGEMENT ──────────────────────────

export type BookingStatus =
  | "Draft"
  | "Pending Confirmation"
  | "Partially Confirmed"
  | "Confirmed"
  | "On Trip"
  | "Completed"
  | "Cancelled";

export type PaymentStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid"
  | "Refund Pending"
  | "Refunded";

export type BookingItemType =
  | "Hotel"
  | "Vehicle"
  | "Activity"
  | "Transfer"
  | "Other";

export type BookingItemStatus =
  | "Pending"
  | "Requested"
  | "Confirmed"
  | "Cancelled";

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card" | "Other";

export interface BookingItem {
  id: string;
  bookingId: string;
  type: BookingItemType;
  referenceId?: string; // hotelId, vehicleId, activityId
  title: string;
  subtitle?: string;
  destination?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  nights?: number;
  roomType?: string;
  numberOfRooms?: number;
  guests?: number;
  mealPlan?: string;
  pickupLocation?: string;
  pickupTime?: string;
  dropLocation?: string;
  driverName?: string;
  driverPhone?: string;
  time?: string;
  status: BookingItemStatus;
  supplierId?: string;
  supplierName?: string;
  supplierContact?: string;
  supplierCost: number; // Internal only
  customerPrice: number;
  confirmationNumber?: string;
  confirmationDate?: string;
  cancellationDeadline?: string;
  notes?: string;
}

export interface CustomerPayment {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionId?: string;
  notes?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  bookingId: string;
  supplierId: string;
  supplierName: string;
  bookingItemId?: string;
  itemTitle?: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface BookingRefund {
  id: string;
  bookingId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  referenceNumber?: string;
  status: "Pending" | "Processed";
  notes?: string;
  createdAt: string;
}

export interface BookingTimelineEvent {
  id: string;
  bookingId: string;
  type:
    | "QUOTATION_ACCEPTED"
    | "BOOKING_CREATED"
    | "ITEM_REQUESTED"
    | "ITEM_CONFIRMED"
    | "ITEM_CANCELLED"
    | "PAYMENT_RECEIVED"
    | "SUPPLIER_PAID"
    | "BOOKING_CONFIRMED"
    | "BOOKING_CANCELLED"
    | "REFUND_PROCESSED"
    | "DOCUMENT_GENERATED"
    | "NOTE_ADDED";
  title: string;
  description?: string;
  actor?: string;
  createdAt: string;
}

export interface BookingDocument {
  id: string;
  bookingId: string;
  type:
    | "Booking Confirmation"
    | "Hotel Voucher"
    | "Vehicle Confirmation"
    | "Activity Voucher"
    | "Payment Receipt"
    | "Supplier Confirmation";
  name: string;
  referenceNumber?: string;
  generatedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string; // e.g. BK-2026-0001
  secureToken: string;
  customerId: string;
  tripId: string;
  quotationId?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  
  // Financials
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  
  // Internal Financials (Agent only)
  totalSupplierCost: number;
  paidSupplierCost: number;
  pendingSupplierCost: number;
  expectedProfit: number;

  // Cancellation & Refund
  cancellationReason?: string;
  cancellationCharges?: number;
  refundAmount?: number;
  cancellationDate?: string;

  // Snapshots & Details
  customerSnapshot: CustomerSnapshot;
  tripSnapshot: TripSnapshot;
  agencySnapshot: AgencyBranding;
  itinerarySnapshot?: ItineraryDaySnapshot[];

  // Sub-items
  items: BookingItem[];
  payments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  refunds: BookingRefund[];
  timeline: BookingTimelineEvent[];
  documents: BookingDocument[];

  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBookingView {
  bookingNumber: string;
  secureToken: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;

  customer: CustomerSnapshot;
  trip: TripSnapshot;
  agency: AgencyBranding;
  itinerary?: ItineraryDaySnapshot[];

  // Customer-safe items (no supplier cost or margin)
  items: Array<{
    id: string;
    type: BookingItemType;
    title: string;
    subtitle?: string;
    destination?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    nights?: number;
    roomType?: string;
    numberOfRooms?: number;
    guests?: number;
    mealPlan?: string;
    pickupLocation?: string;
    pickupTime?: string;
    dropLocation?: string;
    driverName?: string;
    driverPhone?: string;
    time?: string;
    status: BookingItemStatus;
    confirmationNumber?: string;
  }>;

  payments: Array<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    receiptNumber?: string;
  }>;

  notes?: string;
}

// ============================================================================
// PHASE 8: TRIP OPERATIONS & LIVE TRIP MANAGEMENT TYPES
// ============================================================================

export type TripOperationsStatus =
  | "Upcoming"
  | "Ready for Trip"
  | "Pickup Pending"
  | "On Trip"
  | "Delayed"
  | "Completed"
  | "Cancelled";

export type DailyOperationStatus =
  | "Upcoming"
  | "Today"
  | "In Progress"
  | "Completed"
  | "Skipped"
  | "Rescheduled";

export type ActivityOperationStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Skipped"
  | "Rescheduled"
  | "Cancelled";

export type TransportStatus =
  | "Scheduled"
  | "Driver Assigned"
  | "Driver On The Way"
  | "Arrived"
  | "Customer Picked Up"
  | "Completed"
  | "Delayed"
  | "Cancelled";

export type DriverStatus = "Available" | "Assigned" | "Unavailable";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  supplierId?: string;
  supplierName?: string;
  vehicleType?: string;
  licenseNumber?: string;
  status: DriverStatus;
  notes?: string;
}

export interface TransportOperation {
  id: string;
  tripId: string;
  bookingId?: string;
  bookingItemId?: string;
  type: "Pickup" | "Transfer" | "Drop" | "Sightseeing";
  title: string;
  date: string;
  time: string;
  pickupLocation: string;
  dropLocation: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleNumber?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: TransportStatus;
  delayReason?: string;
  expectedArrivalTime?: string;
  notes?: string;
}

export interface DailyActivityOperation {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  time?: string;
  title: string;
  location?: string;
  status: ActivityOperationStatus;
  notes?: string;
  rescheduledDate?: string;
  rescheduleReason?: string;
}

export interface DailyTripPlan {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  title: string;
  location: string;
  status: DailyOperationStatus;
  activities: DailyActivityOperation[];
  transports: TransportOperation[];
  notes?: string;
}

export interface TripIssue {
  id: string;
  tripId: string;
  bookingId?: string;
  customerId: string;
  customerName: string;
  type:
    | "Transport"
    | "Hotel"
    | "Activity"
    | "Customer"
    | "Payment"
    | "Itinerary"
    | "Supplier"
    | "Other";
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  resolvedAt?: string;
  timeline: Array<{
    id: string;
    time: string;
    text: string;
    actor: string;
  }>;
}

export interface TripChange {
  id: string;
  tripId: string;
  entityType: "Activity" | "Transport" | "Hotel" | "Itinerary" | "Trip";
  entityId: string;
  oldValue: string;
  newValue: string;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface OperationalTimelineEvent {
  id: string;
  tripId: string;
  type:
    | "DRIVER_ASSIGNED"
    | "DRIVER_DELAYED"
    | "PICKUP_COMPLETED"
    | "HOTEL_CHECKIN"
    | "ACTIVITY_COMPLETED"
    | "ACTIVITY_RESCHEDULED"
    | "ISSUE_CREATED"
    | "ISSUE_RESOLVED"
    | "TRIP_STATUS_CHANGED"
    | "TRIP_COMPLETED"
    | "FEEDBACK_SUBMITTED";
  title: string;
  description?: string;
  time?: string;
  actor?: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  tripId: string;
  name: string;
  phone: string;
  type:
    | "Agency Desk"
    | "Driver"
    | "Hotel"
    | "Local Supplier"
    | "Emergency Contact";
  notes?: string;
  isCustomerVisible: boolean;
}

export interface PostTripFeedback {
  id: string;
  tripId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  recommend: boolean;
  createdAt: string;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface TripReadiness {
  score: number; // 0 to 100
  status: "READY FOR TRIP" | "ACTION REQUIRED";
  checks: ReadinessCheck[];
}

export interface TripOperation {
  id: string;
  tripId: string;
  bookingId: string;
  bookingNumber: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  
  operationsStatus: TripOperationsStatus;
  currentDay: number;
  totalDays: number;
  currentLocation: string;
  
  readiness: TripReadiness;
  
  customerSnapshot: CustomerSnapshot;
  agencySnapshot?: AgencyBranding;
  
  dailyPlans: DailyTripPlan[];
  transports: TransportOperation[];
  issues: TripIssue[];
  changes: TripChange[];
  emergencyContacts: EmergencyContact[];
  timeline: OperationalTimelineEvent[];
  feedback?: PostTripFeedback;
  
  isDriverVisibleToCustomer: boolean;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9: CUSTOMER EXPERIENCE, REVIEWS, REFERRALS & RETENTION
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerLifecycleStatus =
  | "New Customer"
  | "Quoted"
  | "Booked"
  | "Traveling"
  | "Completed"
  | "Repeat Customer"
  | "VIP"
  | "Inactive";

export interface CustomerPreference {
  id: string;
  customerId: string;
  preferredDestinations: string[];
  travelStyle?:
    | "Family"
    | "Honeymoon"
    | "Solo"
    | "Friends"
    | "Luxury"
    | "Budget"
    | "Adventure"
    | "Corporate";
  preferredHotelCategory?:
    | "3 Star"
    | "4 Star"
    | "5 Star"
    | "Heritage"
    | "Resort"
    | "Homestay";
  preferredMealPlan?: "EP" | "CP" | "MAP" | "AP";
  preferredVehicle?:
    | "Sedan"
    | "SUV"
    | "Innova Crysta"
    | "Tempo Traveller"
    | "Force Urbania"
    | "Luxury Coach";
  preferredActivities?: string[];
  typicalGroupSize?: string;
  mealPreference?: "Vegetarian" | "Non-Vegetarian" | "Jain" | "Vegan";
  budgetRange?: string;
  notes?: string;
  updatedAt: string;
}

export interface CustomerFeedback {
  id: string;
  tripId: string;
  tripTitle: string;
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  overallRating: number; // 1-5
  hotelRating?: number; // 1-5
  vehicleRating?: number; // 1-5
  driverRating?: number; // 1-5
  activityRating?: number; // 1-5
  supportRating?: number; // 1-5
  positiveComment?: string;
  improvementComment?: string;
  travelAgain?: "Yes" | "Maybe" | "No";
  additionalComments?: string;
  serviceRecoveryStatus?: "Not Needed" | "Follow-up Required" | "Contacted" | "Resolved";
  serviceRecoveryNotes?: string;
  createdAt: string;
}

export interface PublicReview {
  id: string;
  feedbackId?: string;
  customerId: string;
  customerName: string;
  tripId?: string;
  tripTitle?: string;
  rating: number;
  comment: string;
  platform: "Google" | "TripAdvisor" | "Website" | "Internal";
  isPublished: boolean;
  createdAt: string;
}

export type ReferralStatus =
  | "Shared"
  | "Registered"
  | "Inquiry"
  | "Booked"
  | "Completed"
  | "Rewarded"
  | "Cancelled";

export interface Referral {
  id: string;
  referrerCustomerId: string;
  referrerName: string;
  referrerPhone: string;
  referredCustomerId?: string;
  referredName: string;
  referredPhone: string;
  referralCode: string;
  status: ReferralStatus;
  bookingId?: string;
  bookingNumber?: string;
  tripValue?: number;
  rewardAmount: number;
  friendDiscount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReward {
  id: string;
  customerId: string;
  type: "Travel Credit" | "Discount" | "Referral Reward" | "Loyalty Bonus";
  amount: number;
  status: "Available" | "Pending" | "Redeemed" | "Expired" | "Cancelled";
  description: string;
  source: "Referral" | "Booking Milestone" | "Agent Goodwill" | "Promotion";
  bookingId?: string;
  createdAt: string;
}

export type LoyaltyTier = "Silver" | "Gold" | "Platinum";

export interface LoyaltyInfo {
  tier: LoyaltyTier;
  completedTrips: number;
  nextTier?: LoyaltyTier;
  tripsToNextTier: number;
  tierDiscountPercentage: number;
  badgeColor: string;
}

export interface CustomerCommunicationRecord {
  id: string;
  customerId: string;
  tripId?: string;
  type:
    | "Quotation Sent"
    | "Booking Confirmation"
    | "Payment Reminder"
    | "Pickup Details"
    | "Feedback Request"
    | "Review Invitation"
    | "Service Recovery"
    | "Referral Invite"
    | "General Note";
  channel: "WhatsApp" | "Email" | "SMS" | "Phone Call" | "Portal";
  summary: string;
  date: string;
  agentName: string;
}

export interface CustomerEvent {
  id: string;
  customerId: string;
  type: "Birthday" | "Anniversary" | "Milestone";
  date: string;
  notes?: string;
}

export interface AgencyReviewSettings {
  googleReviewUrl: string;
  tripAdvisorUrl?: string;
  reviewInvitationMessage: string;
  referralRewardAmount: number;
  referralFriendDiscount: number;
  referralMinBookingAmount: number;
}


