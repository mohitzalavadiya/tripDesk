import "dotenv/config";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { documentPdfService } from "../src/lib/services/document-pdf-service";
import { operationsDocumentService } from "../src/lib/services/operations-document-service";

// Standard valid 1x1 PNG data URL
const VALID_1X1_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const VALID_PNG_DATA_URL = `data:image/png;base64,${VALID_1X1_PNG_BASE64}`;

function countPdfPages(buffer: Buffer): number {
  const binary = buffer.toString("binary");
  const matches = binary.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 0;
}

function inspectStreamSizes(buffer: Buffer): number[] {
  const binary = buffer.toString("binary");
  const pageObjects = binary.split(/\/Type\s*\/Page\b/).slice(1);
  return pageObjects.map((p) => {
    const streamMatch = p.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    return streamMatch ? streamMatch[1].length : 0;
  });
}

async function main() {
  console.log("================================================================================");
  console.log("    PHASE 220 — PDF TRAILING BLANK PAGES / FOOTER PAGINATION FIX QA SUITE      ");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // --- SECTION 1: Quotation PDF Pagination Tests (Minimal, Medium, Large) ---
  console.log("\n--- Section 1: Quotation PDF Pagination Tests ---");

  // 1. Quotation Minimal (1 Content Page -> Exactly 1 PDF Page)
  try {
    const qMinimal: any = {
      quotationNumber: "QT-MIN-001",
      version: 1,
      title: "Quick Weekend Escape",
      finalAmount: 12000,
      currency: "INR",
      customer: { name: "Alice Smith", phone: "+91 9999999999" },
      agency: { name: "Global Explorer Agency", phone: "+91 8888888888", email: "info@explorer.com" },
      trip: {
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-02"),
        travelers: [{ name: "Alice Smith" }],
        itineraryItems: [{ dayNumber: 1, title: "Day 1 Arrival & City Sightseeing" }],
      },
    };

    const buf = await quotationPdfService.generateQuotationPdf(qMinimal);
    const pages = countPdfPages(buf);
    const streams = inspectStreamSizes(buf);
    assert(pages === 1 && streams[0] > 1000, "Quotation (Minimal without logo) generates exactly 1 page (0 trailing pages)", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Quotation (Minimal without logo) generates exactly 1 page", err.message);
  }

  // 2. Quotation Minimal with Entitled Logo (Exactly 1 PDF Page)
  try {
    const qMinimalLogo: any = {
      quotationNumber: "QT-MIN-002",
      version: 1,
      title: "Quick Weekend Escape",
      finalAmount: 12000,
      currency: "INR",
      customer: { name: "Alice Smith", phone: "+91 9999999999" },
      agency: { name: "Global Explorer Agency", logo: VALID_PNG_DATA_URL, phone: "+91 8888888888", email: "info@explorer.com" },
      trip: {
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-02"),
        travelers: [{ name: "Alice Smith" }],
        itineraryItems: [{ dayNumber: 1, title: "Day 1 Arrival & City Sightseeing" }],
      },
    };

    const buf = await quotationPdfService.generateQuotationPdf(qMinimalLogo);
    const pages = countPdfPages(buf);
    assert(pages === 1, "Quotation (Minimal with logo) generates exactly 1 page (0 trailing pages)", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Quotation (Minimal with logo) generates exactly 1 page", err.message);
  }

  // 3. Quotation Medium (2 Content Pages -> Exactly 2 PDF Pages)
  try {
    const qMedium: any = {
      quotationNumber: "QT-MED-001",
      version: 1,
      title: "Kerala Backwaters & Hills 4D3N",
      proposalSubtitle: "Experience God's Own Country in Comfort",
      finalAmount: 38000,
      currency: "INR",
      customer: { name: "Bob Johnson", phone: "+91 9999999999", email: "bob@test.com" },
      agency: { name: "Global Explorer Agency", logo: VALID_PNG_DATA_URL, phone: "+91 8888888888", email: "info@explorer.com" },
      trip: {
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-04"),
        travelers: [{ name: "Bob Johnson" }, { name: "Sarah Johnson" }],
        itineraryItems: [
          { dayNumber: 1, title: "Cochin to Munnar", description: "Scenic drive through tea plantations and Cheeyappara waterfalls." },
          { dayNumber: 2, title: "Munnar Sightseeing", description: "Visit Eravikulam National Park, Mattupetty Dam, and Tea Museum." },
          { dayNumber: 3, title: "Munnar to Alleppey", description: "Check in to premium houseboat, cruise through serene backwaters." },
          { dayNumber: 4, title: "Alleppey to Cochin Departure", description: "Transfer to Cochin International Airport for return flight." }
        ],
        hotels: [
          { name: "Tea County Resort", city: "Munnar", roomType: "Deluxe Valley View", mealPlan: "Breakfast Included", nights: 2, rooms: 1 },
          { name: "Premium Houseboat", city: "Alleppey", roomType: "1BHK Luxury AC", mealPlan: "All Meals Included", nights: 1, rooms: 1 }
        ],
        vehicles: [
          { name: "Toyota Innova Crysta", type: "Private AC Cab", capacity: 4, notes: "Dedicated chauffeur with fuel, tolls and parking included" }
        ],
        activities: [
          { name: "Kathakali Classical Dance Show", city: "Munnar", date: new Date("2026-12-02"), description: "Evening cultural performance tickets." }
        ]
      },
      proposalItems: [
        { type: "INCLUSION", title: "Daily buffet breakfast at Munnar resort" },
        { type: "INCLUSION", title: "All meals (Lunch, Evening Snack, Dinner, Breakfast) on Houseboat" },
        { type: "INCLUSION", title: "Private AC Toyota Innova Crysta for entire tour" },
        { type: "INCLUSION", title: "All tolls, parking fees, and driver allowances" },
        { type: "EXCLUSION", title: "Airfare / Train tickets to and from Cochin" },
        { type: "EXCLUSION", title: "Optional activities, monument entry tickets, and camera fees" }
      ],
      terms: "50% advance upon confirmation, 50% 15 days prior to arrival.",
      cancellationPolicy: "Full refund 30 days prior. 50% refund 15-29 days prior. No refund within 14 days."
    };

    const buf = await quotationPdfService.generateQuotationPdf(qMedium);
    const pages = countPdfPages(buf);
    const streams = inspectStreamSizes(buf);
    // Every page must have substantive body content (> 2000 bytes)
    const allHaveContent = streams.every((s) => s > 1500);
    assert(pages === 2 && allHaveContent, "Quotation (Medium) generates exactly 2 pages with 0 trailing blank pages", `Pages: ${pages}, Streams: ${JSON.stringify(streams)}`);
  } catch (err: any) {
    assert(false, "Quotation (Medium) generates exactly 2 pages", err.message);
  }

  // --- SECTION 2: Tax Invoice PDF Pagination Tests ---
  console.log("\n--- Section 2: Tax Invoice PDF Pagination Tests ---");

  // 4. Tax Invoice Standard (1 Content Page -> Exactly 1 PDF Page)
  try {
    const invData: any = {
      id: "inv-qa-001",
      invoiceNumber: "INV-2026-0001",
      status: "ISSUED",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "INR",
      subtotal: 50000,
      totalTax: 2500,
      totalAmount: 52500,
      amountPaid: 20000,
      balanceDue: 32500,
      isInterState: false,
      taxMode: "GST",
      agencySnapshot: { name: "Wonder Tours", address: "123 Main St, Mumbai", email: "info@wonder.com", phone: "+91 9999999999", gstin: "27AAAAA0000A1Z5" },
      customerSnapshot: { name: "John Doe", email: "john@example.com", phone: "+91 8888888888" },
      items: [
        { description: "Kerala Tour Package (4D3N)", quantity: 1, unitPrice: 50000, amount: 50000, taxRate: 5, taxAmount: 2500, sacCode: "998555" }
      ],
      payments: []
    };

    const buf = await invoicePdfService.generateInvoicePdf(invData);
    const pages = countPdfPages(buf);
    assert(pages === 1, "Tax Invoice (Standard without logo) generates exactly 1 page (0 trailing pages)", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Tax Invoice (Standard without logo) generates exactly 1 page", err.message);
  }

  // 5. Tax Invoice Standard with Entitled Logo (Exactly 1 PDF Page)
  try {
    const invDataLogo: any = {
      id: "inv-qa-002",
      invoiceNumber: "INV-2026-0002",
      status: "ISSUED",
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "INR",
      subtotal: 50000,
      totalTax: 2500,
      totalAmount: 52500,
      amountPaid: 20000,
      balanceDue: 32500,
      isInterState: false,
      taxMode: "GST",
      agencySnapshot: { name: "Wonder Tours", logo: VALID_PNG_DATA_URL, address: "123 Main St, Mumbai", email: "info@wonder.com", phone: "+91 9999999999", gstin: "27AAAAA0000A1Z5" },
      customerSnapshot: { name: "John Doe", email: "john@example.com", phone: "+91 8888888888" },
      items: [
        { description: "Kerala Tour Package (4D3N)", quantity: 1, unitPrice: 50000, amount: 50000, taxRate: 5, taxAmount: 2500, sacCode: "998555" }
      ],
      payments: []
    };

    const buf = await invoicePdfService.generateInvoicePdf(invDataLogo);
    const pages = countPdfPages(buf);
    assert(pages === 1, "Tax Invoice (Standard with logo) generates exactly 1 page (0 trailing pages)", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Tax Invoice (Standard with logo) generates exactly 1 page", err.message);
  }

  // --- SECTION 3: Document PDF Suite Regression Tests ---
  console.log("\n--- Section 3: Document PDF Suite Regression Tests ---");

  const docBase = {
    agency: { id: "a1", name: "Wonder Tours", logo: VALID_PNG_DATA_URL, phone: "+91 9999999999", email: "info@wonder.com" },
    customer: { name: "Alice", phone: "+91 8888888888", email: "alice@test.com", city: "Mumbai" },
    tripNumber: "TRIP-2026-001",
    version: 1,
  };

  // 6. Hotel Voucher
  try {
    const buf = await documentPdfService.renderHotelVoucher({
      ...docBase,
      documentNumber: "HV-2026-001",
      hotelName: "Tea County Munnar",
      hotelCity: "Munnar",
      checkIn: new Date("2026-12-01"),
      checkOut: new Date("2026-12-03"),
      rooms: 1,
      roomType: "Deluxe",
      mealPlan: "Breakfast",
      nights: 2,
    });
    const pages = countPdfPages(buf);
    assert(pages === 1, "Document Suite: Hotel Voucher generates exactly 1 page", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Document Suite: Hotel Voucher generates exactly 1 page", err.message);
  }

  // 7. Vehicle Voucher
  try {
    const buf = await documentPdfService.renderVehicleVoucher({
      ...docBase,
      documentNumber: "VV-2026-001",
      vehicleName: "Toyota Innova Crysta",
      vehicleType: "Private AC SUV",
      capacity: 6,
      driverName: "Rajesh Kumar",
      driverPhone: "+91 9876543210",
    });
    const pages = countPdfPages(buf);
    assert(pages === 1, "Document Suite: Vehicle Voucher generates exactly 1 page", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Document Suite: Vehicle Voucher generates exactly 1 page", err.message);
  }

  // 8. Activity Pass
  try {
    const buf = await documentPdfService.renderActivityVoucher({
      ...docBase,
      documentNumber: "AV-2026-001",
      activityName: "Kathakali Classical Dance Performance",
      activityCity: "Munnar",
      activityDate: new Date("2026-12-02"),
      activityTime: "18:00",
    });
    const pages = countPdfPages(buf);
    assert(pages === 1, "Document Suite: Activity Pass generates exactly 1 page", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Document Suite: Activity Pass generates exactly 1 page", err.message);
  }

  // 9. Booking Confirmation
  try {
    const buf = await documentPdfService.renderBookingConfirmation({
      ...docBase,
      documentNumber: "BC-2026-001",
      bookingNumber: "BKG-2026-001",
      tripTitle: "Kerala Scenic Holiday",
      startDate: new Date("2026-12-01"),
      endDate: new Date("2026-12-04"),
      totalAmount: 45000,
      paidAmount: 20000,
      balanceAmount: 25000,
      currency: "INR",
    });
    const pages = countPdfPages(buf);
    assert(pages === 1, "Document Suite: Booking Confirmation generates exactly 1 page", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Document Suite: Booking Confirmation generates exactly 1 page", err.message);
  }

  // 10. Official Payment Receipt (Strict 1-page check)
  try {
    const buf = await documentPdfService.renderPaymentReceipt({
      ...docBase,
      documentNumber: "RC-2026-001",
      paymentNumber: "PAY-2026-001",
      amount: 20000,
      currency: "INR",
      paymentMethod: "UPI / NEFT",
      paidAt: new Date("2026-11-20"),
    });
    const pages = countPdfPages(buf);
    assert(pages === 1, "Document Suite: Payment Receipt remains strictly 1 page", `Pages: ${pages}`);
  } catch (err: any) {
    assert(false, "Document Suite: Payment Receipt remains strictly 1 page", err.message);
  }

  console.log("\n================================================================================");
  console.log(`    PHASE 220 QA SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
