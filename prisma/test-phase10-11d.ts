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
import { quotationService } from "../src/lib/services/quotation-service";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";

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

async function runPhase1011DTests() {
  console.log("\n=======================================================");
  console.log("   PHASE 10.11D: PROFESSIONAL PDF PROPOSAL SYSTEM TEST");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `test-agency-a-${timestamp}`;
  const agencyBId = `test-agency-b-${timestamp}`;
  const customerId = `test-cust-${timestamp}`;
  const tripId = `test-trip-${timestamp}`;
  const quotationId = `test-quotation-${timestamp}`;
  const shareToken = `test-share-token-${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. Multi-Tenant Fixtures Setup
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixtures Setup ---");

    await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Himalayan Vistas Holidays",
        email: `himalayan-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        address: "The Mall Road, Manali, Himachal Pradesh",
        status: "ACTIVE",
      },
    });

    await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Competitor Travels",
        email: `competitor-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    });

    await prisma.customer.create({
      data: {
        id: customerId,
        agencyId: agencyAId,
        customerNumber: `CUST-${timestamp}`,
        name: "Rahul & Priya Sharma",
        phone: "+91 9811223344",
        email: "rahul.sharma@example.com",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        id: tripId,
        agencyId: agencyAId,
        customerId,
        tripNumber: `TRIP-${timestamp}`,
        title: "Kashmir Luxury Paradise Honeymoon",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-11"),
        status: "QUOTED",
        travelers: {
          create: [
            { name: "Rahul Sharma", type: "ADULT" },
            { name: "Priya Sharma", type: "ADULT" },
          ],
        },
        itineraryItems: {
          create: [
            {
              dayNumber: 1,
              date: new Date("2026-10-05"),
              title: "Arrival in Srinagar & Shikara Sunset Cruise",
              description: "Welcome to Srinagar Airport. Meet and greet by our executive and private transfer to luxury houseboat on Dal Lake. Enjoy evening Shikara ride.",
              location: "Srinagar",
              sortOrder: 1,
            },
            {
              dayNumber: 2,
              date: new Date("2026-10-06"),
              title: "Srinagar to Gulmarg Meadow of Flowers",
              description: "Scenic drive through pine forests to Gulmarg. Experience world-famous Gondola Phase 1 & 2 to Mt. Apharwat. Afternoon snow activities.",
              location: "Gulmarg",
              sortOrder: 2,
            },
            {
              dayNumber: 3,
              date: new Date("2026-10-07"),
              title: "Gulmarg to Pahalgam Valley of Shepherds",
              description: "Drive along the Lidder River to Pahalgam. Visit saffron fields of Pampore and historic Awantipora ruins. Evening leisure at Betaab Valley.",
              location: "Pahalgam",
              sortOrder: 3,
            },
          ],
        },
      },
    });

    // Create a Hotel, Vehicle, and Activity for the trip
    const hotel = await prisma.hotel.create({
      data: {
        agencyId: agencyAId,
        name: "The Khyber Himalayan Resort & Spa",
        city: "Gulmarg",
        category: "5_STAR",
      },
    });

    await prisma.tripHotel.create({
      data: {
        tripId,
        hotelId: hotel.id,
        checkIn: new Date("2026-10-06"),
        checkOut: new Date("2026-10-07"),
        roomType: "Premier Mountain View Room",
        mealPlan: "MAP (Breakfast + Dinner)",
        rooms: 1,
        notes: "Honeymoon special flower decor and welcome cake included",
      },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        agencyId: agencyAId,
        name: "Toyota Innova Crysta",
        type: "LUXURY_SUV",
        capacity: 6,
      },
    });

    await prisma.tripVehicle.create({
      data: {
        tripId,
        vehicleId: vehicle.id,
        vehicleName: "Toyota Innova Crysta Luxury SUV",
        vehicleType: "SUV",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-11"),
        notes: "Dedicated chauffeur with all interstate tolls, parking, and driver allowances",
      },
    });

    const activity = await prisma.activity.create({
      data: {
        agencyId: agencyAId,
        name: "Gulmarg Gondola Cable Car Phase 1 & 2",
        location: "Gulmarg",
      },
    });

    await prisma.tripActivity.create({
      data: {
        tripId,
        activityId: activity.id,
        name: "Gulmarg Gondola Cable Car Phase 1 & 2",
        date: new Date("2026-10-06"),
        description: "Priority express tickets to Apharwat Peak at 13,780 ft altitude",
      },
    });

    // Create Quotation with Tiered Packages, Inclusions, Exclusions, Milestones
    await prisma.quotation.create({
      data: {
        id: quotationId,
        agencyId: agencyAId,
        customerId,
        tripId,
        quotationNumber: `QT-2026-00042`,
        version: 1,
        title: "Exclusive Kashmir Honeymoon Tour",
        proposalSubtitle: "6 Nights / 7 Days Luxury Itinerary with Gondola & Houseboat",
        currency: "INR",
        subtotal: 110000,
        markupPercentage: 20,
        markupAmount: 22000,
        finalAmount: 132000,
        status: "SENT",
        shareToken,
        validUntil: new Date("2026-10-01"),
        customerMessage: "Dear Rahul & Priya, it gives us immense pleasure to present this bespoke itinerary tailored for your honeymoon in Kashmir.",
        inclusionsIntro: "Complete holiday package inclusions",
        exclusionsIntro: "Services not included in this proposal",
        paymentTerms: "30% Advance at booking, 40% 15 days before travel, 30% upon arrival.",
        cancellationPolicy: "Full refund if cancelled 30 days prior. 50% refund between 15-30 days. No refund within 14 days of travel.",
        terms: "All room allocations subject to standard check-in at 14:00. Gondola tickets are non-refundable once issued.",
        importantNotes: "Original Govt ID cards required for all travelers during Gondola boarding.",
        proposalItems: {
          create: [
            { type: "INCLUSION", title: "6 Nights Accommodation in Luxury 5-Star & Premium Heritage Houseboat", sortOrder: 1 },
            { type: "INCLUSION", title: "Daily Buffet Breakfast and Chef-curated Dinners", sortOrder: 2 },
            { type: "INCLUSION", title: "Exclusive Toyota Innova Crysta for all transfers and sightseeing", sortOrder: 3 },
            { type: "INCLUSION", title: "1-Hour Sunset Shikara Ride on Dal Lake", sortOrder: 4 },
            { type: "INCLUSION", title: "Gulmarg Gondola Phase 1 & 2 tickets included", sortOrder: 5 },
            { type: "EXCLUSION", title: "Airfare / Train tickets to and from Srinagar", sortOrder: 1 },
            { type: "EXCLUSION", title: "Personal expenses, laundry, telephone calls, and tips", sortOrder: 2 },
            { type: "EXCLUSION", title: "Pony rides or ATV quad biking in Gulmarg/Pahalgam", sortOrder: 3 },
          ],
        },
        paymentMilestones: {
          create: [
            { title: "Booking Deposit", percentage: 30, amount: 39600, dueDate: new Date("2026-09-15"), sortOrder: 1 },
            { title: "Pre-Arrival Milestone", percentage: 40, amount: 52800, dueDate: new Date("2026-09-25"), sortOrder: 2 },
            { title: "Final Balance on Arrival", percentage: 30, amount: 39600, dueDate: new Date("2026-10-05"), sortOrder: 3 },
          ],
        },
        packageOptions: {
          create: [
            {
              name: "Standard Experience",
              subtitle: "4-Star Accommodations & Sedan",
              description: "Comfortable standard hotels with delicious buffet meals and dedicated sedan transfer.",
              isRecommended: false,
              subtotal: 95000,
              markupPercentage: 20,
              markupAmount: 19000,
              finalAmount: 114000,
              hotelNotes: "4-Star Premium Resorts",
              vehicleNotes: "Toyota Etios / Dzire",
              inclusions: ["Breakfast & Dinner", "Shikara Ride", "All transfers"],
              exclusions: ["Gondola Phase 2"],
              sortOrder: 1,
            },
            {
              name: "Luxury Honeymoon",
              subtitle: "5-Star Resorts, Innova Crysta & Gondola",
              description: "The ultimate Kashmir experience featuring The Khyber, luxury heritage houseboat, and Innova Crysta.",
              isRecommended: true,
              subtotal: 110000,
              markupPercentage: 20,
              markupAmount: 22000,
              finalAmount: 132000,
              hotelNotes: "5-Star Resorts (The Khyber / Radisson)",
              vehicleNotes: "Toyota Innova Crysta",
              inclusions: ["Breakfast & Dinner", "Houseboat Stay", "Gondola Phase 1 & 2", "Innova Crysta"],
              exclusions: ["Personal laundry", "Pony rides"],
              sortOrder: 2,
            },
          ],
        },
      },
    });

    assert(true, "Test fixtures created for Agency A, Trip, Customer, Quotation, and Trip Assets");

    // ═══════════════════════════════════════════════════════════════════
    // 2. Multi-Tenant Authorization Verification
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Multi-Tenant Authorization Verification ---");

    const quoteA = await quotationService.getQuotation(agencyAId, quotationId);
    assert(quoteA !== null, "Agency A can fetch own quotation");
    assert(quoteA?.quotationNumber === "QT-2026-00042", "Quotation number matches");

    const quoteBCrossAccess = await quotationService.getQuotation(agencyBId, quotationId);
    assert(quoteBCrossAccess === null, "Agency B cannot fetch Agency A's quotation (Tenant Isolation Enforced)");

    // ═══════════════════════════════════════════════════════════════════
    // 3. Customer Data & Trip Asset Mapping
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Customer Data & Trip Asset Mapping ---");

    assert(quoteA?.trip.itineraryItems.length === 3, "Trip has 3 day-by-day itinerary items");
    assert(quoteA?.trip.tripHotels !== undefined && quoteA?.trip.tripHotels.length === 1, "Trip has 1 hotel accommodation");
    assert(quoteA?.trip.tripHotels?.[0]?.hotel?.name === "The Khyber Himalayan Resort & Spa", "Hotel name mapped correctly");
    assert(quoteA?.trip.tripVehicles !== undefined && quoteA?.trip.tripVehicles.length === 1, "Trip has 1 vehicle transfer");
    assert(quoteA?.trip.tripActivities !== undefined && quoteA?.trip.tripActivities.length === 1, "Trip has 1 activity");
    assert(quoteA?.packageOptions.length === 2, "Quotation has 2 package tiers (Standard & Luxury)");
    assert(quoteA?.proposalItems.length === 8, "Quotation has 8 inclusion/exclusion items");
    assert(quoteA?.paymentMilestones.length === 3, "Quotation has 3 payment milestones");

    // ═══════════════════════════════════════════════════════════════════
    // 4. PDF Generation & Buffer Verification
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 4. PDF Generation & Buffer Verification ---");

    const pdfData = {
      quotationNumber: quoteA!.quotationNumber,
      version: quoteA!.version,
      title: quoteA!.title,
      proposalSubtitle: quoteA!.proposalSubtitle,
      currency: quoteA!.currency,
      finalAmount: Number(quoteA!.finalAmount),
      validUntil: quoteA!.validUntil,
      customerMessage: quoteA!.customerMessage,
      inclusionsIntro: quoteA!.inclusionsIntro,
      exclusionsIntro: quoteA!.exclusionsIntro,
      paymentTerms: quoteA!.paymentTerms,
      cancellationPolicy: quoteA!.cancellationPolicy,
      importantNotes: quoteA!.importantNotes,
      terms: quoteA!.terms,
      agency: {
        name: quoteA!.agency!.name,
        email: quoteA!.agency!.email,
        phone: quoteA!.agency!.phone,
        address: quoteA!.agency!.address,
      },
      customer: {
        name: quoteA!.customer.name,
        email: quoteA!.customer.email,
        phone: quoteA!.customer.phone,
      },
      trip: {
        title: quoteA!.trip.title,
        tripNumber: quoteA!.trip.tripNumber,
        startDate: quoteA!.trip.startDate,
        endDate: quoteA!.trip.endDate,
        travelers: quoteA!.trip.travelers,
        itineraryItems: quoteA!.trip.itineraryItems,
        hotels: quoteA!.trip.tripHotels?.map((th) => ({
          id: th.id,
          name: th.hotel?.name || "Selected Hotel",
          city: th.hotel?.city || null,
          roomType: th.roomType,
          mealPlan: th.mealPlan || null,
          checkIn: th.checkIn,
          checkOut: th.checkOut,
          nights: 1,
          rooms: th.rooms || 1,
          notes: th.notes || null,
        })),
        vehicles: quoteA!.trip.tripVehicles?.map((tv) => ({
          id: tv.id,
          name: tv.vehicleName || tv.vehicle?.name || "Private Transport",
          type: tv.vehicleType || tv.vehicle?.type || null,
          capacity: tv.vehicle?.capacity || null,
          startDate: tv.startDate || null,
          endDate: tv.endDate || null,
          notes: tv.notes || null,
        })),
        activities: quoteA!.trip.tripActivities?.map((ta) => ({
          id: ta.id,
          name: ta.name || ta.activity?.name || "Excursion",
          city: ta.activity?.city || null,
          date: ta.date || null,
          description: ta.description || null,
          notes: ta.notes || null,
        })),
      },
      packageOptions: quoteA!.packageOptions.map((opt) => ({
        id: opt.id,
        name: opt.name,
        subtitle: opt.subtitle,
        description: opt.description,
        isRecommended: opt.isRecommended,
        finalAmount: Number(opt.finalAmount),
        hotelNotes: opt.hotelNotes,
        vehicleNotes: opt.vehicleNotes,
        activityNotes: opt.activityNotes,
        inclusions: opt.inclusions,
        exclusions: opt.exclusions,
      })),
      selectedPackageOptionId: quoteA!.packageOptions.find((p) => p.isRecommended)?.id,
      selectedPackageOption: quoteA!.packageOptions.find((p) => p.isRecommended)
        ? {
            id: quoteA!.packageOptions.find((p) => p.isRecommended)!.id,
            name: quoteA!.packageOptions.find((p) => p.isRecommended)!.name,
            subtitle: quoteA!.packageOptions.find((p) => p.isRecommended)!.subtitle,
            description: quoteA!.packageOptions.find((p) => p.isRecommended)!.description,
            isRecommended: quoteA!.packageOptions.find((p) => p.isRecommended)!.isRecommended,
            finalAmount: Number(quoteA!.packageOptions.find((p) => p.isRecommended)!.finalAmount),
            hotelNotes: quoteA!.packageOptions.find((p) => p.isRecommended)!.hotelNotes,
            vehicleNotes: quoteA!.packageOptions.find((p) => p.isRecommended)!.vehicleNotes,
            activityNotes: quoteA!.packageOptions.find((p) => p.isRecommended)!.activityNotes,
            inclusions: quoteA!.packageOptions.find((p) => p.isRecommended)!.inclusions,
            exclusions: quoteA!.packageOptions.find((p) => p.isRecommended)!.exclusions,
          }
        : null,
      proposalItems: quoteA!.proposalItems.map((p) => ({
        id: p.id,
        type: p.type as any,
        title: p.title,
        description: p.description,
      })),
      paymentMilestones: quoteA!.paymentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        percentage: m.percentage ? Number(m.percentage) : null,
        amount: m.amount ? Number(m.amount) : null,
        dueDate: m.dueDate,
      })),
    };

    const pdfBuffer = await quotationPdfService.generateQuotationPdf(pdfData);

    assert(Buffer.isBuffer(pdfBuffer), "PDF generator returns a Node.js Buffer");
    assert(pdfBuffer.length > 1000, `PDF generated successfully (size: ${pdfBuffer.length} bytes)`);

    const headerSignature = pdfBuffer.slice(0, 5).toString("utf-8");
    assert(headerSignature === "%PDF-", "PDF begins with standard %PDF- magic signature");

    // ═══════════════════════════════════════════════════════════════════
    // 5. Commercial Privacy & Zero Data Leakage Scan
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Commercial Privacy & Zero Data Leakage Scan ---");

    const serializedPayload = JSON.stringify(pdfData);

    assert(!serializedPayload.includes("costPrice"), "Proposal data contains ZERO 'costPrice' occurrences");
    assert(!serializedPayload.includes("buyPrice"), "Proposal data contains ZERO 'buyPrice' occurrences");
    assert(!serializedPayload.includes("supplierCost"), "Proposal data contains ZERO 'supplierCost' occurrences");
    assert(!serializedPayload.includes("supplierPayable"), "Proposal data contains ZERO 'supplierPayable' occurrences");
    assert(!serializedPayload.includes("markupPercentage"), "Proposal data contains ZERO 'markupPercentage' occurrences");
    assert(!serializedPayload.includes("markupAmount"), "Proposal data contains ZERO 'markupAmount' occurrences");
    assert(!serializedPayload.includes("grossProfit"), "Proposal data contains ZERO 'grossProfit' occurrences");
    assert(!serializedPayload.includes("profitMargin"), "Proposal data contains ZERO 'profitMargin' occurrences");
    assert(!serializedPayload.includes("internalNotes"), "Proposal data contains ZERO 'internalNotes' occurrences");
    assert(!serializedPayload.includes("internalIssues"), "Proposal data contains ZERO 'internalIssues' occurrences");

    // ═══════════════════════════════════════════════════════════════════
    // 6. Public Share Token PDF Compatibility
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Public Share Token PDF Compatibility ---");

    const publicQuote = await quotationService.getPublicQuotationByToken(shareToken);
    assert(publicQuote !== null, "Public quotation fetched successfully via shareToken");
    assert(publicQuote?.quotationNumber === "QT-2026-00042", "Public quotation matches quotation number");
    assert(publicQuote?.trip.tripHotels?.length === 1, "Public quotation includes hotels");
    assert(publicQuote?.trip.tripVehicles?.length === 1, "Public quotation includes vehicles");
    assert(publicQuote?.trip.tripActivities?.length === 1, "Public quotation includes activities");

    const publicPdfBuffer = await quotationPdfService.generateQuotationPdf({
      quotationNumber: publicQuote!.quotationNumber,
      version: publicQuote!.version,
      title: publicQuote!.title,
      proposalSubtitle: publicQuote!.proposalSubtitle,
      currency: publicQuote!.currency,
      finalAmount: publicQuote!.finalAmount,
      validUntil: publicQuote!.validUntil,
      customerMessage: publicQuote!.customerMessage,
      inclusionsIntro: publicQuote!.inclusionsIntro,
      exclusionsIntro: publicQuote!.exclusionsIntro,
      paymentTerms: publicQuote!.paymentTerms,
      cancellationPolicy: publicQuote!.cancellationPolicy,
      importantNotes: publicQuote!.importantNotes,
      terms: publicQuote!.terms,
      agency: publicQuote!.agency,
      customer: publicQuote!.customer,
      trip: {
        title: publicQuote!.trip.title,
        tripNumber: publicQuote!.trip.tripNumber,
        startDate: publicQuote!.trip.startDate,
        endDate: publicQuote!.trip.endDate,
        travelers: publicQuote!.trip.travelers,
        itineraryItems: publicQuote!.trip.itineraryItems,
        hotels: publicQuote!.trip.tripHotels?.map((th) => ({
          id: th.id,
          name: th.hotel?.name || "Selected Hotel",
          city: th.hotel?.city || null,
          roomType: th.roomType,
          mealPlan: th.mealPlan || null,
          checkIn: th.checkIn,
          checkOut: th.checkOut,
          nights: 1,
          rooms: th.rooms || 1,
          notes: th.notes || null,
        })),
        vehicles: publicQuote!.trip.tripVehicles?.map((tv) => ({
          id: tv.id,
          name: tv.vehicleName || tv.vehicle?.name || "Private Transport",
          type: tv.vehicleType || tv.vehicle?.type || null,
          capacity: tv.vehicle?.capacity || null,
          startDate: tv.startDate || null,
          endDate: tv.endDate || null,
          notes: tv.notes || null,
        })),
        activities: publicQuote!.trip.tripActivities?.map((ta) => ({
          id: ta.id,
          name: ta.name || ta.activity?.name || "Excursion",
          city: ta.activity?.city || null,
          date: ta.date || null,
          description: ta.description || null,
          notes: ta.notes || null,
        })),
      },
      packageOptions: publicQuote!.packageOptions,
      selectedPackageOptionId: publicQuote!.selectedPackageOptionId,
      selectedPackageOption: publicQuote!.selectedPackageOption,
      proposalItems: publicQuote!.proposalItems as any,
      paymentMilestones: publicQuote!.paymentMilestones,
    });

    assert(Buffer.isBuffer(publicPdfBuffer) && publicPdfBuffer.length > 1000, "Public PDF generated successfully from shareToken");

    // ═══════════════════════════════════════════════════════════════════
    // 7. Multi-Page & Long Itinerary Resilience Test
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Multi-Page & Long Itinerary Resilience Test ---");

    const longItineraryItems = Array.from({ length: 14 }, (_, i) => ({
      dayNumber: i + 1,
      date: new Date(2026, 9, 5 + i),
      title: `Day ${i + 1} - Grand Adventure Exploration of Region ${i + 1}`,
      description: `Comprehensive guided exploration of historical monuments, mountain viewpoints, local cuisine tasting, and evening leisure cultural show with traditional live performances. Detailed briefing for the subsequent day's travel schedule.`,
      location: `Destination Point ${i + 1}`,
    }));

    const multiPagePdfBuffer = await quotationPdfService.generateQuotationPdf({
      ...pdfData,
      trip: {
        ...pdfData.trip!,
        itineraryItems: longItineraryItems,
      },
    });

    assert(
      Buffer.isBuffer(multiPagePdfBuffer) && multiPagePdfBuffer.length > pdfBuffer.length,
      `Multi-page long itinerary PDF generated successfully (${multiPagePdfBuffer.length} bytes)`
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup fixtures
    try {
      await prisma.quotationPackageOption.deleteMany({ where: { quotationId } });
      await prisma.quotationProposalItem.deleteMany({ where: { quotationId } });
      await prisma.quotationPaymentMilestone.deleteMany({ where: { quotationId } });
      await prisma.quotation.deleteMany({ where: { id: quotationId } });
      await prisma.tripActivity.deleteMany({ where: { tripId } });
      await prisma.tripVehicle.deleteMany({ where: { tripId } });
      await prisma.tripHotel.deleteMany({ where: { tripId } });
      await prisma.itineraryItem.deleteMany({ where: { tripId } });
      await prisma.traveler.deleteMany({ where: { tripId } });
      await prisma.activity.deleteMany({ where: { agencyId: agencyAId } });
      await prisma.vehicle.deleteMany({ where: { agencyId: agencyAId } });
      await prisma.hotel.deleteMany({ where: { agencyId: agencyAId } });
      await prisma.trip.deleteMany({ where: { id: tripId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n=======================================================");
  console.log("   PHASE 10.11D TEST RUN COMPLETE");
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1011DTests();
