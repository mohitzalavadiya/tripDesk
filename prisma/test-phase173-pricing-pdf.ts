import "dotenv/config";
import prisma from "../src/lib/prisma";
import { quotationService } from "../src/lib/services/quotation-service";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";

async function runPhase173Verification() {
  console.log("=====================================================================");
  console.log("TRIPDESK PHASE 173 — QUOTATION PRICING MODEL & PDF VERIFICATION TEST");
  console.log("=====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const agencyId = "cmu2g9rgq0000swtqbr5aie7x";
    const tripId = "cmu5fhkk40006v4tqpd2k2kd4";

    // 1. Verify Agency & Trip Existence
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    assert(agency !== null, `Agency ${agencyId} found`);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { customer: true, tripHotels: true, tripVehicles: true, tripActivities: true },
    });
    assert(trip !== null, `Target trip ${tripId} found`);

    // 2. Generate Quotation from Trip (Single Markup Architecture)
    console.log("\n--- Scenario A: Generate Quotation from Trip (Single Markup Model) ---");
    const quote = await quotationService.generateQuotationFromTrip(agencyId, tripId);
    assert(quote !== null, "Quotation generated successfully from Trip");
    assert(quote.items.length > 0, `Quotation has ${quote.items.length} line items`);

    // Verify all line items have markupPercentage === 0 and unitPrice === costPrice / quantity
    let calculatedSubtotal = 0;
    for (const item of quote.items) {
      const lineQty = Number(item.quantity);
      const lineRate = Number(item.unitPrice);
      const lineBase = lineRate * lineQty;
      assert(Number(item.markupPercentage) === 0, `Line item "${item.name}" has 0% line markup`);
      assert(Number(item.costPrice) === lineBase, `Line item "${item.name}" costPrice matches Base Total (₹${lineBase})`);
      assert(Number(item.sellingPrice) === lineBase, `Line item "${item.name}" sellingPrice matches Base Total (₹${lineBase})`);
      calculatedSubtotal += lineBase;
    }

    assert(
      Number(quote.subtotal) === calculatedSubtotal,
      `Quotation aggregate subtotal matches sum of Line Base Totals (₹${quote.subtotal} === ₹${calculatedSubtotal})`
    );

    // 3. Test Package Markup Calculation (20% Markup)
    console.log("\n--- Scenario B: Package Markup (20%) Recalculation ---");
    const quoteWithMarkup = await quotationService.updateQuotation(agencyId, quote.id, {
      markupPercentage: 20,
      discountPercentage: 0,
    });

    const expectedSubtotal = Number(quoteWithMarkup.subtotal);
    const expectedMarkupAmount = Math.round((expectedSubtotal * 20) / 100);
    const expectedGross = expectedSubtotal + expectedMarkupAmount;

    assert(
      Number(quoteWithMarkup.markupAmount) === expectedMarkupAmount,
      `Package Markup Amount is calculated ONCE on Subtotal: ₹${quoteWithMarkup.markupAmount} (expected ₹${expectedMarkupAmount})`
    );
    assert(
      Number(quoteWithMarkup.taxableAmount) === expectedGross,
      `Taxable Amount equals Gross Package Amount: ₹${quoteWithMarkup.taxableAmount} (expected ₹${expectedGross})`
    );

    // 4. Test Discount & Tax Recalculation
    console.log("\n--- Scenario C: Special Discount (10%) & Tax (5% Exclusive) ---");
    const quoteWithDiscount = await quotationService.updateQuotation(agencyId, quote.id, {
      markupPercentage: 20,
      discountPercentage: 10,
      taxRate: 5,
      taxMode: "EXCLUSIVE",
      gstTreatment: "INTRA_STATE",
    });

    const subtotalC = Number(quoteWithDiscount.subtotal);
    const markupC = Math.round((subtotalC * 20) / 100);
    const grossC = subtotalC + markupC;
    const expectedDiscount = Math.round((grossC * 10) / 100);
    const expectedTaxable = grossC - expectedDiscount;
    const expectedTax = Math.round(expectedTaxable * 0.05 * 100) / 100;
    const expectedFinal = Math.round((expectedTaxable + expectedTax) * 100) / 100;

    assert(
      Number(quoteWithDiscount.discountAmount) === expectedDiscount,
      `Discount Amount is 10% of Gross Package Amount: ₹${quoteWithDiscount.discountAmount} (expected ₹${expectedDiscount})`
    );
    assert(
      Number(quoteWithDiscount.taxableAmount) === expectedTaxable,
      `Taxable Amount is Gross - Discount: ₹${quoteWithDiscount.taxableAmount} (expected ₹${expectedTaxable})`
    );
    assert(
      Number(quoteWithDiscount.taxAmount) === expectedTax,
      `Tax Amount is 5% of Taxable Amount: ₹${quoteWithDiscount.taxAmount} (expected ₹${expectedTax})`
    );
    assert(
      Number(quoteWithDiscount.finalAmount) === expectedFinal,
      `Final Quotation Amount is Taxable + Tax: ₹${quoteWithDiscount.finalAmount} (expected ₹${expectedFinal})`
    );

    // 5. Verify Payment Milestone Synchronization
    console.log("\n--- Scenario D: Payment Milestone Synchronization ---");
    const milestones = quoteWithDiscount.paymentMilestones;
    assert(milestones.length > 0, `Quotation has ${milestones.length} payment milestones`);

    let milestoneSum = 0;
    for (const m of milestones) {
      milestoneSum += Number(m.amount);
    }
    assert(
      milestoneSum === Number(quoteWithDiscount.finalAmount),
      `Sum of milestone amounts (₹${milestoneSum}) EXACTLY equals Final Amount (₹${quoteWithDiscount.finalAmount})`
    );

    // 6. Test Public Proposal Redaction Security
    console.log("\n--- Scenario E: Public Proposal Redaction Security ---");
    const publicQuote = await quotationService.getPublicQuotationByToken(quoteWithDiscount.shareToken!);
    assert(publicQuote !== null, "Public quotation retrieved via shareToken");

    // Strictly redacted fields
    assert((publicQuote as any).subtotal === undefined, "Subtotal is strictly redacted from public DTO");
    assert((publicQuote as any).markupAmount === undefined, "Markup Amount is strictly redacted from public DTO");
    assert((publicQuote as any).markupPercentage === undefined, "Markup Percentage is strictly redacted from public DTO");
    assert((publicQuote as any).discountAmount === undefined, "Discount Amount is strictly redacted from public DTO");
    assert((publicQuote as any).taxableAmount === undefined, "Taxable Amount is strictly redacted from public DTO");
    assert((publicQuote as any).taxAmount === undefined, "Tax Amount is strictly redacted from public DTO");
    assert((publicQuote as any).cgstAmount === undefined, "CGST Amount is strictly redacted from public DTO");
    assert((publicQuote as any).sgstAmount === undefined, "SGST Amount is strictly redacted from public DTO");
    assert((publicQuote as any).igstAmount === undefined, "IGST Amount is strictly redacted from public DTO");
    assert((publicQuote as any).internalNotes === undefined, "Internal notes are strictly redacted from public DTO");

    // Public line items do NOT expose unitPrice or totalPrice
    for (const item of publicQuote!.items) {
      assert((item as any).unitPrice === undefined, `Line item "${item.name}" unitPrice is redacted from public DTO`);
      assert((item as any).totalPrice === undefined, `Line item "${item.name}" totalPrice is redacted from public DTO`);
      assert((item as any).costPrice === undefined, `Line item "${item.name}" costPrice is redacted from public DTO`);
      assert((item as any).sellingPrice === undefined, `Line item "${item.name}" sellingPrice is redacted from public DTO`);
    }

    // Public payment milestones do NOT expose currency amounts
    for (const m of publicQuote!.paymentMilestones) {
      assert((m as any).amount === undefined, `Payment milestone "${m.title}" currency amount is redacted from public DTO`);
      assert(m.percentage !== null && Number(m.percentage) > 0, `Payment milestone "${m.title}" percentage is preserved (${m.percentage}%)`);
    }

    // Only Final Quotation Amount is exposed
    assert(
      Number(publicQuote?.finalAmount) === Number(quoteWithDiscount.finalAmount),
      `Public Final Quotation Amount is accurately exposed: ₹${publicQuote?.finalAmount}`
    );

    // 7. Customer PDF Generation & Single Monetary Value Rule
    console.log("\n--- Scenario F: Customer PDF Generation ---");
    const pdfBuffer = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quoteWithDiscount.quotationNumber,
      version: quoteWithDiscount.version,
      title: quoteWithDiscount.title,
      currency: quoteWithDiscount.currency,
      finalAmount: Number(quoteWithDiscount.finalAmount),
      customer: { name: trip.customer?.name || "Mohit", email: trip.customer?.email, phone: trip.customer?.phone },
      agency: { name: agency.name, email: agency.email, phone: agency.phone },
      trip: {
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        travelers: [{ id: "1", name: "Mohit", type: "ADULT" }],
        itineraryItems: [
          { dayNumber: 1, title: "Arrival & Sightseeing", description: "Arrive at destination, check-in and explore." },
          { dayNumber: 2, title: "Full Day Guided Tour", description: "Scenic viewpoints and cultural landmarks." },
        ],
        hotels: [
          {
            id: "h1",
            name: "Grand Palace Hotel",
            city: "Munnar",
            roomType: "Deluxe Valley View",
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
            notes: "Dedicated chauffeur with parking and toll charges covered",
          },
        ],
        activities: [
          {
            id: "a1",
            name: "Tea Garden Safari & Tea Factory Visit",
            city: "Munnar",
            description: "Guided estate walkthrough and tea tasting",
          },
        ],
      },
      proposalItems: [
        { id: "p1", type: "INCLUSION", title: "Accommodation on double sharing with daily breakfast" },
        { id: "p2", type: "INCLUSION", title: "Private AC vehicle for all transfers and sightseeing" },
        { id: "p3", type: "EXCLUSION", title: "Airfare / train tickets" },
        { id: "p4", type: "EXCLUSION", title: "Personal expenses, laundry, and tips" },
      ],
      paymentMilestones: quoteWithDiscount.paymentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        percentage: Number(m.percentage),
        dueDate: m.dueDate,
      })),
      terms: "100% advance required 7 days prior to travel.",
      cancellationPolicy: "Full refund if cancelled 15 days before check-in.",
    });

    assert(Buffer.isBuffer(pdfBuffer), "PDF Buffer generated successfully");
    assert(pdfBuffer.length > 2000, `PDF size is valid (${pdfBuffer.length} bytes)`);

    console.log("\n=====================================================================");
    console.log(`PHASE 173 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("=====================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase173Verification();
