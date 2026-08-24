export type AgencyStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "READ_ONLY" | "SUSPENDED";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "EXPIRED";
export type PlanTier = "Starter" | "Professional";
export type BillingCycle = "Monthly" | "Yearly";
export type SubscriptionPaymentMethod = "UPI" | "QR" | "Bank Transfer" | "Direct Payment" | "Other";
export type SubscriptionPaymentStatus = "Pending" | "Verified" | "Rejected";

export interface SaaSAgency {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  website?: string;
  gstin?: string;
  internalNotes?: string;
  ownerId: string;
  status: AgencyStatus;
  createdAt: string;
}

export interface SaaSAgencyOwner {
  id: string;
  agencyId: string;
  name: string;
  email: string;
  phone: string;
}

export interface SaaSPlan {
  id: "starter" | "professional";
  name: PlanTier;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  features: string[];
  status: "Active" | "Archived";
}

export interface SaaSSubscription {
  id: string;
  agencyId: string;
  planId: "starter" | "professional";
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  trialStart?: string;
  trialEnd?: string;
  startDate: string;
  renewalDate: string;
  amount: number;
}

export interface SaaSSubscriptionPayment {
  id: string;
  agencyId: string;
  agencyName: string;
  subscriptionId: string;
  planName: PlanTier;
  amount: number;
  method: SubscriptionPaymentMethod;
  reference: string;
  paymentDate: string;
  status: SubscriptionPaymentStatus;
  verifiedBy?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface SaaSAgencyActivity {
  id: string;
  agencyId: string;
  date: string;
  time: string;
  title: string;
  description: string;
  actor: string;
}

// 7-day dynamic date helper for initial mock records
const now = new Date();
const formatDate = (d: Date) => d.toISOString().split("T")[0];

const todayStr = formatDate(now);
const trialStartDate = formatDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
const trialEndDate = formatDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000));
const trialExpiringTomorrow = formatDate(new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000));
const oneYearLater = formatDate(new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000));
const pastDueRenewal = formatDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));

export const initialSaaSPlans: SaaSPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    tagline: "Essential travel planning & quotation workflow for boutique operators.",
    features: [
      "Customers & Traveler Directory",
      "Trip Planning & Day-wise Itinerary",
      "Hotel & Vehicle Inventory Rates",
      "Quotation Versions with Markup & Discount",
      "Confirmed Booking Generation",
      "Customer Trip Portal & Shareable Links",
      "7-Day Free Trial Included",
    ],
    status: "Active",
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    tagline: "Comprehensive operating suite for established agencies and tour desks.",
    features: [
      "Everything in Starter",
      "Live Operations Command Center & Day Tracker",
      "Dedicated Chauffeur & Vehicle Dispatch",
      "Post-Trip Multi-Category Feedback & CSAT",
      "Google Reviews Redirect Link",
      "Referral Program & Loyalty Rewards Engine",
      "Advanced Gross Margin & Costing Reports",
      "Agency Custom Branding & Header Accent",
      "Priority WhatsApp & Phone Technical Support",
    ],
    status: "Active",
  },
];

export const initialSaaSAgencies: SaaSAgency[] = [
  {
    id: "agency-1",
    name: "ABC Travels",
    slug: "abc-travels",
    email: "contact@abctravels.com",
    phone: "+91 98470 12345",
    address: "Suite 402, Marine Drive Commercial Complex",
    city: "Kochi",
    state: "Kerala",
    country: "India",
    website: "https://abctravels.in",
    gstin: "32ABCDE1234F1Z5",
    internalNotes: "Premium Kerala specialist agency. Reliable client since 2025.",
    ownerId: "owner-1",
    status: "ACTIVE",
    createdAt: "2025-08-22",
  },
  {
    id: "agency-2",
    name: "Dream Holidays",
    slug: "dream-holidays",
    email: "info@dreamholidays.in",
    phone: "+91 98250 99887",
    address: "12, Business Bay, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    website: "https://dreamholidays.in",
    gstin: "27AABCT8901D1Z2",
    internalNotes: "Recently onboarded for Mumbai outbound groups.",
    ownerId: "owner-2",
    status: "TRIAL",
    createdAt: trialStartDate,
  },
  {
    id: "agency-3",
    name: "Kerala Backwaters & Hills",
    slug: "kerala-backwaters",
    email: "bookings@keralabackwaters.com",
    phone: "+91 97440 22334",
    address: "Finishing Point Road, Punnamada",
    city: "Alleppey",
    state: "Kerala",
    country: "India",
    website: "https://keralabackwaters.com",
    gstin: "32AAECK4567M1Z8",
    internalNotes: "Houseboat operator expanding into luxury Munnar itineraries.",
    ownerId: "owner-3",
    status: "ACTIVE",
    createdAt: "2025-11-10",
  },
  {
    id: "agency-4",
    name: "Royal Rajasthan Tours",
    slug: "royal-rajasthan",
    email: "tours@royalrajasthan.com",
    phone: "+91 94140 55667",
    address: "MI Road, Heritage Plaza",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    website: "https://royalrajasthan.com",
    gstin: "08AABCR1234P1Z3",
    internalNotes: "Pending renewal payment verification for annual billing.",
    ownerId: "owner-4",
    status: "PAST_DUE",
    createdAt: "2025-09-01",
  },
  {
    id: "agency-5",
    name: "Goa Coastal Escapes",
    slug: "goa-coastal",
    email: "support@goaescapes.com",
    phone: "+91 98221 44556",
    address: "Calangute Beach Road",
    city: "Panaji",
    state: "Goa",
    country: "India",
    website: "https://goaescapes.com",
    gstin: "30AABCG9876E1Z9",
    internalNotes: "Account suspended due to prolonged inactivity and non-payment.",
    ownerId: "owner-5",
    status: "SUSPENDED",
    createdAt: "2026-02-01",
  },
  {
    id: "agency-6",
    name: "Himalayan Treks & Tours",
    slug: "himalayan-treks",
    email: "lead@himalayantreks.in",
    phone: "+91 98160 33445",
    address: "Mall Road, Upper Bazar",
    city: "Manali",
    state: "Himachal Pradesh",
    country: "India",
    website: "https://himalayantreks.in",
    ownerId: "owner-6",
    status: "READ_ONLY",
    createdAt: "2026-04-15",
  },
];

export const initialSaaSOwners: SaaSAgencyOwner[] = [
  {
    id: "owner-1",
    agencyId: "agency-1",
    name: "Rahul Patel",
    email: "rahul@abctravels.com",
    phone: "+91 98470 12345",
  },
  {
    id: "owner-2",
    agencyId: "agency-2",
    name: "Amit Shah",
    email: "amit@dreamholidays.in",
    phone: "+91 98250 99887",
  },
  {
    id: "owner-3",
    agencyId: "agency-3",
    name: "Kishan Kumar",
    email: "kishan@keralabackwaters.com",
    phone: "+91 97440 22334",
  },
  {
    id: "owner-4",
    agencyId: "agency-4",
    name: "Vikram Singh",
    email: "vikram@royalrajasthan.com",
    phone: "+91 94140 55667",
  },
  {
    id: "owner-5",
    agencyId: "agency-5",
    name: "Suresh Lobo",
    email: "suresh@goaescapes.com",
    phone: "+91 98221 44556",
  },
  {
    id: "owner-6",
    agencyId: "agency-6",
    name: "Rohit Verma",
    email: "rohit@himalayantreks.in",
    phone: "+91 98160 33445",
  },
];

export const initialSaaSSubscriptions: SaaSSubscription[] = [
  {
    id: "sub-1",
    agencyId: "agency-1",
    planId: "professional",
    billingCycle: "Yearly",
    status: "ACTIVE",
    startDate: "2025-08-22",
    renewalDate: oneYearLater,
    amount: 49999,
  },
  {
    id: "sub-2",
    agencyId: "agency-2",
    planId: "starter",
    billingCycle: "Monthly",
    status: "TRIAL",
    trialStart: trialStartDate,
    trialEnd: trialEndDate,
    startDate: trialStartDate,
    renewalDate: trialEndDate,
    amount: 1999,
  },
  {
    id: "sub-3",
    agencyId: "agency-3",
    planId: "professional",
    billingCycle: "Monthly",
    status: "ACTIVE",
    startDate: "2025-11-10",
    renewalDate: "2026-09-10",
    amount: 4999,
  },
  {
    id: "sub-4",
    agencyId: "agency-4",
    planId: "professional",
    billingCycle: "Yearly",
    status: "PAST_DUE",
    startDate: "2025-09-01",
    renewalDate: pastDueRenewal,
    amount: 49999,
  },
  {
    id: "sub-5",
    agencyId: "agency-5",
    planId: "starter",
    billingCycle: "Monthly",
    status: "EXPIRED",
    startDate: "2026-02-01",
    renewalDate: "2026-08-01",
    amount: 1999,
  },
  {
    id: "sub-6",
    agencyId: "agency-6",
    planId: "starter",
    billingCycle: "Yearly",
    status: "EXPIRED",
    startDate: "2026-04-15",
    renewalDate: "2026-08-15",
    amount: 19999,
  },
];

export const initialSaaSPayments: SaaSSubscriptionPayment[] = [
  {
    id: "PAY-1001",
    agencyId: "agency-1",
    agencyName: "ABC Travels",
    subscriptionId: "sub-1",
    planName: "Professional",
    amount: 49999,
    method: "UPI",
    reference: "UPI/328910283910/HDFC",
    paymentDate: "2025-08-22",
    status: "Verified",
    verifiedBy: "TripDesk Admin",
    notes: "Annual renewal confirmed via official ICICI UPI.",
  },
  {
    id: "PAY-1002",
    agencyId: "agency-4",
    agencyName: "Royal Rajasthan Tours",
    subscriptionId: "sub-4",
    planName: "Professional",
    amount: 49999,
    method: "Bank Transfer",
    reference: "NEFT-SBIN00012849-VIKRAM",
    paymentDate: todayStr,
    status: "Pending",
    notes: "NEFT screenshot submitted via WhatsApp. Pending verification against bank ledger.",
  },
  {
    id: "PAY-1003",
    agencyId: "agency-3",
    agencyName: "Kerala Backwaters & Hills",
    subscriptionId: "sub-3",
    planName: "Professional",
    amount: 4999,
    method: "QR",
    reference: "UPI/9981273918/GPay",
    paymentDate: "2026-08-10",
    status: "Verified",
    verifiedBy: "TripDesk Admin",
    notes: "Monthly fee credited.",
  },
  {
    id: "PAY-1004",
    agencyId: "agency-2",
    agencyName: "Dream Holidays",
    subscriptionId: "sub-2",
    planName: "Starter",
    amount: 1999,
    method: "Direct Payment",
    reference: "CASH-DEPOSIT-MUMBAI",
    paymentDate: todayStr,
    status: "Pending",
    notes: "Early conversion payment from 7-day trial to monthly Starter.",
  },
  {
    id: "PAY-1005",
    agencyId: "agency-5",
    agencyName: "Goa Coastal Escapes",
    subscriptionId: "sub-5",
    planName: "Starter",
    amount: 1999,
    method: "UPI",
    reference: "INVALID-TXN-REF-998",
    paymentDate: "2026-08-02",
    status: "Rejected",
    verifiedBy: "TripDesk Admin",
    rejectionReason: "UTR reference was invalid or not found in TripDesk bank statement.",
  },
];

export const initialSaaSActivities: SaaSAgencyActivity[] = [
  {
    id: "act-1",
    agencyId: "agency-1",
    date: "2025-08-22",
    time: "10:30 AM",
    title: "Agency Onboarded",
    description: "ABC Travels created on TripDesk Platform with Professional Plan.",
    actor: "TripDesk Admin",
  },
  {
    id: "act-2",
    agencyId: "agency-1",
    date: "2025-08-22",
    time: "11:15 AM",
    title: "Payment Verified",
    description: "Annual subscription payment ₹49,999 verified (UPI/328910283910).",
    actor: "TripDesk Admin",
  },
  {
    id: "act-3",
    agencyId: "agency-2",
    date: trialStartDate,
    time: "02:00 PM",
    title: "7-Day Free Trial Started",
    description: "Dream Holidays started 7-day evaluation on Starter Plan.",
    actor: "System",
  },
  {
    id: "act-4",
    agencyId: "agency-4",
    date: todayStr,
    time: "09:45 AM",
    title: "Renewal Payment Submitted",
    description: "Manual Bank Transfer payment ₹49,999 submitted for verification.",
    actor: "Vikram Singh",
  },
  {
    id: "act-5",
    agencyId: "agency-5",
    date: "2026-08-05",
    time: "04:00 PM",
    title: "Account Suspended",
    description: "Account suspended due to overdue invoice and rejected payment reference.",
    actor: "TripDesk Admin",
  },
];
