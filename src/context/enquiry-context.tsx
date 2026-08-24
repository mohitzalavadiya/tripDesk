"use client"

import * as React from "react"
import {
  Customer,
  Enquiry,
  EnquiryStatus,
  FollowUp,
  TimelineActivity,
  Trip,
  TimelineActivityType,
  FollowUpStatus,
  TripStatus,
  ContactMethod,
  ItineraryDay,
  ItineraryPlace,
  CustomerNote,
  TripNote
} from "@/types"

interface EnquiryContextType {
  customers: Customer[]
  enquiries: Enquiry[]
  followups: FollowUp[]
  activities: TimelineActivity[]
  trips: Trip[]
  itineraryDays: ItineraryDay[]
  customerNotes: CustomerNote[]
  tripNotes: TripNote[]
  
  // Customer Actions
  addCustomer: (name: string, phone: string, email?: string, city?: string, preferredContactMethod?: ContactMethod) => Customer
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  addCustomerNote: (customerId: string, content: string) => CustomerNote
  updateCustomerNote: (noteId: string, content: string) => void
  deleteCustomerNote: (noteId: string) => void
  
  // Enquiry Actions
  addEnquiry: (enquiry: Omit<Enquiry, "id" | "createdAt" | "updatedAt">) => Enquiry
  updateEnquiryStatus: (id: string, status: EnquiryStatus) => void
  addNote: (enquiryId: string, content: string) => void
  scheduleFollowUp: (enquiryId: string, date: string, time: string, note: string) => void
  completeFollowUp: (followupId: string) => void
  convertToTrip: (enquiryId: string) => Trip
  
  // Trip Actions
  addTrip: (tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">) => Trip
  updateTrip: (id: string, updates: Partial<Trip>) => void
  updateTripStatus: (id: string, status: TripStatus) => void
  addTripNote: (tripId: string, content: string) => TripNote
  updateTripNote: (noteId: string, content: string) => void
  deleteTripNote: (noteId: string) => void
  
  // Itinerary Actions
  addItineraryDay: (tripId: string, day: Omit<ItineraryDay, "id" | "createdAt" | "updatedAt" | "places">) => ItineraryDay
  updateItineraryDay: (dayId: string, updates: Partial<ItineraryDay>) => void
  deleteItineraryDay: (dayId: string) => void
  reorderItineraryDays: (tripId: string, dayIdsOrdered: string[]) => void
  addItineraryPlace: (dayId: string, place: Omit<ItineraryPlace, "id">) => ItineraryPlace
  updateItineraryPlace: (dayId: string, placeId: string, updates: Partial<ItineraryPlace>) => void
  removeItineraryPlace: (dayId: string, placeId: string) => void
}

const EnquiryContext = React.createContext<EnquiryContextType | undefined>(undefined)

const getTodayString = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split("T")[0]
}

// Initial Mock Data (Extended for Phase 3)
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "CUS-001",
    name: "Rahul Patel",
    phone: "+91 98765 43210",
    email: "rahul.patel@example.com",
    city: "Mumbai",
    preferredContactMethod: "WhatsApp",
    preferredHotelCategory: "4 Star",
    preferredMealPlan: "MAP",
    preferredVehicle: "SUV",
    preferredDestination: "Kerala",
    preferences: "Prefers family-friendly hotels, high floor rooms, early check-in.",
    notes: "Frequent family traveler. Always travels with kids and parents.",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "CUS-002",
    name: "Priya Shah",
    phone: "+91 98234 56789",
    email: "priya.shah@example.com",
    city: "Pune",
    preferredContactMethod: "Email",
    preferredHotelCategory: "3 Star",
    preferredMealPlan: "CP",
    preferredVehicle: "Sedan",
    preferredDestination: "Goa",
    preferences: "Prefers beachfront resorts, veg meals only.",
    notes: "Prefers adventure trips. Travels solo or with a partner.",
    createdAt: "2026-08-10T11:00:00.000Z",
    updatedAt: "2026-08-10T11:00:00.000Z",
  },
  {
    id: "CUS-003",
    name: "Amit Shah",
    phone: "+91 97123 45678",
    email: "amit.shah@example.com",
    city: "Ahmedabad",
    preferredContactMethod: "Phone",
    preferredHotelCategory: "5 Star",
    preferredMealPlan: "MAP",
    preferredVehicle: "Private SUV",
    preferredDestination: "Dubai",
    preferences: "Prefers luxury resorts, private guides.",
    notes: "Looks for luxury packages. High budget customer.",
    createdAt: "2026-08-12T11:00:00.000Z",
    updatedAt: "2026-08-12T11:00:00.000Z",
  },
  {
    id: "CUS-004",
    name: "Meera Nair",
    phone: "+91 96012 34567",
    email: "meera.nair@example.com",
    city: "Bangalore",
    preferredContactMethod: "WhatsApp",
    preferredHotelCategory: "4 Star",
    preferredMealPlan: "MAP",
    preferredVehicle: "SUV",
    preferredDestination: "Himachal Pradesh",
    createdAt: "2026-08-15T11:00:00.000Z",
    updatedAt: "2026-08-15T11:00:00.000Z",
  },
  {
    id: "CUS-005",
    name: "Vikram Malhotra",
    phone: "+91 95987 65432",
    email: "vikram.m@example.com",
    city: "Delhi",
    preferredContactMethod: "Phone",
    preferredHotelCategory: "Luxury",
    preferredMealPlan: "MAP",
    preferredVehicle: "Sedan",
    preferredDestination: "Kashmir",
    createdAt: "2026-08-20T11:00:00.000Z",
    updatedAt: "2026-08-20T11:00:00.000Z",
  },
]

const INITIAL_ENQUIRIES: Enquiry[] = [
  {
    id: "ENQ-001",
    customerId: "CUS-001",
    destination: "Kerala",
    startDate: "2026-09-01",
    endDate: "2026-09-07",
    adults: 4,
    children: 2,
    infants: 0,
    budget: 120000,
    budgetType: "total",
    hotelCategory: "4 Star",
    mealPlan: "MAP",
    vehiclePreference: "SUV",
    source: "WhatsApp",
    status: "Confirmed",
    notes: "Requested Munnar & Alleppey houseboat stay",
    nextFollowUp: getTodayString(1),
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "ENQ-002",
    customerId: "CUS-002",
    destination: "Goa",
    startDate: "2026-09-12",
    endDate: "2026-09-15",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 72000,
    budgetType: "total",
    hotelCategory: "3 Star",
    mealPlan: "CP",
    vehiclePreference: "Sedan",
    source: "Instagram",
    status: "Confirmed",
    notes: "Honeymoon couple, beachside stay preferred",
    nextFollowUp: getTodayString(2),
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "ENQ-003",
    customerId: "CUS-003",
    destination: "Dubai",
    startDate: "2026-09-20",
    endDate: "2026-09-25",
    adults: 4,
    children: 0,
    infants: 0,
    budget: 150000,
    budgetType: "total",
    hotelCategory: "5 Star",
    mealPlan: "MAP",
    vehiclePreference: "SUV",
    source: "Website",
    status: "New",
    notes: "Expo City tours needed",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "ENQ-004",
    customerId: "CUS-004",
    destination: "Himachal Pradesh",
    startDate: "2026-10-05",
    endDate: "2026-10-12",
    adults: 3,
    children: 1,
    infants: 0,
    budget: 95000,
    budgetType: "total",
    hotelCategory: "4 Star",
    mealPlan: "MAP",
    vehiclePreference: "SUV",
    source: "WhatsApp",
    status: "Contacted",
    notes: "Shimla & Manali local sightseeing",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "ENQ-005",
    customerId: "CUS-005",
    destination: "Kashmir",
    startDate: "2026-10-18",
    endDate: "2026-10-23",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 110000,
    budgetType: "total",
    hotelCategory: "Luxury",
    mealPlan: "MAP",
    vehiclePreference: "Sedan",
    source: "Phone",
    status: "Confirmed",
    notes: "Srinagar & Gulmarg houseboat stay included",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
]

const INITIAL_FOLLOWUPS: FollowUp[] = [
  {
    id: "FOL-001",
    enquiryId: "ENQ-001",
    date: getTodayString(0),
    time: "11:30",
    note: "Follow up on Munnar hotel options",
    status: "Due Today",
    createdAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "FOL-002",
    enquiryId: "ENQ-002",
    date: getTodayString(1),
    time: "15:00",
    note: "Discuss Goa couple activity pricing",
    status: "Upcoming",
    createdAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "FOL-003",
    enquiryId: "ENQ-003",
    date: getTodayString(0),
    time: "16:00",
    note: "Send initial quote for Dubai",
    status: "Due Today",
    createdAt: "2026-08-21T11:00:00.000Z",
  },
]

const INITIAL_ACTIVITIES: TimelineActivity[] = [
  {
    id: "ACT-001",
    enquiryId: "ENQ-001",
    type: "ENQUIRY_CREATED",
    title: "Enquiry Created",
    description: "Rahul Patel requested a Kerala package (4 Adults + 2 Children).",
    createdAt: "2026-08-21T14:53:00.000Z",
  },
  {
    id: "ACT-002",
    enquiryId: "ENQ-001",
    type: "STATUS_CHANGED",
    title: "Status Changed",
    description: "New → Quoted. Proposal sent.",
    createdAt: "2026-08-21T15:53:00.000Z",
  },
  {
    id: "ACT-003",
    enquiryId: "ENQ-002",
    type: "ENQUIRY_CREATED",
    title: "Enquiry Created",
    description: "Priya Shah requested Goa package (2 Adults).",
    createdAt: "2026-08-21T11:53:00.000Z",
  },
  {
    id: "ACT-004",
    enquiryId: "ENQ-003",
    type: "ENQUIRY_CREATED",
    title: "Enquiry Created",
    description: "Amit Shah requested Dubai package (4 Adults).",
    createdAt: "2026-08-21T16:43:00.000Z",
  },
]

const INITIAL_TRIPS: Trip[] = [
  {
    id: "TRP-001",
    enquiryId: "ENQ-001",
    customerId: "CUS-001",
    name: "Kerala Family Holiday",
    destination: "Kerala",
    startDate: "2026-09-01",
    endDate: "2026-09-07",
    adults: 4,
    children: 2,
    infants: 0,
    budget: 120000,
    status: "Confirmed",
    notes: "Family trip. Needs early check-in and private SUV.",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "TRP-002",
    customerId: "CUS-001",
    name: "Goa Escape",
    destination: "Goa",
    startDate: "2026-12-15",
    endDate: "2026-12-18",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 85000,
    status: "Completed",
    notes: "Weekend tour. Beachside hotels only.",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "TRP-003",
    enquiryId: "ENQ-002",
    customerId: "CUS-002",
    name: "Goa Beach Getaway",
    destination: "Goa",
    startDate: "2026-09-12",
    endDate: "2026-09-15",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 72000,
    status: "Confirmed",
    notes: "Honeymoon couple trip. Special beachside setup requested.",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
  {
    id: "TRP-004",
    enquiryId: "ENQ-005",
    customerId: "CUS-005",
    name: "Kashmir Paradise Tour",
    destination: "Kashmir",
    startDate: "2026-10-18",
    endDate: "2026-10-23",
    adults: 2,
    children: 0,
    infants: 0,
    budget: 110000,
    status: "Confirmed",
    notes: "Houseboat stays and local vehicle arranged.",
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z",
  },
]

const INITIAL_ITINERARIES: ItineraryDay[] = [
  {
    id: "DAY-001",
    tripId: "TRP-001",
    dayNumber: 1,
    date: "2026-09-01",
    title: "Arrival in Kochi & Transfer to Munnar",
    description: "Arrive at Kochi Airport. Meet our representative and drive to Munnar. On the way, enjoy beautiful waterfalls and scenic spice plantations. Check into hotel and relax.",
    notes: "Transfer vehicle: private SUV. Drive takes approximately 4 hours.",
    places: [
      { id: "PLC-001", name: "Kochi Airport", visitTime: "10:00 AM", description: "Arrival point" },
      { id: "PLC-002", name: "Cheeyappara Waterfalls", visitTime: "01:30 PM", description: "Enroute scenic stop" },
      { id: "PLC-003", name: "Munnar Hotel", visitTime: "04:30 PM", description: "Check-in" }
    ],
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z"
  },
  {
    id: "DAY-002",
    tripId: "TRP-001",
    dayNumber: 2,
    date: "2026-09-02",
    title: "Munnar Sightseeing Tour",
    description: "Full day sightseeing in Munnar. Visit Mattupetty Dam, Echo Point, Tea Museum and Kundala Lake. Optional boating activities.",
    notes: "Leave hotel by 9:00 AM to beat the crowd.",
    places: [
      { id: "PLC-004", name: "Mattupetty Dam", visitTime: "09:30 AM", description: "Boating & photography" },
      { id: "PLC-005", name: "Echo Point", visitTime: "11:30 AM", description: "Natural acoustic phenomenon" },
      { id: "PLC-006", name: "Tata Tea Gardens", visitTime: "03:00 PM", description: "Tea estate walk" }
    ],
    createdAt: "2026-08-21T11:00:00.000Z",
    updatedAt: "2026-08-21T11:00:00.000Z"
  }
]

const INITIAL_CUSTOMER_NOTES: CustomerNote[] = [
  {
    id: "CN-001",
    customerId: "CUS-001",
    content: "Customer prefers early check-in. Always check if room is ready by 11 AM.",
    createdAt: "2026-08-21T11:00:00.000Z"
  },
  {
    id: "CN-002",
    customerId: "CUS-001",
    content: "Prefers private vehicle. Does not like shared coaches.",
    createdAt: "2026-08-21T12:00:00.000Z"
  }
]

const INITIAL_TRIP_NOTES: TripNote[] = [
  {
    id: "TN-001",
    tripId: "TRP-001",
    content: "Customer requested specific private SUV model. Innova Crysta is confirmed.",
    createdAt: "2026-08-21T11:00:00.000Z"
  }
]

export function EnquiryProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = React.useState<Customer[]>(INITIAL_CUSTOMERS)
  const [enquiries, setEnquiries] = React.useState<Enquiry[]>(INITIAL_ENQUIRIES)
  const [followups, setFollowups] = React.useState<FollowUp[]>(INITIAL_FOLLOWUPS)
  const [activities, setActivities] = React.useState<TimelineActivity[]>(INITIAL_ACTIVITIES)
  const [trips, setTrips] = React.useState<Trip[]>(INITIAL_TRIPS)
  const [itineraryDays, setItineraryDays] = React.useState<ItineraryDay[]>(INITIAL_ITINERARIES)
  const [customerNotes, setCustomerNotes] = React.useState<CustomerNote[]>(INITIAL_CUSTOMER_NOTES)
  const [tripNotes, setTripNotes] = React.useState<TripNote[]>(INITIAL_TRIP_NOTES)

  // Log Activity Helper
  const logActivity = (type: TimelineActivityType, title: string, description: string, opts?: { enquiryId?: string, tripId?: string }) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newActivity: TimelineActivity = {
      id: `ACT-${Date.now()}-${randomSuffix}`,
      enquiryId: opts?.enquiryId,
      tripId: opts?.tripId,
      type,
      title,
      description,
      createdAt: new Date().toISOString(),
    }
    setActivities((prev) => [newActivity, ...prev])
  }

  // --- Customer Actions ---
  const addCustomer = (name: string, phone: string, email?: string, city?: string, preferredContactMethod?: ContactMethod) => {
    const existing = customers.find((c) => c.phone.trim() === phone.trim())
    if (existing) return existing

    const newCustomer: Customer = {
      id: `CUS-0${customers.length + 10}`,
      name,
      phone,
      email: email || undefined,
      city: city || undefined,
      preferredContactMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setCustomers((prev) => [...prev, newCustomer])
    return newCustomer
  }

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        }
        return c
      })
    )
  }

  const addCustomerNote = (customerId: string, content: string) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newNote: CustomerNote = {
      id: `CN-${Date.now()}-${randomSuffix}`,
      customerId,
      content,
      createdAt: new Date().toISOString(),
    }
    setCustomerNotes((prev) => [newNote, ...prev])
    return newNote
  }

  const updateCustomerNote = (noteId: string, content: string) => {
    setCustomerNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content } : n))
    )
  }

  const deleteCustomerNote = (noteId: string) => {
    setCustomerNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  // --- Enquiry Actions ---
  const addEnquiry = (enquiryData: Omit<Enquiry, "id" | "createdAt" | "updatedAt">) => {
    const newId = `ENQ-00${enquiries.length + 1}`
    const newEnquiry: Enquiry = {
      ...enquiryData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEnquiries((prev) => [newEnquiry, ...prev])

    const customer = customers.find((c) => c.id === enquiryData.customerId)
    logActivity(
      "ENQUIRY_CREATED",
      "Enquiry Created",
      `${customer ? customer.name : "Customer"} requested package for ${enquiryData.destination}.`,
      { enquiryId: newId }
    )

    return newEnquiry
  }

  const updateEnquiryStatus = (id: string, status: EnquiryStatus) => {
    let oldStatus: EnquiryStatus = "New"
    setEnquiries((prev) =>
      prev.map((enq) => {
        if (enq.id === id) {
          oldStatus = enq.status
          return { ...enq, status, updatedAt: new Date().toISOString() }
        }
        return enq
      })
    )

    logActivity(
      "STATUS_CHANGED",
      "Status Changed",
      `Changed status from ${oldStatus} to ${status}.`,
      { enquiryId: id }
    )
  }

  const addNote = (enquiryId: string, content: string) => {
    setEnquiries((prev) =>
      prev.map((enq) => {
        if (enq.id === enquiryId) {
          return {
            ...enq,
            internalNotes: enq.internalNotes
              ? `${enq.internalNotes}\n\n${content}`
              : content,
            updatedAt: new Date().toISOString(),
          }
        }
        return enq
      })
    )

    logActivity("NOTE_ADDED", "Note Added", content, { enquiryId })
  }

  const scheduleFollowUp = (enquiryId: string, date: string, time: string, note: string) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newFollowUp: FollowUp = {
      id: `FOL-${Date.now()}-${randomSuffix}`,
      enquiryId,
      date,
      time,
      note,
      status: "Upcoming",
      createdAt: new Date().toISOString(),
    }
    setFollowups((prev) => [newFollowUp, ...prev])

    setEnquiries((prev) =>
      prev.map((enq) => {
        if (enq.id === enquiryId) {
          return { ...enq, nextFollowUp: date, updatedAt: new Date().toISOString() }
        }
        return enq
      })
    )

    logActivity(
      "FOLLOW_UP_SCHEDULED",
      "Follow-up Scheduled",
      `Scheduled call for ${date} at ${time}. Note: ${note}`,
      { enquiryId }
    )
  }

  const completeFollowUp = (followupId: string) => {
    let enqId = ""
    let noteText = ""
    setFollowups((prev) =>
      prev.map((f) => {
        if (f.id === followupId) {
          enqId = f.enquiryId
          noteText = f.note
          return { ...f, status: "Completed" as FollowUpStatus }
        }
        return f
      })
    )

    if (enqId) {
      logActivity(
        "FOLLOW_UP_COMPLETED",
        "Follow-up Completed",
        `Follow-up completed: "${noteText}"`,
        { enquiryId: enqId }
      )
    }
  }

  // Action: Convert to Trip with Duplicate Protection
  const convertToTrip = (enquiryId: string) => {
    const enq = enquiries.find((e) => e.id === enquiryId)
    if (!enq) throw new Error("Enquiry not found")

    // PREVENT DUPLICATE CONVERSION
    const existingTrip = trips.find((t) => t.enquiryId === enquiryId)
    if (existingTrip) {
      return existingTrip
    }

    const tripName = `${enq.destination} Holiday`
    const tripId = `TRP-00${trips.length + 1}`

    const newTrip: Trip = {
      id: tripId,
      enquiryId,
      customerId: enq.customerId,
      name: tripName,
      destination: enq.destination,
      startDate: enq.startDate,
      endDate: enq.endDate,
      adults: enq.adults,
      children: enq.children,
      infants: enq.infants,
      budget: enq.budget,
      status: "Planning",
      notes: enq.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTrips((prev) => [...prev, newTrip])
    
    // Update enquiry status to Confirmed
    updateEnquiryStatus(enquiryId, "Confirmed")

    // Log to original enquiry
    logActivity(
      "TRIP_CREATED",
      "Trip Created",
      `Converted enquiry to Trip ${tripId}: ${tripName}.`,
      { enquiryId, tripId }
    )

    // Log to trip timeline
    logActivity(
      "TRIP_CREATED",
      "Trip created from enquiry",
      `Trip created from enquiry ${enquiryId}.`,
      { tripId }
    )

    return newTrip
  }

  // --- Trip Actions ---
  const addTrip = (tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
    const tripId = `TRP-00${trips.length + 1}`
    const newTrip: Trip = {
      ...tripData,
      id: tripId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTrips((prev) => [...prev, newTrip])

    logActivity(
      "TRIP_CREATED",
      "Trip Created",
      `Trip ${tripId} created for destination ${tripData.destination}.`,
      { tripId }
    )
    return newTrip
  }

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
          return updated
        }
        return t
      })
    )

    logActivity(
      "TRIP_UPDATED",
      "Trip Updated",
      `Trip details updated.`,
      { tripId: id }
    )
  }

  const updateTripStatus = (id: string, status: TripStatus) => {
    let oldStatus: TripStatus = "Planning"
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          oldStatus = t.status
          return { ...t, status, updatedAt: new Date().toISOString() }
        }
        return t
      })
    )

    logActivity(
      "STATUS_CHANGED",
      "Trip Status Changed",
      `Trip status changed from ${oldStatus} to ${status}.`,
      { tripId: id }
    )
  }

  const addTripNote = (tripId: string, content: string) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newNote: TripNote = {
      id: `TN-${Date.now()}-${randomSuffix}`,
      tripId,
      content,
      createdAt: new Date().toISOString(),
    }
    setTripNotes((prev) => [newNote, ...prev])

    logActivity(
      "TRIP_NOTE_ADDED",
      "Internal Note Added",
      content,
      { tripId }
    )

    return newNote
  }

  const updateTripNote = (noteId: string, content: string) => {
    setTripNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content } : n))
    )
  }

  const deleteTripNote = (noteId: string) => {
    setTripNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  // --- Itinerary Actions ---
  const addItineraryDay = (tripId: string, day: Omit<ItineraryDay, "id" | "createdAt" | "updatedAt" | "places">) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newDay: ItineraryDay = {
      ...day,
      id: `DAY-${Date.now()}-${randomSuffix}`,
      places: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setItineraryDays((prev) => [...prev, newDay].sort((a, b) => a.dayNumber - b.dayNumber))

    logActivity(
      "TRIP_UPDATED",
      "Itinerary Day Added",
      `Day ${day.dayNumber}: ${day.title} added.`,
      { tripId }
    )
    return newDay
  }

  const updateItineraryDay = (dayId: string, updates: Partial<ItineraryDay>) => {
    let tId = ""
    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.id === dayId) {
          tId = d.tripId
          return {
            ...d,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
    )

    if (tId) {
      logActivity(
        "TRIP_UPDATED",
        "Itinerary Day Updated",
        `Itinerary Day details modified.`,
        { tripId: tId }
      )
    }
  }

  const deleteItineraryDay = (dayId: string) => {
    let tId = ""
    let deletedDayNumber = 0
    
    // We need to renumber subsequent days to avoid holes
    setItineraryDays((prev) => {
      const dayToDelete = prev.find((d) => d.id === dayId)
      if (!dayToDelete) return prev
      tId = dayToDelete.tripId
      deletedDayNumber = dayToDelete.dayNumber

      const remaining = prev.filter((d) => d.id !== dayId)
      
      // Renumber days belonging to the same trip
      return remaining.map((d) => {
        if (d.tripId === tId && d.dayNumber > deletedDayNumber) {
          return {
            ...d,
            dayNumber: d.dayNumber - 1,
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      }).sort((a, b) => a.dayNumber - b.dayNumber)
    })

    if (tId) {
      logActivity(
        "TRIP_UPDATED",
        "Itinerary Day Deleted",
        `Day ${deletedDayNumber} deleted. Subsequent days renumbered.`,
        { tripId: tId }
      )
    }
  }

  const reorderItineraryDays = (tripId: string, dayIdsOrdered: string[]) => {
    setItineraryDays((prev) => {
      return prev.map((d) => {
        if (d.tripId === tripId) {
          const newIndex = dayIdsOrdered.indexOf(d.id)
          if (newIndex !== -1) {
            return {
              ...d,
              dayNumber: newIndex + 1,
              updatedAt: new Date().toISOString(),
            }
          }
        }
        return d
      }).sort((a, b) => a.dayNumber - b.dayNumber)
    })

    logActivity(
      "TRIP_UPDATED",
      "Itinerary Reordered",
      `Day order updated.`,
      { tripId }
    )
  }

  const addItineraryPlace = (dayId: string, place: Omit<ItineraryPlace, "id">) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const newPlace: ItineraryPlace = {
      ...place,
      id: `PLC-${Date.now()}-${randomSuffix}`,
    }

    let tId = ""
    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.id === dayId) {
          tId = d.tripId
          return {
            ...d,
            places: [...d.places, newPlace],
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
    )

    if (tId) {
      logActivity(
        "TRIP_UPDATED",
        "Itinerary Place Added",
        `Place "${place.name}" added to itinerary.`,
        { tripId: tId }
      )
    }

    return newPlace
  }

  const updateItineraryPlace = (dayId: string, placeId: string, updates: Partial<ItineraryPlace>) => {
    let tId = ""
    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.id === dayId) {
          tId = d.tripId
          return {
            ...d,
            places: d.places.map((p) => (p.id === placeId ? { ...p, ...updates } : p)),
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
    )

    if (tId) {
      logActivity(
        "TRIP_UPDATED",
        "Itinerary Place Updated",
        `Place details modified.`,
        { tripId: tId }
      )
    }
  }

  const removeItineraryPlace = (dayId: string, placeId: string) => {
    let tId = ""
    setItineraryDays((prev) =>
      prev.map((d) => {
        if (d.id === dayId) {
          tId = d.tripId
          return {
            ...d,
            places: d.places.filter((p) => p.id !== placeId),
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
    )

    if (tId) {
      logActivity(
        "TRIP_UPDATED",
        "Itinerary Place Removed",
        `Place removed from itinerary day.`,
        { tripId: tId }
      )
    }
  }

  return (
    <EnquiryContext.Provider
      value={{
        customers,
        enquiries,
        followups,
        activities,
        trips,
        itineraryDays,
        customerNotes,
        tripNotes,
        addCustomer,
        updateCustomer,
        addCustomerNote,
        updateCustomerNote,
        deleteCustomerNote,
        addEnquiry,
        updateEnquiryStatus,
        addNote,
        scheduleFollowUp,
        completeFollowUp,
        convertToTrip,
        addTrip,
        updateTrip,
        updateTripStatus,
        addTripNote,
        updateTripNote,
        deleteTripNote,
        addItineraryDay,
        updateItineraryDay,
        deleteItineraryDay,
        reorderItineraryDays,
        addItineraryPlace,
        updateItineraryPlace,
        removeItineraryPlace,
      }}
    >
      {children}
    </EnquiryContext.Provider>
  )
}

export function useEnquiry() {
  const context = React.useContext(EnquiryContext)
  if (context === undefined) {
    throw new Error("useEnquiry must be used within an EnquiryProvider")
  }
  return context
}
