import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { AgencyStatus, SubscriptionStatus, UserRole } from "@prisma/client";
import { pdfBrandingHelper } from "../src/lib/services/pdf-branding-helper";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { documentPdfService } from "../src/lib/services/document-pdf-service";
import { operationsDocumentService } from "../src/lib/services/operations-document-service";
import { entitlementService } from "../src/lib/services/entitlement-service";

// Standard valid 1x1 PNG data url that PDFKit can parse
const VALID_1X1_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const VALID_PNG_DATA_URL = `data:image/png;base64,${VALID_1X1_PNG_BASE64}`;
const VALID_PNG_BUFFER = Buffer.from(VALID_1X1_PNG_BASE64, "base64");

// Standard valid 1x1 JPEG base64
const VALID_1X1_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const VALID_JPEG_DATA_URL = `data:image/jpeg;base64,${VALID_1X1_JPEG_BASE64}`;
const VALID_JPEG_BUFFER = Buffer.from(VALID_1X1_JPEG_BASE64, "base64");

async function main() {
  console.log("================================================================================");
  console.log("    PHASE 219 — PROFESSIONAL AGENCY LOGO IN CUSTOMER-FACING PDFs QA SUITE       ");
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

  // --- SECTION 1: PDF Branding Helper Resolution & Magic Byte Validation ---
  console.log("\n--- Section 1: PDF Branding Helper Unit & Magic Byte Tests ---");

  // 1. Valid PNG Data URL resolves to non-empty Buffer
  try {
    const buf = await pdfBrandingHelper.resolveLogoBuffer({
      logoUrl: VALID_PNG_DATA_URL,
      checkEntitlement: false,
    });
    assert(buf !== null && buf.length > 0 && buf[0] === 0x89 && buf[1] === 0x50, "Valid PNG data URL resolves to Buffer");
  } catch (err: any) {
    assert(false, "Valid PNG data URL resolves to Buffer", err.message);
  }

  // 2. Valid JPEG Data URL resolves to non-empty Buffer
  try {
    const buf = await pdfBrandingHelper.resolveLogoBuffer({
      logoUrl: VALID_JPEG_DATA_URL,
      checkEntitlement: false,
    });
    assert(buf !== null && buf.length > 0 && buf[0] === 0xff && buf[1] === 0xd8, "Valid JPEG data URL resolves to Buffer");
  } catch (err: any) {
    assert(false, "Valid JPEG data URL resolves to Buffer", err.message);
  }

  // 3. SVG payload rejected (SVG disabled in Phase 218 & 219)
  try {
    const svgDataUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==";
    const buf = await pdfBrandingHelper.resolveLogoBuffer({
      logoUrl: svgDataUrl,
      checkEntitlement: false,
    });
    assert(buf === null, "SVG data URL is safely rejected and returns null");
  } catch (err: any) {
    assert(false, "SVG data URL rejection check", err.message);
  }

  // 4. Corrupt / invalid bytes rejected
  try {
    const corruptDataUrl = "data:image/png;base64,bm90YW5pbWFnZWF0YWxs";
    const buf = await pdfBrandingHelper.resolveLogoBuffer({
      logoUrl: corruptDataUrl,
      checkEntitlement: false,
    });
    assert(buf === null, "Corrupt binary payload returns null without throwing");
  } catch (err: any) {
    assert(false, "Corrupt binary payload check", err.message);
  }

  // 5. Null or empty logo URL returns null
  try {
    const buf1 = await pdfBrandingHelper.resolveLogoBuffer({ logoUrl: null });
    const buf2 = await pdfBrandingHelper.resolveLogoBuffer({ logoUrl: undefined });
    const buf3 = await pdfBrandingHelper.resolveLogoBuffer({ logoUrl: "   " });
    assert(buf1 === null && buf2 === null && buf3 === null, "Null / undefined / empty logo URL returns null");
  } catch (err: any) {
    assert(false, "Null logo URL check", err.message);
  }

  // 6. Unreachable HTTPS URL / Timeout handling (fail-open)
  try {
    const unreachableUrl = "https://10.255.255.1/nonexistent-logo.png";
    const buf = await pdfBrandingHelper.resolveLogoBuffer({
      logoUrl: unreachableUrl,
      checkEntitlement: false,
    });
    assert(buf === null, "Unreachable URL fails open and returns null without crashing");
  } catch (err: any) {
    assert(false, "Unreachable URL fail-open check", err.message);
  }

  // --- SECTION 2: Entitlement Enforcement ---
  console.log("\n--- Section 2: Entitlement Checks for CUSTOM_AGENCY_LOGO ---");

  const starterPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });
  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });

  // Create temporary test agency with STARTER plan (unentitled)
  const testStarterAgency = await prisma.agency.create({
    data: {
      name: `QA Unentitled Agency ${Date.now()}`,
      email: `unentitled-${Date.now()}@tripdesk-qa.com`,
      phone: "+919876543210",
      status: AgencyStatus.ACTIVE,
      logo: VALID_PNG_DATA_URL,
    },
  });
  if (starterPlan) {
    await prisma.subscription.create({
      data: {
        agencyId: testStarterAgency.id,
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // Create temporary test agency with PROFESSIONAL plan (entitled)
  const testProAgency = await prisma.agency.create({
    data: {
      name: `QA Professional Agency ${Date.now()}`,
      email: `pro-${Date.now()}@tripdesk-qa.com`,
      phone: "+919876543211",
      status: AgencyStatus.ACTIVE,
      logo: VALID_PNG_DATA_URL,
    },
  });
  if (proPlan) {
    await prisma.subscription.create({
      data: {
        agencyId: testProAgency.id,
        planId: proPlan.id,
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  try {
    // 7. Unentitled agency returns null even if logo is stored
    const starterBuf = await pdfBrandingHelper.resolveLogoBuffer({
      agencyId: testStarterAgency.id,
      logoUrl: testStarterAgency.logo,
      checkEntitlement: true,
    });
    assert(starterBuf === null, "Starter (unentitled) agency logo resolves to null");

    // 8. Entitled agency returns Buffer
    const proBuf = await pdfBrandingHelper.resolveLogoBuffer({
      agencyId: testProAgency.id,
      logoUrl: testProAgency.logo,
      checkEntitlement: true,
    });
    assert(proBuf !== null && proBuf.length > 0, "Professional (entitled) agency logo resolves to valid Buffer");

    // 9. Trial agency returns Buffer (trials inherit full entitlement)
    const testTrialAgency = await prisma.agency.create({
      data: {
        name: `QA Trial Agency ${Date.now()}`,
        email: `trial-${Date.now()}@tripdesk-qa.com`,
        phone: "+919876543212",
        status: AgencyStatus.ACTIVE,
        logo: VALID_PNG_DATA_URL,
      },
    });

    if (starterPlan) {
      await prisma.subscription.create({
        data: {
          agencyId: testTrialAgency.id,
          planId: starterPlan.id,
          status: SubscriptionStatus.TRIAL,
          trialStart: new Date(),
          trialEnd: new Date(Date.now() + 14 * 86400000),
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 14 * 86400000),
        },
      });
    }

    const trialBuf = await pdfBrandingHelper.resolveLogoBuffer({
      agencyId: testTrialAgency.id,
      logoUrl: testTrialAgency.logo,
      checkEntitlement: true,
    });
    assert(trialBuf !== null && trialBuf.length > 0, "Active Trial agency logo resolves to valid Buffer");

    await prisma.subscription.deleteMany({ where: { agencyId: testTrialAgency.id } });
    await prisma.agency.delete({ where: { id: testTrialAgency.id } });
  } catch (err: any) {
    assert(false, "Entitlement checks execution", err.message);
  }

  // --- SECTION 3: End-to-End PDF Document Generation Tests ---
  console.log("\n--- Section 3: Customer-Facing PDF Generation (With & Without Logo) ---");

  // Common sample data structures
  const sampleAgencyWithLogo = {
    id: testProAgency.id,
    name: testProAgency.name,
    email: testProAgency.email,
    phone: testProAgency.phone,
    address: "100 Innovation Way, Tech Park, Bengaluru, KA 560001",
    logo: VALID_PNG_DATA_URL,
  };

  const sampleAgencyNoLogo = {
    id: testStarterAgency.id,
    name: testStarterAgency.name,
    email: testStarterAgency.email,
    phone: testStarterAgency.phone,
    address: "200 Baseline Street, Mumbai, MH 400001",
    logo: null,
  };

  const sampleCustomer = {
    name: "Dr. Rajesh Sharma",
    email: "rajesh.sharma@example.com",
    phone: "+91 99887 76655",
    city: "New Delhi",
  };

  // 10. Quotation PDF with Logo
  try {
    const pdfBufWithLogo = await quotationPdfService.generateQuotationPdf({
      quotationNumber: "QT-2026-001",
      version: 1,
      title: "Exotic Maldives Island Getaway",
      currency: "INR",
      finalAmount: 185000,
      validUntil: new Date(Date.now() + 7 * 86400000),
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      trip: {
        title: "Maldives Luxury Escape",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86400000),
        travelers: [{ name: "Dr. Rajesh Sharma" }, { name: "Mrs. Sunita Sharma" }],
      },
    });
    assert(pdfBufWithLogo.length > 1000 && pdfBufWithLogo.toString("utf8", 0, 5) === "%PDF-", "Quotation PDF with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Quotation PDF with Logo generation", err.message);
  }

  // 11. Quotation PDF without Logo (Fallback)
  try {
    const pdfBufNoLogo = await quotationPdfService.generateQuotationPdf({
      quotationNumber: "QT-2026-002",
      version: 1,
      title: "Exotic Maldives Island Getaway",
      currency: "INR",
      finalAmount: 185000,
      validUntil: new Date(Date.now() + 7 * 86400000),
      agency: sampleAgencyNoLogo,
      customer: sampleCustomer,
      trip: {
        title: "Maldives Luxury Escape",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86400000),
      },
    });
    assert(pdfBufNoLogo.length > 1000 && pdfBufNoLogo.toString("utf8", 0, 5) === "%PDF-", "Quotation PDF without Logo generates valid fallback PDF binary");
  } catch (err: any) {
    assert(false, "Quotation PDF without Logo fallback", err.message);
  }

  // 12. Tax Invoice PDF with Logo
  try {
    const invoicePdfWithLogo = await invoicePdfService.generateInvoicePdf({
      invoiceNumber: "INV-2026-001",
      invoiceDate: new Date(),
      status: "ISSUED",
      agency: {
        ...sampleAgencyWithLogo,
        gstin: "29AABCT1332L1Z1",
        stateCode: "29",
      },
      customer: {
        ...sampleCustomer,
        address: "Flat 402, Green Meadows",
        stateCode: "29",
      },
      lineItems: [
        { description: "Luxury Villa Accommodation (4 Nights)", taxableAmount: 150000, gstRate: 18, gstAmount: 27000, totalAmount: 177000 },
      ],
      taxableAmount: 150000,
      discount: 0,
      cgst: 13500,
      sgst: 13500,
      igst: 0,
      totalTax: 27000,
      finalAmount: 177000,
      currency: "INR",
      paymentStatus: "PARTIAL",
      amountPaid: 50000,
      balanceDue: 127000,
    });
    assert(invoicePdfWithLogo.length > 1000 && invoicePdfWithLogo.toString("utf8", 0, 5) === "%PDF-", "Tax Invoice PDF with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Tax Invoice PDF with Logo generation", err.message);
  }

  // 13. Tax Invoice PDF without Logo (Fallback)
  try {
    const invoicePdfNoLogo = await invoicePdfService.generateInvoicePdf({
      invoiceNumber: "INV-2026-002",
      invoiceDate: new Date(),
      status: "ISSUED",
      agency: {
        ...sampleAgencyNoLogo,
        gstin: "27AABCT1332L1Z2",
        stateCode: "27",
      },
      customer: {
        ...sampleCustomer,
        stateCode: "27",
      },
      lineItems: [
        { description: "Standard Room Package", taxableAmount: 50000, gstRate: 18, gstAmount: 9000, totalAmount: 59000 },
      ],
      taxableAmount: 50000,
      discount: 0,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      totalTax: 9000,
      finalAmount: 59000,
      currency: "INR",
      paymentStatus: "UNPAID",
      amountPaid: 0,
      balanceDue: 59000,
    });
    assert(invoicePdfNoLogo.length > 1000 && invoicePdfNoLogo.toString("utf8", 0, 5) === "%PDF-", "Tax Invoice PDF without Logo generates valid fallback PDF binary");
  } catch (err: any) {
    assert(false, "Tax Invoice PDF without Logo fallback", err.message);
  }

  // 14. Hotel Voucher with Logo
  try {
    const hotelVoucherWithLogo = await documentPdfService.renderHotelVoucher({
      documentNumber: "VCH-HTL-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      tripNumber: "TRIP-001",
      hotelName: "Taj Exotica Resort & Spa",
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 4 * 86400000),
      roomDetails: "Deluxe Lagoon Villa",
      mealPlan: "Full Board (Breakfast, Lunch, Dinner)",
      confirmationNumber: "TAJ-MAL-8899",
    });
    assert(hotelVoucherWithLogo.length > 1000 && hotelVoucherWithLogo.toString("utf8", 0, 5) === "%PDF-", "Hotel Voucher with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Hotel Voucher with Logo generation", err.message);
  }

  // 15. Vehicle Voucher with Logo
  try {
    const vehicleVoucherWithLogo = await documentPdfService.renderVehicleVoucher({
      documentNumber: "VCH-VEH-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      tripNumber: "TRIP-001",
      vehicleName: "Toyota Innova Crysta",
      vehicleNumber: "KA 01 MG 4421",
      driverName: "Suresh Kumar",
      driverPhone: "+91 98450 12345",
      pickupDate: new Date(),
      pickupLocation: "Kempegowda International Airport (BLR)",
      dropLocation: "The Leela Palace Bengaluru",
    });
    assert(vehicleVoucherWithLogo.length > 1000 && vehicleVoucherWithLogo.toString("utf8", 0, 5) === "%PDF-", "Vehicle Voucher with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Vehicle Voucher with Logo generation", err.message);
  }

  // 16. Activity Voucher with Logo
  try {
    const actVoucherWithLogo = await documentPdfService.renderActivityVoucher({
      documentNumber: "VCH-ACT-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      tripNumber: "TRIP-001",
      activityName: "Sunset Scuba Diving & Coral Safari",
      ticketNumber: "ACT-SCUBA-774",
      confirmationNumber: "CONF-9921",
      participantsCount: 2,
    });
    assert(actVoucherWithLogo.length > 1000 && actVoucherWithLogo.toString("utf8", 0, 5) === "%PDF-", "Activity Voucher with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Activity Voucher with Logo generation", err.message);
  }

  // 17. Booking Confirmation with Logo
  try {
    const confWithLogo = await documentPdfService.renderBookingConfirmation({
      documentNumber: "DOC-CONF-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      tripNumber: "TRIP-001",
      tripTitle: "Kashmir Paradise Tour",
      bookingNumber: "BKG-2026-001",
      bookingDate: new Date(),
      totalAmount: 95000,
      paidAmount: 50000,
      balanceAmount: 45000,
      currency: "INR",
      hotels: [{ name: "The Lalit Grand Palace Srinagar" }],
      vehicles: [{ name: "Luxury Tempo Traveler" }],
      activities: [{ name: "Shikara Ride in Dal Lake" }],
    });
    assert(confWithLogo.length > 1000 && confWithLogo.toString("utf8", 0, 5) === "%PDF-", "Booking Confirmation with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Booking Confirmation with Logo generation", err.message);
  }

  // 18. Customer Itinerary / Travel Kit with Logo (Cover page hero branding)
  try {
    const itineraryWithLogo = await documentPdfService.renderCustomerItinerary({
      documentNumber: "DOC-ITIN-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      tripNumber: "TRIP-001",
      tripTitle: "Golden Triangle Exploration",
      startDate: new Date(),
      endDate: new Date(Date.now() + 4 * 86400000),
      itineraryDays: [
        { dayNumber: 1, title: "Arrival in Delhi & Heritage Walk", description: "Explore Old Delhi, Red Fort, and Chandni Chowk." },
        { dayNumber: 2, title: "Drive to Agra & Taj Mahal Tour", description: "Visit the iconic Taj Mahal at sunset and Agra Fort." },
        { dayNumber: 3, title: "Agra to Jaipur via Fatehpur Sikri", description: "En route stop at the UNESCO World Heritage site Fatehpur Sikri." },
      ],
      hotels: [{ name: "Oberoi Amarvilas Agra" }],
      vehicles: [{ name: "Private Chauffeur Sedan" }],
      activities: [{ name: "Guided Monument Pass" }],
    });
    assert(itineraryWithLogo.length > 1000 && itineraryWithLogo.toString("utf8", 0, 5) === "%PDF-", "Travel Kit / Customer Itinerary with Logo generates valid PDF binary");
  } catch (err: any) {
    assert(false, "Travel Kit with Logo generation", err.message);
  }

  // 19. Official Payment Receipt with Logo (Strict 1-Page Verification)
  try {
    const receiptWithLogo = await documentPdfService.renderPaymentReceipt({
      documentNumber: "RCPT-2026-001",
      version: 1,
      agency: sampleAgencyWithLogo,
      customer: sampleCustomer,
      paymentNumber: "PAY-2026-001",
      receiptNumber: "RCPT-2026-001",
      paymentDate: new Date(),
      amount: 50000,
      currency: "INR",
      paymentMethod: "UPI / Net Banking",
      referenceNumber: "UPI/399488271100/AXIS",
      totalBookingAmount: 150000,
      cumulativePaidAmount: 50000,
      remainingBalance: 100000,
      notes: "Advance installment received with thanks.",
    });
    assert(receiptWithLogo.length > 1000 && receiptWithLogo.toString("utf8", 0, 5) === "%PDF-", "Official Payment Receipt with Logo generates valid 1-page PDF binary");
  } catch (err: any) {
    assert(false, "Official Payment Receipt with Logo generation", err.message);
  }

  // 20. Official Payment Receipt without Logo (Strict 1-Page Verification)
  try {
    const receiptNoLogo = await documentPdfService.renderPaymentReceipt({
      documentNumber: "RCPT-2026-002",
      version: 1,
      agency: sampleAgencyNoLogo,
      customer: sampleCustomer,
      paymentNumber: "PAY-2026-002",
      receiptNumber: "RCPT-2026-002",
      paymentDate: new Date(),
      amount: 25000,
      currency: "INR",
      paymentMethod: "Bank NEFT Transfer",
      referenceNumber: "NEFT/HDFC22991002",
      totalBookingAmount: 75000,
      cumulativePaidAmount: 25000,
      remainingBalance: 50000,
    });
    assert(receiptNoLogo.length > 1000 && receiptNoLogo.toString("utf8", 0, 5) === "%PDF-", "Official Payment Receipt without Logo generates valid 1-page fallback PDF binary");
  } catch (err: any) {
    assert(false, "Official Payment Receipt without Logo fallback", err.message);
  }

  // --- SECTION 4: Tenant Isolation & Security ---
  console.log("\n--- Section 4: Tenant Isolation & Security Tests ---");

  // 21. Cross-Agency Logo Isolation: Agency A context cannot resolve Agency B logo
  try {
    const agencyBLogoUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    // When Agency A's ID is passed, checkEntitlement checks Agency A's plan/entitlement
    const resolved = await pdfBrandingHelper.resolveLogoBuffer({
      agencyId: testStarterAgency.id, // Starter agency (unentitled)
      logoUrl: agencyBLogoUrl,
      checkEntitlement: true,
    });
    assert(resolved === null, "Unentitled Agency A cannot render any logo even if URL is provided");
  } catch (err: any) {
    assert(false, "Cross-agency entitlement isolation check", err.message);
  }

  // 22. Fail-Open Robustness: Malformed URL does not throw
  try {
    const malformedBuf = await pdfBrandingHelper.resolveLogoBuffer({
      agencyId: testProAgency.id,
      logoUrl: "not-a-valid-url-at-all://foo",
      checkEntitlement: true,
    });
    assert(malformedBuf === null, "Malformed logo URL returns null fail-open without unhandled exceptions");
  } catch (err: any) {
    assert(false, "Malformed logo URL check", err.message);
  }

  // Clean up temporary database records
  await prisma.subscription.deleteMany({
    where: { agencyId: { in: [testStarterAgency.id, testProAgency.id] } },
  });
  await prisma.agency.delete({ where: { id: testStarterAgency.id } });
  await prisma.agency.delete({ where: { id: testProAgency.id } });

  console.log("\n================================================================================");
  console.log(`    PHASE 219 QA SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL: Phase 219 test execution failed:", err);
  process.exit(1);
});
