import {
  Quotation,
  Trip,
  TripCosting,
  TripHotel,
  TripVehicle,
  TripActivity,
  ItineraryDay,
} from "@/types"
import { formatCurrency } from "@/lib/costing-engine"

export interface QuotationDifference {
  hasChanges: boolean
  priceChanged: boolean
  oldPrice: number
  newPrice: number
  messages: string[]
}

export function detectQuotationChanges(
  quotation: Quotation,
  currentTrip?: Trip,
  currentCosting?: TripCosting,
  currentItinerary: ItineraryDay[] = [],
  currentHotels: TripHotel[] = [],
  currentVehicles: TripVehicle[] = [],
  currentActivities: TripActivity[] = []
): QuotationDifference {
  const messages: string[] = []
  let priceChanged = false
  const oldPrice = quotation.sellingPrice
  const newPrice = currentCosting?.summary?.sellingPrice ?? oldPrice

  // 1. Check Selling Price differences from Phase 5 Costing
  if (currentCosting && Math.abs(oldPrice - newPrice) > 0.01) {
    priceChanged = true
    messages.push(
      `Package costing changed: Snapshot is ${formatCurrency(oldPrice)}, current Trip Costing is ${formatCurrency(newPrice)}.`
    )
  }

  // 2. Check Trip Travel Dates or Travellers
  if (currentTrip) {
    if (
      quotation.tripSnapshot.startDate !== currentTrip.startDate ||
      quotation.tripSnapshot.endDate !== currentTrip.endDate
    ) {
      messages.push(
        `Travel schedule modified: Snapshot (${quotation.tripSnapshot.startDate} – ${quotation.tripSnapshot.endDate}) vs Live Trip (${currentTrip.startDate} – ${currentTrip.endDate}).`
      )
    }

    if (
      quotation.tripSnapshot.adults !== currentTrip.adults ||
      quotation.tripSnapshot.children !== currentTrip.children
    ) {
      messages.push(
        `Travellers count updated: Snapshot had ${quotation.tripSnapshot.adults} Adults + ${quotation.tripSnapshot.children} Kids, Trip currently has ${currentTrip.adults} Adults + ${currentTrip.children} Kids.`
      )
    }
  }

  // 3. Check Itinerary Day Count
  if (currentItinerary.length > 0 && currentItinerary.length !== quotation.itinerarySnapshot.length) {
    messages.push(
      `Itinerary days changed: Snapshot has ${quotation.itinerarySnapshot.length} day(s), Live Trip has ${currentItinerary.length} day(s).`
    )
  }

  // 4. Check Accommodations Count
  if (currentHotels.length !== quotation.hotelSnapshot.length) {
    messages.push(
      `Selected accommodations changed: Snapshot has ${quotation.hotelSnapshot.length} hotel stay(s), Live Trip has ${currentHotels.length}.`
    )
  }

  // 5. Check Activities Count
  if (currentActivities.length !== quotation.activitySnapshot.length) {
    messages.push(
      `Experiences & activities updated: Snapshot has ${quotation.activitySnapshot.length} item(s), Live Trip has ${currentActivities.length}.`
    )
  }

  return {
    hasChanges: messages.length > 0,
    priceChanged,
    oldPrice,
    newPrice,
    messages,
  }
}
