import * as Yup from "yup"

// ─── Shared Regex Patterns ────────────────────────────────────────────
const NAME_REGEX = /^[a-zA-Z\s.\-]+$/
const CITY_REGEX = /^[a-zA-Z\s\-]+$/
const DESTINATION_REGEX = /^[a-zA-Z\s\-,]+$/
const PHONE_REGEX = /^\+?[0-9]{10,15}$/

// ─── Customer Schema ──────────────────────────────────────────────────
// Used by /customers/new and /customers/[id] edit form
export const customerSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Full Name is required")
    .min(3, "Full Name must be at least 3 characters long")
    .max(100, "Full Name cannot exceed 100 characters")
    .matches(NAME_REGEX, "Full Name can only contain letters, spaces, dots, and hyphens"),

  phone: Yup.string()
    .trim()
    .required("Phone Number is required")
    .test(
      "phone-format",
      "Phone Number must be between 10 and 15 digits (e.g. +919876543210)",
      (value) => {
        if (!value) return false
        const clean = value.replace(/\s+/g, "")
        return PHONE_REGEX.test(clean)
      }
    ),

  email: Yup.string()
    .trim()
    .email("Please enter a valid email address (e.g. rahul@example.com)")
    .max(100, "Email address cannot exceed 100 characters"),

  city: Yup.string()
    .trim()
    .test("city-format", "City name must be at least 2 characters long", function (value) {
      if (!value) return true
      return value.length >= 2
    })
    .max(100, "City name cannot exceed 100 characters")
    .test("city-chars", "City name can only contain letters, spaces, and hyphens", function (value) {
      if (!value) return true
      return CITY_REGEX.test(value)
    }),

  preferredContact: Yup.string().default("WhatsApp"),

  notes: Yup.string()
    .trim()
    .max(2000, "Internal notes cannot exceed 2000 characters"),

  // Travel Preferences
  hotelCategory: Yup.string(),
  mealPlan: Yup.string(),
  vehicle: Yup.string(),

  destination: Yup.string()
    .trim()
    .test("dest-min", "Destination must be at least 2 characters long", function (value) {
      if (!value) return true
      return value.length >= 2
    })
    .max(100, "Destination cannot exceed 100 characters")
    .test("dest-chars", "Destination can only contain letters, spaces, commas, and hyphens", function (value) {
      if (!value) return true
      return DESTINATION_REGEX.test(value)
    }),

  preferences: Yup.string()
    .trim()
    .max(1000, "Preferences notes cannot exceed 1000 characters"),
})

// ─── Trip Schema ──────────────────────────────────────────────────────
// Used by /trips/new and /trips/[id] Edit Properties modal
export const tripSchema = Yup.object().shape({
  customerId: Yup.string()
    .required("Please select a customer"),

  tripName: Yup.string()
    .trim()
    .test("tripname-min", "Trip Name must be at least 3 characters long", function (value) {
      if (!value) return true
      return value.length >= 3
    })
    .max(100, "Trip Name cannot exceed 100 characters"),

  destination: Yup.string()
    .trim()
    .required("Destination is required")
    .min(2, "Destination must be at least 2 characters long")
    .max(100, "Destination cannot exceed 100 characters")
    .matches(DESTINATION_REGEX, "Destination can only contain letters, spaces, commas, and hyphens"),

  startDate: Yup.string()
    .required("Start date is required")
    .test("valid-start", "Please enter a valid Start Date", (value) => {
      if (!value) return false
      return !isNaN(new Date(value).getTime())
    }),

  endDate: Yup.string()
    .required("End date is required")
    .test("valid-end", "Please enter a valid End Date", (value) => {
      if (!value) return false
      return !isNaN(new Date(value).getTime())
    })
    .test("end-after-start", "End date cannot be before start date", function (value) {
      const { startDate } = this.parent
      if (!value || !startDate) return true
      const start = new Date(startDate)
      const end = new Date(value)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return true
      return end >= start
    }),

  adults: Yup.number()
    .required("At least 1 adult is required")
    .min(1, "At least 1 adult is required")
    .max(100, "Number of adults cannot exceed 100"),

  children: Yup.number()
    .min(0, "Number of children must be between 0 and 100")
    .max(100, "Number of children must be between 0 and 100"),

  infants: Yup.number()
    .min(0, "Number of infants must be between 0 and 100")
    .max(100, "Number of infants must be between 0 and 100"),

  budget: Yup.string()
    .test("budget-valid", "Budget must be a positive number greater than 0", function (value) {
      if (!value || value.trim() === "") return true
      const num = parseFloat(value)
      return !isNaN(num) && num > 0
    })
    .test("budget-max", "Budget is too large (max budget limit ₹10,00,00,000)", function (value) {
      if (!value || value.trim() === "") return true
      const num = parseFloat(value)
      if (isNaN(num)) return true
      return num <= 100000000
    }),

  status: Yup.string(),

  notes: Yup.string()
    .trim()
    .max(2000, "Trip notes cannot exceed 2000 characters"),
})

// ─── Trip Edit Schema (no customerId required) ───────────────────────
// Used in the Edit Trip Properties modal where customer can't be changed
export const tripEditSchema = tripSchema.omit(["customerId"])

// ─── Itinerary Day Schema ─────────────────────────────────────────────
export const itineraryDaySchema = Yup.object().shape({
  dayTitle: Yup.string()
    .trim()
    .required("Day title is required")
    .min(2, "Day title must be at least 2 characters long")
    .max(100, "Day title cannot exceed 100 characters"),

  dayDate: Yup.string(),

  dayDescription: Yup.string()
    .trim()
    .max(1000, "Day description cannot exceed 1000 characters"),

  dayNotes: Yup.string()
    .trim()
    .max(1000, "Internal notes cannot exceed 1000 characters"),
})

// ─── Itinerary Place Schema ───────────────────────────────────────────
export const itineraryPlaceSchema = Yup.object().shape({
  placeName: Yup.string()
    .trim()
    .required("Place name is required")
    .min(2, "Place name must be at least 2 characters long")
    .max(100, "Place name cannot exceed 100 characters"),

  placeVisitTime: Yup.string()
    .trim()
    .max(50, "Visit time cannot exceed 50 characters"),

  placeDescription: Yup.string()
    .trim()
    .max(1000, "Place description cannot exceed 1000 characters"),

  placeNotes: Yup.string()
    .trim()
    .max(1000, "Operation notes cannot exceed 1000 characters"),
})

// ─── Note Schema ──────────────────────────────────────────────────────
export const noteSchema = Yup.object().shape({
  content: Yup.string()
    .trim()
    .required("Note content cannot be empty")
    .max(1000, "Note content cannot exceed 1000 characters"),
})

// ═════════════════════════════════════════════════════════════════════
// PHASE 4: SUPPLIERS & TRAVEL INVENTORY VALIDATION SCHEMAS
// ═════════════════════════════════════════════════════════════════════

// ─── Supplier Schema ──────────────────────────────────────────────────
export const supplierSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Supplier name is required")
    .min(2, "Supplier name must be at least 2 characters long")
    .max(100, "Supplier name cannot exceed 100 characters"),

  type: Yup.string()
    .required("Supplier type is required"),

  contactPerson: Yup.string()
    .trim()
    .max(100, "Contact person cannot exceed 100 characters"),

  phone: Yup.string()
    .trim()
    .test(
      "phone-format",
      "Phone number must be between 10 and 15 digits (e.g. +919876543210)",
      (value) => {
        if (!value) return true
        const clean = value.replace(/\s+/g, "")
        return PHONE_REGEX.test(clean)
      }
    ),

  email: Yup.string()
    .trim()
    .test("email-valid", "Please enter a valid email address", (value) => {
      if (!value) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    })
    .max(100, "Email address cannot exceed 100 characters"),

  city: Yup.string()
    .trim()
    .max(100, "City name cannot exceed 100 characters"),

  website: Yup.string()
    .trim()
    .max(200, "Website URL cannot exceed 200 characters"),

  services: Yup.array()
    .of(Yup.string())
    .min(1, "At least one service type must be selected"),

  status: Yup.string().default("Active"),

  notes: Yup.string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters"),
})

// ─── Hotel Schema ─────────────────────────────────────────────────────
export const hotelSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Hotel name is required")
    .min(2, "Hotel name must be at least 2 characters long")
    .max(100, "Hotel name cannot exceed 100 characters"),

  destination: Yup.string()
    .trim()
    .required("Destination is required")
    .min(2, "Destination must be at least 2 characters long")
    .max(100, "Destination cannot exceed 100 characters"),

  supplierId: Yup.string(),

  area: Yup.string()
    .trim()
    .max(100, "Area cannot exceed 100 characters"),

  address: Yup.string()
    .trim()
    .max(300, "Address cannot exceed 300 characters"),

  starCategory: Yup.number()
    .min(1, "Star category must be between 1 and 5")
    .max(5, "Star category must be between 1 and 5")
    .default(3),

  contactPerson: Yup.string()
    .trim()
    .max(100, "Contact person cannot exceed 100 characters"),

  phone: Yup.string()
    .trim()
    .test(
      "phone-format",
      "Phone number must be between 10 and 15 digits",
      (value) => {
        if (!value) return true
        const clean = value.replace(/\s+/g, "")
        return PHONE_REGEX.test(clean)
      }
    ),

  email: Yup.string()
    .trim()
    .test("email-valid", "Please enter a valid email address", (value) => {
      if (!value) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    })
    .max(100, "Email address cannot exceed 100 characters"),

  website: Yup.string()
    .trim()
    .max(200, "Website URL cannot exceed 200 characters"),

  checkInTime: Yup.string().default("14:00"),
  checkOutTime: Yup.string().default("11:00"),

  amenities: Yup.array().of(Yup.string()).default([]),

  description: Yup.string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters"),

  status: Yup.string().default("Active"),

  notes: Yup.string()
    .trim()
    .max(2000, "Notes cannot exceed 2000 characters"),
})

// ─── Hotel Room Schema ────────────────────────────────────────────────
export const hotelRoomSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Room name is required")
    .min(2, "Room name must be at least 2 characters long")
    .max(100, "Room name cannot exceed 100 characters"),

  maxAdults: Yup.number()
    .required("Max adults is required")
    .min(1, "At least 1 adult capacity required")
    .max(20, "Maximum adult capacity cannot exceed 20"),

  maxChildren: Yup.number()
    .min(0, "Max children cannot be negative")
    .max(10, "Maximum child capacity cannot exceed 10")
    .default(0),

  bedType: Yup.string()
    .trim()
    .max(50, "Bed type cannot exceed 50 characters"),

  description: Yup.string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters"),

  status: Yup.string().default("Active"),
})

// ─── Hotel Rate Schema ────────────────────────────────────────────────
export const hotelRateSchema = Yup.object().shape({
  hotelId: Yup.string().required("Please select a hotel"),
  roomId: Yup.string().required("Please select a room"),
  rateSheetId: Yup.string(),
  mealPlan: Yup.string().required("Meal plan is required"),
  currency: Yup.string().default("INR"),

  baseRate: Yup.number()
    .required("Base rate is required")
    .min(0, "Rate must be greater than or equal to 0")
    .max(10000000, "Rate is too high"),

  occupancyAdults: Yup.number()
    .required("Adult occupancy is required")
    .min(1, "Must allow at least 1 adult"),

  occupancyChildren: Yup.number()
    .min(0, "Cannot be negative")
    .default(0),

  extraAdultRate: Yup.number()
    .min(0, "Cannot be negative")
    .default(0),

  childRate: Yup.number()
    .min(0, "Cannot be negative")
    .default(0),

  validFrom: Yup.string()
    .required("Valid from date is required")
    .test("valid-from", "Please enter a valid Start Date", (v) => !v || !isNaN(new Date(v).getTime())),

  validTo: Yup.string()
    .required("Valid to date is required")
    .test("valid-to", "Please enter a valid End Date", (v) => !v || !isNaN(new Date(v).getTime()))
    .test("end-after-start", "Valid To cannot be before Valid From", function (value) {
      const { validFrom } = this.parent
      if (!value || !validFrom) return true
      return new Date(value) >= new Date(validFrom)
    }),

  status: Yup.string().default("Active"),
  notes: Yup.string().trim().max(1000, "Notes cannot exceed 1000 characters"),
})

// ─── Rate Sheet Schema ────────────────────────────────────────────────
export const rateSheetSchema = Yup.object().shape({
  supplierId: Yup.string().required("Supplier is required"),

  name: Yup.string()
    .trim()
    .required("Rate sheet name is required")
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  description: Yup.string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters"),

  validFrom: Yup.string()
    .required("Valid from date is required")
    .test("valid-from", "Please enter a valid Start Date", (v) => !v || !isNaN(new Date(v).getTime())),

  validTo: Yup.string()
    .required("Valid to date is required")
    .test("valid-to", "Please enter a valid End Date", (v) => !v || !isNaN(new Date(v).getTime()))
    .test("end-after-start", "Valid To cannot be before Valid From", function (value) {
      const { validFrom } = this.parent
      if (!value || !validFrom) return true
      return new Date(value) >= new Date(validFrom)
    }),

  status: Yup.string().default("Active"),
  sourceType: Yup.string().default("Manual"),
})

// ─── Vehicle Schema ───────────────────────────────────────────────────
export const vehicleSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Vehicle name is required")
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  vehicleType: Yup.string().required("Vehicle type is required"),

  seatingCapacity: Yup.number()
    .required("Seating capacity is required")
    .min(1, "Must have at least 1 seat")
    .max(100, "Capacity cannot exceed 100"),

  luggageCapacity: Yup.number()
    .min(0, "Cannot be negative")
    .default(2),

  supplierId: Yup.string(),
  baseLocation: Yup.string().trim().max(100, "Location cannot exceed 100 characters"),
  ac: Yup.boolean().default(true),
  driverIncluded: Yup.boolean().default(true),
  model: Yup.string().trim().max(100, "Model cannot exceed 100 characters"),
  permitType: Yup.string().trim().max(100, "Permit cannot exceed 100 characters"),
  status: Yup.string().default("Active"),
  notes: Yup.string().trim().max(2000, "Notes cannot exceed 2000 characters"),
})

// ─── Vehicle Rate Schema ──────────────────────────────────────────────
export const vehicleRateSchema = Yup.object().shape({
  vehicleId: Yup.string().required("Vehicle is required"),
  pricingType: Yup.string().required("Pricing type is required"),
  currency: Yup.string().default("INR"),

  baseRate: Yup.number()
    .required("Base rate is required")
    .min(0, "Rate must be greater than or equal to 0"),

  includedKm: Yup.number().min(0, "Cannot be negative").default(0),
  extraKmRate: Yup.number().min(0, "Cannot be negative").default(0),
  driverAllowance: Yup.number().min(0, "Cannot be negative").default(0),
  nightHalt: Yup.number().min(0, "Cannot be negative").default(0),
  tollIncluded: Yup.boolean().default(false),
  parkingIncluded: Yup.boolean().default(false),

  validFrom: Yup.string().test("valid-from", "Invalid date", (v) => !v || !isNaN(new Date(v).getTime())),
  validTo: Yup.string()
    .test("valid-to", "Invalid date", (v) => !v || !isNaN(new Date(v).getTime()))
    .test("end-after-start", "Valid To cannot be before Valid From", function (value) {
      const { validFrom } = this.parent
      if (!value || !validFrom) return true
      return new Date(value) >= new Date(validFrom)
    }),

  status: Yup.string().default("Active"),
  notes: Yup.string().trim().max(1000, "Notes cannot exceed 1000 characters"),
})

// ─── Activity Schema ──────────────────────────────────────────────────
export const activitySchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Activity name is required")
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name cannot exceed 100 characters"),

  destination: Yup.string()
    .trim()
    .required("Destination is required")
    .min(2, "Destination must be at least 2 characters long")
    .max(100, "Destination cannot exceed 100 characters"),

  category: Yup.string().required("Category is required"),
  supplierId: Yup.string(),
  duration: Yup.string().trim().max(50, "Duration cannot exceed 50 characters"),
  description: Yup.string().trim().max(2000, "Description cannot exceed 2000 characters"),
  ageRestrictions: Yup.string().trim().max(100, "Age restrictions cannot exceed 100 characters"),
  status: Yup.string().default("Active"),
  notes: Yup.string().trim().max(2000, "Notes cannot exceed 2000 characters"),
})

// ─── Activity Rate Schema ─────────────────────────────────────────────
export const activityRateSchema = Yup.object().shape({
  activityId: Yup.string().required("Activity is required"),
  pricingType: Yup.string().required("Pricing type is required"),
  currency: Yup.string().default("INR"),

  adultRate: Yup.number().min(0, "Cannot be negative"),
  childRate: Yup.number().min(0, "Cannot be negative"),
  groupRate: Yup.number().min(0, "Cannot be negative"),
  vehicleRate: Yup.number().min(0, "Cannot be negative"),
  bookingRate: Yup.number().min(0, "Cannot be negative"),

  validFrom: Yup.string().test("valid-from", "Invalid date", (v) => !v || !isNaN(new Date(v).getTime())),
  validTo: Yup.string()
    .test("valid-to", "Invalid date", (v) => !v || !isNaN(new Date(v).getTime()))
    .test("end-after-start", "Valid To cannot be before Valid From", function (value) {
      const { validFrom } = this.parent
      if (!value || !validFrom) return true
      return new Date(value) >= new Date(validFrom)
    }),

  status: Yup.string().default("Active"),
  notes: Yup.string().trim().max(1000, "Notes cannot exceed 1000 characters"),
})

// ═════════════════════════════════════════════════════════════════════
// PHASE 5: TRIP COSTING & PRICING SCHEMAS
// ═════════════════════════════════════════════════════════════════════

// ─── Manual Cost Item Schema ──────────────────────────────────────────
export const manualCostItemSchema = Yup.object().shape({
  category: Yup.string().required("Category is required"),
  name: Yup.string()
    .trim()
    .required("Service / item name is required")
    .min(2, "Name must be at least 2 characters long")
    .max(120, "Name cannot exceed 120 characters"),
  supplierId: Yup.string().nullable(),
  supplierName: Yup.string().trim().max(100, "Supplier name cannot exceed 100 characters"),
  quantity: Yup.number()
    .typeError("Quantity must be a number")
    .required("Quantity is required")
    .min(1, "Quantity must be at least 1"),
  unit: Yup.string().trim().max(50, "Unit cannot exceed 50 characters"),
  duration: Yup.number()
    .typeError("Duration must be a number")
    .min(1, "Duration must be at least 1")
    .default(1),
  unitCost: Yup.number()
    .typeError("Unit cost must be a number")
    .required("Unit cost is required")
    .min(0, "Unit cost cannot be negative"),
  currency: Yup.string().default("INR"),
  dateFrom: Yup.string().nullable(),
  dateTo: Yup.string().nullable(),
  notes: Yup.string().trim().max(1000, "Notes cannot exceed 1000 characters"),
})

// ─── Internal Expense Schema ──────────────────────────────────────────
export const internalExpenseSchema = Yup.object().shape({
  category: Yup.string().required("Expense category is required"),
  name: Yup.string()
    .trim()
    .required("Expense description is required")
    .min(2, "Description must be at least 2 characters long")
    .max(120, "Description cannot exceed 120 characters"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0.01, "Amount must be greater than 0"),
  currency: Yup.string().default("INR"),
  date: Yup.string().nullable(),
  notes: Yup.string().trim().max(1000, "Notes cannot exceed 1000 characters"),
})

// ─── Pricing Settings Schema ──────────────────────────────────────────
export const pricingSettingsSchema = Yup.object().shape({
  markupType: Yup.string().oneOf(["percentage", "fixed"]).required(),
  markupValue: Yup.number()
    .typeError("Markup value must be a number")
    .min(0, "Markup cannot be negative")
    .required("Markup is required"),
  discountType: Yup.string().oneOf(["percentage", "fixed"]).nullable(),
  discountValue: Yup.number()
    .typeError("Discount value must be a number")
    .min(0, "Discount cannot be negative")
    .default(0),
  pricingMode: Yup.string().oneOf(["automatic", "manual"]).required(),
  manualSellingPrice: Yup.number()
    .typeError("Selling price must be a number")
    .min(0, "Selling price cannot be negative")
    .nullable(),
  taxRuleId: Yup.string().nullable(),
  customTaxRate: Yup.number()
    .typeError("Custom tax rate must be a number")
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .nullable(),
  lowMarginThreshold: Yup.number()
    .typeError("Threshold must be a number")
    .min(0, "Threshold cannot be negative")
    .max(100, "Threshold cannot exceed 100%")
    .default(10),
  roundPriceTo: Yup.number()
    .typeError("Rounding value must be a number")
    .min(0, "Cannot be negative")
    .default(0),
})


