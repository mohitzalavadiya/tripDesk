import "dotenv/config";

// Mock server-only for standalone test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from "../src/lib/prisma";
import { BookingStatus, BookingPaymentStatus, QuotationStatus, TripStatus } from "@prisma/client";
import { bookingService } from "../src/lib/services/booking-service";
import { operationsService } from "../src/lib/services/operations-service";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runPhase11Tests() {
  console.log("\n=======================================================");
  console.log("   PHASE 11: BOOKING & OPERATIONS MANAGEMENT TEST");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `test-agency-a-${timestamp}`;
  const agencyBId = `test-agency-b-${timestamp}`;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Multi-Tenant Fixtures Setup
    // ─────────────────────────────────────────────────────────────────────────
    console.log("--- 1. Multi-Tenant Fixtures Setup ---");

    const agencyA = await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Himalayan Elite Journeys",
        email: `himalayan-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        address: "The Mall Road, Srinagar",
        status: "ACTIVE",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Goa Coastal Escapes",
        email: `goa-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        address: "Calangute Beach Road, Goa",
        status: "ACTIVE",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyAId,
        customerNumber: `CUST-A-${timestamp}`,
        name: "Vikram Malhotra",
        email: `vikram-${timestamp}@example.com`,
        phone: `+9198765${String(timestamp).slice(-5)}`,
        city: "Mumbai",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyBId,
        customerNumber: `CUST-B-${timestamp}`,
        name: "Ananya Desai",
        email: `ananya-${timestamp}@example.com`,
        phone: `+9198111${String(timestamp).slice(-5)}`,
        city: "Pune",
      },
    });

    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyAId,
        name: "The Khyber Himalayan Resort",
        city: "Gulmarg",
        category: "5-Star",
      },
    });

    const vehicleA = await prisma.vehicle.create({
      data: {
        agencyId: agencyAId,
        name: "Toyota Innova Crysta",
        type: "INNOVA",
        capacity: 6,
      },
    });

    const activityA = await prisma.activity.create({
      data: {
        agencyId: agencyAId,
        name: "Gulmarg Gondola Cable Car Ride",
        location: "Gulmarg",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyAId,
        customerId: customerA.id,
        tripNumber: `TRIP-A-${timestamp}`,
        title: "Kashmir Luxury Honeymoon Tour",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-12"),
        status: TripStatus.QUOTED,
        travelers: {
          create: [
            { name: "Vikram Malhotra", type: "ADULT", isPrimary: true },
            { name: "Neha Malhotra", type: "ADULT", isPrimary: false },
          ],
        },
      },
    });

    await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelA.id,
        checkIn: new Date("2026-10-05"),
        checkOut: new Date("2026-10-08"),
        roomType: "Premier Luxury Mountain View",
        mealPlan: "MAP",
        rooms: 1,
      },
    });

    await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleId: vehicleA.id,
        vehicleName: "Toyota Innova Crysta",
        vehicleType: "SUV",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-12"),
        pickupLocation: "Srinagar Airport",
        dropLocation: "Srinagar Airport",
      },
    });

    await prisma.tripActivity.create({
      data: {
        tripId: tripA.id,
        activityId: activityA.id,
        name: "Gulmarg Gondola Cable Car Ride",
        location: "Gulmarg",
        date: new Date("2026-10-06"),
        time: "10:00 AM",
      },
    });

    const quotationA = await prisma.quotation.create({
      data: {
        agencyId: agencyAId,
        tripId: tripA.id,
        customerId: customerA.id,
        quotationNumber: `QUO-A-${timestamp}`,
        title: "Kashmir Bespoke Proposal",
        subtotal: 120000,
        markupPercentage: 20,
        markupAmount: 24000,
        finalAmount: 144000,
        status: QuotationStatus.SENT,
        packageOptions: {
          create: [
            {
              name: "Luxury Experience",
              subtitle: "5-Star Resort + Innova",
              subtotal: 120000,
              markupPercentage: 20,
              markupAmount: 24000,
              finalAmount: 144000,
              isRecommended: true,
              sortOrder: 1,
            },
          ],
        },
      },
    });

    assert(Boolean(agencyA && agencyB && tripA && quotationA), "Fixtures initialized for Agency Alpha & Beta");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Quotation → Booking Idempotent Conversion
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Quotation → Booking Idempotent Conversion ---");

    // 1st conversion: should create booking BK1
    const booking1 = await bookingService.convertQuotationToBooking(agencyAId, quotationA.id, {
      notes: "VIP travelers on honeymoon.",
    });

    assert(Boolean(booking1), "Booking created successfully from accepted quotation");
    assert(booking1.status === BookingStatus.CONFIRMED, "Initial booking status is CONFIRMED");
    assert(booking1.tripId === tripA.id, "Booking is linked to correct Trip ID");
    assert(booking1.customerId === customerA.id, "Booking is linked to correct Customer ID");
    assert(booking1.quotationId === quotationA.id, "Booking is linked to correct Quotation ID");
    assert(Number(booking1.totalAmount) === 144000, "Booking totalAmount matches quotation finalAmount (₹144,000)");

    // Verify Quotation status is now ACCEPTED
    const updatedQuotation = await prisma.quotation.findUnique({ where: { id: quotationA.id } });
    assert(updatedQuotation?.status === QuotationStatus.ACCEPTED, "Quotation status transitioned to ACCEPTED");

    // Verify Trip status is now BOOKED
    const updatedTrip = await prisma.trip.findUnique({ where: { id: tripA.id } });
    assert(updatedTrip?.status === TripStatus.BOOKED, "Trip status transitioned to BOOKED");

    // 2nd conversion of the SAME quotation: should idempotently return booking1 without creating a second record
    const booking2 = await bookingService.convertQuotationToBooking(agencyAId, quotationA.id);
    assert(booking2.id === booking1.id, "Second conversion returns existing booking idempotently");
    assert(booking2.bookingNumber === booking1.bookingNumber, "Booking number matches original booking");

    const bookingCount = await prisma.booking.count({ where: { quotationId: quotationA.id } });
    assert(bookingCount === 1, "Database contains exactly 1 booking for the converted quotation (No duplicate bookings)");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Automatic Operations Initialization & Asset Linking
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Automatic Operations Initialization & Asset Linking ---");

    const bookingDetail = await bookingService.getBooking(agencyAId, booking1.id);
    assert(Boolean(bookingDetail?.tripOperation), "TripOperation record automatically initialized and linked to Booking");
    assert(bookingDetail?.tripOperation?.hotelConfirmations.length === 1, "Hotel confirmation record auto-created from TripHotel");
    assert(bookingDetail?.tripOperation?.vehicleDispatches.length === 1, "Vehicle dispatch record auto-created from TripVehicle");
    assert(bookingDetail?.tripOperation?.activityConfirmations.length === 1, "Activity confirmation record auto-created from TripActivity");

    const events = bookingDetail?.tripOperation?.events || [];
    const bookingCreatedEvent = events.find((e) => e.eventType === "BOOKING_CREATED");
    assert(Boolean(bookingCreatedEvent), "BOOKING_CREATED audit event logged in operations timeline");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Operational Readiness Engine Integration
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Operational Readiness Engine Integration ---");

    assert(bookingDetail?.operationalReadiness !== undefined, "Operational readiness summary attached to booking detail");
    const initialScore = bookingDetail?.operationalReadiness?.score || 0;
    assert(initialScore < 100, `Initial readiness score is ${initialScore}% (Pending confirmations)`);
    assert(bookingDetail?.operationalReadiness?.isReady === false, "Booking is not ready before confirmations");

    // Confirm the hotel, vehicle, and activity in operations
    const opId = bookingDetail?.tripOperation?.id!;
    const hotelConf = bookingDetail?.tripOperation?.hotelConfirmations[0];
    if (hotelConf) {
      await operationsService.updateHotelConfirmation(agencyAId, opId, hotelConf.id, {
        status: "CONFIRMED" as any,
        confirmationNumber: "KHYBER-RES-9988",
      });
    }

    const vehicleDisp = bookingDetail?.tripOperation?.vehicleDispatches[0];
    if (vehicleDisp) {
      await operationsService.updateVehicleDispatch(agencyAId, opId, vehicleDisp.id, {
        status: "CONFIRMED" as any,
        driverName: "Tariq Ahmed",
        driverPhone: "+919906112233",
        vehicleNumber: "JK-01-AB-4455",
      });
    }

    const activityConf = bookingDetail?.tripOperation?.activityConfirmations[0];
    if (activityConf) {
      await operationsService.updateActivityConfirmation(agencyAId, opId, activityConf.id, {
        status: "CONFIRMED" as any,
        confirmationNumber: "GONDOLA-PASS-1029",
      });
    }

    // Refetch booking and check dynamic readiness update
    const readyBooking = await bookingService.getBooking(agencyAId, booking1.id);
    const updatedScore = readyBooking?.operationalReadiness?.score || 0;
    assert(updatedScore === 100, `Readiness score dynamically recalculated to ${updatedScore}% after all confirmations`);
    assert(readyBooking?.operationalReadiness?.isReady === true, "Booking operationalReadiness.isReady is now TRUE");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. State Machine Lifecycle Transitions & Controlled Cancellation
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. State Machine Lifecycle & Controlled Cancellation ---");

    // Transition to ONGOING
    const ongoingBooking = await bookingService.updateBooking(agencyAId, booking1.id, {
      status: BookingStatus.ONGOING,
    });
    assert(ongoingBooking.status === BookingStatus.ONGOING, "Booking transitioned to ONGOING");

    // Attempt cancellation
    const cancelledBooking = await bookingService.cancelBooking(
      agencyAId,
      booking1.id,
      "Customer requested emergency cancellation due to medical urgency."
    );
    assert(cancelledBooking.status === BookingStatus.CANCELLED, "Booking successfully cancelled via controlled workflow");
    assert(Boolean(cancelledBooking.cancellationReason), "Cancellation reason recorded in database");
    assert(cancelledBooking.cancellationReason?.includes("emergency cancellation") === true, "Reason matches submitted input");

    // Verify invalid transition: Re-activating cancelled booking directly should be rejected
    let reactivationError = false;
    try {
      await bookingService.updateBooking(agencyAId, booking1.id, {
        status: BookingStatus.CONFIRMED,
      });
    } catch {
      reactivationError = true;
    }
    assert(reactivationError, "Direct reactivation of cancelled booking is BLOCKED by state machine");

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Multi-Tenant Isolation & IDOR Protection
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Multi-Tenant Isolation & IDOR Protection ---");

    // Agency B attempts to read Agency A's booking
    const crossTenantRead = await bookingService.getBooking(agencyBId, booking1.id);
    assert(crossTenantRead === null, "Agency B reading Agency A's booking returns NULL (IDOR BLOCKED)");

    // Agency B attempts to update Agency A's booking
    let crossTenantUpdateError = false;
    try {
      await bookingService.updateBooking(agencyBId, booking1.id, {
        status: BookingStatus.COMPLETED,
      });
    } catch {
      crossTenantUpdateError = true;
    }
    assert(crossTenantUpdateError, "Agency B updating Agency A's booking is BLOCKED");

    // Agency B attempts to cancel Agency A's booking
    let crossTenantCancelError = false;
    try {
      await bookingService.cancelBooking(agencyBId, booking1.id, "Malicious attempt");
    } catch {
      crossTenantCancelError = true;
    }
    assert(crossTenantCancelError, "Agency B cancelling Agency A's booking is BLOCKED");

    // Agency B listing bookings
    const agencyBList = await bookingService.getBookings(agencyBId);
    assert(agencyBList.data.length === 0, "Agency B booking list contains 0 bookings (Complete Tenant Isolation)");

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Operations Finalization Immutability Enforcement
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 7. Operations Finalization Immutability Enforcement ---");

    // Create a new booking for testing finalization lock
    const tripLock = await prisma.trip.create({
      data: {
        agencyId: agencyAId,
        customerId: customerA.id,
        tripNumber: `TRIP-LOCK-${timestamp}`,
        title: "Kashmir Tour for Finalization Lock",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-05"),
        status: TripStatus.COMPLETED,
      },
    });

    const bookingLock = await bookingService.createBooking(agencyAId, {
      tripId: tripLock.id,
      customerId: customerA.id,
      totalAmount: 50000,
      paidAmount: 50000,
      status: BookingStatus.COMPLETED,
    });

    // Finalize the operation
    const opLock = await prisma.tripOperation.findFirst({
      where: { agencyId: agencyAId, tripId: tripLock.id },
    });

    if (opLock) {
      await prisma.tripOperation.update({
        where: { id: opLock.id },
        data: { status: "COMPLETED" },
      });

      await operationsService.finalizeOperation(agencyAId, opLock.id, {
        notes: "All vendor accounts settled and tour completed.",
      });

      let mutationBlocked = false;
      try {
        await bookingService.updateBooking(agencyAId, bookingLock.id, {
          totalAmount: 60000,
        });
      } catch {
        mutationBlocked = true;
      }
      assert(mutationBlocked, "Modifying booking on financially finalized operation is BLOCKED by immutability lock");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Commercial Privacy & Zero-Data-Leakage Scan
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 8. Commercial Privacy & Zero-Data-Leakage Scan ---");

    const privacyPayload = JSON.stringify(bookingDetail);
    const forbiddenCommercialKeys = [
      "costPrice",
      "buyPrice",
      "supplierCost",
      "supplierPayable",
      "internalMarkup",
      "markupPercentage",
      "markupAmount",
      "grossProfit",
      "profitMargin",
    ];

    let leakCount = 0;
    for (const key of forbiddenCommercialKeys) {
      if (privacyPayload.includes(`"${key}"`)) {
        console.error(`  ❌ Privacy Leak: found sensitive commercial key "${key}"`);
        leakCount++;
      }
    }
    assert(leakCount === 0, "Booking payload contains ZERO commercial sensitive price/margin keys");

    // ─────────────────────────────────────────────────────────────────────────
    // Final Summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n=======================================================");
    console.log(`   PHASE 11 TEST RUN COMPLETE`);
    console.log(`   RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log("=======================================================\n");

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    // Cleanup fixtures
    await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.quotationPackageOption.deleteMany({ where: { quotation: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.quotation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.traveler.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.tripHotel.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.tripVehicle.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.tripActivity.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.vehicle.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.activity.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runPhase11Tests();
