import {
  Booking,
  CustomerSnapshot,
  TripOperation,
  TripReadiness,
  ReadinessCheck,
  TransportOperation,
  Driver,
} from "@/types";
import { formatCurrency } from "@/lib/costing-engine";

/**
 * Evaluates all operational criteria and calculates the 0-100% readiness score.
 */
export function calculateTripReadiness(
  operation: Partial<TripOperation>,
  booking?: Booking
): TripReadiness {
  const checks: ReadinessCheck[] = [];

  // 1. Customer details
  const cust = operation.customerSnapshot || booking?.customerSnapshot;
  const hasCustomer = !!(cust?.name && cust?.phone);
  checks.push({
    key: "customer_details",
    label: "Customer Contact & Guest Details",
    passed: hasCustomer,
    message: hasCustomer ? undefined : "Customer phone or guest count missing",
  });

  // 2. Travel Dates
  const hasDates = !!(operation.startDate && operation.endDate);
  checks.push({
    key: "travel_dates",
    label: "Travel Window & Dates Confirmed",
    passed: hasDates,
    message: hasDates ? undefined : "Start or End date missing",
  });

  // 3. Hotels Confirmed
  const hotelItems = booking?.items.filter((i) => i.type === "Hotel") || [];
  const hotelsConfirmed =
    hotelItems.length > 0 && hotelItems.every((h) => h.status === "Confirmed");
  checks.push({
    key: "hotels_confirmed",
    label: `Hotel Accommodations (${
      hotelItems.length > 0
        ? `${hotelItems.filter((h) => h.status === "Confirmed").length}/${hotelItems.length}`
        : "None"
    })`,
    passed: hotelItems.length === 0 || hotelsConfirmed,
    message: hotelsConfirmed
      ? undefined
      : "One or more hotel reservations are pending supplier confirmation",
  });

  // 4. Vehicle Confirmed
  const vehicleItems = booking?.items.filter((i) => i.type === "Vehicle") || [];
  const vehiclesConfirmed =
    vehicleItems.length === 0 ||
    vehicleItems.every((v) => v.status === "Confirmed");
  checks.push({
    key: "vehicles_confirmed",
    label: "Vehicle & Fleet Allocation",
    passed: vehiclesConfirmed,
    message: vehiclesConfirmed
      ? undefined
      : "Vehicle confirmation pending with fleet vendor",
  });

  // 5. Driver Assigned
  const transports = operation.transports || [];
  const requiredDriverTransports = transports.filter(
    (t) => t.type === "Pickup" || t.type === "Transfer"
  );
  const driversAssigned =
    requiredDriverTransports.length === 0 ||
    requiredDriverTransports.every((t) => !!t.driverId || !!t.driverName);
  checks.push({
    key: "driver_assigned",
    label: `Chauffeur Assignment (${
      requiredDriverTransports.length > 0
        ? `${requiredDriverTransports.filter((t) => !!t.driverId || !!t.driverName).length}/${requiredDriverTransports.length}`
        : "None"
    })`,
    passed: driversAssigned,
    message: driversAssigned
      ? undefined
      : "Driver has not been assigned to scheduled pickup/transfer",
  });

  // 6. Activities Confirmed
  const actItems = booking?.items.filter((i) => i.type === "Activity") || [];
  const actsConfirmed =
    actItems.length === 0 || actItems.every((a) => a.status === "Confirmed");
  checks.push({
    key: "activities_confirmed",
    label: "Excursions & Activity Slots",
    passed: actsConfirmed,
    message: actsConfirmed
      ? undefined
      : "Activity slots or entry passes pending confirmation",
  });

  // 7. Customer Payment Status
  const paymentOk =
    (booking?.paidAmount || 0) > 0 || booking?.paymentStatus === "Paid";
  checks.push({
    key: "customer_payment",
    label: `Customer Payment (${
      booking ? formatCurrency(booking.paidAmount) + " paid" : "Pending"
    })`,
    passed: paymentOk,
    message: paymentOk
      ? undefined
      : "No advance payment recorded from customer",
  });

  // 8. Booking Documents Ready
  const hasDocuments = (booking?.documents.length || 0) > 0;
  checks.push({
    key: "documents_ready",
    label: "Vouchers & Confirmation Documents",
    passed: hasDocuments,
    message: hasDocuments
      ? undefined
      : "Trip vouchers or hotel confirmation slips not generated",
  });

  // 9. Emergency Contacts
  const hasEmergency =
    (operation.emergencyContacts?.length || 0) > 0;
  checks.push({
    key: "emergency_contacts",
    label: "24x7 Emergency Coordination Contacts",
    passed: hasEmergency,
    message: hasEmergency
      ? undefined
      : "No emergency support helpline added for this trip",
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const status = score === 100 ? "READY FOR TRIP" : "ACTION REQUIRED";

  return { score, status, checks };
}

/**
 * Checks for overlapping driver commitments on the same date and time.
 */
export function detectDriverConflict(
  driverId: string,
  date: string,
  time: string,
  allTransports: TransportOperation[],
  excludeTransportId?: string
): { hasConflict: boolean; conflictingTripId?: string; conflictingTransport?: TransportOperation } {
  if (!driverId) return { hasConflict: false };

  const conflict = allTransports.find((t) => {
    if (excludeTransportId && t.id === excludeTransportId) return false;
    if (t.driverId !== driverId) return false;
    if (t.date !== date) return false;
    if (t.status === "Cancelled" || t.status === "Completed") return false;

    // Check time proximity (within same 2 hour window)
    if (t.time && time) {
      const [tH, tM] = t.time.split(":").map((v) => parseInt(v, 10));
      const [nH, nM] = time.split(":").map((v) => parseInt(v, 10));
      if (!isNaN(tH) && !isNaN(nH)) {
        const diffMinutes = Math.abs(tH * 60 + (tM || 0) - (nH * 60 + (nM || 0)));
        return diffMinutes <= 120; // 2 hour overlap window
      }
    }

    return true;
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingTripId: conflict.tripId,
      conflictingTransport: conflict,
    };
  }

  return { hasConflict: false };
}

/**
 * Checks for overlapping vehicle commitments on the same date and time.
 */
export function detectVehicleConflict(
  vehicleId: string,
  date: string,
  time: string,
  allTransports: TransportOperation[],
  excludeTransportId?: string
): { hasConflict: boolean; conflictingTripId?: string; conflictingTransport?: TransportOperation } {
  if (!vehicleId) return { hasConflict: false };

  const conflict = allTransports.find((t) => {
    if (excludeTransportId && t.id === excludeTransportId) return false;
    if (t.vehicleId !== vehicleId) return false;
    if (t.date !== date) return false;
    if (t.status === "Cancelled" || t.status === "Completed") return false;

    if (t.time && time) {
      const [tH, tM] = t.time.split(":").map((v) => parseInt(v, 10));
      const [nH, nM] = time.split(":").map((v) => parseInt(v, 10));
      if (!isNaN(tH) && !isNaN(nH)) {
        const diffMinutes = Math.abs(tH * 60 + (tM || 0) - (nH * 60 + (nM || 0)));
        return diffMinutes <= 120;
      }
    }

    return true;
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingTripId: conflict.tripId,
      conflictingTransport: conflict,
    };
  }

  return { hasConflict: false };
}

/**
 * Communication Template Types & Generator
 */
export type CommunicationTemplateType =
  | "DRIVER_PICKUP"
  | "HOTEL_CHECKIN"
  | "TOMORROW_ITINERARY"
  | "DELAY_NOTIFICATION"
  | "TRIP_WELCOME"
  | "TRIP_COMPLETED";

export function generateCommunicationTemplate(
  type: CommunicationTemplateType,
  operation: TripOperation,
  transport?: TransportOperation
): string {
  const customerName = operation.customerSnapshot.name;
  const destination = operation.destination;
  const agencyName = operation.agencySnapshot?.name || "TripDesk Holidays";
  const agencyPhone = operation.agencySnapshot?.phone || "+91 98470 12345";

  switch (type) {
    case "DRIVER_PICKUP": {
      const t = transport || operation.transports[0];
      return `Namaste ${customerName},

Your dedicated chauffeur details for your ${destination} pickup are as follows:

*Pickup Time:* ${t?.time || "10:30 AM"}
*Pickup Location:* ${t?.pickupLocation || "Airport Arrival"}
*Vehicle:* ${t?.vehicleName || "AC Vehicle"} (${t?.vehicleNumber || "Will be shared"})
*Chauffeur:* ${t?.driverName || "Assigned Driver"} (${t?.driverPhone || "Will be shared"})

Please keep your phone active upon arrival. For emergency support, call us at ${agencyPhone}.

Warm regards,
*${agencyName}*`;
    }

    case "HOTEL_CHECKIN": {
      return `Dear ${customerName},

Your hotel check-in details for ${destination}:

*Hotel:* Parakkat Nature Resort (Munnar)
*Check-in Time:* From 1:00 PM
*Voucher Ref:* HTL-458921
*Meal Plan:* CP (Breakfast Included)

Please show government-issued photo IDs for all adults at reception.

Have a wonderful stay!
*${agencyName}*`;
    }

    case "TOMORROW_ITINERARY": {
      const currentDay = operation.currentDay || 1;
      const nextPlan = operation.dailyPlans.find((p) => p.dayNumber === currentDay + 1) || operation.dailyPlans[0];
      return `Good evening ${customerName},

Here is your scheduled plan for tomorrow (*Day ${nextPlan?.dayNumber || 2} - ${nextPlan?.title || destination}*):

${nextPlan?.activities.map((a) => `• *${a.time || "Scheduled"}*: ${a.title}`).join("\n") || "• Sightseeing and local exploration"}

*Pickup Time:* 09:00 AM from hotel lobby.
Please carry sunglasses, comfortable footwear, and a light jacket.

Wishing you a memorable day!
*${agencyName}*`;
    }

    case "DELAY_NOTIFICATION": {
      const t = transport || operation.transports[0];
      return `Dear ${customerName},

*Operational Update:* Your chauffeur ${t?.driverName || "Driver"} is slightly delayed due to ${t?.delayReason || "heavy highway traffic"}.

*Expected Revised Arrival:* ${t?.expectedArrivalTime || "Shortly"}
*Driver Contact:* ${t?.driverPhone || agencyPhone}

We apologize for the inconvenience and are actively tracking the vehicle to ensure a smooth pickup.

*${agencyName} Guest Support*`;
    }

    case "TRIP_WELCOME": {
      return `🎉 *Welcome to your ${destination} Holiday!*

Dear ${customerName},
The entire team at ${agencyName} wishes you and your family a magical journey.

Our 24x7 guest experience team is on standby to assist you at every step of your trip:
📞 *Helpline:* ${agencyPhone}

Have an extraordinary trip!
*${agencyName}*`;
    }

    case "TRIP_COMPLETED": {
      return `Dear ${customerName},

We hope you had a wonderful and memorable trip to ${destination}!

Thank you for choosing *${agencyName}*. We would love to hear your feedback to help us continually enhance our guest experience:

⭐ *Rate your experience & share your feedback:*
${typeof window !== "undefined" ? window.location.origin : ""}/trip/${operation.bookingNumber}

Looking forward to planning your next adventure!
*${agencyName}*`;
    }

    default:
      return "";
  }
}
