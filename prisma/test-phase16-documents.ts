import "dotenv/config";

// Mock server-only before importing service modules
import Module from "module";
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  // @ts-ignore
  return originalRequire.apply(this, arguments);
};

import { prisma } from "../src/lib/prisma";
import { TravelDocumentType, TravelDocumentStatus, NotificationChannel, UserRole } from "@prisma/client";
import { travelDocumentService } from "../src/lib/services/travel-document-service";
import { documentPdfService } from "../src/lib/services/document-pdf-service";
import { customerPortalService } from "../src/lib/services/customer-portal-service";

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

async function runPhase16Tests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 16: VOUCHERS & TRAVEL DOCUMENTS VERIFICATION");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  let agencyA: any;
  let agencyB: any;
  let customerA: any;
  let customerB: any;
  let tripA: any;
  let tripB: any;
  let bookingA: any;
  let bookingB: any;
  let paymentA: any;

  try {
    // ─── 1. SETUP MULTI-TENANT FIXTURES ───
    console.log("--- 1. Multi-Tenant Fixture Setup ---");

    agencyA = await prisma.agency.create({
      data: {
        name: `Alpha Voyages ${timestamp}`,
        phone: "+91 9876500001",
        email: `alpha_${timestamp}@test.com`,
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `Beta Safaris ${timestamp}`,
        phone: "+91 9876500002",
        email: `beta_${timestamp}@test.com`,
      },
    });

    // Customer A (Agency A)
    customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        customerNumber: `CUST-A-${timestamp}`,
        name: "Arjun Verma",
        phone: `+91981${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `arjun_${timestamp}@example.com`,
        city: "Mumbai",
      },
    });

    // Customer B (Agency B)
    customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        customerNumber: `CUST-B-${timestamp}`,
        name: "Priya Sharma",
        phone: `+91982${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `priya_${timestamp}@example.com`,
        city: "Delhi",
      },
    });

    // Trip & Booking A
    tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-A-${timestamp}`,
        title: "Golden Triangle Luxury Tour",
        startDate: new Date(Date.now() + 86400000 * 5),
        endDate: new Date(Date.now() + 86400000 * 10),
        status: "BOOKED",
      },
    });

    bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-A-${timestamp}`,
        status: "CONFIRMED",
        totalAmount: 120000,
        paidAmount: 50000,
        balanceAmount: 70000,
      },
    });

    // Trip & Booking B
    tripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `TRIP-B-${timestamp}`,
        title: "Kerala Backwaters & Hills",
        startDate: new Date(Date.now() + 86400000 * 7),
        endDate: new Date(Date.now() + 86400000 * 12),
        status: "BOOKED",
      },
    });

    bookingB = await prisma.booking.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripId: tripB.id,
        bookingNumber: `BK-B-${timestamp}`,
        status: "CONFIRMED",
        totalAmount: 95000,
        paidAmount: 95000,
        balanceAmount: 0,
      },
    });

    // Hotels, Operations & Confirmations for Booking A
    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "The Oberoi Amarvilas",
        city: "Agra",
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelA.id,
        roomType: "Premier Taj View Room",
        mealPlan: "Buffet Breakfast & Dinner",
        checkIn: tripA.startDate,
        checkOut: tripA.endDate,
      },
    });

    const opA = await prisma.tripOperation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        bookingId: bookingA.id,
        status: "READY",
      },
    });

    const hotelConfA = await prisma.hotelConfirmation.create({
      data: {
        agencyId: agencyA.id,
        tripOperationId: opA.id,
        tripHotelId: tripHotelA.id,
        confirmationNumber: `OB-AGRA-${timestamp}`,
        status: "CONFIRMED",
        checkIn: tripA.startDate,
        checkOut: tripA.endDate,
        roomDetails: "Premier Taj View Room",
        mealPlan: "MAPAI (Breakfast & Dinner)",
      },
    });

    // Payment A
    paymentA = await prisma.payment.create({
      data: {
        agencyId: agencyA.id,
        bookingId: bookingA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        paymentNumber: `PAY-${timestamp}`,
        amount: 50000,
        paymentMethod: "UPI",
        referenceNumber: "UPI/TXN/998877",
        receiptNumber: `RCP-${timestamp}`,
        status: "COMPLETED",
      },
    });

    assert(agencyA && agencyB, "Test agencies Alpha and Beta created successfully");

    // ─── 2. SEQUENTIAL DOCUMENT NUMBERING ───
    console.log("\n--- 2. Sequential Document Numbering ---");

    const hvNum1 = await travelDocumentService.generateNextDocumentNumber(agencyA.id, TravelDocumentType.HOTEL_VOUCHER);
    const year = new Date().getFullYear();
    assert(hvNum1.startsWith(`HV-${year}-`), `Hotel Voucher number starts with HV-${year}- (${hvNum1})`);

    const vvNum1 = await travelDocumentService.generateNextDocumentNumber(agencyA.id, TravelDocumentType.VEHICLE_VOUCHER);
    assert(vvNum1.startsWith(`VV-${year}-`), `Vehicle Voucher number starts with VV-${year}- (${vvNum1})`);

    const rcNum1 = await travelDocumentService.generateNextDocumentNumber(agencyA.id, TravelDocumentType.PAYMENT_RECEIPT);
    assert(rcNum1.startsWith(`RC-${year}-`), `Payment Receipt number starts with RC-${year}- (${rcNum1})`);

    // ─── 3. MULTI-DOCUMENT GENERATION ───
    console.log("\n--- 3. Multi-Document Generation Engine ---");

    const genResult = await travelDocumentService.generateBookingDocuments(agencyA.id, bookingA.id);
    assert(genResult.generatedCount >= 3, `Generated ${genResult.generatedCount} travel documents for booking A`);

    const confirmationDoc = genResult.documents.find((d) => d.documentType === TravelDocumentType.BOOKING_CONFIRMATION);
    assert(!!confirmationDoc, "Booking confirmation document created");
    assert(confirmationDoc?.status === TravelDocumentStatus.GENERATED, "Initial booking confirmation status is GENERATED");
    assert(confirmationDoc?.version === 1, "Initial booking confirmation version is 1");
    assert(confirmationDoc?.isLatest === true, "Initial booking confirmation is marked isLatest = true");

    const hotelVoucherDoc = genResult.documents.find((d) => d.documentType === TravelDocumentType.HOTEL_VOUCHER);
    assert(!!hotelVoucherDoc, "Hotel voucher document created from operation confirmation");
    assert(hotelVoucherDoc?.hotelConfirmationId === hotelConfA.id, "Hotel voucher linked to correct HotelConfirmation ID");

    // Idempotency: duplicate generation request returns existing documents without duplicate records
    const genResult2 = await travelDocumentService.generateBookingDocuments(agencyA.id, bookingA.id);
    assert(genResult2.generatedCount === genResult.generatedCount, "Second generation call returns existing documents idempotently");

    const totalDocsInDb = await prisma.travelDocument.count({
      where: { agencyId: agencyA.id, bookingId: bookingA.id },
    });
    assert(totalDocsInDb === genResult.generatedCount, `Database contains exactly ${genResult.generatedCount} document records (No duplicates)`);

    // Payment Receipt Generation
    const receiptDoc = await travelDocumentService.generatePaymentReceipt(agencyA.id, paymentA.id);
    assert(receiptDoc.documentType === TravelDocumentType.PAYMENT_RECEIPT, "Payment receipt document generated");
    assert(receiptDoc.status === TravelDocumentStatus.ISSUED, "Payment receipt is immediately marked ISSUED");
    assert(receiptDoc.paymentId === paymentA.id, "Payment receipt correctly linked to Payment ID");

    // ─── 4. STATE MACHINE & ISSUANCE LIFECYCLE ───
    console.log("\n--- 4. Document State Machine & Issuance ---");

    if (hotelVoucherDoc) {
      // GENERATED -> ISSUED
      const issuedDoc = await travelDocumentService.issueDocument(agencyA.id, hotelVoucherDoc.id, {
        notifyCustomer: false,
      });
      assert(issuedDoc.status === TravelDocumentStatus.ISSUED, "Document transitioned from GENERATED to ISSUED");
      assert(issuedDoc.issuedAt !== null, "issuedAt timestamp is set on issued document");

      // ISSUED -> REVOKED
      const revokedDoc = await travelDocumentService.revokeDocument(agencyA.id, hotelVoucherDoc.id, {
        reason: "Traveler requested date change and property upgrade",
      });
      assert(revokedDoc.status === TravelDocumentStatus.REVOKED, "Document transitioned from ISSUED to REVOKED");
      assert(revokedDoc.revokedAt !== null, "revokedAt timestamp is set on revoked document");
      assert(revokedDoc.revokedReason === "Traveler requested date change and property upgrade", "Revocation reason recorded");

      // Invalid transition: REVOKED -> ISSUED must be BLOCKED
      let issueBlocked = false;
      try {
        await travelDocumentService.issueDocument(agencyA.id, hotelVoucherDoc.id);
      } catch (err: any) {
        issueBlocked = true;
      }
      assert(issueBlocked, "Re-issuing a REVOKED document is strictly blocked by state machine");
    }

    // ─── 5. DOCUMENT VERSIONING & IMMUTABILITY ───
    console.log("\n--- 5. Document Versioning & Immutability ---");

    if (confirmationDoc) {
      // Issue v1 first
      const v1Issued = await travelDocumentService.issueDocument(agencyA.id, confirmationDoc.id);
      assert(v1Issued.status === TravelDocumentStatus.ISSUED, "Confirmation v1 officially issued");

      // Regenerate document -> v1 becomes SUPERSEDED, v2 created as GENERATED
      const v2 = await travelDocumentService.regenerateDocument(agencyA.id, confirmationDoc.id, "Updated flight times");
      assert(v2.version === 2, "Regenerated document has version = 2");
      assert(v2.isLatest === true, "v2 document marked isLatest = true");
      assert(v2.supersedesDocumentId === confirmationDoc.id, "v2 linked to v1 via supersedesDocumentId");
      assert(v2.documentNumber === confirmationDoc.documentNumber, "v2 retains same canonical documentNumber");

      const v1Refreshed = await prisma.travelDocument.findUnique({
        where: { id: confirmationDoc.id },
      });
      assert(v1Refreshed?.status === TravelDocumentStatus.SUPERSEDED, "v1 document status transitioned to SUPERSEDED");
      assert(v1Refreshed?.isLatest === false, "v1 document marked isLatest = false");

      // Invalid transition: SUPERSEDED -> ISSUED must be BLOCKED
      let supersedeBlocked = false;
      try {
        await travelDocumentService.issueDocument(agencyA.id, confirmationDoc.id);
      } catch {
        supersedeBlocked = true;
      }
      assert(supersedeBlocked, "Issuing a SUPERSEDED document is strictly blocked");
    }

    // ─── 6. COMMERCIAL PRIVACY & ZERO DATA LEAKAGE ───
    console.log("\n--- 6. Commercial Privacy & Zero Data Leakage Scan ---");

    // Render hotel voucher PDF buffer
    if (hotelVoucherDoc) {
      const pdfRes = await travelDocumentService.renderDocumentPdf(agencyA.id, hotelVoucherDoc.id);
      assert(pdfRes.buffer.length > 1000, `Hotel Voucher PDF generated successfully (${pdfRes.buffer.length} bytes)`);
      assert(pdfRes.contentType === "application/pdf", "Content-Type is application/pdf");

      const pdfText = pdfRes.buffer.toString("utf8");
      assert(!pdfText.includes("costPrice") && !pdfText.includes("buyPrice"), "Zero costPrice / buyPrice leakage in PDF");
      assert(!pdfText.includes("markupPercentage") && !pdfText.includes("markupAmount"), "Zero markup leakage in PDF");
      assert(!pdfText.includes("supplierPayable") && !pdfText.includes("grossProfit"), "Zero supplierPayable / profit leakage in PDF");
    }

    // Render payment receipt PDF buffer
    const receiptPdf = await travelDocumentService.renderDocumentPdf(agencyA.id, receiptDoc.id);
    assert(receiptPdf.buffer.length > 1000, `Payment Receipt PDF generated successfully (${receiptPdf.buffer.length} bytes)`);

    // ─── 7. MULTI-TENANT ISOLATION & IDOR PREVENTION ───
    console.log("\n--- 7. Multi-Tenant Isolation & Customer IDOR Enforcement ---");

    // Agency B accessing Agency A document -> BLOCKED
    let agencyIdorBlocked = false;
    try {
      await travelDocumentService.getDocumentDetails(agencyB.id, receiptDoc.id);
    } catch {
      agencyIdorBlocked = true;
    }
    assert(agencyIdorBlocked, "Agency B accessing Agency A document returns NOT_FOUND / Access Denied");

    // Customer Portal: Customer A can access own trip documents
    const custDocsA = await customerPortalService.getCustomerTripDocuments(customerA.id, agencyA.id, tripA.id);
    assert(custDocsA.length > 0, `Customer A retrieved ${custDocsA.length} customer-safe documents for own trip`);

    // Customer B attempting to access Customer A trip documents -> BLOCKED
    let custIdorBlocked = false;
    try {
      await customerPortalService.getCustomerTripDocuments(customerB.id, agencyA.id, tripA.id);
    } catch {
      custIdorBlocked = true;
    }
    assert(custIdorBlocked, "Customer B accessing Customer A trip documents is strictly BLOCKED (IDOR)");

    // Customer B downloading Customer A document -> BLOCKED
    let custDownloadBlocked = false;
    try {
      await customerPortalService.downloadCustomerDocument(customerB.id, agencyA.id, tripA.id, "TRAVEL_DOCUMENT", receiptDoc.id);
    } catch {
      custDownloadBlocked = true;
    }
    assert(custDownloadBlocked, "Customer B downloading Customer A document directly is BLOCKED (IDOR)");

    // ─── 8. COMMUNICATION GATEWAY INTEGRATION & RESEND ───
    console.log("\n--- 8. Communication Gateway Integration ---");

    const resendResult = await travelDocumentService.resendDocument(agencyA.id, receiptDoc.id, {
      channel: NotificationChannel.EMAIL,
    });
    assert(resendResult.success === true, "Issued document successfully dispatched via Phase 15 communication gateway");

    // Resend on REVOKED document -> BLOCKED
    if (hotelVoucherDoc) {
      let resendRevokedBlocked = false;
      try {
        await travelDocumentService.resendDocument(agencyA.id, hotelVoucherDoc.id);
      } catch {
        resendRevokedBlocked = true;
      }
      assert(resendRevokedBlocked, "Resending a REVOKED document is strictly blocked");
    }

    // ─── 9. STRICT ROLE MODEL INVARIANT ───
    console.log("\n--- 9. Strict Role Architecture Invariant ---");

    const customerUsers = await prisma.user.findMany({
      where: { email: { in: [customerA.email, customerB.email] } },
    });
    assert(customerUsers.length === 0, "Zero internal User accounts created for customers (External customer architecture preserved)");

    const allUsers = await prisma.user.findMany({
      select: { role: true },
    });
    const invalidRoles = allUsers.filter(
      (u) => u.role !== UserRole.PLATFORM_OWNER && u.role !== UserRole.AGENCY_OWNER
    );
    assert(invalidRoles.length === 0, "All internal users have valid roles (PLATFORM_OWNER or AGENCY_OWNER)");

  } catch (error) {
    console.error("Test execution encountered an error:", error);
    failed++;
  } finally {
    // Clean up fixtures
    console.log("\n--- Cleaning up Phase 16 Test Fixtures ---");
    if (agencyA?.id) {
      await prisma.agency.delete({ where: { id: agencyA.id } }).catch(() => {});
    }
    if (agencyB?.id) {
      await prisma.agency.delete({ where: { id: agencyB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`🏁 PHASE 16 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED (${passed + failed} Total)`);
  console.log("══════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase16Tests();
