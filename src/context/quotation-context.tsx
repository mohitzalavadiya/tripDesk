"use client"

import * as React from "react"
import {
  Quotation,
  QuotationStatus,
  PublicQuotation,
  AgencyBranding,
  Trip,
  Customer,
  ItineraryDay,
  TripHotel,
  TripVehicle,
  TripActivity,
  TripCosting,
  Hotel,
  HotelRoom,
  Vehicle,
  Activity,
} from "@/types"
import {
  DEFAULT_AGENCY_BRANDING,
  DEFAULT_QUOTATION_SECTIONS,
  DEFAULT_INCLUSIONS,
  DEFAULT_EXCLUSIONS,
  createQuotationSnapshot,
  sanitizeToPublicQuotation,
  generateQuotationNumber,
  generateShareToken,
  isQuotationExpired,
} from "@/lib/quotation/quotation-service"
import { toast } from "sonner"

// ═════════════════════════════════════════════════════════════════════
// INITIAL DEMO QUOTATION (Kerala Family Holiday)
// ═════════════════════════════════════════════════════════════════════

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: "QT-001",
    version: 1,
    tripId: "TRIP-001",
    customerId: "CUST-001",
    quotationNumber: "QT-2026-0001",
    status: "Sent",
    title: "Kerala Family Holiday",
    subtitle: "7 Days / 6 Nights • Kochi • Munnar • Thekkady • Alleppey",
    validUntil: "2026-08-29",
    currency: "INR",
    sellingPrice: 85000,
    templateId: "modern-premium",
    shareToken: "kerala-holiday-2026",
    sections: DEFAULT_QUOTATION_SECTIONS,

    customerSnapshot: {
      id: "CUST-001",
      name: "Rahul Patel",
      email: "rahul.patel@example.com",
      phone: "+91 98765 43210",
      city: "Ahmedabad",
      travellersLabel: "4 Adults (Family Group)",
    },

    tripSnapshot: {
      id: "TRIP-001",
      title: "Kerala Family Holiday",
      destination: "Kerala",
      startDate: "2026-10-15",
      endDate: "2026-10-21",
      durationLabel: "7 Days / 6 Nights",
      nights: 6,
      days: 7,
      adults: 4,
      children: 0,
      infants: 0,
      vehiclePreference: "Force Urbania (17-Seater Luxury Fleet)",
      hotelCategory: "4 Star Premium Resorts",
    },

    itinerarySnapshot: [
      {
        dayNumber: 1,
        date: "2026-10-15",
        title: "Arrival in Cochin & Scenic Munnar Hills Transfer",
        description: "Warm welcome at Cochin International Airport. Board your private luxury Force Urbania vehicle and embark on a scenic 4-hour uphill drive to Munnar. Enroute enjoy breathtaking stopovers at Cheeyappara and Valara waterfalls.",
        places: [
          { name: "Cochin Airport Pickup", visitTime: "09:30 AM", notes: "Meet & greet chauffeur" },
          { name: "Cheeyappara Waterfalls", visitTime: "01:00 PM", notes: "Scenic photo stop" },
          { name: "Munnar Valley Resort Check-in", visitTime: "04:30 PM", notes: "Welcome drink on arrival" },
        ],
        overnightLocation: "Munnar",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 2,
        date: "2026-10-16",
        title: "Munnar Tea Estates & High-Altitude Sightseeing",
        description: "Full day dedicated to exploring the emerald beauty of Munnar. Visit Mattupetty Dam for serene waters, Echo Point, Kundala Lake, and the KDHP Tea Museum to discover the legacy of colonial tea estates.",
        places: [
          { name: "Mattupetty Dam", visitTime: "10:00 AM", notes: "Speedboat ride available" },
          { name: "Echo Point & Kundala Lake", visitTime: "12:30 PM", notes: "Nature photography" },
          { name: "Tea Museum & Spice Market", visitTime: "03:30 PM", notes: "Tea tasting session" },
        ],
        overnightLocation: "Munnar",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 3,
        date: "2026-10-17",
        title: "Munnar to Thekkady · Cardamom Hills & Periyar Sanctuary",
        description: "Check out after breakfast and drive through winding cardamom plantations to Thekkady (Periyar). In the afternoon, enjoy a guided boat safari on Lake Periyar to spot wild elephants and exotic bird species.",
        places: [
          { name: "Spice Plantation Walk", visitTime: "02:00 PM", notes: "Guided botanical trail" },
          { name: "Periyar Lake Boat Cruise", visitTime: "04:00 PM", notes: "Wildlife spotting" },
        ],
        overnightLocation: "Thekkady",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 4,
        date: "2026-10-18",
        title: "Thekkady to Alleppey · Backwater Cruise & Mangrove Kayaking",
        description: "Descend to the Venice of the East — Alleppey. Check into your backwater resort and venture out on an exclusive mangrove kayaking expedition gliding through narrow village canals.",
        places: [
          { name: "Mangrove Kayaking Expedition", visitTime: "03:00 PM", notes: "Certified guide with safety jackets" },
          { name: "Sunset Backwater Walk", visitTime: "06:00 PM", notes: "Traditional Kerala sunset" },
        ],
        overnightLocation: "Alleppey",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 5,
        date: "2026-10-19",
        title: "Alleppey to Varkala · Clifftop Ocean Panorama",
        description: "After breakfast, journey south along the coastal belt to the majestic red laterite cliffs of Varkala Beach. Spend the evening enjoying coastal breeze and cliffside cafes overlooking the Arabian Sea.",
        places: [
          { name: "Varkala North Cliff", visitTime: "04:30 PM", notes: "Panoramic sunset view" },
          { name: "Papanasam Beach", visitTime: "06:00 PM", notes: "Holy spring waters" },
        ],
        overnightLocation: "Varkala",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 6,
        date: "2026-10-20",
        title: "Varkala Coastal Leisure & Jatayu Earth's Center",
        description: "Morning beach leisure followed by a trip to the world's largest bird sculpture at Jatayu Earth's Center with cable car ride. Evening free for local handicraft shopping and Ayurvedic massage.",
        places: [
          { name: "Jatayu Earth's Center", visitTime: "11:00 AM", notes: "Cable car ticket included" },
          { name: "Varkala Cliff Promenade", visitTime: "05:30 PM", notes: "Leisure shopping" },
        ],
        overnightLocation: "Varkala",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
      {
        dayNumber: 7,
        date: "2026-10-21",
        title: "Trivandrum Sightseeing & Airport Drop with Sweet Memories",
        description: "Enjoy a leisurely breakfast. Drive to Trivandrum, visit the historic Padmanabhaswamy Temple (exterior/dress code permitted areas) and transfer to Trivandrum / Cochin Airport for return journey home.",
        places: [
          { name: "Padmanabhaswamy Temple", visitTime: "10:30 AM", notes: "Historic temple darshan" },
          { name: "Airport Departure Drop", visitTime: "02:00 PM", notes: "Chauffeur drop with luggage assistance" },
        ],
        overnightLocation: "Departure",
        mealsIncluded: "Breakfast Included (CPAI)",
      },
    ],

    hotelSnapshot: [
      {
        id: "HS-001",
        hotelId: "HOTEL-002",
        hotelName: "Munnar Valley Retreat",
        destination: "Munnar",
        starCategory: 4,
        roomName: "Premium Mountain View Room",
        mealPlan: "CPAI (Breakfast Included)",
        nights: 2,
        checkIn: "2026-10-15",
        checkOut: "2026-10-17",
        roomsCount: 2,
        description: "Nestled amidst misty green tea slopes with private balconies, heated water, and multi-cuisine dining.",
      },
      {
        id: "HS-002",
        hotelId: "HOTEL-001",
        hotelName: "Grand Palace & Spa",
        destination: "Thekkady",
        starCategory: 4,
        roomName: "Jungle Villa Room",
        mealPlan: "CPAI (Breakfast Included)",
        nights: 1,
        checkIn: "2026-10-17",
        checkOut: "2026-10-18",
        roomsCount: 2,
        description: "Surrounded by spice gardens, close to Periyar Wildlife Sanctuary entry with an outdoor swimming pool.",
      },
      {
        id: "HS-003",
        hotelId: "HOTEL-003",
        hotelName: "Sea Breeze Resort",
        destination: "Varkala",
        starCategory: 4,
        roomName: "Ocean Facing Deluxe Room",
        mealPlan: "CPAI (Breakfast Included)",
        nights: 2,
        checkIn: "2026-10-19",
        checkOut: "2026-10-21",
        roomsCount: 2,
        description: "Perched right along the scenic North Cliff with direct private access to beach and coastal lounge.",
      },
    ],

    vehicleSnapshot: {
      id: "VS-001",
      vehicleId: "VEH-001",
      vehicleName: "Force Urbania (17-Seater Luxury Fleet)",
      vehicleType: "Tempo Traveller / Executive Minibus",
      seatingCapacity: 17,
      ac: true,
      durationDays: 7,
      pickupLocation: "Cochin International Airport (COK)",
      dropLocation: "Trivandrum Airport (TRV) / Cochin",
      notes: "Dedicated 24/7 private luxury transportation with recliner bucket seats, USB charging points, and luggage bay.",
    },

    activitySnapshot: [
      {
        id: "AS-001",
        activityId: "ACT-002",
        activityName: "Mangrove Kayaking & Backwater Canoe Tour",
        destination: "Alleppey",
        category: "Water Activity",
        date: "2026-10-18",
        adults: 4,
        children: 0,
        duration: "3.5 Hours",
        description: "Guided excursion through narrow village backwaters with safety jackets and certified rescue paddler.",
      },
      {
        id: "AS-002",
        activityId: "ACT-001",
        activityName: "Munnar Tea Plantation & Factory Walk",
        destination: "Munnar",
        category: "Cultural",
        date: "2026-10-16",
        adults: 4,
        children: 0,
        duration: "2 Hours",
        description: "Private guided tea tasting and heritage factory tour explaining orthodox leaf harvesting.",
      },
    ],

    pricingSnapshot: {
      sellingPrice: 85000,
      currency: "INR",
      perPersonPrice: 21250,
      validUntil: "2026-08-29",
      priceNote: "All-inclusive comprehensive package for 4 Adults (₹21,250 / Person)",
      totalTravellers: 4,
    },

    agencySnapshot: DEFAULT_AGENCY_BRANDING,

    inclusions: DEFAULT_INCLUSIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    paymentTerms: DEFAULT_AGENCY_BRANDING.defaultPaymentTerms!,
    cancellationPolicy: DEFAULT_AGENCY_BRANDING.defaultCancellationPolicy!,
    termsAndConditions: DEFAULT_AGENCY_BRANDING.defaultTerms!,
    customNotes: "We have carefully designed this holiday to balance relaxing stays, scenic hill drives, and authentic backwater adventures. Please let us know if you would like any adjustments to the schedule.",

    createdAt: "2026-08-22T06:00:00.000Z",
    updatedAt: "2026-08-22T06:00:00.000Z",
    sentAt: "2026-08-22T06:30:00.000Z",
  },
]

// ═════════════════════════════════════════════════════════════════════
// CONTEXT INTERFACE
// ═════════════════════════════════════════════════════════════════════

interface QuotationContextType {
  quotations: Quotation[]
  agencyProfile: AgencyBranding

  // Queries
  getQuotationById: (id: string) => Quotation | undefined
  getQuotationsForTrip: (tripId: string) => Quotation[]
  getPublicQuotation: (shareToken: string) => PublicQuotation | null

  // CRUD Actions
  createQuotationFromTrip: (
    trip: Trip,
    customer: Customer,
    itinerary: ItineraryDay[],
    tripHotels: TripHotel[],
    tripVehicles: TripVehicle[],
    tripActivities: TripActivity[],
    costing: TripCosting | undefined,
    inventoryMaster: {
      hotels: Hotel[]
      hotelRooms: HotelRoom[]
      vehicles: Vehicle[]
      activities: Activity[]
    }
  ) => Quotation

  updateQuotation: (id: string, updates: Partial<Quotation>) => void
  deleteQuotation: (id: string) => boolean
  createQuotationVersion: (
    quotationId: string,
    currentTrip?: Trip,
    currentCustomer?: Customer,
    currentItinerary?: ItineraryDay[],
    currentHotels?: TripHotel[],
    currentVehicles?: TripVehicle[],
    currentActivities?: TripActivity[],
    currentCosting?: TripCosting,
    inventoryMaster?: {
      hotels: Hotel[]
      hotelRooms: HotelRoom[]
      vehicles: Vehicle[]
      activities: Activity[]
    }
  ) => Quotation

  // Status Transitions
  markQuotationReady: (id: string) => void
  markQuotationSent: (id: string) => void
  markQuotationViewed: (shareToken: string) => void
  updateAgencyBranding: (branding: Partial<AgencyBranding>) => void
}

const QuotationContext = React.createContext<QuotationContextType | undefined>(undefined)

const QUOTATIONS_STORAGE_KEY = "tripdesk_quotations_v1"
const AGENCY_STORAGE_KEY = "tripdesk_agency_profile_v1"

export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const [quotations, setQuotations] = React.useState<Quotation[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(QUOTATIONS_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load quotations from localStorage", e)
      }
    }
    return INITIAL_QUOTATIONS
  })

  const [agencyProfile, setAgencyProfile] = React.useState<AgencyBranding>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(AGENCY_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load agency profile from localStorage", e)
      }
    }
    return DEFAULT_AGENCY_BRANDING
  })

  // ─── Persistence ──────────────────────────────────────────────────────
  React.useEffect(() => {
    try {
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(quotations))
    } catch (e) {
      console.error(e)
    }
  }, [quotations])

  React.useEffect(() => {
    try {
      localStorage.setItem(AGENCY_STORAGE_KEY, JSON.stringify(agencyProfile))
    } catch (e) {
      console.error(e)
    }
  }, [agencyProfile])

  // ─── Query Helpers ────────────────────────────────────────────────────
  const getQuotationById = React.useCallback(
    (id: string) => quotations.find((q) => q.id === id),
    [quotations]
  )

  const getQuotationsForTrip = React.useCallback(
    (tripId: string) => quotations.filter((q) => q.tripId === tripId),
    [quotations]
  )

  const getPublicQuotation = React.useCallback(
    (shareToken: string): PublicQuotation | null => {
      const q = quotations.find((item) => item.shareToken === shareToken)
      if (!q) return null
      return sanitizeToPublicQuotation(q)
    },
    [quotations]
  )

  // ─── Create Quotation from Trip ───────────────────────────────────────
  const createQuotationFromTrip = React.useCallback(
    (
      trip: Trip,
      customer: Customer,
      itinerary: ItineraryDay[],
      tripHotels: TripHotel[],
      tripVehicles: TripVehicle[],
      tripActivities: TripActivity[],
      costing: TripCosting | undefined,
      inventoryMaster: {
        hotels: Hotel[]
        hotelRooms: HotelRoom[]
        vehicles: Vehicle[]
        activities: Activity[]
      }
    ) => {
      const existingTripQuotations = quotations.filter((q) => q.tripId === trip.id)
      const nextIndex = quotations.length + 1

      const newQuotation = createQuotationSnapshot(
        trip,
        customer,
        itinerary,
        tripHotels,
        tripVehicles,
        tripActivities,
        costing,
        inventoryMaster,
        agencyProfile,
        nextIndex,
        1
      )

      setQuotations((prev) => [newQuotation, ...prev])
      toast.success(`Quotation ${newQuotation.quotationNumber} created successfully.`)
      return newQuotation
    },
    [agencyProfile, quotations]
  )

  // ─── Update Quotation ─────────────────────────────────────────────────
  const updateQuotation = React.useCallback((id: string, updates: Partial<Quotation>) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        return {
          ...q,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      })
    )
    toast.success("Quotation updated.")
  }, [])

  // ─── Delete Quotation (Drafts Only) ───────────────────────────────────
  const deleteQuotation = React.useCallback((id: string) => {
    const target = quotations.find((q) => q.id === id)
    if (!target) return false

    if (target.status !== "Draft") {
      toast.error("Only Draft quotations can be deleted. Sent or viewed quotations are archived.")
      return false
    }

    setQuotations((prev) => prev.filter((q) => q.id !== id))
    toast.success(`Draft quotation ${target.quotationNumber} deleted.`)
    return true
  }, [quotations])

  // ─── Create New Version ───────────────────────────────────────────────
  const createQuotationVersion = React.useCallback(
    (
      quotationId: string,
      currentTrip?: Trip,
      currentCustomer?: Customer,
      currentItinerary: ItineraryDay[] = [],
      currentHotels: TripHotel[] = [],
      currentVehicles: TripVehicle[] = [],
      currentActivities: TripActivity[] = [],
      currentCosting?: TripCosting,
      inventoryMaster?: {
        hotels: Hotel[]
        hotelRooms: HotelRoom[]
        vehicles: Vehicle[]
        activities: Activity[]
      }
    ) => {
      const base = quotations.find((q) => q.id === quotationId)
      if (!base) {
        throw new Error("Base quotation not found")
      }

      const nextVersion = (base.version || 1) + 1
      const baseCleanNumber = base.quotationNumber.split("-V")[0]
      const newQuotationNumber = `${baseCleanNumber}-V${nextVersion}`
      const newShareToken = generateShareToken()

      let newQuotation: Quotation

      // If fresh trip models were supplied, compile fresh snapshots, otherwise copy previous
      if (
        currentTrip &&
        currentCustomer &&
        inventoryMaster &&
        currentCosting
      ) {
        newQuotation = createQuotationSnapshot(
          currentTrip,
          currentCustomer,
          currentItinerary,
          currentHotels,
          currentVehicles,
          currentActivities,
          currentCosting,
          inventoryMaster,
          agencyProfile,
          1,
          nextVersion,
          base.id
        )
        newQuotation.quotationNumber = newQuotationNumber
      } else {
        newQuotation = {
          ...base,
          id: `QT-${Date.now()}-${newShareToken.substring(0, 4)}`,
          version: nextVersion,
          parentQuotationId: base.id,
          quotationNumber: newQuotationNumber,
          status: "Draft",
          shareToken: newShareToken,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sentAt: undefined,
          viewedAt: undefined,
          expiredAt: undefined,
        }
      }

      setQuotations((prev) => [newQuotation, ...prev])
      toast.success(`New quotation version ${newQuotation.quotationNumber} created.`)
      return newQuotation
    },
    [agencyProfile, quotations]
  )

  // ─── Status Lifecycle Methods ─────────────────────────────────────────
  const markQuotationReady = React.useCallback((id: string) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "Ready", updatedAt: new Date().toISOString() } : q))
    )
    toast.success("Quotation marked as Ready.")
  }, [])

  const markQuotationSent = React.useCallback((id: string) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: "Sent",
              sentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : q
      )
    )
    toast.success("Quotation marked as Sent.")
  }, [])

  const markQuotationViewed = React.useCallback((shareToken: string) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.shareToken !== shareToken) return q
        // If status is Sent, update to Viewed
        if (q.status === "Sent" || q.status === "Ready" || q.status === "Draft") {
          return {
            ...q,
            status: "Viewed",
            viewedAt: q.viewedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
        return q
      })
    )
  }, [])

  const updateAgencyBranding = React.useCallback((brandingUpdates: Partial<AgencyBranding>) => {
    setAgencyProfile((prev) => ({ ...prev, ...brandingUpdates }))
    toast.success("Agency branding updated.")
  }, [])

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        agencyProfile,
        getQuotationById,
        getQuotationsForTrip,
        getPublicQuotation,
        createQuotationFromTrip,
        updateQuotation,
        deleteQuotation,
        createQuotationVersion,
        markQuotationReady,
        markQuotationSent,
        markQuotationViewed,
        updateAgencyBranding,
      }}
    >
      {children}
    </QuotationContext.Provider>
  )
}

export function useQuotation() {
  const context = React.useContext(QuotationContext)
  if (!context) {
    throw new Error("useQuotation must be used within a QuotationProvider")
  }
  return context
}
