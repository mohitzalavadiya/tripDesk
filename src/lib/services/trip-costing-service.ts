import "server-only";
import { prisma } from "@/lib/prisma";
import { rateSheetService } from "./rate-sheet-service";

export interface HotelCostItem {
  id: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  rooms: number;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  nightlyRate: number;
  mealPlan?: string | null;
  totalCost: number;
  rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT";
  rateSheetId?: string;
  rateSheetNumber?: string | null;
  supplierName?: string | null;
  seasonName?: string | null;
}

export interface VehicleCostItem {
  id: string;
  vehicleId?: string | null;
  vehicleName: string;
  vehicleType: string;
  pricingType: string;
  ratePerKm: number;
  estimatedKm: number;
  actualKm?: number | null;
  totalCost: number;
  rateSource: "TRIP_SNAPSHOT";
  supplierName?: string | null;
}

export interface ActivityCostItem {
  id: string;
  activityId?: string | null;
  activityName: string;
  type: string;
  numberOfParticipants: number;
  adultPrice: number;
  childPrice: number;
  totalCost: number;
  rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT";
  rateSheetId?: string;
  rateSheetNumber?: string | null;
  supplierName?: string | null;
  seasonName?: string | null;
}

export interface TripCostingResult {
  tripId: string;
  tripTitle: string;
  tripNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  travelersCount: number;
  adultsCount: number;
  childrenCount: number;
  hotels: HotelCostItem[];
  vehicles: VehicleCostItem[];
  activities: ActivityCostItem[];
  hotelsTotal: number;
  vehiclesTotal: number;
  activitiesTotal: number;
  subtotal: number;
}

export const tripCostingService = {
  /**
   * Calculate live trip resource costing from PostgreSQL database, dynamically
   * resolving hotel supplier purchase rates via the Rate Sheet Validity Engine,
   * while vehicle costs are calculated directly from trip-specific commercial parameters.
   */
  async calculateTripCosting(agencyId: string, tripId: string): Promise<TripCostingResult | null> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId, archivedAt: null },
      include: {
        customer: true,
        travelers: true,
        tripHotels: {
          include: { hotel: true },
        },
        tripVehicles: {
          include: { vehicle: true },
        },
        tripActivities: {
          include: { activity: true },
        },
      },
    });

    if (!trip) {
      return null;
    }

    const adultsCount = trip.travelers.filter((t) => t.type === "ADULT").length;
    const childrenCount = trip.travelers.filter((t) => t.type === "CHILD").length;
    const travelersCount = trip.travelers.length || 1;

    // 1. Prepare Batch Items for Rate Sheet Resolution (Hotels)
    const hotelBatchItems = trip.tripHotels.map((th) => ({
      id: th.id,
      hotelId: th.hotelId,
      travelDate: th.checkIn,
      roomType: th.roomType,
      mealPlan: th.mealPlan,
    }));

    // 2. Fetch Rate Resolutions in Concurrent Batch Queries
    const [hotelRateMap] = await Promise.all([
      rateSheetService.getApplicableHotelRatesBatch(agencyId, hotelBatchItems),
    ]);

    // 3. Calculate Hotel Costings from Pre-Fetched Batch Rates
    let hotelsTotal = 0;
    const hotels: HotelCostItem[] = trip.tripHotels.map((th) => {
      const checkInTime = new Date(th.checkIn).getTime();
      const checkOutTime = new Date(th.checkOut).getTime();
      const diffDays = Math.max(1, Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24)));
      const rooms = th.rooms || 1;

      const matchedRate = hotelRateMap.get(th.id) || { matched: false, currency: "INR", costPrice: 0, priority: 0 };

      let nightlyRate = th.nightlyRate ? Number(th.nightlyRate) : 0;
      let totalCost = th.totalAmount ? Number(th.totalAmount) : 0;
      let rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT" = "TRIP_SNAPSHOT";
      let rateSheetId: string | undefined = undefined;
      let rateSheetNumber: string | null | undefined = undefined;
      let supplierName: string | null | undefined = undefined;
      let seasonName: string | null | undefined = undefined;

      if (matchedRate.matched && matchedRate.costPrice > 0) {
        rateSource = "RATE_SHEET";
        nightlyRate = matchedRate.costPrice;
        totalCost = nightlyRate * rooms * diffDays;
        rateSheetId = matchedRate.rateSheetId;
        rateSheetNumber = matchedRate.rateSheetNumber;
        supplierName = matchedRate.supplierName;
        seasonName = matchedRate.seasonName;
      } else {
        // Fallback to manual trip assignment snapshot
        if (nightlyRate > 0) {
          totalCost = nightlyRate * rooms * diffDays;
        }
      }

      hotelsTotal += totalCost;

      return {
        id: th.id,
        hotelId: th.hotelId,
        hotelName: th.hotel?.name || "Contracted Hotel",
        roomType: th.roomType,
        rooms,
        checkIn: th.checkIn,
        checkOut: th.checkOut,
        nights: diffDays,
        nightlyRate,
        mealPlan: th.mealPlan,
        totalCost: Math.round(totalCost * 100) / 100,
        rateSource,
        rateSheetId,
        rateSheetNumber,
        supplierName,
        seasonName,
      };
    });

    // 4. Calculate Vehicle Costings (Direct from TripVehicle commercial params)
    let vehiclesTotal = 0;
    const vehicles: VehicleCostItem[] = trip.tripVehicles.map((tv) => {
      const ratePerKm = tv.ratePerKm ? Number(tv.ratePerKm) : 0;
      const estimatedKm = tv.estimatedKm ? Number(tv.estimatedKm) : 0;
      const actualKm = tv.actualKm ? Number(tv.actualKm) : null;
      let totalCost = 0;

      if (tv.pricingType === "PER_KM") {
        const effectiveKm = actualKm !== null ? actualKm : estimatedKm;
        totalCost = ratePerKm * effectiveKm;
      } else {
        // FIXED / TOTAL
        totalCost = tv.totalRate ? Number(tv.totalRate) : 0;
      }

      vehiclesTotal += totalCost;

      return {
        id: tv.id,
        vehicleId: tv.vehicleId,
        vehicleName: tv.vehicleName,
        vehicleType: tv.vehicleType,
        pricingType: tv.pricingType,
        ratePerKm,
        estimatedKm,
        actualKm,
        totalCost: Math.round(totalCost * 100) / 100,
        rateSource: "TRIP_SNAPSHOT",
      };
    });

    // 5. Activities (Non-Monetary Descriptive List: Included / Excluded)
    let activitiesTotal = 0;
    const activities: ActivityCostItem[] = trip.tripActivities.map((ta) => {
      return {
        id: ta.id,
        activityId: ta.activityId,
        activityName: ta.name,
        type: ta.type,
        numberOfParticipants: 1,
        adultPrice: 0,
        childPrice: 0,
        totalCost: 0,
        rateSource: "TRIP_SNAPSHOT",
        rateSheetId: undefined,
        rateSheetNumber: undefined,
        supplierName: undefined,
        seasonName: undefined,
      };
    });

    const subtotal = Math.round((hotelsTotal + vehiclesTotal + activitiesTotal) * 100) / 100;

    return {
      tripId: trip.id,
      tripTitle: trip.title,
      tripNumber: trip.tripNumber,
      customer: {
        id: trip.customer.id,
        name: trip.customer.name,
        phone: trip.customer.phone,
        email: trip.customer.email,
      },
      travelersCount,
      adultsCount,
      childrenCount,
      hotels,
      vehicles,
      activities,
      hotelsTotal: Math.round(hotelsTotal * 100) / 100,
      vehiclesTotal: Math.round(vehiclesTotal * 100) / 100,
      activitiesTotal: Math.round(activitiesTotal * 100) / 100,
      subtotal,
    };
  },
};
