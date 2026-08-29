import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
  totalCost: number;
  rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT";
  rateSheetId?: string;
  rateSheetNumber?: string | null;
  supplierName?: string | null;
  seasonName?: string | null;
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
   * resolving supplier purchase rates via the Rate Sheet Validity Engine.
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

    // 1. Calculate Hotel Costings with Rate Sheet Resolution
    let hotelsTotal = 0;
    const hotels: HotelCostItem[] = await Promise.all(
      trip.tripHotels.map(async (th) => {
        const checkInTime = new Date(th.checkIn).getTime();
        const checkOutTime = new Date(th.checkOut).getTime();
        const diffDays = Math.max(1, Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24)));
        const rooms = th.rooms || 1;

        // Query Rate Sheet Engine
        const matchedRate = await rateSheetService.getApplicableHotelRate(
          agencyId,
          th.hotelId,
          th.checkIn,
          th.roomType,
          th.mealPlan
        );

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
          if (totalCost === 0 && nightlyRate > 0) {
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
      })
    );

    // 2. Calculate Vehicle Costings with Rate Sheet Resolution
    let vehiclesTotal = 0;
    const vehicles: VehicleCostItem[] = await Promise.all(
      trip.tripVehicles.map(async (tv) => {
        let ratePerKm = tv.ratePerKm ? Number(tv.ratePerKm) : 0;
        const estimatedKm = tv.estimatedKm ? Number(tv.estimatedKm) : 0;
        let totalCost = tv.totalRate ? Number(tv.totalRate) : 0;
        let rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT" = "TRIP_SNAPSHOT";
        let rateSheetId: string | undefined = undefined;
        let rateSheetNumber: string | null | undefined = undefined;
        let supplierName: string | null | undefined = undefined;
        let seasonName: string | null | undefined = undefined;

        if (tv.vehicleId) {
          const matchedRate = await rateSheetService.getApplicableVehicleRate(
            agencyId,
            tv.vehicleId,
            tv.startDate || trip.startDate,
            tv.pricingType
          );

          if (matchedRate.matched) {
            rateSource = "RATE_SHEET";
            rateSheetId = matchedRate.rateSheetId;
            rateSheetNumber = matchedRate.rateSheetNumber;
            supplierName = matchedRate.supplierName;
            seasonName = matchedRate.seasonName;

            if (tv.pricingType === "PER_KM" && matchedRate.ratePerKm) {
              ratePerKm = matchedRate.ratePerKm;
              totalCost = ratePerKm * (estimatedKm || matchedRate.minimumKm || 0);
            } else if (matchedRate.totalRate) {
              totalCost = matchedRate.totalRate;
            } else if (matchedRate.costPrice > 0) {
              totalCost = matchedRate.costPrice;
            }

            if (matchedRate.driverAllowance) {
              totalCost += matchedRate.driverAllowance;
            }
          }
        }

        if (rateSource === "TRIP_SNAPSHOT") {
          if (tv.pricingType === "PER_KM" && ratePerKm > 0 && estimatedKm > 0 && totalCost === 0) {
            totalCost = ratePerKm * estimatedKm;
          }
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
          totalCost: Math.round(totalCost * 100) / 100,
          rateSource,
          rateSheetId,
          rateSheetNumber,
          supplierName,
          seasonName,
        };
      })
    );

    // 3. Calculate Activity Costings with Rate Sheet Resolution
    let activitiesTotal = 0;
    const activities: ActivityCostItem[] = await Promise.all(
      trip.tripActivities.map(async (ta) => {
        let adultPrice = ta.adultPrice ? Number(ta.adultPrice) : 0;
        let childPrice = ta.childPrice ? Number(ta.childPrice) : 0;
        const participants = ta.numberOfParticipants || travelersCount;
        let totalCost = ta.totalPrice ? Number(ta.totalPrice) : 0;
        let rateSource: "RATE_SHEET" | "TRIP_SNAPSHOT" = "TRIP_SNAPSHOT";
        let rateSheetId: string | undefined = undefined;
        let rateSheetNumber: string | null | undefined = undefined;
        let supplierName: string | null | undefined = undefined;
        let seasonName: string | null | undefined = undefined;

        if (ta.activityId) {
          const matchedRate = await rateSheetService.getApplicableActivityRate(
            agencyId,
            ta.activityId,
            ta.date || trip.startDate
          );

          if (matchedRate.matched) {
            rateSource = "RATE_SHEET";
            rateSheetId = matchedRate.rateSheetId;
            rateSheetNumber = matchedRate.rateSheetNumber;
            supplierName = matchedRate.supplierName;
            seasonName = matchedRate.seasonName;

            if (matchedRate.adultCost !== null || matchedRate.childCost !== null) {
              adultPrice = matchedRate.adultCost ?? 0;
              childPrice = matchedRate.childCost ?? 0;
              const effectiveAdults = adultsCount > 0 ? adultsCount : participants;
              totalCost = (adultPrice * effectiveAdults) + (childPrice * childrenCount);
            } else if (matchedRate.costPrice > 0) {
              totalCost = matchedRate.costPrice;
            }
          }
        }

        if (rateSource === "TRIP_SNAPSHOT" && totalCost === 0) {
          if (adultPrice > 0 || childPrice > 0) {
            const effectiveAdults = adultsCount > 0 ? adultsCount : participants;
            totalCost = (adultPrice * effectiveAdults) + (childPrice * childrenCount);
          }
        }

        activitiesTotal += totalCost;

        return {
          id: ta.id,
          activityId: ta.activityId,
          activityName: ta.name,
          type: ta.type,
          numberOfParticipants: participants,
          adultPrice,
          childPrice,
          totalCost: Math.round(totalCost * 100) / 100,
          rateSource,
          rateSheetId,
          rateSheetNumber,
          supplierName,
          seasonName,
        };
      })
    );

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
