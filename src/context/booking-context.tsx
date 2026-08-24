"use client";

import * as React from "react";
import {
  Booking,
  BookingItem,
  BookingStatus,
  PaymentStatus,
  CustomerPayment,
  SupplierPayment,
  BookingRefund,
  BookingTimelineEvent,
  BookingDocument,
  PublicBookingView,
  Quotation,
} from "@/types";
import {
  convertQuotationToBooking,
  generateBookingNumber,
  generateBookingSecureToken,
  reconcileBookingStatus,
  reconcilePaymentStatus,
  sanitizeForPublicBooking,
} from "@/lib/booking/booking-service";

interface CreateManualBookingInput {
  customerId: string;
  tripId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants?: number;
  totalAmount: number;
  items: Array<Omit<BookingItem, "id" | "bookingId">>;
  customerSnapshot: Booking["customerSnapshot"];
  tripSnapshot: Booking["tripSnapshot"];
  agencySnapshot: Booking["agencySnapshot"];
  notes?: string;
}

interface BookingContextType {
  bookings: Booking[];
  getBooking: (id: string) => Booking | undefined;
  getBookingByNumber: (bookingNumber: string) => Booking | undefined;
  getPublicBooking: (secureToken: string) => PublicBookingView | undefined;
  createBookingFromQuotation: (quotation: Quotation) => Booking;
  createManualBooking: (input: CreateManualBookingInput) => Booking;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  updateBookingItem: (
    bookingId: string,
    itemId: string,
    updates: Partial<BookingItem>
  ) => void;
  addCustomerPayment: (
    bookingId: string,
    payment: Omit<CustomerPayment, "id" | "bookingId" | "createdAt" | "receiptNumber">
  ) => CustomerPayment;
  addSupplierPayment: (
    bookingId: string,
    payment: Omit<SupplierPayment, "id" | "bookingId" | "createdAt">
  ) => SupplierPayment;
  cancelBooking: (
    bookingId: string,
    reason: string,
    cancellationCharges: number,
    notes?: string
  ) => void;
  processRefund: (
    bookingId: string,
    refundId: string,
    referenceNumber: string
  ) => void;
  acceptQuotationAndCreateBooking: (quotation: Quotation) => Booking;
}

const BookingContext = React.createContext<BookingContextType | null>(null);

// ─── INITIAL PRELOADED SAMPLE BOOKINGS ──────────────────────────────────────

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "bk_001",
    bookingNumber: "BK-2026-0001",
    secureToken: "bk_kerala_sample_001",
    customerId: "cust_1",
    tripId: "trip_1",
    quotationId: "qt_001",
    title: "Kerala Family Holiday",
    destination: "Munnar & Alleppey",
    startDate: "2026-08-27",
    endDate: "2026-09-03",
    adults: 4,
    children: 1,
    infants: 0,
    status: "Confirmed",
    paymentStatus: "Partially Paid",

    totalAmount: 85000,
    paidAmount: 40000,
    pendingAmount: 45000,

    totalSupplierCost: 65000,
    paidSupplierCost: 35000,
    pendingSupplierCost: 30000,
    expectedProfit: 20000,

    customerSnapshot: {
      id: "cust_1",
      name: "Rahul Patel",
      phone: "+91 98765 43210",
      email: "rahul.patel@gmail.com",
      city: "Ahmedabad, Gujarat",
      travellersLabel: "4 Adults, 1 Child",
    },
    tripSnapshot: {
      id: "trip_1",
      title: "Kerala Family Holiday",
      destination: "Munnar & Alleppey, Kerala",
      startDate: "2026-08-27",
      endDate: "2026-09-03",
      durationLabel: "7 Nights / 8 Days",
      nights: 7,
      days: 8,
      adults: 4,
      children: 1,
      infants: 0,
    },
    agencySnapshot: {
      name: "TripDesk Travel Studio",
      tagline: "Tailor-Made Luxury & Experiential Journeys",
      email: "holidays@tripdesk.in",
      phone: "+91 98470 12345",
      website: "www.tripdesk.in",
      address: "Suite 402, Trade Tower, MG Road, Kochi, Kerala",
      licenseNumber: "DOT/KER/EXP/2026-981",
    },
    itinerarySnapshot: [
      {
        dayNumber: 1,
        date: "2026-08-27",
        title: "Arrival in Cochin & Transfer to Munnar",
        description: "Pick up from Cochin Airport, scenic drive past Cheeyappara & Valara waterfalls.",
        places: [{ name: "Cheeyappara Waterfalls" }],
      },
      {
        dayNumber: 2,
        date: "2026-08-28",
        title: "Munnar Tea Plantations & Eravikulam National Park",
        description: "Visit Nilgiri Tahr habitat, Mattupetty Dam, Eco Point and Tea Museum.",
        places: [{ name: "Eravikulam National Park" }],
      },
      {
        dayNumber: 3,
        date: "2026-08-29",
        title: "Munnar to Thekkady Spice Sanctuary",
        description: "Spice plantation walk and evening Periyar Lake boat safari.",
        places: [{ name: "Periyar National Park" }],
      },
      {
        dayNumber: 4,
        date: "2026-08-30",
        title: "Thekkady to Alleppey Houseboat Cruise",
        description: "Check in to private air-conditioned premium houseboat on Vembanad Lake.",
        places: [{ name: "Vembanad Lake" }],
      },
    ],

    items: [
      {
        id: "bi_htl_1",
        bookingId: "bk_001",
        type: "Hotel",
        referenceId: "htl_1",
        title: "Parakkat Nature Resort",
        subtitle: "Munnar • 5★ Luxury Resort",
        destination: "Munnar",
        startDate: "2026-08-27",
        endDate: "2026-08-29",
        nights: 2,
        roomType: "Club Suite Valley View",
        numberOfRooms: 2,
        guests: 5,
        mealPlan: "CP (Breakfast Included)",
        supplierId: "sup_1",
        supplierName: "Parakkat Nature Resorts Direct",
        supplierContact: "+91 4865 263000",
        supplierCost: 28000,
        customerPrice: 36000,
        status: "Confirmed",
        confirmationNumber: "HTL-458921",
        confirmationDate: "2026-08-23",
        cancellationDeadline: "2026-08-20",
        notes: "Interconnecting rooms requested for family.",
      },
      {
        id: "bi_htl_2",
        bookingId: "bk_001",
        type: "Hotel",
        referenceId: "htl_2",
        title: "Lake Palace Alleppey Resort & Houseboat",
        subtitle: "Alleppey • 4★ Premium",
        destination: "Alleppey",
        startDate: "2026-08-29",
        endDate: "2026-08-31",
        nights: 2,
        roomType: "2-Bedroom Deluxe Houseboat",
        numberOfRooms: 1,
        guests: 5,
        mealPlan: "AP (All Meals Onboard)",
        supplierId: "sup_2",
        supplierName: "Kerala Backwater Fleet DMC",
        supplierContact: "+91 94470 33441",
        supplierCost: 22000,
        customerPrice: 28000,
        status: "Confirmed",
        confirmationNumber: "HTL-771203",
        confirmationDate: "2026-08-23",
        cancellationDeadline: "2026-08-22",
        notes: "Traditional Kerala Karimeen lunch menu arranged.",
      },
      {
        id: "bi_veh_1",
        bookingId: "bk_001",
        type: "Vehicle",
        referenceId: "veh_1",
        title: "Toyota Innova Crysta AC",
        subtitle: "7-Seater Luxury MPV with Chauffeur",
        destination: "Kerala Circuit",
        startDate: "2026-08-27",
        endDate: "2026-09-03",
        pickupLocation: "Cochin International Airport (COK)",
        dropLocation: "Trivandrum International Airport (TRV)",
        pickupTime: "10:30 AM",
        driverName: "Rajesh Kumar",
        driverPhone: "+91 94471 22334",
        supplierId: "sup_3",
        supplierName: "Royal Cabs Kerala",
        supplierCost: 12000,
        customerPrice: 16000,
        status: "Confirmed",
        confirmationNumber: "CAB-98214",
        confirmationDate: "2026-08-24",
        notes: "English and Hindi speaking chauffeur requested.",
      },
      {
        id: "bi_act_1",
        bookingId: "bk_001",
        type: "Activity",
        referenceId: "act_1",
        title: "Periyar Wildlife Boat Safari & Spice Walk",
        subtitle: "Thekkady • Forest Department Reserved Slot",
        destination: "Thekkady",
        date: "2026-08-29",
        time: "10:00 AM",
        guests: 5,
        supplierId: "sup_4",
        supplierName: "Kerala Forest Tourism",
        supplierCost: 3000,
        customerPrice: 5000,
        status: "Confirmed",
        confirmationNumber: "ACT-5501",
        confirmationDate: "2026-08-24",
      },
    ],

    payments: [
      {
        id: "pay_001",
        bookingId: "bk_001",
        amount: 20000,
        date: "2026-08-20",
        method: "UPI",
        transactionId: "UPI/6233091823/Kochi",
        notes: "Advance confirmation deposit",
        receiptNumber: "RCPT-2026-0001",
        createdAt: "2026-08-20T11:30:00.000Z",
      },
      {
        id: "pay_002",
        bookingId: "bk_001",
        amount: 20000,
        date: "2026-08-23",
        method: "Bank Transfer",
        transactionId: "NEFT/HDFC2299104",
        notes: "Second stage payment on hotel confirmation",
        receiptNumber: "RCPT-2026-0002",
        createdAt: "2026-08-23T14:15:00.000Z",
      },
    ],

    supplierPayments: [
      {
        id: "spay_001",
        bookingId: "bk_001",
        supplierId: "sup_1",
        supplierName: "Parakkat Nature Resorts Direct",
        bookingItemId: "bi_htl_1",
        itemTitle: "Parakkat Nature Resort",
        amount: 20000,
        date: "2026-08-23",
        method: "Bank Transfer",
        transactionId: "NEFT/SBIN8821034",
        notes: "Hotel advance blocking payment",
        createdAt: "2026-08-23T15:00:00.000Z",
      },
      {
        id: "spay_002",
        bookingId: "bk_001",
        supplierId: "sup_3",
        supplierName: "Royal Cabs Kerala",
        bookingItemId: "bi_veh_1",
        itemTitle: "Toyota Innova Crysta AC",
        amount: 15000,
        date: "2026-08-24",
        method: "UPI",
        transactionId: "UPI/CAB992144",
        notes: "Driver advance & fuel allowance",
        createdAt: "2026-08-24T09:30:00.000Z",
      },
    ],

    refunds: [],

    timeline: [
      {
        id: "tl_1",
        bookingId: "bk_001",
        type: "QUOTATION_ACCEPTED",
        title: "Quotation QT-2026-0001 Accepted",
        description: "Customer reviewed and accepted the Kerala Holiday package.",
        actor: "Rahul Patel",
        createdAt: "2026-08-19T16:20:00.000Z",
      },
      {
        id: "tl_2",
        bookingId: "bk_001",
        type: "BOOKING_CREATED",
        title: "Booking BK-2026-0001 Initialized",
        description: "Converted quotation to operational booking.",
        actor: "TripDesk System",
        createdAt: "2026-08-19T16:21:00.000Z",
      },
      {
        id: "tl_3",
        bookingId: "bk_001",
        type: "PAYMENT_RECEIVED",
        title: "Advance Payment ₹20,000 Received",
        description: "UPI transaction verified.",
        actor: "Accounts Desk",
        createdAt: "2026-08-20T11:30:00.000Z",
      },
      {
        id: "tl_4",
        bookingId: "bk_001",
        type: "ITEM_CONFIRMED",
        title: "Parakkat Nature Resort Confirmed (HTL-458921)",
        description: "Supplier confirmed 2 Club Suites for 2 Nights.",
        actor: "Operations Manager",
        createdAt: "2026-08-23T12:00:00.000Z",
      },
      {
        id: "tl_5",
        bookingId: "bk_001",
        type: "ITEM_CONFIRMED",
        title: "Alleppey Houseboat Confirmed (HTL-771203)",
        description: "Deluxe houseboat blocked with full meals.",
        actor: "Operations Manager",
        createdAt: "2026-08-23T14:00:00.000Z",
      },
      {
        id: "tl_6",
        bookingId: "bk_001",
        type: "ITEM_CONFIRMED",
        title: "Vehicle Confirmed (CAB-98214)",
        description: "Assigned Driver Rajesh Kumar (+91 94471 22334).",
        actor: "Fleet Coordinator",
        createdAt: "2026-08-24T09:30:00.000Z",
      },
      {
        id: "tl_7",
        bookingId: "bk_001",
        type: "BOOKING_CONFIRMED",
        title: "All Services Confirmed 🎉",
        description: "Booking status updated to Confirmed.",
        actor: "TripDesk System",
        createdAt: "2026-08-24T10:00:00.000Z",
      },
    ],

    documents: [
      {
        id: "doc_1",
        bookingId: "bk_001",
        type: "Booking Confirmation",
        name: "Official Booking Confirmation - BK-2026-0001",
        referenceNumber: "BK-2026-0001",
        generatedAt: "2026-08-24T10:05:00.000Z",
      },
      {
        id: "doc_2",
        bookingId: "bk_001",
        type: "Hotel Voucher",
        name: "Parakkat Nature Resort Hotel Voucher",
        referenceNumber: "HTL-458921",
        generatedAt: "2026-08-24T10:10:00.000Z",
      },
      {
        id: "doc_3",
        bookingId: "bk_001",
        type: "Vehicle Confirmation",
        name: "Innova Crysta Vehicle Voucher",
        referenceNumber: "CAB-98214",
        generatedAt: "2026-08-24T10:12:00.000Z",
      },
      {
        id: "doc_4",
        bookingId: "bk_001",
        type: "Payment Receipt",
        name: "Payment Receipt - RCPT-2026-0001",
        referenceNumber: "RCPT-2026-0001",
        generatedAt: "2026-08-20T11:35:00.000Z",
      },
    ],

    createdAt: "2026-08-19T16:21:00.000Z",
    updatedAt: "2026-08-24T10:12:00.000Z",
  },
  {
    id: "bk_002",
    bookingNumber: "BK-2026-0002",
    secureToken: "bk_rajasthan_sample_002",
    customerId: "cust_2",
    tripId: "trip_2",
    title: "Rajasthan Heritage Tour",
    destination: "Jaipur & Udaipur",
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    adults: 2,
    children: 0,
    infants: 0,
    status: "Pending Confirmation",
    paymentStatus: "Unpaid",

    totalAmount: 62000,
    paidAmount: 0,
    pendingAmount: 62000,

    totalSupplierCost: 46000,
    paidSupplierCost: 0,
    pendingSupplierCost: 46000,
    expectedProfit: 16000,

    customerSnapshot: {
      id: "cust_2",
      name: "Priya Sharma",
      phone: "+91 98112 34567",
      email: "priya.sharma@yahoo.com",
      city: "New Delhi",
      travellersLabel: "2 Adults",
    },
    tripSnapshot: {
      id: "trip_2",
      title: "Rajasthan Heritage Tour",
      destination: "Jaipur & Udaipur, Rajasthan",
      startDate: "2026-09-10",
      endDate: "2026-09-16",
      durationLabel: "6 Nights / 7 Days",
      nights: 6,
      days: 7,
      adults: 2,
      children: 0,
      infants: 0,
    },
    agencySnapshot: {
      name: "TripDesk Travel Studio",
      tagline: "Tailor-Made Luxury & Experiential Journeys",
      email: "holidays@tripdesk.in",
      phone: "+91 98470 12345",
      website: "www.tripdesk.in",
    },

    items: [
      {
        id: "bi_htl_201",
        bookingId: "bk_002",
        type: "Hotel",
        title: "Alsisar Haveli Heritage",
        subtitle: "Jaipur • 4★ Heritage Hotel",
        destination: "Jaipur",
        startDate: "2026-09-10",
        endDate: "2026-09-13",
        nights: 3,
        roomType: "Heritage Standard Room",
        numberOfRooms: 1,
        guests: 2,
        mealPlan: "CP (Breakfast)",
        supplierName: "Rajasthan Heritage DMC",
        supplierCost: 21000,
        customerPrice: 28000,
        status: "Requested",
        notes: "Ground floor room preferred.",
      },
      {
        id: "bi_htl_202",
        bookingId: "bk_002",
        type: "Hotel",
        title: "Fateh Garh Palace",
        subtitle: "Udaipur • Heritage Hilltop",
        destination: "Udaipur",
        startDate: "2026-09-13",
        endDate: "2026-09-16",
        nights: 3,
        roomType: "Renaissance Suite",
        numberOfRooms: 1,
        guests: 2,
        mealPlan: "CP (Breakfast)",
        supplierName: "Fateh Collection",
        supplierCost: 18000,
        customerPrice: 24000,
        status: "Pending",
      },
      {
        id: "bi_veh_201",
        bookingId: "bk_002",
        type: "Vehicle",
        title: "Maruti Dzire AC Sedan",
        subtitle: "Chauffeur Driven Dedicated Cab",
        destination: "Jaipur-Udaipur",
        startDate: "2026-09-10",
        endDate: "2026-09-16",
        pickupLocation: "Jaipur Airport",
        dropLocation: "Udaipur Airport",
        supplierName: "Desert Wheels Fleet",
        supplierCost: 7000,
        customerPrice: 10000,
        status: "Pending",
      },
    ],

    payments: [],
    supplierPayments: [],
    refunds: [],

    timeline: [
      {
        id: "tl_201",
        bookingId: "bk_002",
        type: "BOOKING_CREATED",
        title: "Booking Request BK-2026-0002 Created",
        description: "Awaiting supplier confirmation and client advance.",
        actor: "Agent",
        createdAt: "2026-08-22T09:00:00.000Z",
      },
      {
        id: "tl_202",
        bookingId: "bk_002",
        type: "ITEM_REQUESTED",
        title: "Hotel Request Sent to Alsisar Haveli",
        description: "Email booking voucher sent to DMC.",
        actor: "Operations Desk",
        createdAt: "2026-08-22T09:30:00.000Z",
      },
    ],

    documents: [
      {
        id: "doc_201",
        bookingId: "bk_002",
        type: "Booking Confirmation",
        name: "Provisional Booking Confirmation - BK-2026-0002",
        referenceNumber: "BK-2026-0002",
        generatedAt: "2026-08-22T09:05:00.000Z",
      },
    ],

    createdAt: "2026-08-22T09:00:00.000Z",
    updatedAt: "2026-08-22T09:30:00.000Z",
  },
  {
    id: "bk_003",
    bookingNumber: "BK-2026-0003",
    secureToken: "bk_goa_sample_003",
    customerId: "cust_3",
    tripId: "trip_3",
    title: "Goa Luxury Coastal Escape",
    destination: "North & South Goa",
    startDate: "2026-09-18",
    endDate: "2026-09-22",
    adults: 2,
    children: 0,
    infants: 0,
    status: "Partially Confirmed",
    paymentStatus: "Partially Paid",

    totalAmount: 45000,
    paidAmount: 20000,
    pendingAmount: 25000,

    totalSupplierCost: 32000,
    paidSupplierCost: 15000,
    pendingSupplierCost: 17000,
    expectedProfit: 13000,

    customerSnapshot: {
      id: "cust_3",
      name: "Vikram Malhotra",
      phone: "+91 97690 12890",
      email: "vikram.m@techcorp.in",
      city: "Mumbai, Maharashtra",
      travellersLabel: "2 Adults",
    },
    tripSnapshot: {
      id: "trip_3",
      title: "Goa Luxury Coastal Escape",
      destination: "Goa",
      startDate: "2026-09-18",
      endDate: "2026-09-22",
      durationLabel: "4 Nights / 5 Days",
      nights: 4,
      days: 5,
      adults: 2,
      children: 0,
      infants: 0,
    },
    agencySnapshot: {
      name: "TripDesk Travel Studio",
      tagline: "Tailor-Made Luxury & Experiential Journeys",
      email: "holidays@tripdesk.in",
      phone: "+91 98470 12345",
      website: "www.tripdesk.in",
    },

    items: [
      {
        id: "bi_htl_301",
        bookingId: "bk_003",
        type: "Hotel",
        title: "Taj Holiday Village Resort & Spa",
        subtitle: "Candolim, Goa • 5★ Luxury Beachfront",
        destination: "Goa",
        startDate: "2026-09-18",
        endDate: "2026-09-22",
        nights: 4,
        roomType: "Superior Sea View Cottage",
        numberOfRooms: 1,
        guests: 2,
        mealPlan: "CP (Breakfast Included)",
        supplierName: "IHCL Central Reservation",
        supplierCost: 24000,
        customerPrice: 34000,
        status: "Confirmed",
        confirmationNumber: "HTL-998124",
        confirmationDate: "2026-08-21",
      },
      {
        id: "bi_act_301",
        bookingId: "bk_003",
        type: "Activity",
        title: "Private Catamaran Sunset Cruise",
        subtitle: "Mandovi River & Arabian Sea",
        destination: "Goa",
        date: "2026-09-20",
        time: "05:00 PM",
        guests: 2,
        supplierName: "Goa Yacht Charters",
        supplierCost: 8000,
        customerPrice: 11000,
        status: "Requested",
      },
    ],

    payments: [
      {
        id: "pay_301",
        bookingId: "bk_003",
        amount: 20000,
        date: "2026-08-21",
        method: "Card",
        transactionId: "PG/HDFC_991823901",
        notes: "Online card advance payment",
        receiptNumber: "RCPT-2026-0003",
        createdAt: "2026-08-21T18:00:00.000Z",
      },
    ],

    supplierPayments: [
      {
        id: "spay_301",
        bookingId: "bk_003",
        supplierId: "sup_taj",
        supplierName: "IHCL Central Reservation",
        bookingItemId: "bi_htl_301",
        itemTitle: "Taj Holiday Village Resort",
        amount: 15000,
        date: "2026-08-21",
        method: "Bank Transfer",
        transactionId: "NEFT/TAJ_992144",
        notes: "50% room retention guarantee",
        createdAt: "2026-08-21T18:30:00.000Z",
      },
    ],

    refunds: [],

    timeline: [
      {
        id: "tl_301",
        bookingId: "bk_003",
        type: "BOOKING_CREATED",
        title: "Booking BK-2026-0003 Created",
        description: "Package converted with 1 Hotel + 1 Yacht activity.",
        actor: "Agent",
        createdAt: "2026-08-21T17:45:00.000Z",
      },
      {
        id: "tl_302",
        bookingId: "bk_003",
        type: "PAYMENT_RECEIVED",
        title: "Advance Payment ₹20,000 Received",
        actor: "System Gateway",
        createdAt: "2026-08-21T18:00:00.000Z",
      },
      {
        id: "tl_303",
        bookingId: "bk_003",
        type: "ITEM_CONFIRMED",
        title: "Taj Holiday Village Confirmed (HTL-998124)",
        actor: "Taj Direct",
        createdAt: "2026-08-21T18:20:00.000Z",
      },
    ],

    documents: [
      {
        id: "doc_301",
        bookingId: "bk_003",
        type: "Hotel Voucher",
        name: "Taj Holiday Village Hotel Voucher",
        referenceNumber: "HTL-998124",
        generatedAt: "2026-08-21T18:25:00.000Z",
      },
      {
        id: "doc_302",
        bookingId: "bk_003",
        type: "Payment Receipt",
        name: "Payment Receipt - RCPT-2026-0003",
        referenceNumber: "RCPT-2026-0003",
        generatedAt: "2026-08-21T18:05:00.000Z",
      },
    ],

    createdAt: "2026-08-21T17:45:00.000Z",
    updatedAt: "2026-08-21T18:30:00.000Z",
  },
];

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = React.useState<Booking[]>(INITIAL_BOOKINGS);

  const getBooking = React.useCallback(
    (id: string) => bookings.find((b) => b.id === id),
    [bookings]
  );

  const getBookingByNumber = React.useCallback(
    (bookingNumber: string) =>
      bookings.find(
        (b) => b.bookingNumber.toLowerCase() === bookingNumber.toLowerCase()
      ),
    [bookings]
  );

  const getPublicBooking = React.useCallback(
    (secureToken: string) => {
      const b = bookings.find((bk) => bk.secureToken === secureToken);
      if (!b) return undefined;
      return sanitizeForPublicBooking(b);
    },
    [bookings]
  );

  const createBookingFromQuotation = React.useCallback(
    (quotation: Quotation) => {
      const newBooking = convertQuotationToBooking(quotation, bookings);
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    },
    [bookings]
  );

  const createManualBooking = React.useCallback(
    (input: CreateManualBookingInput) => {
      const now = new Date().toISOString();
      const bookingNumber = generateBookingNumber(bookings);
      const secureToken = generateBookingSecureToken();
      const bookingId = `bk_${Date.now()}`;

      const items: BookingItem[] = input.items.map((it, idx) => ({
        ...it,
        id: `bi_${Date.now()}_${idx}`,
        bookingId,
      }));

      const totalSupplierCost = items.reduce(
        (sum, item) => sum + (item.supplierCost || 0),
        0
      );
      const expectedProfit = Math.max(0, input.totalAmount - totalSupplierCost);

      const timeline: BookingTimelineEvent[] = [
        {
          id: `tl_${Date.now()}`,
          bookingId,
          type: "BOOKING_CREATED",
          title: `Booking ${bookingNumber} Created`,
          description: `Direct booking registered for ${input.destination}.`,
          actor: "Agent",
          createdAt: now,
        },
      ];

      const newBooking: Booking = {
        id: bookingId,
        bookingNumber,
        secureToken,
        customerId: input.customerId,
        tripId: input.tripId,
        title: input.title,
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
        adults: input.adults,
        children: input.children,
        infants: input.infants || 0,
        status: "Pending Confirmation",
        paymentStatus: "Unpaid",

        totalAmount: input.totalAmount,
        paidAmount: 0,
        pendingAmount: input.totalAmount,

        totalSupplierCost,
        paidSupplierCost: 0,
        pendingSupplierCost: totalSupplierCost,
        expectedProfit,

        customerSnapshot: input.customerSnapshot,
        tripSnapshot: input.tripSnapshot,
        agencySnapshot: input.agencySnapshot,

        items,
        payments: [],
        supplierPayments: [],
        refunds: [],
        timeline,
        documents: [
          {
            id: `doc_${Date.now()}`,
            bookingId,
            type: "Booking Confirmation",
            name: `Booking Confirmation - ${bookingNumber}`,
            referenceNumber: bookingNumber,
            generatedAt: now,
          },
        ],
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    },
    [bookings]
  );

  const updateBooking = React.useCallback(
    (id: string, updates: Partial<Booking>) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          return {
            ...b,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const updateBookingItem = React.useCallback(
    (bookingId: string, itemId: string, updates: Partial<BookingItem>) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;

          const updatedItems = b.items.map((i) => {
            if (i.id !== itemId) return i;
            return { ...i, ...updates };
          });

          const newBookingStatus = reconcileBookingStatus(
            updatedItems,
            b.status
          );

          // Add timeline event if item confirmed
          const newTimeline = [...b.timeline];
          if (updates.status === "Confirmed") {
            const targetItem = updatedItems.find((i) => i.id === itemId);
            newTimeline.push({
              id: `tl_${Date.now()}`,
              bookingId,
              type: "ITEM_CONFIRMED",
              title: `${targetItem?.title || "Service"} Confirmed ${
                updates.confirmationNumber ? `(${updates.confirmationNumber})` : ""
              }`,
              actor: "Agent / Supplier",
              createdAt: new Date().toISOString(),
            });

            if (newBookingStatus === "Confirmed" && b.status !== "Confirmed") {
              newTimeline.push({
                id: `tl_${Date.now()}_all`,
                bookingId,
                type: "BOOKING_CONFIRMED",
                title: "All Services Confirmed 🎉",
                description: "Trip booking is fully confirmed.",
                actor: "TripDesk System",
                createdAt: new Date().toISOString(),
              });
            }
          }

          // Document addition for voucher if confirmed
          const newDocs = [...b.documents];
          if (updates.status === "Confirmed" && updates.confirmationNumber) {
            const targetItem = updatedItems.find((i) => i.id === itemId);
            const docType =
              targetItem?.type === "Hotel"
                ? "Hotel Voucher"
                : targetItem?.type === "Vehicle"
                ? "Vehicle Confirmation"
                : "Activity Voucher";

            if (!newDocs.some((d) => d.referenceNumber === updates.confirmationNumber)) {
              newDocs.push({
                id: `doc_${Date.now()}`,
                bookingId,
                type: docType,
                name: `${targetItem?.title} Voucher`,
                referenceNumber: updates.confirmationNumber,
                generatedAt: new Date().toISOString(),
              });
            }
          }

          return {
            ...b,
            items: updatedItems,
            status: newBookingStatus,
            timeline: newTimeline,
            documents: newDocs,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const addCustomerPayment = React.useCallback(
    (
      bookingId: string,
      paymentData: Omit<
        CustomerPayment,
        "id" | "bookingId" | "createdAt" | "receiptNumber"
      >
    ) => {
      const now = new Date().toISOString();
      const paymentId = `pay_${Date.now()}`;
      const receiptNumber = `RCPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPayment: CustomerPayment = {
        ...paymentData,
        id: paymentId,
        bookingId,
        receiptNumber,
        createdAt: now,
      };

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;

          const updatedPayments = [...b.payments, newPayment];
          const newPaidAmount = updatedPayments.reduce(
            (sum, p) => sum + p.amount,
            0
          );
          const newPendingAmount = Math.max(0, b.totalAmount - newPaidAmount);
          const newPaymentStatus = reconcilePaymentStatus(
            b.totalAmount,
            newPaidAmount,
            b.refunds
          );

          const newTimeline: BookingTimelineEvent[] = [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              bookingId,
              type: "PAYMENT_RECEIVED",
              title: `Customer Payment ₹${paymentData.amount.toLocaleString(
                "en-IN"
              )} Received`,
              description: `Via ${paymentData.method}${
                paymentData.transactionId
                  ? ` (Ref: ${paymentData.transactionId})`
                  : ""
              }`,
              actor: "Accounts Desk",
              createdAt: now,
            },
          ];

          const newDocs: BookingDocument[] = [
            ...b.documents,
            {
              id: `doc_${Date.now()}`,
              bookingId,
              type: "Payment Receipt",
              name: `Payment Receipt - ${receiptNumber}`,
              referenceNumber: receiptNumber,
              generatedAt: now,
            },
          ];

          return {
            ...b,
            payments: updatedPayments,
            paidAmount: newPaidAmount,
            pendingAmount: newPendingAmount,
            paymentStatus: newPaymentStatus,
            timeline: newTimeline,
            documents: newDocs,
            updatedAt: now,
          };
        })
      );

      return newPayment;
    },
    []
  );

  const addSupplierPayment = React.useCallback(
    (
      bookingId: string,
      paymentData: Omit<SupplierPayment, "id" | "bookingId" | "createdAt">
    ) => {
      const now = new Date().toISOString();
      const paymentId = `spay_${Date.now()}`;

      const newSupplierPayment: SupplierPayment = {
        ...paymentData,
        id: paymentId,
        bookingId,
        createdAt: now,
      };

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;

          const updatedSupplierPayments = [
            ...b.supplierPayments,
            newSupplierPayment,
          ];
          const newPaidSupplierCost = updatedSupplierPayments.reduce(
            (sum, p) => sum + p.amount,
            0
          );
          const newPendingSupplierCost = Math.max(
            0,
            b.totalSupplierCost - newPaidSupplierCost
          );

          const newTimeline: BookingTimelineEvent[] = [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              bookingId,
              type: "SUPPLIER_PAID",
              title: `Supplier Payment ₹${paymentData.amount.toLocaleString(
                "en-IN"
              )} to ${paymentData.supplierName}`,
              description: `${paymentData.itemTitle || "Service"}${
                paymentData.transactionId
                  ? ` • Ref: ${paymentData.transactionId}`
                  : ""
              }`,
              actor: "Accounts Desk",
              createdAt: now,
            },
          ];

          return {
            ...b,
            supplierPayments: updatedSupplierPayments,
            paidSupplierCost: newPaidSupplierCost,
            pendingSupplierCost: newPendingSupplierCost,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );

      return newSupplierPayment;
    },
    []
  );

  const cancelBooking = React.useCallback(
    (
      bookingId: string,
      reason: string,
      cancellationCharges: number,
      notes?: string
    ) => {
      const now = new Date().toISOString();

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;

          const refundAmount = Math.max(
            0,
            b.paidAmount - cancellationCharges
          );

          const newRefunds: BookingRefund[] = [...b.refunds];
          if (refundAmount > 0) {
            newRefunds.push({
              id: `ref_${Date.now()}`,
              bookingId,
              amount: refundAmount,
              date: now.split("T")[0],
              method: "Bank Transfer",
              status: "Pending",
              notes: `Refund calculated after ₹${cancellationCharges.toLocaleString(
                "en-IN"
              )} cancellation charges.`,
              createdAt: now,
            });
          }

          const newPaymentStatus: PaymentStatus =
            refundAmount > 0 ? "Refund Pending" : b.paymentStatus;

          const newTimeline: BookingTimelineEvent[] = [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              bookingId,
              type: "BOOKING_CANCELLED",
              title: `Booking Cancelled: ${reason}`,
              description: `Cancellation charges: ₹${cancellationCharges.toLocaleString(
                "en-IN"
              )}${
                refundAmount > 0
                  ? ` • Refund Pending: ₹${refundAmount.toLocaleString("en-IN")}`
                  : ""
              }`,
              actor: "Agent / Customer Request",
              createdAt: now,
            },
          ];

          return {
            ...b,
            status: "Cancelled",
            paymentStatus: newPaymentStatus,
            cancellationReason: reason,
            cancellationCharges,
            refundAmount,
            cancellationDate: now,
            refunds: newRefunds,
            timeline: newTimeline,
            internalNotes: notes
              ? `${b.internalNotes || ""}\n[Cancelled]: ${notes}`
              : b.internalNotes,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const processRefund = React.useCallback(
    (bookingId: string, refundId: string, referenceNumber: string) => {
      const now = new Date().toISOString();

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;

          const updatedRefunds = b.refunds.map((r) => {
            if (r.id !== refundId) return r;
            return {
              ...r,
              status: "Processed" as const,
              referenceNumber,
            };
          });

          const allProcessed = updatedRefunds.every(
            (r) => r.status === "Processed"
          );

          const newTimeline: BookingTimelineEvent[] = [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              bookingId,
              type: "REFUND_PROCESSED",
              title: `Refund Processed (Ref: ${referenceNumber})`,
              actor: "Accounts Desk",
              createdAt: now,
            },
          ];

          return {
            ...b,
            refunds: updatedRefunds,
            paymentStatus: allProcessed ? "Refunded" : "Refund Pending",
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const acceptQuotationAndCreateBooking = React.useCallback(
    (quotation: Quotation) => {
      // Check if booking already exists for this quotation
      const existing = bookings.find((b) => b.quotationId === quotation.id);
      if (existing) {
        return existing;
      }
      const newBooking = convertQuotationToBooking(quotation, bookings);
      setBookings((prev) => [newBooking, ...prev]);
      return newBooking;
    },
    [bookings]
  );

  const value = React.useMemo(
    () => ({
      bookings,
      getBooking,
      getBookingByNumber,
      getPublicBooking,
      createBookingFromQuotation,
      createManualBooking,
      updateBooking,
      updateBookingItem,
      addCustomerPayment,
      addSupplierPayment,
      cancelBooking,
      processRefund,
      acceptQuotationAndCreateBooking,
    }),
    [
      bookings,
      getBooking,
      getBookingByNumber,
      getPublicBooking,
      createBookingFromQuotation,
      createManualBooking,
      updateBooking,
      updateBookingItem,
      addCustomerPayment,
      addSupplierPayment,
      cancelBooking,
      processRefund,
      acceptQuotationAndCreateBooking,
    ]
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking() {
  const context = React.useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
