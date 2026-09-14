/**
 * Centralized human-readable label formatting for Prisma enums, filter presets,
 * and business display values across the TripDesk SaaS platform.
 * 
 * Rules:
 * 1. Internal enum values and database IDs remain completely untouched.
 * 2. Only user-facing display strings are formatted.
 * 3. Specific domain wording takes precedence over generic underscore replacement.
 */

export const ENUM_LABEL_MAP: Record<string, string> = {
  // ─── Tax & Commercial Modes ───
  EXCLUSIVE: "Tax Exclusive",
  INCLUSIVE: "Tax Inclusive",
  TAX_EXCLUSIVE: "Tax Exclusive",
  TAX_INCLUSIVE: "Tax Inclusive",
  INTRA_STATE: "Intra-State",
  INTER_STATE: "Inter-State",
  NON_GST_EXEMPT: "Non-GST / Exempt",

  // ─── Trip Lifecycle ───
  DRAFT: "Draft",
  PLANNING: "Planning",
  QUOTED: "Quoted",
  BOOKED: "Booked",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",

  // ─── Quotation Lifecycle ───
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",

  // ─── Booking Statuses ───
  CONFIRMED: "Confirmed",

  // ─── Payment & Invoicing ───
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  ISSUED: "Issued",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  VOIDED: "Voided",

  // ─── Payment Methods ───
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CARD: "Credit / Debit Card",
  CHEQUE: "Cheque",
  OTHER: "Other",

  // ─── Payment Milestone Types ───
  ADVANCE: "Advance Payment",
  PARTIAL: "Partial Installment",
  FINAL: "Final Settlement",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",

  // ─── Pricing Models & Basis ───
  PER_KM: "Per Kilometer",
  PER_DAY: "Per Day",
  TOTAL: "Total Fixed Rate",
  FIXED: "Fixed Trip Rate",
  INCLUDED: "Included in Package",
  OPTIONAL: "Optional Add-on",
  PERCENTAGE: "Percentage (%)",
  PER_PERSON: "Per Person",
  PER_ROOM: "Per Room",
  PER_VEHICLE: "Per Vehicle",

  // ─── Meal Plans ───
  EP: "EP (Room Only)",
  CP: "CP (Breakfast Included)",
  MAP: "MAP (Breakfast + Dinner)",
  AP: "AP (All Meals Included)",

  // ─── Financial & Date Presets ───
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  LAST_7_DAYS: "Last 7 Days",
  THIS_MONTH: "This Month",
  LAST_MONTH: "Last Month",
  LAST_30_DAYS: "Last 30 Days",
  LAST_90_DAYS: "Last 90 Days",
  CURRENT_MONTH: "Current Month",
  PREVIOUS_MONTH: "Previous Month",
  THIS_QUARTER: "This Quarter",
  CURRENT_YEAR: "Current Year",
  THIS_YEAR: "This Year",
  ALL_TIME: "All Time",
  CUSTOM_RANGE: "Custom Range",

  // ─── Finance Transactions ───
  ALL: "All",
  CUSTOMER_PAYMENT: "Customer Payment",
  CUSTOMER_REFUND: "Customer Refund",
  SUPPLIER_PAYMENT: "Supplier Disbursement",
  EXPENSE: "Operational Expense",

  // ─── Expense Categories ───
  TOLL: "Toll Charges",
  PARKING: "Parking Fees",
  FUEL: "Fuel",
  DRIVER_ALLOWANCE: "Driver Allowance",
  MEALS: "Meals",
  EMERGENCY: "Emergency",
  ACTIVITY: "Activity",
  MISCELLANEOUS: "Miscellaneous",

  // ─── Follow-up Interactions ───
  CALL: "Phone Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  MEETING: "Meeting",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  RESCHEDULED: "Rescheduled",

  // ─── Operational Confirmations & Dispatches ───
  REQUESTED: "Requested",
  AMENDED: "Amended",
  ASSIGNED: "Assigned",
  ON_DUTY: "On Duty",
  PREPARING: "Preparing",
  READY: "Ready",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CRITICAL: "Critical",

  // ─── Operational Adjustments & Reconciliation ───
  HOTEL_AMENDMENT: "Hotel Amendment",
  ROOM_UPGRADE: "Room Upgrade",
  EXTRA_VEHICLE_KM: "Extra Vehicle KM",
  VEHICLE_UPGRADE: "Vehicle Upgrade",
  ACTIVITY_ADDON: "Activity Add-on",
  CANCELLATION_FEE: "Cancellation Fee",
  GUEST_REQUEST: "Guest Request",
  OPERATIONAL_ERROR: "Operational Error",

  // ─── Operational Communications & Reviews ───
  DRIVER_PICKUP: "Chauffeur & Pickup Details",
  HOTEL_VOUCHER: "Hotel Check-in & Voucher",
  ACTIVITY_PASS: "Excursion & Activity E-Pass",
  WELCOME_BRIEFING: "Welcome Briefing & Itinerary",
  EMERGENCY_BROADCAST: "Operations Alert / Broadcast",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",
  POOR: "Poor",

  // ─── CRM Enquiry Pipeline ───
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  FOLLOW_UP: "Follow-up",
  QUOTATION_SENT: "Quotation Sent",
  NEGOTIATION: "Negotiation",
  CONVERTED: "Converted",
  LOST: "Lost",

  // ─── Subscription & Platform Admin ───
  TRIAL: "7-Day Free Trial",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  VERIFIED: "Verified",
  INFO: "Information",
  WARNING: "Warning",
  MAINTENANCE: "Maintenance",
  FEATURE: "Feature Release",
  INACTIVE: "Inactive",
  AGENCY_SUSPENDED: "Agency Suspended",
  AGENCY_REACTIVATED: "Agency Reactivated",
  TRIAL_EXTENDED: "Trial Extended",
  PLAN_CREATED: "Plan Created",
};

/**
 * Returns a clean, user-friendly label for any internal enum or preset string.
 * If the value is not in the explicit dictionary, it formats SCREAMING_SNAKE_CASE
 * into Title Case while preserving acronyms and lowercase strings.
 */
export function formatEnumLabel(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (!str) return "";

  if (ENUM_LABEL_MAP[str]) {
    return ENUM_LABEL_MAP[str];
  }

  // Handle SCREAMING_SNAKE_CASE fallback
  if (/^[A-Z0-9_]+$/.test(str)) {
    return str
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return str;
}
