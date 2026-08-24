"use client";

import * as React from "react";
import {
  TripOperation,
  TripOperationsStatus,
  DailyOperationStatus,
  ActivityOperationStatus,
  TransportStatus,
  TransportOperation,
  DailyTripPlan,
  DailyActivityOperation,
  Driver,
  TripIssue,
  TripChange,
  OperationalTimelineEvent,
  EmergencyContact,
  PostTripFeedback,
} from "@/types";
import {
  calculateTripReadiness,
  detectDriverConflict,
  detectVehicleConflict,
} from "@/lib/operations/operations-service";
import { useBooking } from "@/context/booking-context";

interface OperationsContextType {
  operations: TripOperation[];
  drivers: Driver[];
  getOperationByTripId: (tripId: string) => TripOperation | undefined;
  getOperationByBookingId: (bookingId: string) => TripOperation | undefined;
  updateTripOperationsStatus: (
    tripId: string,
    status: TripOperationsStatus
  ) => void;
  assignDriverAndVehicle: (
    tripId: string,
    transportId: string,
    driverId: string,
    driverName: string,
    driverPhone: string,
    vehicleId?: string,
    vehicleName?: string,
    vehicleNumber?: string
  ) => { success: boolean; conflictWarning?: string };
  updateTransportStatus: (
    tripId: string,
    transportId: string,
    status: TransportStatus,
    delayReason?: string,
    expectedArrivalTime?: string
  ) => void;
  updateActivityStatus: (
    tripId: string,
    dayNumber: number,
    activityId: string,
    status: ActivityOperationStatus
  ) => void;
  rescheduleActivity: (
    tripId: string,
    dayNumber: number,
    activityId: string,
    newDate: string,
    newTime: string,
    reason: string
  ) => void;
  createIssue: (
    issueData: Omit<TripIssue, "id" | "createdAt" | "timeline">
  ) => TripIssue;
  updateIssue: (issueId: string, updates: Partial<TripIssue>) => void;
  resolveIssue: (issueId: string, resolutionNote?: string) => void;
  addEmergencyContact: (
    tripId: string,
    contact: Omit<EmergencyContact, "id" | "tripId">
  ) => void;
  toggleDriverVisibility: (tripId: string, isVisible: boolean) => void;
  completeTrip: (tripId: string) => void;
  submitFeedback: (
    tripId: string,
    rating: number,
    comment: string,
    recommend: boolean
  ) => void;
}

const OperationsContext = React.createContext<OperationsContextType | null>(
  null
);

// ─── PRELOADED DRIVERS DATASET ─────────────────────────────────────────────

const INITIAL_DRIVERS: Driver[] = [
  {
    id: "drv_1",
    name: "Rajesh Kumar",
    phone: "+91 94471 22334",
    supplierId: "sup_3",
    supplierName: "Royal Cabs Kerala",
    vehicleType: "Toyota Innova Crysta / Force Urbania",
    licenseNumber: "KL-07-2018-0091244",
    status: "Assigned",
    notes: "Top-rated chauffeur. English, Hindi, and Malayalam fluent.",
  },
  {
    id: "drv_2",
    name: "Suresh Menon",
    phone: "+91 94470 88219",
    supplierId: "sup_3",
    supplierName: "Royal Cabs Kerala",
    vehicleType: "Tempo Traveller 12-Seater",
    licenseNumber: "KL-07-2015-0012903",
    status: "Available",
    notes: "Experienced hill route driver for Munnar & Thekkady.",
  },
  {
    id: "drv_3",
    name: "Vikram Joshi",
    phone: "+91 98290 44551",
    supplierId: "sup_raj",
    supplierName: "Desert Wheels Fleet",
    vehicleType: "Maruti Dzire / Toyota Etios",
    licenseNumber: "RJ-14-2019-0081290",
    status: "Available",
    notes: "Jaipur & Udaipur heritage circuit specialist.",
  },
  {
    id: "drv_4",
    name: "Dilip Rathore",
    phone: "+91 98291 99012",
    supplierId: "sup_raj",
    supplierName: "Desert Wheels Fleet",
    vehicleType: "Toyota Innova Crysta",
    licenseNumber: "RJ-14-2016-0044192",
    status: "Available",
    notes: "Luxury fleet chauffeur with 10+ years experience.",
  },
];

// ─── PRELOADED OPERATIONS DATASET ──────────────────────────────────────────

const INITIAL_OPERATIONS: TripOperation[] = [
  {
    id: "op_001",
    tripId: "trip_1",
    bookingId: "bk_001",
    bookingNumber: "BK-2026-0001",
    title: "Kerala Family Holiday",
    destination: "Munnar & Alleppey",
    startDate: "2026-08-27",
    endDate: "2026-09-03",
    adults: 4,
    children: 1,
    infants: 0,
    operationsStatus: "On Trip",
    currentDay: 3,
    totalDays: 8,
    currentLocation: "Munnar",
    isDriverVisibleToCustomer: true,

    customerSnapshot: {
      id: "cust_1",
      name: "Rahul Patel",
      phone: "+91 98765 43210",
      email: "rahul.patel@gmail.com",
      city: "Ahmedabad, Gujarat",
      travellersLabel: "4 Adults, 1 Child",
    },

    readiness: {
      score: 100,
      status: "READY FOR TRIP",
      checks: [
        { key: "customer_details", label: "Customer Contact & Guest Details", passed: true },
        { key: "travel_dates", label: "Travel Window & Dates Confirmed", passed: true },
        { key: "hotels_confirmed", label: "Hotel Accommodations (2/2)", passed: true },
        { key: "vehicles_confirmed", label: "Vehicle & Fleet Allocation", passed: true },
        { key: "driver_assigned", label: "Chauffeur Assignment (1/1)", passed: true },
        { key: "activities_confirmed", label: "Excursions & Activity Slots", passed: true },
        { key: "customer_payment", label: "Customer Payment (Advance Paid)", passed: true },
        { key: "documents_ready", label: "Vouchers & Confirmation Documents", passed: true },
        { key: "emergency_contacts", label: "24x7 Emergency Coordination Contacts", passed: true },
      ],
    },

    dailyPlans: [
      {
        id: "dp_1",
        tripId: "trip_1",
        dayNumber: 1,
        date: "2026-08-27",
        title: "Arrival in Cochin & Scenic Drive to Munnar",
        location: "Kochi → Munnar",
        status: "Completed",
        activities: [
          {
            id: "act_101",
            tripId: "trip_1",
            dayNumber: 1,
            date: "2026-08-27",
            time: "10:30 AM",
            title: "Cochin Airport Pickup & Welcome",
            location: "Cochin Airport Terminal 1",
            status: "Completed",
          },
          {
            id: "act_102",
            tripId: "trip_1",
            dayNumber: 1,
            date: "2026-08-27",
            time: "01:30 PM",
            title: "Cheeyappara & Valara Waterfalls Photo Stop",
            location: "NH85 Highway",
            status: "Completed",
          },
          {
            id: "act_103",
            tripId: "trip_1",
            dayNumber: 1,
            date: "2026-08-27",
            time: "04:30 PM",
            title: "Parakkat Nature Resort Check-in & Leisure",
            location: "Parakkat Resort Munnar",
            status: "Completed",
          },
        ],
        transports: [
          {
            id: "tr_1",
            tripId: "trip_1",
            bookingId: "bk_001",
            type: "Pickup",
            title: "Airport Arrival Pickup to Munnar",
            date: "2026-08-27",
            time: "10:30 AM",
            pickupLocation: "Cochin Airport (COK)",
            dropLocation: "Parakkat Nature Resort Munnar",
            vehicleId: "veh_1",
            vehicleName: "Force Urbania 10-Seater Luxury",
            vehicleNumber: "KL 07 CC 9812",
            driverId: "drv_1",
            driverName: "Rajesh Kumar",
            driverPhone: "+91 94471 22334",
            status: "Completed",
          },
        ],
      },
      {
        id: "dp_2",
        tripId: "trip_1",
        dayNumber: 2,
        date: "2026-08-28",
        title: "Eravikulam National Park & Munnar Tea Estates",
        location: "Munnar",
        status: "Completed",
        activities: [
          {
            id: "act_201",
            tripId: "trip_1",
            dayNumber: 2,
            date: "2026-08-28",
            time: "09:00 AM",
            title: "Eravikulam National Park Safari (Nilgiri Tahr)",
            location: "Rajamala Munnar",
            status: "Completed",
          },
          {
            id: "act_202",
            tripId: "trip_1",
            dayNumber: 2,
            date: "2026-08-28",
            time: "02:00 PM",
            title: "Tata Tea Museum & Tea Tasting Session",
            location: "Nullatanni Munnar",
            status: "Completed",
          },
        ],
        transports: [],
      },
      {
        id: "dp_3",
        tripId: "trip_1",
        dayNumber: 3,
        date: "2026-08-29",
        title: "Mattupetty Dam, Echo Point & Kundala Lake",
        location: "Munnar",
        status: "Today",
        activities: [
          {
            id: "act_301",
            tripId: "trip_1",
            dayNumber: 3,
            date: "2026-08-29",
            time: "09:30 AM",
            title: "Hotel Pickup & Mattupetty Dam Speedboat Ride",
            location: "Mattupetty Dam",
            status: "Completed",
          },
          {
            id: "act_302",
            tripId: "trip_1",
            dayNumber: 3,
            date: "2026-08-29",
            time: "12:00 PM",
            title: "Echo Point Natural Acoustic Valley",
            location: "Echo Point",
            status: "In Progress",
          },
          {
            id: "act_303",
            tripId: "trip_1",
            dayNumber: 3,
            date: "2026-08-29",
            time: "03:00 PM",
            title: "Kundala Lake Pedal Boating",
            location: "Kundala Dam",
            status: "Scheduled",
          },
          {
            id: "act_304",
            tripId: "trip_1",
            dayNumber: 3,
            date: "2026-08-29",
            time: "05:30 PM",
            title: "Munnar Spice Plantation Walk & Market",
            location: "Munnar Town",
            status: "Scheduled",
          },
        ],
        transports: [
          {
            id: "tr_301",
            tripId: "trip_1",
            bookingId: "bk_001",
            type: "Sightseeing",
            title: "Full Day Munnar Sightseeing Cab",
            date: "2026-08-29",
            time: "09:00 AM",
            pickupLocation: "Parakkat Nature Resort",
            dropLocation: "Parakkat Nature Resort",
            vehicleName: "Force Urbania Luxury",
            vehicleNumber: "KL 07 CC 9812",
            driverId: "drv_1",
            driverName: "Rajesh Kumar",
            driverPhone: "+91 94471 22334",
            status: "Customer Picked Up",
          },
        ],
      },
      {
        id: "dp_4",
        tripId: "trip_1",
        dayNumber: 4,
        date: "2026-08-30",
        title: "Munnar to Alleppey Backwaters & Houseboat Check-in",
        location: "Munnar → Alleppey",
        status: "Upcoming",
        activities: [
          {
            id: "act_401",
            tripId: "trip_1",
            dayNumber: 4,
            date: "2026-08-30",
            time: "08:30 AM",
            title: "Hotel Check-out & Transfer to Alleppey Jetty",
            location: "Punnamada Jetty Alleppey",
            status: "Scheduled",
          },
          {
            id: "act_402",
            tripId: "trip_1",
            dayNumber: 4,
            date: "2026-08-30",
            time: "12:30 PM",
            title: "Private Houseboat Check-in & Welcome Drink",
            location: "Vembanad Lake",
            status: "Scheduled",
          },
        ],
        transports: [
          {
            id: "tr_401",
            tripId: "trip_1",
            bookingId: "bk_001",
            type: "Transfer",
            title: "Munnar to Alleppey Jetty Inter-city Transfer",
            date: "2026-08-30",
            time: "08:30 AM",
            pickupLocation: "Parakkat Nature Resort",
            dropLocation: "Alleppey Houseboat Jetty",
            vehicleName: "Force Urbania Luxury",
            vehicleNumber: "KL 07 CC 9812",
            driverId: "drv_1",
            driverName: "Rajesh Kumar",
            driverPhone: "+91 94471 22334",
            status: "Driver Assigned",
          },
        ],
      },
    ],

    transports: [
      {
        id: "tr_1",
        tripId: "trip_1",
        bookingId: "bk_001",
        type: "Pickup",
        title: "Airport Arrival Pickup to Munnar",
        date: "2026-08-27",
        time: "10:30 AM",
        pickupLocation: "Cochin Airport (COK)",
        dropLocation: "Parakkat Nature Resort Munnar",
        vehicleId: "veh_1",
        vehicleName: "Force Urbania 10-Seater Luxury",
        vehicleNumber: "KL 07 CC 9812",
        driverId: "drv_1",
        driverName: "Rajesh Kumar",
        driverPhone: "+91 94471 22334",
        status: "Completed",
      },
      {
        id: "tr_301",
        tripId: "trip_1",
        bookingId: "bk_001",
        type: "Sightseeing",
        title: "Full Day Munnar Sightseeing Cab",
        date: "2026-08-29",
        time: "09:00 AM",
        pickupLocation: "Parakkat Nature Resort",
        dropLocation: "Parakkat Nature Resort",
        vehicleName: "Force Urbania Luxury",
        vehicleNumber: "KL 07 CC 9812",
        driverId: "drv_1",
        driverName: "Rajesh Kumar",
        driverPhone: "+91 94471 22334",
        status: "Customer Picked Up",
      },
      {
        id: "tr_401",
        tripId: "trip_1",
        bookingId: "bk_001",
        type: "Transfer",
        title: "Munnar to Alleppey Jetty Inter-city Transfer",
        date: "2026-08-30",
        time: "08:30 AM",
        pickupLocation: "Parakkat Nature Resort",
        dropLocation: "Alleppey Houseboat Jetty",
        vehicleName: "Force Urbania Luxury",
        vehicleNumber: "KL 07 CC 9812",
        driverId: "drv_1",
        driverName: "Rajesh Kumar",
        driverPhone: "+91 94471 22334",
        status: "Driver Assigned",
      },
    ],

    issues: [
      {
        id: "iss_101",
        tripId: "trip_1",
        bookingId: "bk_001",
        customerId: "cust_1",
        customerName: "Rahul Patel",
        type: "Hotel",
        title: "Extra Bedding in Club Suite",
        description: "Customer requested additional soft pillows and extra duvet for child.",
        priority: "Low",
        status: "Resolved",
        assignedTo: "Kishan (Guest Support)",
        createdAt: "2026-08-27T17:30:00.000Z",
        resolvedAt: "2026-08-27T18:15:00.000Z",
        timeline: [
          {
            id: "it_1",
            time: "05:30 PM",
            text: "Issue logged via customer portal",
            actor: "Rahul Patel",
          },
          {
            id: "it_2",
            time: "05:40 PM",
            text: "Contacted Parakkat Resort Front Desk",
            actor: "Kishan",
          },
          {
            id: "it_3",
            time: "06:15 PM",
            text: "Housekeeping delivered bedding to Room 304",
            actor: "Hotel Staff",
          },
        ],
      },
    ],

    changes: [],

    emergencyContacts: [
      {
        id: "ec_1",
        tripId: "trip_1",
        name: "Kishan (TripDesk Lead Coordinator)",
        phone: "+91 98470 12345",
        type: "Agency Desk",
        isCustomerVisible: true,
        notes: "24x7 guest hotline",
      },
      {
        id: "ec_2",
        tripId: "trip_1",
        name: "Rajesh Kumar (Chauffeur)",
        phone: "+91 94471 22334",
        type: "Driver",
        isCustomerVisible: true,
      },
      {
        id: "ec_3",
        tripId: "trip_1",
        name: "Parakkat Nature Resort Duty Manager",
        phone: "+91 4865 263000",
        type: "Hotel",
        isCustomerVisible: true,
      },
    ],

    timeline: [
      {
        id: "otl_1",
        tripId: "trip_1",
        type: "DRIVER_ASSIGNED",
        title: "Chauffeur Rajesh Kumar Assigned (KL 07 CC 9812)",
        time: "10:00 AM",
        actor: "Fleet Desk",
        createdAt: "2026-08-27T04:30:00.000Z",
      },
      {
        id: "otl_2",
        tripId: "trip_1",
        type: "PICKUP_COMPLETED",
        title: "Airport Pickup Completed at Cochin Terminal 1",
        time: "10:45 AM",
        actor: "Rajesh Kumar",
        createdAt: "2026-08-27T05:15:00.000Z",
      },
      {
        id: "otl_3",
        tripId: "trip_1",
        type: "HOTEL_CHECKIN",
        title: "Check-in Confirmed at Parakkat Nature Resort Munnar",
        time: "04:30 PM",
        actor: "Parakkat Front Desk",
        createdAt: "2026-08-27T11:00:00.000Z",
      },
      {
        id: "otl_4",
        tripId: "trip_1",
        type: "ACTIVITY_COMPLETED",
        title: "Mattupetty Dam Speedboat Ride Completed",
        time: "11:30 AM",
        actor: "Guest Confirmation",
        createdAt: "2026-08-29T06:00:00.000Z",
      },
    ],

    createdAt: "2026-08-22T08:00:00.000Z",
    updatedAt: "2026-08-29T06:00:00.000Z",
  },
  {
    id: "op_002",
    tripId: "trip_2",
    bookingId: "bk_002",
    bookingNumber: "BK-2026-0002",
    title: "Rajasthan Heritage Tour",
    destination: "Jaipur & Udaipur",
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    adults: 2,
    children: 0,
    infants: 0,
    operationsStatus: "Upcoming",
    currentDay: 0,
    totalDays: 7,
    currentLocation: "Jaipur",
    isDriverVisibleToCustomer: false,

    customerSnapshot: {
      id: "cust_2",
      name: "Priya Sharma",
      phone: "+91 98112 34567",
      email: "priya.sharma@yahoo.com",
      city: "New Delhi",
      travellersLabel: "2 Adults",
    },

    readiness: {
      score: 75,
      status: "ACTION REQUIRED",
      checks: [
        { key: "customer_details", label: "Customer Contact & Guest Details", passed: true },
        { key: "travel_dates", label: "Travel Window & Dates Confirmed", passed: true },
        { key: "hotels_confirmed", label: "Hotel Accommodations (1/2 Pending)", passed: false, message: "Fateh Garh Palace confirmation pending" },
        { key: "vehicles_confirmed", label: "Vehicle & Fleet Allocation", passed: true },
        { key: "driver_assigned", label: "Chauffeur Assignment", passed: false, message: "Driver not yet assigned to Jaipur pickup" },
        { key: "activities_confirmed", label: "Excursions & Activity Slots", passed: true },
        { key: "customer_payment", label: "Customer Payment", passed: false, message: "Advance payment pending" },
        { key: "documents_ready", label: "Vouchers & Confirmation Documents", passed: true },
        { key: "emergency_contacts", label: "24x7 Emergency Coordination Contacts", passed: true },
      ],
    },

    dailyPlans: [
      {
        id: "dp_201",
        tripId: "trip_2",
        dayNumber: 1,
        date: "2026-09-10",
        title: "Jaipur Arrival & Evening Chokhi Dhani",
        location: "Jaipur",
        status: "Upcoming",
        activities: [
          {
            id: "act_901",
            tripId: "trip_2",
            dayNumber: 1,
            date: "2026-09-10",
            time: "11:00 AM",
            title: "Jaipur Airport Pickup to Alsisar Haveli",
            location: "Jaipur Airport",
            status: "Scheduled",
          },
          {
            id: "act_902",
            tripId: "trip_2",
            dayNumber: 1,
            date: "2026-09-10",
            time: "06:30 PM",
            title: "Chokhi Dhani Cultural Village & Dinner",
            location: "Chokhi Dhani Jaipur",
            status: "Scheduled",
          },
        ],
        transports: [
          {
            id: "tr_901",
            tripId: "trip_2",
            bookingId: "bk_002",
            type: "Pickup",
            title: "Jaipur Airport Pickup",
            date: "2026-09-10",
            time: "11:00 AM",
            pickupLocation: "Jaipur International Airport",
            dropLocation: "Alsisar Haveli Heritage",
            vehicleName: "Maruti Dzire AC Sedan",
            status: "Scheduled",
          },
        ],
      },
    ],

    transports: [
      {
        id: "tr_901",
        tripId: "trip_2",
        bookingId: "bk_002",
        type: "Pickup",
        title: "Jaipur Airport Pickup",
        date: "2026-09-10",
        time: "11:00 AM",
        pickupLocation: "Jaipur International Airport",
        dropLocation: "Alsisar Haveli Heritage",
        vehicleName: "Maruti Dzire AC Sedan",
        status: "Scheduled",
      },
    ],

    issues: [],
    changes: [],

    emergencyContacts: [
      {
        id: "ec_201",
        tripId: "trip_2",
        name: "TripDesk Rajasthan Desk",
        phone: "+91 98470 12345",
        type: "Agency Desk",
        isCustomerVisible: true,
      },
    ],

    timeline: [
      {
        id: "otl_201",
        tripId: "trip_2",
        type: "TRIP_STATUS_CHANGED",
        title: "Operations File Initialized for Rajasthan Tour",
        time: "09:00 AM",
        actor: "Agent",
        createdAt: "2026-08-22T09:00:00.000Z",
      },
    ],

    createdAt: "2026-08-22T09:00:00.000Z",
    updatedAt: "2026-08-22T09:00:00.000Z",
  },
];

export function OperationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [operations, setOperations] =
    React.useState<TripOperation[]>(INITIAL_OPERATIONS);
  const [drivers, setDrivers] = React.useState<Driver[]>(INITIAL_DRIVERS);
  const { bookings } = useBooking();

  // Recalculate readiness whenever operations or bookings change
  React.useEffect(() => {
    setOperations((prevOps) =>
      prevOps.map((op) => {
        const matchingBooking = bookings.find((b) => b.id === op.bookingId);
        const readiness = calculateTripReadiness(op, matchingBooking);
        return {
          ...op,
          readiness,
        };
      })
    );
  }, [bookings]);

  const getOperationByTripId = React.useCallback(
    (tripId: string) => operations.find((op) => op.tripId === tripId),
    [operations]
  );

  const getOperationByBookingId = React.useCallback(
    (bookingId: string) =>
      operations.find((op) => op.bookingId === bookingId),
    [operations]
  );

  const updateTripOperationsStatus = React.useCallback(
    (tripId: string, status: TripOperationsStatus) => {
      const now = new Date().toISOString();
      setOperations((prev) =>
        prev.map((op) => {
          if (op.tripId !== tripId) return op;

          const newTimeline = [
            ...op.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: "TRIP_STATUS_CHANGED" as const,
              title: `Trip Operations Status updated to "${status}"`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Operations Manager",
              createdAt: now,
            },
          ];

          return {
            ...op,
            operationsStatus: status,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const assignDriverAndVehicle = React.useCallback(
    (
      tripId: string,
      transportId: string,
      driverId: string,
      driverName: string,
      driverPhone: string,
      vehicleId?: string,
      vehicleName?: string,
      vehicleNumber?: string
    ) => {
      const now = new Date().toISOString();
      const op = operations.find((o) => o.tripId === tripId);
      const targetTransport = op?.transports.find((t) => t.id === transportId);

      // Check conflict
      let conflictWarning: string | undefined = undefined;
      if (targetTransport && driverId) {
        const allTransports = operations.flatMap((o) => o.transports);
        const conflict = detectDriverConflict(
          driverId,
          targetTransport.date,
          targetTransport.time,
          allTransports,
          transportId
        );
        if (conflict.hasConflict) {
          conflictWarning = `Notice: Chauffeur ${driverName} is already assigned on ${targetTransport.date} near ${targetTransport.time}.`;
        }
      }

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;

          const updatedTransports = o.transports.map((t) => {
            if (t.id !== transportId) return t;
            return {
              ...t,
              driverId,
              driverName,
              driverPhone,
              vehicleId: vehicleId || t.vehicleId,
              vehicleName: vehicleName || t.vehicleName,
              vehicleNumber: vehicleNumber || t.vehicleNumber,
              status: "Driver Assigned" as TransportStatus,
            };
          });

          // Also update in daily plans
          const updatedPlans = o.dailyPlans.map((dp) => ({
            ...dp,
            transports: dp.transports.map((t) => {
              if (t.id !== transportId) return t;
              return {
                ...t,
                driverId,
                driverName,
                driverPhone,
                vehicleId: vehicleId || t.vehicleId,
                vehicleName: vehicleName || t.vehicleName,
                vehicleNumber: vehicleNumber || t.vehicleNumber,
                status: "Driver Assigned" as TransportStatus,
              };
            }),
          }));

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: "DRIVER_ASSIGNED" as const,
              title: `Chauffeur ${driverName} assigned to ${
                targetTransport?.title || "transport"
              }`,
              description: `Vehicle: ${vehicleName || "Assigned Vehicle"} (${
                vehicleNumber || "Assigned"
              })`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Fleet Coordinator",
              createdAt: now,
            },
          ];

          return {
            ...o,
            transports: updatedTransports,
            dailyPlans: updatedPlans,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );

      return { success: true, conflictWarning };
    },
    [operations]
  );

  const updateTransportStatus = React.useCallback(
    (
      tripId: string,
      transportId: string,
      status: TransportStatus,
      delayReason?: string,
      expectedArrivalTime?: string
    ) => {
      const now = new Date().toISOString();

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;

          const targetTransport = o.transports.find((t) => t.id === transportId);

          const updatedTransports = o.transports.map((t) => {
            if (t.id !== transportId) return t;
            return {
              ...t,
              status,
              delayReason: delayReason || t.delayReason,
              expectedArrivalTime:
                expectedArrivalTime || t.expectedArrivalTime,
            };
          });

          const updatedPlans = o.dailyPlans.map((dp) => ({
            ...dp,
            transports: dp.transports.map((t) => {
              if (t.id !== transportId) return t;
              return {
                ...t,
                status,
                delayReason: delayReason || t.delayReason,
                expectedArrivalTime:
                  expectedArrivalTime || t.expectedArrivalTime,
              };
            }),
          }));

          const timelineType =
            status === "Delayed"
              ? "DRIVER_DELAYED"
              : status === "Customer Picked Up" || status === "Completed"
              ? "PICKUP_COMPLETED"
              : "TRIP_STATUS_CHANGED";

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: timelineType as any,
              title: `${targetTransport?.title || "Transport"} status: ${status}`,
              description: delayReason
                ? `Reason: ${delayReason} (Expected arrival: ${expectedArrivalTime})`
                : undefined,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Operations Desk",
              createdAt: now,
            },
          ];

          // Auto-create issue if delayed
          let updatedIssues = [...o.issues];
          if (status === "Delayed") {
            updatedIssues.push({
              id: `iss_${Date.now()}`,
              tripId,
              bookingId: o.bookingId,
              customerId: o.customerSnapshot.id,
              customerName: o.customerSnapshot.name,
              type: "Transport",
              title: `Chauffeur Delay: ${targetTransport?.title || "Pickup"}`,
              description: `Delay reported: ${delayReason || "Traffic delay"}. Revised arrival: ${expectedArrivalTime || "Shortly"}.`,
              priority: "High",
              status: "Open",
              assignedTo: "Operations Desk",
              createdAt: now,
              timeline: [
                {
                  id: `it_${Date.now()}`,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  text: "Driver delay reported by operations",
                  actor: "TripDesk System",
                },
              ],
            });
          }

          return {
            ...o,
            transports: updatedTransports,
            dailyPlans: updatedPlans,
            issues: updatedIssues,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const updateActivityStatus = React.useCallback(
    (
      tripId: string,
      dayNumber: number,
      activityId: string,
      status: ActivityOperationStatus
    ) => {
      const now = new Date().toISOString();

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;

          let targetActivityName = "Activity";
          const updatedPlans = o.dailyPlans.map((dp) => {
            if (dp.dayNumber !== dayNumber) return dp;
            return {
              ...dp,
              activities: dp.activities.map((act) => {
                if (act.id !== activityId) return act;
                targetActivityName = act.title;
                return { ...act, status };
              }),
            };
          });

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: "ACTIVITY_COMPLETED" as const,
              title: `${targetActivityName} marked as ${status}`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Operations Desk",
              createdAt: now,
            },
          ];

          return {
            ...o,
            dailyPlans: updatedPlans,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const rescheduleActivity = React.useCallback(
    (
      tripId: string,
      dayNumber: number,
      activityId: string,
      newDate: string,
      newTime: string,
      reason: string
    ) => {
      const now = new Date().toISOString();

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;

          let movedActivity: DailyActivityOperation | undefined;
          const updatedPlans = o.dailyPlans.map((dp) => {
            if (dp.dayNumber !== dayNumber) return dp;
            return {
              ...dp,
              activities: dp.activities.map((act) => {
                if (act.id !== activityId) return act;
                movedActivity = act;
                return {
                  ...act,
                  status: "Rescheduled" as ActivityOperationStatus,
                  rescheduledDate: newDate,
                  rescheduleReason: reason,
                  time: newTime || act.time,
                };
              }),
            };
          });

          const newChange: TripChange = {
            id: `chg_${Date.now()}`,
            tripId,
            entityType: "Activity",
            entityId: activityId,
            oldValue: `${movedActivity?.date || ""} ${movedActivity?.time || ""}`,
            newValue: `${newDate} ${newTime}`,
            reason,
            changedBy: "Agent",
            changedAt: now,
          };

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: "ACTIVITY_RESCHEDULED" as const,
              title: `${movedActivity?.title || "Activity"} Rescheduled to ${newDate}`,
              description: `Reason: ${reason}`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Agent",
              createdAt: now,
            },
          ];

          return {
            ...o,
            dailyPlans: updatedPlans,
            changes: [...o.changes, newChange],
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const createIssue = React.useCallback(
    (issueData: Omit<TripIssue, "id" | "createdAt" | "timeline">) => {
      const now = new Date().toISOString();
      const issueId = `iss_${Date.now()}`;

      const newIssue: TripIssue = {
        ...issueData,
        id: issueId,
        createdAt: now,
        timeline: [
          {
            id: `it_${Date.now()}`,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text: "Issue logged in operations workspace",
            actor: issueData.assignedTo || "TripDesk Support",
          },
        ],
      };

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== issueData.tripId) return o;

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId: issueData.tripId,
              type: "ISSUE_CREATED" as const,
              title: `[${issueData.priority} Priority] Issue Created: ${issueData.title}`,
              description: issueData.description,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: "Support Desk",
              createdAt: now,
            },
          ];

          return {
            ...o,
            issues: [newIssue, ...o.issues],
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );

      return newIssue;
    },
    []
  );

  const updateIssue = React.useCallback(
    (issueId: string, updates: Partial<TripIssue>) => {
      const now = new Date().toISOString();
      setOperations((prev) =>
        prev.map((o) => {
          const matching = o.issues.find((i) => i.id === issueId);
          if (!matching) return o;

          const updatedIssues = o.issues.map((i) => {
            if (i.id !== issueId) return i;
            return {
              ...i,
              ...updates,
            };
          });

          return {
            ...o,
            issues: updatedIssues,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const resolveIssue = React.useCallback(
    (issueId: string, resolutionNote?: string) => {
      const now = new Date().toISOString();
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setOperations((prev) =>
        prev.map((o) => {
          const matching = o.issues.find((i) => i.id === issueId);
          if (!matching) return o;

          const updatedIssues = o.issues.map((i) => {
            if (i.id !== issueId) return i;
            return {
              ...i,
              status: "Resolved" as const,
              resolvedAt: now,
              notes: resolutionNote
                ? `${i.notes || ""}\n[Resolved]: ${resolutionNote}`
                : i.notes,
              timeline: [
                ...i.timeline,
                {
                  id: `it_${Date.now()}`,
                  time: timeStr,
                  text: resolutionNote || "Issue resolved and closed",
                  actor: "Support Desk",
                },
              ],
            };
          });

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId: o.tripId,
              type: "ISSUE_RESOLVED" as const,
              title: `Issue Resolved: ${matching.title}`,
              time: timeStr,
              actor: "Support Desk",
              createdAt: now,
            },
          ];

          return {
            ...o,
            issues: updatedIssues,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const addEmergencyContact = React.useCallback(
    (
      tripId: string,
      contactData: Omit<EmergencyContact, "id" | "tripId">
    ) => {
      const contact: EmergencyContact = {
        ...contactData,
        id: `ec_${Date.now()}`,
        tripId,
      };

      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;
          return {
            ...o,
            emergencyContacts: [...o.emergencyContacts, contact],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const toggleDriverVisibility = React.useCallback(
    (tripId: string, isVisible: boolean) => {
      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;
          return {
            ...o,
            isDriverVisibleToCustomer: isVisible,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const completeTrip = React.useCallback((tripId: string) => {
    const now = new Date().toISOString();
    setOperations((prev) =>
      prev.map((o) => {
        if (o.tripId !== tripId) return o;

        const newTimeline = [
          ...o.timeline,
          {
            id: `otl_${Date.now()}`,
            tripId,
            type: "TRIP_COMPLETED" as const,
            title: `Trip Successfully Completed 🎉`,
            description: `All scheduled services completed. Awaiting guest post-trip review.`,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            actor: "Operations Lead",
            createdAt: now,
          },
        ];

        return {
          ...o,
          operationsStatus: "Completed",
          completedAt: now,
          timeline: newTimeline,
          updatedAt: now,
        };
      })
    );
  }, []);

  const submitFeedback = React.useCallback(
    (
      tripId: string,
      rating: number,
      comment: string,
      recommend: boolean
    ) => {
      const now = new Date().toISOString();
      setOperations((prev) =>
        prev.map((o) => {
          if (o.tripId !== tripId) return o;

          const feedback: PostTripFeedback = {
            id: `fb_${Date.now()}`,
            tripId,
            customerId: o.customerSnapshot.id,
            customerName: o.customerSnapshot.name,
            rating,
            comment,
            recommend,
            createdAt: now,
          };

          const newTimeline = [
            ...o.timeline,
            {
              id: `otl_${Date.now()}`,
              tripId,
              type: "FEEDBACK_SUBMITTED" as const,
              title: `Customer Feedback Received (${rating} ★)`,
              description: `"${comment}"`,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              actor: o.customerSnapshot.name,
              createdAt: now,
            },
          ];

          return {
            ...o,
            feedback,
            timeline: newTimeline,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

  const value = React.useMemo(
    () => ({
      operations,
      drivers,
      getOperationByTripId,
      getOperationByBookingId,
      updateTripOperationsStatus,
      assignDriverAndVehicle,
      updateTransportStatus,
      updateActivityStatus,
      rescheduleActivity,
      createIssue,
      updateIssue,
      resolveIssue,
      addEmergencyContact,
      toggleDriverVisibility,
      completeTrip,
      submitFeedback,
    }),
    [
      operations,
      drivers,
      getOperationByTripId,
      getOperationByBookingId,
      updateTripOperationsStatus,
      assignDriverAndVehicle,
      updateTransportStatus,
      updateActivityStatus,
      rescheduleActivity,
      createIssue,
      updateIssue,
      resolveIssue,
      addEmergencyContact,
      toggleDriverVisibility,
      completeTrip,
      submitFeedback,
    ]
  );

  return (
    <OperationsContext.Provider value={value}>
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = React.useContext(OperationsContext);
  if (!context) {
    throw new Error(
      "useOperations must be used within an OperationsProvider"
    );
  }
  return context;
}
