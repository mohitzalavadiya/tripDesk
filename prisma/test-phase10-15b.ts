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
import { customerPortalService } from "../src/lib/services/customer-portal-service";
import { operationsService } from "../src/lib/services/operations-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase1015BTests() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK PHASE 10.15B: CUSTOMER PORTAL & IDOR AUDIT");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `agency-cp-alpha-${timestamp}`;
  const agencyBId = `agency-cp-beta-${timestamp}`;
  const customerAId = `cust-alpha-${timestamp}`;
  const customerBId = `cust-beta-${timestamp}`;
  const tripAId = `trip-cp-alpha-${timestamp}`;
  const tripBId = `trip-cp-beta-${timestamp}`;
  const bookingAId = `bkg-cp-alpha-${timestamp}`;
  const bookingBId = `bkg-cp-beta-${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. Multi-Tenant Setup: Agencies, Customers, Trips, Operations
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixture Setup ---");

    // Create Agency Alpha
    await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Alpha Himalayan Adventures",
        email: `alpha-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        status: "ACTIVE",
      },
    });

    // Create Agency Beta
    await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Beta Kerala Travels",
        email: `beta-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    });

    // Create Customer A (Agency Alpha)
    const customerA = await prisma.customer.create({
      data: {
        id: customerAId,
        agencyId: agencyAId,
        customerNumber: `CUST-A-${timestamp}`,
        name: "Rahul Sharma",
        phone: "+91 9988776655",
        email: "rahul@example.com",
        city: "Delhi",
        state: "Delhi",
        country: "India",
      },
    });

    // Create Customer B (Agency Beta)
    const customerB = await prisma.customer.create({
      data: {
        id: customerBId,
        agencyId: agencyBId,
        customerNumber: `CUST-B-${timestamp}`,
        name: "Sneha Nair",
        phone: "+91 9988776656",
        email: "sneha@example.com",
        city: "Kochi",
        state: "Kerala",
        country: "India",
      },
    });

    // Create Hotel & Vehicle Masters for Agency Alpha
    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyAId,
        name: "The Grand Himalayan Resort",
        city: "Manali",
        category: "5 Star Luxury",
        phone: "+91 1902 250000",
      },
    });

    const vehicleA = await prisma.vehicle.create({
      data: {
        agencyId: agencyAId,
        name: "Toyota Innova Crysta",
        type: "SUV",
        capacity: 6,
      },
    });

    const activityA = await prisma.activity.create({
      data: {
        agencyId: agencyAId,
        name: "Solang Valley Paragliding Experience",
        type: "INCLUDED",
        location: "Solang Valley",
      },
    });

    // Create Trip A for Customer A
    const tripA = await prisma.trip.create({
      data: {
        id: tripAId,
        agencyId: agencyAId,
        customerId: customerAId,
        tripNumber: `TRIP-A-${timestamp}`,
        title: "Manali Snow & Adventure Vacation",
        startDate: new Date("2026-09-10"),
        endDate: new Date("2026-09-15"),
        status: "BOOKED",
        travelers: {
          create: [
            { name: "Rahul Sharma", type: "ADULT", isPrimary: true, phone: "+91 9988776655" },
            { name: "Pooja Sharma", type: "ADULT", isPrimary: false },
          ],
        },
        itineraryItems: {
          create: [
            { dayNumber: 1, title: "Arrival in Manali", description: "Airport pickup and hotel check-in.", location: "Manali" },
            { dayNumber: 2, title: "Solang Valley Tour", description: "Full day excursion and paragliding.", location: "Solang" },
          ],
        },
        tripHotels: {
          create: {
            hotelId: hotelA.id,
            roomType: "Deluxe Valley View",
            mealPlan: "MAP",
            checkIn: new Date("2026-09-10"),
            checkOut: new Date("2026-09-15"),
            rooms: 1,
            nightlyRate: 5000,
            totalAmount: 25000,
          },
        },
        tripVehicles: {
          create: {
            vehicleId: vehicleA.id,
            vehicleName: "Toyota Innova Crysta",
            vehicleType: "SUV",
            startDate: new Date("2026-09-10"),
            endDate: new Date("2026-09-15"),
            pickupLocation: "Chandigarh Airport",
            dropLocation: "Manali Mall Road",
            driverName: "Vikram Singh",
            driverPhone: "+91 9876500000",
            totalRate: 22000,
          },
        },
        tripActivities: {
          create: {
            activityId: activityA.id,
            name: "Solang Valley Paragliding Experience",
            date: new Date("2026-09-11"),
            numberOfParticipants: 2,
            totalPrice: 5000,
          },
        },
      },
    });

    // Create Booking A for Customer A
    const bookingA = await prisma.booking.create({
      data: {
        id: bookingAId,
        agencyId: agencyAId,
        tripId: tripAId,
        customerId: customerAId,
        bookingNumber: `BKG-A-${timestamp}`,
        status: "CONFIRMED",
        paymentStatus: "PARTIALLY_PAID",
        totalAmount: 100000,
        paidAmount: 40000,
        balanceAmount: 60000,
        packageOptionName: "Deluxe Explorer Package",
      },
    });

    // Add Completed Payment for Booking A
    const paymentA = await prisma.payment.create({
      data: {
        agencyId: agencyAId,
        bookingId: bookingAId,
        tripId: tripAId,
        customerId: customerAId,
        paymentNumber: `PAY-A-${timestamp}`,
        amount: 40000,
        paymentMethod: "UPI",
        status: "COMPLETED",
        receiptNumber: `REC-A-${timestamp}`,
      },
    });

    // Initialize TripOperation for Trip A
    const opA = await operationsService.initializeOperation(agencyAId, { tripId: tripAId, bookingId: bookingAId });

    // Create Trip B & Booking B for Customer B (Agency Beta)
    const tripB = await prisma.trip.create({
      data: {
        id: tripBId,
        agencyId: agencyBId,
        customerId: customerBId,
        tripNumber: `TRIP-B-${timestamp}`,
        title: "Kerala Backwaters & Tea Trails",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-06"),
        status: "BOOKED",
      },
    });

    const bookingB = await prisma.booking.create({
      data: {
        id: bookingBId,
        agencyId: agencyBId,
        tripId: tripBId,
        customerId: customerBId,
        bookingNumber: `BKG-B-${timestamp}`,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        totalAmount: 85000,
        paidAmount: 85000,
        balanceAmount: 0,
      },
    });

    const opB = await operationsService.initializeOperation(agencyBId, { tripId: tripBId, bookingId: bookingBId });

    assert(true, "Fixtures created for Customer A (Alpha) and Customer B (Beta)");

    // ═══════════════════════════════════════════════════════════════════
    // 2. Customer Bookings & Trip Listing (Own vs Cross-Customer)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Customer Bookings & Listing Access ---");

    const custABookings = await customerPortalService.getCustomerBookings(customerAId, agencyAId);
    assert(custABookings.length === 1, "Customer A can view their own booking list");
    assert(custABookings[0].bookingNumber === bookingA.bookingNumber, "Customer A booking number matches");
    assert(custABookings[0].totalAmount === "100000.00", "Customer A total amount is ₹100,000.00");
    assert(custABookings[0].balanceAmount === "60000.00", "Customer A balance amount is ₹60,000.00");

    // Cross-customer listing isolation
    const custBBookings = await customerPortalService.getCustomerBookings(customerBId, agencyBId);
    assert(custBBookings.length === 1, "Customer B can view their own booking list");
    assert(custBBookings[0].bookingNumber === bookingB.bookingNumber, "Customer B booking number matches");
    assert(!custABookings.some((b) => b.id === bookingBId), "Customer A booking list NEVER contains Customer B booking");
    assert(!custBBookings.some((b) => b.id === bookingAId), "Customer B booking list NEVER contains Customer A booking");

    // ═══════════════════════════════════════════════════════════════════
    // 3. Customer Trip Details & Content Verification
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Customer Trip Detail & Whitelist Inspection ---");

    const tripADetail = await customerPortalService.getCustomerTripDetail(customerAId, agencyAId, tripAId);
    assert(tripADetail !== null, "Customer A can access their own trip detail view");
    assert(tripADetail?.title === "Manali Snow & Adventure Vacation", "Trip title matches");
    assert(tripADetail?.travelers.length === 2, "Travelers count matches (2 passengers)");
    assert(tripADetail?.itinerary.length === 2, "Itinerary days match (2 days)");
    assert(tripADetail?.accommodations.length === 1, "Hotel accommodations list matches");
    assert(tripADetail?.accommodations[0].hotelName === "The Grand Himalayan Resort", "Hotel name is displayed");
    assert(tripADetail?.transfers.length === 1, "Vehicle transfer is displayed");
    assert(tripADetail?.activities.length === 1, "Activity excursion is displayed");

    // IDOR Protection: Customer A attempts to access Customer B's trip
    const crossTripAccess = await customerPortalService.getCustomerTripDetail(customerAId, agencyAId, tripBId);
    assert(crossTripAccess === null, "Customer A accessing Customer B trip returns null / 404 (IDOR BLOCKED)");

    const crossTenantTripAccess = await customerPortalService.getCustomerTripDetail(customerAId, agencyBId, tripAId);
    assert(crossTenantTripAccess === null, "Cross-agency customer trip lookup returns null / 404 (IDOR BLOCKED)");

    // ═══════════════════════════════════════════════════════════════════
    // 4. Commercial Data Privacy Scan (Zero Cost / Margin Leakage)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 4. Commercial Data Privacy Scan ---");

    const serializedPayload = JSON.stringify(tripADetail);
    assert(!serializedPayload.includes("costPrice"), "Customer trip payload contains ZERO costPrice occurrences");
    assert(!serializedPayload.includes("supplierPayable"), "Customer trip payload contains ZERO supplierPayable occurrences");
    assert(!serializedPayload.includes("markupPercentage"), "Customer trip payload contains ZERO markupPercentage occurrences");
    assert(!serializedPayload.includes("markupAmount"), "Customer trip payload contains ZERO markupAmount occurrences");
    assert(!serializedPayload.includes("grossProfit"), "Customer trip payload contains ZERO grossProfit occurrences");
    assert(!serializedPayload.includes("profitMargin"), "Customer trip payload contains ZERO profitMargin occurrences");
    assert(!serializedPayload.includes("operationalExpense"), "Customer trip payload contains ZERO operationalExpense occurrences");
    assert(!serializedPayload.includes("internalNotes"), "Customer trip payload contains ZERO internalNotes occurrences");

    // ═══════════════════════════════════════════════════════════════════
    // 5. Customer Travel Documents & Voucher Downloads (IDOR Audit)
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Customer Documents & Voucher IDOR Audit ---");

    const docsA = await customerPortalService.getCustomerTripDocuments(customerAId, agencyAId, tripAId);
    assert(docsA.length >= 3, `Customer A has ${docsA.length} travel documents available`);

    const bookingConfirmationDoc = docsA.find((d) => d.type === "BOOKING_CONFIRMATION");
    const travelKitDoc = docsA.find((d) => d.type === "TRAVEL_KIT");
    const hotelVoucherDoc = docsA.find((d) => d.type === "HOTEL_VOUCHER");
    const vehicleVoucherDoc = docsA.find((d) => d.type === "VEHICLE_VOUCHER");
    const activityPassDoc = docsA.find((d) => d.type === "ACTIVITY_PASS");

    assert(!!bookingConfirmationDoc, "Booking confirmation doc is available");
    assert(!!travelKitDoc, "Travel Kit voucher pack is available");
    assert(!!hotelVoucherDoc, "Hotel voucher is available");
    assert(!!vehicleVoucherDoc, "Vehicle dispatch voucher is available");
    assert(!!activityPassDoc, "Activity excursion pass is available");

    // Download own documents
    if (bookingConfirmationDoc) {
      const pdf = await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyAId,
        tripAId,
        "BOOKING_CONFIRMATION",
        bookingConfirmationDoc.id
      );
      assert(pdf.buffer.length > 1000, `Customer A downloaded own Booking Confirmation (${pdf.buffer.length} bytes)`);
    }

    if (hotelVoucherDoc) {
      const pdf = await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyAId,
        tripAId,
        "HOTEL_VOUCHER",
        hotelVoucherDoc.id
      );
      assert(pdf.buffer.length > 1000, `Customer A downloaded own Hotel Voucher (${pdf.buffer.length} bytes)`);
    }

    if (vehicleVoucherDoc) {
      const pdf = await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyAId,
        tripAId,
        "VEHICLE_VOUCHER",
        vehicleVoucherDoc.id
      );
      assert(pdf.buffer.length > 1000, `Customer A downloaded own Vehicle Voucher (${pdf.buffer.length} bytes)`);
    }

    if (activityPassDoc) {
      const pdf = await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyAId,
        tripAId,
        "ACTIVITY_PASS",
        activityPassDoc.id
      );
      assert(pdf.buffer.length > 1000, `Customer A downloaded own Activity Pass (${pdf.buffer.length} bytes)`);
    }

    // IDOR Security Tests on Documents
    let hotelDocTamperedBlocked = false;
    try {
      // Customer A tries to download Hotel Voucher using tripB's operation confirmation ID
      await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyAId,
        tripBId,
        "HOTEL_VOUCHER",
        hotelVoucherDoc?.id || "fake"
      );
    } catch {
      hotelDocTamperedBlocked = true;
    }
    assert(hotelDocTamperedBlocked, "Customer A downloading Customer B trip document is BLOCKED (IDOR)");

    let crossAgencyDocBlocked = false;
    try {
      await customerPortalService.downloadCustomerDocument(
        customerAId,
        agencyBId,
        tripAId,
        "HOTEL_VOUCHER",
        hotelVoucherDoc?.id || "fake"
      );
    } catch {
      crossAgencyDocBlocked = true;
    }
    assert(crossAgencyDocBlocked, "Customer A downloading document across agency boundary is BLOCKED");

    // ═══════════════════════════════════════════════════════════════════
    // 6. Customer Payment Ledger & Receipts
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Customer Payments Ledger ---");

    const paymentsA = await customerPortalService.getCustomerTripPayments(customerAId, agencyAId, tripAId);
    assert(paymentsA !== null, "Customer A can view their own payment ledger");
    assert(paymentsA?.totalAmount === "100000.00", "Total amount is ₹100,000.00");
    assert(paymentsA?.paidAmount === "40000.00", "Paid amount is ₹40,000.00");
    assert(paymentsA?.balanceAmount === "60000.00", "Outstanding balance is ₹60,000.00");
    assert(paymentsA?.payments.length === 1, "Payment transaction record is present");
    assert(paymentsA?.payments[0].receiptNumber === `REC-A-${timestamp}`, "Receipt number matches");

    // Cross-customer payment ledger access
    const crossPaymentAccess = await customerPortalService.getCustomerTripPayments(customerAId, agencyAId, tripBId);
    assert(crossPaymentAccess === null, "Customer A accessing Customer B payments returns null / 404 (IDOR BLOCKED)");

    // ═══════════════════════════════════════════════════════════════════
    // 7. Customer Profile Read & Update
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Customer Profile Security ---");

    const profileA = await customerPortalService.getCustomerProfile(customerAId, agencyAId);
    assert(profileA?.name === "Rahul Sharma", "Customer A reads own profile name");
    assert(profileA?.city === "Delhi", "Customer A reads own profile city");

    const updatedProfileA = await customerPortalService.updateCustomerProfile(customerAId, agencyAId, {
      city: "New Delhi",
      address: "123 Connaught Place",
    });
    assert(updatedProfileA.city === "New Delhi", "Customer A updates own city to 'New Delhi'");
    assert(updatedProfileA.address === "123 Connaught Place", "Customer A updates own address");

    // Cross-customer profile update attempt
    let crossProfileUpdateBlocked = false;
    try {
      await customerPortalService.updateCustomerProfile(customerBId, agencyAId, {
        name: "Hacked Name",
      });
    } catch {
      crossProfileUpdateBlocked = true;
    }
    assert(crossProfileUpdateBlocked, "Updating profile across tenant boundary is BLOCKED");

    // ═══════════════════════════════════════════════════════════════════
    // 8. Customer Feedback Submission & Tenant Scoping
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 8. Customer Feedback & Post-Tour Ratings ---");

    const feedbackA = await customerPortalService.submitCustomerTripFeedback(customerAId, agencyAId, tripAId, {
      rating: 5,
      serviceRating: 5,
      hotelRating: 5,
      driverRating: 5,
      comments: "Exceptional tour arrangements and punctual chauffeur service!",
    });
    assert(feedbackA.rating === 5, "Customer A submits 5★ rating on own trip");
    assert(feedbackA.tripId === tripAId, "Feedback linked to Trip A");
    assert(feedbackA.customerId === customerAId, "Feedback linked to Customer A");

    // Cross-customer feedback attempt
    let crossFeedbackBlocked = false;
    try {
      await customerPortalService.submitCustomerTripFeedback(customerAId, agencyAId, tripBId, {
        rating: 1,
        comments: "Malicious cross-customer review attempt",
      });
    } catch {
      crossFeedbackBlocked = true;
    }
    assert(crossFeedbackBlocked, "Customer A submitting feedback on Customer B trip is BLOCKED (IDOR)");

    // ═══════════════════════════════════════════════════════════════════
    // 9. Customer Access Lookup
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 9. Customer Portal Access Lookup ---");

    const validLookup = await customerPortalService.lookupCustomerAccess(bookingA.bookingNumber, customerA.phone);
    assert(validLookup?.customerId === customerAId, "Lookup by booking number and phone resolves Customer A");

    const invalidPhoneLookup = await customerPortalService.lookupCustomerAccess(bookingA.bookingNumber, "+91 0000000000");
    assert(invalidPhoneLookup === null, "Lookup with mismatched phone number is REJECTED");

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  } finally {
    // Cleanup fixtures
    try {
      await prisma.customerFeedback.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.itineraryItem.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.traveler.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.tripHotel.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.tripVehicle.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.tripActivity.deleteMany({ where: { trip: { agencyId: { in: [agencyAId, agencyBId] } } } });
      await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.vehicle.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.activity.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } });
      await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n=======================================================");
  console.log("   PHASE 10.15B TEST SUITE COMPLETE");
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1015BTests();
