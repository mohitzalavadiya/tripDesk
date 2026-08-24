import {
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
  Quotation,
  QuotationSection,
  PublicQuotation,
  CustomerSnapshot,
  TripSnapshot,
  ItineraryDaySnapshot,
  HotelSnapshot,
  VehicleSnapshot,
  ActivitySnapshot,
  PricingSnapshot,
  AgencyBranding,
} from "@/types"

// ─── Default Agency Profile ───────────────────────────────────────────
export const DEFAULT_AGENCY_BRANDING: AgencyBranding = {
  name: "TripDesk Holidays & Experiences",
  tagline: "Tailored Journeys, Unforgettable Memories",
  email: "holidays@tripdesk.in",
  phone: "+91 98470 12345 / +91 94471 23456",
  website: "https://tripdesk.in",
  address: "Marine Drive, Kochi, Kerala 682031, India",
  logoUrl: "/logo.svg",
  licenseNumber: "DOT/KER/TOUR/2026/8942",
  defaultPaymentTerms:
    "• 25% Advance payment at the time of quotation confirmation to block hotels & fleet.\n• 50% Second installment 15 days prior to arrival date.\n• Balance 25% on arrival during hotel check-in / transfer pickup.",
  defaultCancellationPolicy:
    "• 30+ Days prior to arrival: Full refund less ₹2,500 administrative file fee.\n• 15 to 29 Days prior: 25% package retention fee.\n• 07 to 14 Days prior: 50% package retention fee.\n• Less than 7 Days or No Show: 100% non-refundable as per hotel & fleet booking commitments.",
  defaultTerms:
    "1. Package price is calculated on twin/double sharing accommodation as mentioned.\n2. Standard check-in time is 14:00 hrs and check-out is 11:00 hrs unless early check-in is confirmed.\n3. AC will not be operational in hilly/ghat terrains in Munnar as per regional safety guidelines.\n4. Sightseeing spots are subject to regional weather conditions, state forest department permits, and weekly closures.\n5. Any personal expenses like laundry, telephone calls, room service, alcoholic beverages, and camera tickets are payable directly.",
}

// ─── Default Section Configuration ────────────────────────────────────
export const DEFAULT_QUOTATION_SECTIONS: QuotationSection[] = [
  { id: "sec-cover", type: "cover", title: "Cover Page", visible: true, order: 1 },
  { id: "sec-summary", type: "summary", title: "Trip Highlights", visible: true, order: 2 },
  { id: "sec-itinerary", type: "itinerary", title: "Day-by-Day Itinerary", visible: true, order: 3 },
  { id: "sec-hotels", type: "hotels", title: "Accommodations & Stays", visible: true, order: 4 },
  { id: "sec-vehicle", type: "vehicle", title: "Private Transportation", visible: true, order: 5 },
  { id: "sec-activities", type: "activities", title: "Included Experiences", visible: true, order: 6 },
  { id: "sec-inclusions", type: "inclusions", title: "Inclusions", visible: true, order: 7 },
  { id: "sec-exclusions", type: "exclusions", title: "Exclusions", visible: true, order: 8 },
  { id: "sec-pricing", type: "pricing", title: "Investment & Pricing", visible: true, order: 9 },
  { id: "sec-paymentTerms", type: "paymentTerms", title: "Payment Terms", visible: true, order: 10 },
  { id: "sec-cancellationPolicy", type: "cancellationPolicy", title: "Cancellation Policy", visible: true, order: 11 },
  { id: "sec-terms", type: "terms", title: "Terms & Conditions", visible: true, order: 12 },
  { id: "sec-contact", type: "contact", title: "Agency Contact", visible: true, order: 13 },
]

// ─── Default Inclusions & Exclusions ──────────────────────────────────
export const DEFAULT_INCLUSIONS = [
  "Accommodation in premium sanitized rooms as specified in the proposal",
  "Daily breakfast buffet (CPAI / MAPAI meal plan as mentioned per hotel)",
  "Exclusive air-conditioned private vehicle (chauffeur driven) for all transfers and sightseeing",
  "Experienced professional English / Hindi speaking destination driver",
  "Driver daily allowances (Bata), night halt charges, fuel, and inter-district toll taxes",
  "All state vehicle entry permits and scheduled parking charges",
  "Pre-booked guided sightseeing tours & adventure activities as specified",
  "24/7 dedicated on-tour trip concierge & local emergency support assistance",
  "Applicable Goods & Services Tax (GST)",
]

export const DEFAULT_EXCLUSIONS = [
  "Airfare / Train tickets to and from departure city",
  "Meals other than those specified in the itinerary (Luncheons & Dinners unless noted)",
  "Monument, botanical garden, and national park entry tickets (unless listed under experiences)",
  "Optional adventure sports (parasailing, scuba diving, speed boat charges)",
  "Personal expenses like laundry, telephone calls, mini-bar, and tips / porterage",
  "Travel insurance and medical emergency coverage",
  "Early check-in or late check-out charges at hotels subject to availability",
  "Anything not explicitly mentioned in the 'Inclusions' section above",
]

// ─── Numbering & Token Generators ─────────────────────────────────────
export function generateQuotationNumber(sequentialIndex = 1, version = 1): string {
  const year = new Date().getFullYear()
  const paddedNumber = String(sequentialIndex).padStart(4, "0")
  if (version > 1) {
    return `QT-${year}-${paddedNumber}-V${version}`
  }
  return `QT-${year}-${paddedNumber}`
}

export function generateShareToken(): string {
  // Generate URL-safe random string
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let token = ""
  for (let i = 0; i < 10; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function isQuotationExpired(validUntil: string): boolean {
  if (!validUntil) return false
  const targetDate = new Date(validUntil)
  if (isNaN(targetDate.getTime())) return false

  // Set to end of the day in local time
  targetDate.setHours(23, 59, 59, 999)
  return new Date().getTime() > targetDate.getTime()
}

// ─── Format Duration Helper ───────────────────────────────────────────
export function calculateDuration(startDate: string, endDate: string) {
  if (!startDate || !endDate) return { nights: 0, days: 0, label: "0 Days" }
  const s = new Date(startDate)
  const e = new Date(endDate)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { nights: 0, days: 0, label: "0 Days" }
  const nights = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
  const days = nights + 1
  return {
    nights,
    days,
    label: `${days} Days / ${nights} Nights`,
  }
}

// ─── Create Quotation Snapshot From Live Models ───────────────────────
export function createQuotationSnapshot(
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
  },
  agency: AgencyBranding = DEFAULT_AGENCY_BRANDING,
  existingIndex = 1,
  version = 1,
  parentQuotationId?: string
): Quotation {
  const duration = calculateDuration(trip.startDate, trip.endDate)
  const totalTravellers = Math.max(1, trip.adults + trip.children)

  // 1. Customer Snapshot
  const customerSnapshot: CustomerSnapshot = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    travellersLabel: `${trip.adults} Adults${trip.children > 0 ? `, ${trip.children} Kids` : ""}${trip.infants > 0 ? `, ${trip.infants} Inf` : ""}`,
  }

  // 2. Trip Snapshot
  const tripSnapshot: TripSnapshot = {
    id: trip.id,
    title: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    durationLabel: duration.label,
    nights: duration.nights,
    days: duration.days,
    adults: trip.adults,
    children: trip.children,
    infants: trip.infants || 0,
    vehiclePreference: tripVehicles[0]?.rateSnapshot?.vehicleType || "Private Vehicle",
    hotelCategory: tripHotels[0]?.rateSnapshot?.name || "Premium Hotels",
  }

  // 3. Itinerary Snapshot
  const sortedDays = [...itinerary].sort((a, b) => a.dayNumber - b.dayNumber)
  const itinerarySnapshot: ItineraryDaySnapshot[] = sortedDays.map((d) => ({
    dayNumber: d.dayNumber,
    date: d.date,
    title: d.title,
    description: d.description || `Explore scenic highlights and attractions around ${trip.destination}.`,
    places: (d.places || []).map((p) => ({
      name: p.name,
      visitTime: p.visitTime,
      notes: p.notes,
    })),
    overnightLocation: trip.destination.split(",")[0]?.trim() || "Destination Stay",
    mealsIncluded: "Breakfast Included (CPAI)",
  }))

  // 4. Hotel Snapshot (Customer-Safe: NO supplier rates, NO cost breakdown)
  const hotelSnapshot: HotelSnapshot[] = tripHotels.map((th) => {
    const hotel = inventoryMaster.hotels.find((h) => h.id === th.hotelId)
    const room = inventoryMaster.hotelRooms.find((r) => r.id === th.roomId)
    const snapshot = th.rateSnapshot

    const nights = th.checkIn && th.checkOut
      ? Math.max(1, Math.ceil((new Date(th.checkOut).getTime() - new Date(th.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : duration.nights

    return {
      id: th.id,
      hotelId: th.hotelId,
      hotelName: snapshot?.name || hotel?.name || "Selected Premium Hotel",
      destination: hotel?.destination || trip.destination,
      starCategory: hotel?.starCategory || 4,
      roomName: snapshot?.roomName || room?.name || "Standard Executive Room",
      mealPlan: snapshot?.mealPlan || "CPAI (Breakfast Included)",
      nights,
      checkIn: th.checkIn || trip.startDate,
      checkOut: th.checkOut || trip.endDate,
      roomsCount: th.rooms || 1,
      description: hotel?.description || "Comfortable and hospitable stay situated in prime destination hub.",
    }
  })

  // 5. Vehicle Snapshot
  let vehicleSnapshot: VehicleSnapshot | undefined = undefined
  if (tripVehicles.length > 0) {
    const tv = tripVehicles[0]
    const veh = inventoryMaster.vehicles.find((v) => v.id === tv.vehicleId)
    const snapshot = tv.rateSnapshot
    vehicleSnapshot = {
      id: tv.id,
      vehicleId: tv.vehicleId,
      vehicleName: snapshot?.name || veh?.name || "AC Chauffeur Driven Vehicle",
      vehicleType: snapshot?.vehicleType || veh?.vehicleType || "Tempo Traveller / SUV",
      seatingCapacity: veh?.seatingCapacity || 7,
      ac: veh?.ac ?? true,
      durationDays: duration.days,
      pickupLocation: "Airport / Railway Station",
      dropLocation: "Airport / Railway Station",
      notes: "Dedicated for private sightseeing and inter-city transfers throughout the tour duration.",
    }
  }

  // 6. Activity Snapshot
  const activitySnapshot: ActivitySnapshot[] = tripActivities.map((ta) => {
    const act = inventoryMaster.activities.find((a) => a.id === ta.activityId)
    const snapshot = ta.rateSnapshot
    return {
      id: ta.id,
      activityId: ta.activityId,
      activityName: snapshot?.name || act?.name || "Guided Excursion & Experience",
      destination: act?.destination || trip.destination,
      category: act?.category || "Sightseeing",
      date: ta.date || trip.startDate,
      adults: ta.adults || trip.adults,
      children: ta.children || 0,
      duration: act?.duration || "Half Day",
      description: act?.description || "Curated local sightseeing experience with certified safety gear and guide.",
    }
  })

  // 7. Pricing Snapshot (Pure Final Customer Price from Phase 5 Costing)
  const sellingPrice = costing?.summary?.sellingPrice || 85000
  const perPersonPrice = Math.round(sellingPrice / totalTravellers)

  // Default validity: 7 days from today
  const defaultValidDate = new Date()
  defaultValidDate.setDate(defaultValidDate.getDate() + 7)
  const validUntil = defaultValidDate.toISOString().split("T")[0]

  const pricingSnapshot: PricingSnapshot = {
    sellingPrice,
    currency: "INR",
    perPersonPrice,
    validUntil,
    priceNote: `All-inclusive total package investment for ${totalTravellers} traveller(s)`,
    totalTravellers,
  }

  const quotationNumber = generateQuotationNumber(existingIndex, version)
  const shareToken = generateShareToken()

  return {
    id: `QT-${Date.now()}-${shareToken.substring(0, 4)}`,
    version,
    parentQuotationId,
    tripId: trip.id,
    customerId: customer.id,
    quotationNumber,
    status: "Draft",
    title: trip.name,
    subtitle: `${duration.label} • ${trip.destination}`,
    validUntil,
    currency: "INR",
    sellingPrice,
    templateId: "modern-premium",
    shareToken,
    sections: DEFAULT_QUOTATION_SECTIONS,

    customerSnapshot,
    tripSnapshot,
    itinerarySnapshot,
    hotelSnapshot,
    vehicleSnapshot,
    activitySnapshot,
    pricingSnapshot,
    agencySnapshot: agency,

    inclusions: DEFAULT_INCLUSIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    paymentTerms: agency.defaultPaymentTerms || DEFAULT_AGENCY_BRANDING.defaultPaymentTerms!,
    cancellationPolicy: agency.defaultCancellationPolicy || DEFAULT_AGENCY_BRANDING.defaultCancellationPolicy!,
    termsAndConditions: agency.defaultTerms || DEFAULT_AGENCY_BRANDING.defaultTerms!,
    customNotes: "We look forward to creating wonderful travel memories for your holiday. Feel free to contact your holiday specialist for any modifications.",

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Sanitize Internal Quotation into Customer-Safe Public DTO ────────
export function sanitizeToPublicQuotation(quotation: Quotation): PublicQuotation {
  const isExpired = isQuotationExpired(quotation.validUntil)

  return {
    quotationNumber: quotation.quotationNumber,
    shareToken: quotation.shareToken,
    version: quotation.version,
    status: isExpired ? "Expired" : quotation.status,
    title: quotation.title,
    subtitle: quotation.subtitle,
    validUntil: quotation.validUntil,
    currency: quotation.currency,
    sellingPrice: quotation.sellingPrice,
    isExpired,
    templateId: quotation.templateId,
    sections: quotation.sections.filter((s) => s.visible).sort((a, b) => a.order - b.order),

    customer: {
      id: quotation.customerSnapshot.id,
      name: quotation.customerSnapshot.name,
      city: quotation.customerSnapshot.city,
      travellersLabel: quotation.customerSnapshot.travellersLabel,
      // Omit direct personal phone/email publicly unless necessary
    },
    trip: quotation.tripSnapshot,
    itinerary: quotation.itinerarySnapshot,
    hotels: quotation.hotelSnapshot,
    vehicle: quotation.vehicleSnapshot,
    activities: quotation.activitySnapshot,
    pricing: quotation.pricingSnapshot,
    agency: quotation.agencySnapshot,

    inclusions: quotation.inclusions,
    exclusions: quotation.exclusions,
    paymentTerms: quotation.paymentTerms,
    cancellationPolicy: quotation.cancellationPolicy,
    termsAndConditions: quotation.termsAndConditions,
    customNotes: quotation.customNotes,
  }
}
