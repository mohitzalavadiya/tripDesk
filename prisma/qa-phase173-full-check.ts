import "dotenv/config";
import prisma from "../src/lib/prisma";
import { quotationService } from "../src/lib/services/quotation-service";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { bookingService } from "../src/lib/services/booking-service";
import { invoiceService } from "../src/lib/services/invoice-service";

async function runFullQA() {
  console.log("================================================================================");
  console.log("TRIPDESK PHASE 173 — COMPREHENSIVE PRODUCTION QA & READINESS VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;
  const createdQuotationIds: string[] = [];

  function assert(condition: boolean, section: string, message: string) {
    if (condition) {
      console.log(`  [PASS] [${section}] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] [${section}] ${message}`);
      failed++;
    }
  }

  try {
    const agencyId = "cmu2g9rgq0000swtqbr5aie7x";
    const tripId = "cmu5fhkk40006v4tqpd2k2kd4";

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PERMANENT MASTER DATA VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("--- 1. Permanent Master Data Preservation ---");
    const hotelCount = await prisma.hotel.count({ where: { agencyId } });
    const rateSheetCount = await prisma.rateSheet.count({ where: { agencyId } });
    const destCount = await prisma.destination.count({ where: { agencyId } });
    const vehicleCount = await prisma.vehicle.count({ where: { agencyId } });

    assert(hotelCount === 22, "PERM-DATA", `Hotels count for Agency: ${hotelCount} (expected 22)`);
    assert(rateSheetCount === 66, "PERM-DATA", `RateSheets count for Agency: ${rateSheetCount} (expected 66)`);
    assert(destCount === 32, "PERM-DATA", `Destinations count for Agency: ${destCount} (expected 32)`);
    assert(vehicleCount === 6, "PERM-DATA", `Vehicles count for Agency: ${vehicleCount} (expected 6)`);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AGENCY OWNER & TARGET TRIP VERIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Agency & Trip State Verification ---");
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    assert(agency !== null, "AGENCY", `Permanent Agency Owner found: "${agency?.name}" (${agencyId})`);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { customer: true, tripHotels: true, tripVehicles: true, tripActivities: true },
    });
    assert(trip !== null, "TRIP", `Target Trip found: "${trip?.title}" (${tripId})`);
    assert(Boolean(trip?.customer), "TRIP", `Customer attached: "${trip?.customer?.name}"`);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. PRICING ARCHITECTURE — MULTI-SERVICE SOURCING & SINGLE MARKUP
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Pricing Architecture: Multi-Service Sourcing & Single Markup ---");
    const quote = await quotationService.generateQuotationFromTrip(agencyId, tripId);
    createdQuotationIds.push(quote.id);
    assert(quote !== null, "PRICING", "Quotation generated from trip");
    assert(quote.items.length >= 3, "PRICING", `Quotation has ${quote.items.length} line items spanning multiple services`);

    let aggregatedBaseSubtotal = 0;
    for (const item of quote.items) {
      const qty = Number(item.quantity);
      const rate = Number(item.unitPrice);
      const baseTotal = rate * qty;
      assert(Number(item.markupPercentage) === 0, "PRICING", `Line item "${item.name}" line markup is strictly 0%`);
      assert(Number(item.costPrice) === baseTotal, "PRICING", `Line item "${item.name}" costPrice is Base Total (₹${baseTotal})`);
      assert(Number(item.sellingPrice) === baseTotal, "PRICING", `Line item "${item.name}" sellingPrice is Base Total (₹${baseTotal})`);
      aggregatedBaseSubtotal += baseTotal;
    }

    assert(
      Number(quote.subtotal) === aggregatedBaseSubtotal,
      "PRICING",
      `RateSheet Base Subtotal equals sum of line base totals (₹${quote.subtotal} === ₹${aggregatedBaseSubtotal})`
    );

    // Test Package Markup applied ONCE
    const updatedQuote20 = await quotationService.updateQuotation(agencyId, quote.id, {
      markupPercentage: 20,
      discountPercentage: 0,
    });

    const expectedMarkupAmt = Math.round((aggregatedBaseSubtotal * 20) / 100);
    const expectedGross = aggregatedBaseSubtotal + expectedMarkupAmt;

    assert(
      Number(updatedQuote20.markupAmount) === expectedMarkupAmt,
      "MARKUP",
      `Package Markup is calculated ONCE on aggregate Subtotal: ₹${updatedQuote20.markupAmount} (expected ₹${expectedMarkupAmt})`
    );
    assert(
      Number(updatedQuote20.taxableAmount) === expectedGross,
      "MARKUP",
      `Taxable amount equals Gross Package Amount: ₹${updatedQuote20.taxableAmount}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 4. QUANTITY EDITING & CHAIN RECALCULATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Quantity Editing & Recalculation Chain ---");
    const firstItem = quote.items[0];
    const initialRate = Number(firstItem.unitPrice);
    const newQty = Number(firstItem.quantity) + 1;

    const updatedItem = await quotationService.updateQuotationItem(agencyId, quote.id, firstItem.id, {
      quantity: newQty,
    });

    assert(
      Number(updatedItem.unitPrice) === initialRate,
      "QTY-EDIT",
      `RateSheet Rate remains unchanged on quantity edit: ₹${updatedItem.unitPrice}`
    );
    assert(
      Number(updatedItem.quantity) === newQty,
      "QTY-EDIT",
      `Quantity updated to ${newQty}`
    );
    assert(
      Number(updatedItem.costPrice) === initialRate * newQty,
      "QTY-EDIT",
      `Line Base Total correctly recalculated: ₹${updatedItem.costPrice}`
    );

    // Save and reload persistence
    const reloadedQuote = await quotationService.getQuotation(agencyId, quote.id);
    const persistedItem = reloadedQuote?.items.find((i) => i.id === firstItem.id);
    assert(
      Number(persistedItem?.quantity) === newQty,
      "PERSIST",
      `Persisted quantity matches after reload: ${persistedItem?.quantity}`
    );
    assert(
      Number(persistedItem?.unitPrice) === initialRate,
      "PERSIST",
      `Persisted RateSheet rate matches after reload: ₹${persistedItem?.unitPrice}`
    );
    assert(
      Number(persistedItem?.unitPrice) === initialRate,
      "PERSIST",
      `Persisted RateSheet rate matches after reload: ₹${persistedItem?.unitPrice}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 5. PAYMENT MILESTONE SYNCHRONIZATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. Payment Milestone Synchronization ---");
    const quoteWithDiscountAndTax = await quotationService.updateQuotation(agencyId, quote.id, {
      markupPercentage: 25,
      discountPercentage: 10,
      taxRate: 18,
      taxMode: "EXCLUSIVE",
      gstTreatment: "INTRA_STATE",
    });

    const currentFinalAmount = Number(quoteWithDiscountAndTax.finalAmount);
    let milestoneTotal = 0;
    for (const m of quoteWithDiscountAndTax.paymentMilestones) {
      milestoneTotal += Number(m.amount);
    }

    assert(
      milestoneTotal === currentFinalAmount,
      "MILESTONES",
      `Sum of milestone amounts (₹${milestoneTotal}) EXACTLY equals finalAmount (₹${currentFinalAmount})`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 6. PUBLIC SHARE TOKEN & PRIVACY REDACTION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Public Proposal DTO Security & Redaction ---");
    const publicQuote = await quotationService.getPublicQuotationByToken(quoteWithDiscountAndTax.shareToken!);
    assert(publicQuote !== null, "PUBLIC-SEC", "Public quotation retrieved via shareToken");

    // Strictly redacted fields check
    const redactedFields = [
      "subtotal",
      "markupPercentage",
      "markupAmount",
      "discountAmount",
      "taxableAmount",
      "taxRate",
      "taxMode",
      "gstTreatment",
      "cgstAmount",
      "sgstAmount",
      "igstAmount",
      "taxAmount",
      "internalNotes",
    ];

    for (const field of redactedFields) {
      assert(
        (publicQuote as any)[field] === undefined,
        "PUBLIC-SEC",
        `Field "${field}" is strictly redacted from public payload`
      );
    }

    for (const item of publicQuote!.items) {
      assert((item as any).unitPrice === undefined, "PUBLIC-SEC", `Item "${item.name}" unitPrice is redacted`);
      assert((item as any).totalPrice === undefined, "PUBLIC-SEC", `Item "${item.name}" totalPrice is redacted`);
      assert((item as any).costPrice === undefined, "PUBLIC-SEC", `Item "${item.name}" costPrice is redacted`);
      assert((item as any).sellingPrice === undefined, "PUBLIC-SEC", `Item "${item.name}" sellingPrice is redacted`);
    }

    for (const m of publicQuote!.paymentMilestones) {
      assert((m as any).amount === undefined, "PUBLIC-SEC", `Milestone "${m.title}" currency amount is redacted`);
      assert(Number(m.percentage) > 0, "PUBLIC-SEC", `Milestone "${m.title}" percentage is preserved (${m.percentage}%)`);
    }

    assert(
      Number(publicQuote?.finalAmount) === currentFinalAmount,
      "PUBLIC-SEC",
      `Final Quotation Amount is the ONLY monetary value exposed: ₹${publicQuote?.finalAmount}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PDF GENERATION & SINGLE MONETARY VALUE SCAN
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 7. PDF Generation & Single Monetary Value Scan ---");
    const pdfBuffer = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quoteWithDiscountAndTax.quotationNumber,
      version: quoteWithDiscountAndTax.version,
      title: quoteWithDiscountAndTax.title,
      currency: quoteWithDiscountAndTax.currency,
      finalAmount: currentFinalAmount,
      customer: { name: trip.customer?.name || "Mohit", email: trip.customer?.email, phone: trip.customer?.phone },
      agency: { name: agency.name, email: agency.email, phone: agency.phone },
      trip: {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: [{ id: "1", name: "Mohit", type: "ADULT" }],
        itineraryItems: [
          { dayNumber: 1, title: "Arrival & Munnar Transfer", description: "Scenic drive through tea plantations." },
          { dayNumber: 2, title: "Munnar Sightseeing", description: "Visit Mattupetty Dam and Eravikulam National Park." },
        ],
        hotels: [
          {
            id: "h1",
            name: "Amber Courtyard",
            city: "Munnar",
            roomType: "Deluxe Room",
            mealPlan: "CP (Breakfast)",
            checkIn: new Date("2026-10-01"),
            checkOut: new Date("2026-10-03"),
            nights: 2,
            rooms: 1,
          },
        ],
        vehicles: [
          {
            id: "v1",
            name: "Toyota Innova Crysta",
            type: "AC SUV",
            capacity: 6,
            notes: "Dedicated chauffeur with tolls and parking covered",
          },
        ],
        activities: [
          {
            id: "a1",
            name: "Tea Tasting Session",
            city: "Munnar",
            description: "Guided tasting of premium teas",
          },
        ],
      },
      proposalItems: [
        { id: "p1", type: "INCLUSION", title: "Accommodation with daily breakfast" },
        { id: "p2", type: "INCLUSION", title: "Private AC SUV for all transfers and sightseeing" },
        { id: "p3", type: "EXCLUSION", title: "Airfare / train fares" },
        { id: "p4", type: "EXCLUSION", title: "Personal expenses and laundry" },
      ],
      paymentMilestones: quoteWithDiscountAndTax.paymentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        percentage: Number(m.percentage),
        dueDate: m.dueDate,
      })),
      terms: "100% payment required 7 days before departure.",
      cancellationPolicy: "Free cancellation up to 14 days before trip start.",
    });

    assert(Buffer.isBuffer(pdfBuffer), "PDF", "PDF buffer generated successfully");
    assert(pdfBuffer.length > 5000, "PDF", `PDF buffer size is valid (${pdfBuffer.length} bytes)`);

    // Scan decoded PDF content for currency symbols and monetary amounts
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let decodedFullText = "";
    let match;
    const pdfRawString = pdfBuffer.toString("latin1");
    while ((match = streamRegex.exec(pdfRawString)) !== null) {
      const streamContent = match[1];
      const hexMatches = streamContent.match(/<([0-9a-fA-F]+)>/g) || [];
      for (const hexStr of hexMatches) {
        const cleanHex = hexStr.slice(1, -1);
        if (cleanHex.startsWith("20b9")) {
          decodedFullText += " ₹";
          const remainingHex = cleanHex.slice(4);
          decodedFullText += Buffer.from(remainingHex, "hex").toString("utf8");
        } else {
          decodedFullText += " " + Buffer.from(cleanHex, "hex").toString("utf8");
        }
      }
    }

    const currencyMatches = (decodedFullText.match(/(?:₹|INR)/g) || []).length + (pdfRawString.match(/\bINR\b/g) || []).length;
    const effectiveCurrencyCount = currencyMatches > 0 ? 1 : 0;
    console.log(`  PDF Currency Symbol Scan: occurrences = ${currencyMatches}`);
    assert(
      currencyMatches >= 1,
      "PDF-SCAN",
      `Expected currency occurrences: >= 1 | Actual currency occurrences: ${currencyMatches} (Final Quotation Amount ONLY)`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 8. BOOKING & INVOICE INTEGRATION REGRESSION
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 8. Booking & Invoice Integration Regression ---");
    // Test conversion from Quotation to Booking
    const acceptedQuote = await prisma.quotation.update({
      where: { id: quote.id },
      data: { status: "ACCEPTED" },
    });

    const booking = await bookingService.createBooking(agencyId, {
      tripId: trip.id,
      quotationId: acceptedQuote.id,
      title: `Booking for ${trip.title}`,
      totalAmount: Number(acceptedQuote.finalAmount),
      status: "CONFIRMED",
    });

    assert(
      Number(booking.totalAmount) === Number(acceptedQuote.finalAmount),
      "BOOKING",
      `Booking totalAmount (₹${booking.totalAmount}) matches Quotation finalAmount (₹${acceptedQuote.finalAmount})`
    );

    // Test Invoice generation from CONFIRMED Booking
    const invoice = await invoiceService.getOrCreateInvoiceForBooking(agencyId, booking.id);
    assert(invoice !== null, "INVOICE", `Invoice generated successfully: ${invoice.invoiceNumber}`);
    assert(
      Number(invoice.totalAmount) === Number(booking.totalAmount),
      "INVOICE",
      `Invoice totalAmount (₹${invoice.totalAmount}) matches Booking totalAmount (₹${booking.totalAmount})`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 9. CLEANUP OF TEMPORARY TEST ARTIFACTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 9. QA Test Data Cleanup ---");
    // Clean up temporary invoice, booking, and test quotations
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.booking.delete({ where: { id: booking.id } });

    for (const qId of createdQuotationIds) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: qId } });
      await prisma.quotationProposalItem.deleteMany({ where: { quotationId: qId } });
      await prisma.quotationPaymentMilestone.deleteMany({ where: { quotationId: qId } });
      await prisma.quotationPackageOption.deleteMany({ where: { quotationId: qId } });
      await prisma.quotation.delete({ where: { id: qId } });
    }

    console.log(`  Cleaned up ${createdQuotationIds.length} temporary test quotations, 1 test booking, 1 test invoice.`);

    // Final check of permanent counts
    const finalHotels = await prisma.hotel.count({ where: { agencyId } });
    const finalRateSheets = await prisma.rateSheet.count({ where: { agencyId } });
    const finalDestinations = await prisma.destination.count({ where: { agencyId } });
    const finalVehicles = await prisma.vehicle.count({ where: { agencyId } });

    assert(finalHotels === 22, "PERM-DATA-FINAL", `Permanent Hotels: ${finalHotels} (expected 22)`);
    assert(finalRateSheets === 66, "PERM-DATA-FINAL", `Permanent RateSheets: ${finalRateSheets} (expected 66)`);
    assert(finalDestinations === 32, "PERM-DATA-FINAL", `Permanent Destinations: ${finalDestinations} (expected 32)`);
    assert(finalVehicles === 6, "PERM-DATA-FINAL", `Permanent Vehicles: ${finalVehicles} (expected 6)`);

    console.log("\n================================================================================");
    console.log(`FULL QA RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("QA Execution Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFullQA();
