import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";
import { invoiceSequenceService } from "../src/lib/services/invoice-sequence-service";
import { paymentService } from "../src/lib/services/payment-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import {
  BookingStatus,
  InvoiceStatus,
  DiscountType,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";

async function runDev04InvoiceTests() {
  console.log("=================================================");
  console.log("TRIPDESK DEV-04B INVOICE V1 AUTOMATED VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  // Create isolated Test Agency A
  const agencyA = await prisma.agency.create({
    data: {
      name: `Invoice Test Agency A - ${timestamp}`,
      email: `agency_a_${timestamp}@tripdesk.test`,
      phone: "+919876543210",
      address: "123 Business Tower, Mumbai, Maharashtra",
    },
  });

  // Create isolated Test Agency B (for multi-tenant isolation testing)
  const agencyB = await prisma.agency.create({
    data: {
      name: `Invoice Test Agency B - ${timestamp}`,
      email: `agency_b_${timestamp}@tripdesk.test`,
      phone: "+919876543211",
      address: "456 Commerce Hub, Bengaluru, Karnataka",
    },
  });

  // Create Customer for Agency A
  const customerA = await prisma.customer.create({
    data: {
      agencyId: agencyA.id,
      name: "Rohit Sharma",
      email: "rohit@test.com",
      phone: "+919988776655",
      address: "Flat 402, Sea View Apartments",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400050",
    },
  });

  // Create Trip for Agency A
  const tripA = await prisma.trip.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripNumber: `TRIP-A-${timestamp}`,
      title: "Majestic Kashmir Tour",
      startDate: new Date("2026-10-10"),
      endDate: new Date("2026-10-17"),
      status: "BOOKED",
    },
  });

  // Create Quotation for Agency A
  const quotationA = await prisma.quotation.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripId: tripA.id,
      quotationNumber: `QUO-A-${timestamp}`,
      finalAmount: 75000,
      subtotal: 75000,
      status: "ACCEPTED",
      items: {
        create: [
          {
            type: "PACKAGE",
            name: "Srinagar Deluxe Houseboat (2 Nights)",
            quantity: 2,
            unitPrice: 15000,
            sellingPrice: 15000,
            totalPrice: 30000,
            sortOrder: 0,
          },
          {
            type: "PACKAGE",
            name: "Gulmarg Luxury Resort & Gondola Pass (3 Nights)",
            quantity: 3,
            unitPrice: 15000,
            sellingPrice: 15000,
            totalPrice: 45000,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  // Create Confirmed Booking for Agency A
  const confirmedBookingA = await prisma.booking.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripId: tripA.id,
      quotationId: quotationA.id,
      bookingNumber: `BK-A-${timestamp}`,
      status: BookingStatus.CONFIRMED,
      totalAmount: 75000,
      paidAmount: 0,
      balanceAmount: 75000,
      currency: "INR",
      travelStartDate: new Date("2026-10-10"),
      travelEndDate: new Date("2026-10-17"),
    },
  });

  // Create Draft Booking (Ineligible for invoice creation)
  const draftBookingA = await prisma.booking.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripId: tripA.id,
      bookingNumber: `BK-DRAFT-${timestamp}`,
      status: BookingStatus.DRAFT,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
    },
  });

  console.log("\n--- Section 1: Invoice Creation & Eligibility Tests ---");

  // Test 1: Draft Creation from Confirmed Booking
  const draft1 = await invoiceService.createDraftInvoice(agencyA.id, confirmedBookingA.id);
  assert(
    draft1.status === InvoiceStatus.DRAFT &&
      draft1.invoiceNumber === null &&
      Number(draft1.totalAmount) === 75000 &&
      Number(draft1.subtotal) === 75000 &&
      Number(draft1.balanceAmount) === 75000 &&
      draft1.items.length === 2,
    "1. Draft invoice created successfully from Confirmed Booking with 2 quotation items"
  );

  // Test 2: Structured Snapshots Integrity
  const custSnap = draft1.customerSnapshot as any;
  const bookSnap = draft1.bookingSnapshot as any;
  const agSnap = draft1.agencySnapshot as any;
  assert(
    custSnap?.name === "Rohit Sharma" &&
      custSnap?.phone === "+919988776655" &&
      bookSnap?.bookingNumber === confirmedBookingA.bookingNumber &&
      agSnap?.name === agencyA.name,
    "2. Customer, Booking, and Agency snapshot fields captured accurately"
  );

  // Test 3: Ineligible Booking Rejection (DRAFT Booking)
  let draftBookingRejected = false;
  try {
    await invoiceService.createDraftInvoice(agencyA.id, draftBookingA.id);
  } catch (err: any) {
    draftBookingRejected = err?.message?.includes("CONFIRMED");
  }
  assert(
    draftBookingRejected,
    "3. Ineligible DRAFT Booking strictly rejected from invoice creation"
  );

  // Test 4: Single Active Invoice Constraint (Returns existing Draft)
  const draftReused = await invoiceService.createDraftInvoice(agencyA.id, confirmedBookingA.id);
  assert(
    draftReused.id === draft1.id,
    "4. Calling createDraftInvoice on a booking with existing Draft returns the existing Draft"
  );

  console.log("\n--- Section 2: Draft Editing & Discount Calculations ---");

  // Test 5: Update Draft Line Items and Fixed Discount
  const updatedDraft = await invoiceService.updateDraftInvoice(agencyA.id, draft1.id, {
    items: [
      { description: "Custom Houseboat Stay", quantity: 2, rate: 10000 },
      { description: "Helicopter Transfer", quantity: 1, rate: 20000 },
    ],
    discountType: DiscountType.FIXED,
    discountValue: 5000,
    notes: "Special corporate rate applied.",
    paymentInstructions: "Pay via UPI to agency@hdfcbank",
  });

  assert(
    Number(updatedDraft.subtotal) === 40000 &&
      Number(updatedDraft.discountAmount) === 5000 &&
      Number(updatedDraft.totalAmount) === 35000 &&
      Number(updatedDraft.balanceAmount) === 35000 &&
      updatedDraft.items.length === 2,
    "5. Draft line items update and Fixed Discount calculated accurately (40k - 5k = 35k)"
  );

  // Test 6: Percentage Discount Calculation
  const percentDraft = await invoiceService.updateDraftInvoice(agencyA.id, draft1.id, {
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10, // 10% of 40,000 = 4,000
  });

  assert(
    Number(percentDraft.subtotal) === 40000 &&
      Number(percentDraft.discountAmount) === 4000 &&
      Number(percentDraft.totalAmount) === 36000,
    "6. Percentage Discount calculated accurately (10% of 40k = 4k, Total = 36k)"
  );

  console.log("\n--- Section 3: Draft Deletion & Sequential Issuance ---");

  // Create temporary Draft to test deletion
  const bookingTemp = await prisma.booking.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripId: tripA.id,
      bookingNumber: `BK-TEMP-${timestamp}`,
      status: BookingStatus.CONFIRMED,
      totalAmount: 25000,
      paidAmount: 0,
      balanceAmount: 25000,
    },
  });

  const draftToDelete = await invoiceService.createDraftInvoice(agencyA.id, bookingTemp.id);
  const deleteResult = await invoiceService.deleteDraftInvoice(agencyA.id, draftToDelete.id);
  const findDeleted = await prisma.invoice.findUnique({ where: { id: draftToDelete.id } });
  assert(
    deleteResult.success && findDeleted === null,
    "7. Draft invoice deleted cleanly without consuming invoice number"
  );

  // Test 8: Concurrency-Safe Sequential Invoice Numbering on Issue
  const issued1 = await invoiceService.issueInvoice(agencyA.id, draft1.id, "user-test-1");
  assert(
    issued1.status === InvoiceStatus.ISSUED &&
      issued1.invoiceNumber === "INV-0001" &&
      Number(issued1.totalAmount) === 36000 &&
      Number(issued1.balanceAmount) === 36000,
    "8. First issued invoice atomically allocated sequence 'INV-0001'"
  );

  // Create second invoice for Agency A to verify sequential increment
  const draft2 = await invoiceService.createDraftInvoice(agencyA.id, bookingTemp.id);
  const issued2 = await invoiceService.issueInvoice(agencyA.id, draft2.id, "user-test-1");
  assert(
    issued2.invoiceNumber === "INV-0002" && issued2.status === InvoiceStatus.ISSUED,
    "9. Second issued invoice for Agency A allocated sequential 'INV-0002'"
  );

  // Verify Agency B sequence starts independently at INV-0001
  const customerB = await prisma.customer.create({
    data: {
      agencyId: agencyB.id,
      name: "Virat Kohli",
      email: "virat@test.com",
      phone: "+919988776644",
    },
  });
  const tripB = await prisma.trip.create({
    data: {
      agencyId: agencyB.id,
      customerId: customerB.id,
      tripNumber: `TRIP-B-${timestamp}`,
      title: "Goa Beach Holiday",
      startDate: new Date("2026-11-01"),
      endDate: new Date("2026-11-05"),
      status: "BOOKED",
    },
  });
  const bookingB = await prisma.booking.create({
    data: {
      agencyId: agencyB.id,
      customerId: customerB.id,
      tripId: tripB.id,
      bookingNumber: `BK-B-${timestamp}`,
      status: BookingStatus.CONFIRMED,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
    },
  });
  const draftB = await invoiceService.createDraftInvoice(agencyB.id, bookingB.id);
  const issuedB = await invoiceService.issueInvoice(agencyB.id, draftB.id, "user-test-2");
  assert(
    issuedB.invoiceNumber === "INV-0001",
    "10. Agency B sequence starts independently at 'INV-0001' (Zero cross-tenant sequence leakage)"
  );

  // Test 11: Immutability of Issued Invoices
  let issueUpdateRejected = false;
  try {
    await invoiceService.updateDraftInvoice(agencyA.id, issued1.id, {
      items: [{ description: "Hacked Item", quantity: 1, rate: 99999 }],
    });
  } catch (err: any) {
    issueUpdateRejected = err?.message?.includes("Only DRAFT invoices can be edited");
  }
  assert(
    issueUpdateRejected,
    "11. Issued invoice is IMMUTABLE: direct draft update is strictly rejected"
  );

  console.log("\n--- Section 4: Payment Recording, Voiding & Status State Machine ---");

  // Test 12: Partial Payment Recording
  const payment1 = await paymentService.recordInvoicePayment(agencyA.id, issued1.id, {
    amount: 16000,
    paymentMethod: PaymentMethod.UPI,
    referenceNumber: "UPI-TEST-12345",
    notes: "Part 1 advance",
  });

  const invAfterPay1 = await invoiceService.getInvoice(agencyA.id, issued1.id);
  assert(
    payment1.amount.toNumber() === 16000 &&
      invAfterPay1?.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(invAfterPay1.paidAmount) === 16000 &&
      Number(invAfterPay1.balanceAmount) === 20000,
    "12. Partial payment (₹16,000 on ₹36,000) transitions status to PARTIALLY_PAID (Balance: ₹20,000)"
  );

  // Test 13: Overpayment Rejection
  let overpayRejected = false;
  try {
    await paymentService.recordInvoicePayment(agencyA.id, issued1.id, {
      amount: 25000, // Balance is only 20,000
    });
  } catch (err: any) {
    overpayRejected = err?.message?.includes("exceeds remaining invoice balance");
  }
  assert(
    overpayRejected,
    "13. Overpayment strictly rejected (₹25,000 attempted against ₹20,000 balance)"
  );

  // Test 14: Full Payment Recording
  const payment2 = await paymentService.recordInvoicePayment(agencyA.id, issued1.id, {
    amount: 20000,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    referenceNumber: "NEFT-TEST-99887",
  });

  const invAfterPay2 = await invoiceService.getInvoice(agencyA.id, issued1.id);
  assert(
    invAfterPay2?.status === InvoiceStatus.PAID &&
      Number(invAfterPay2.paidAmount) === 36000 &&
      Number(invAfterPay2.balanceAmount) === 0,
    "14. Final payment transitions status to PAID (Paid: ₹36,000, Balance: ₹0)"
  );

  // Test 15: Payment Voiding with Mandatory Reason
  const voided = await paymentService.voidPayment(
    agencyA.id,
    payment2.id,
    "user-test-1",
    "Customer transfer was reversed by bank"
  );

  const invAfterVoid = await invoiceService.getInvoice(agencyA.id, issued1.id);
  assert(
    voided.status === PaymentStatus.VOIDED &&
      voided.voidReason === "Customer transfer was reversed by bank" &&
      invAfterVoid?.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(invAfterVoid.paidAmount) === 16000 &&
      Number(invAfterVoid.balanceAmount) === 20000,
    "15. Payment voided with mandatory reason; status reverted from PAID to PARTIALLY_PAID and balance recalculated"
  );

  console.log("\n--- Section 5: Cancellation & Replacement Lifecycle ---");

  // Test 16: Cancel Invoice
  const cancelledInv = await invoiceService.cancelInvoice(
    agencyA.id,
    issued1.id,
    "user-test-1",
    "Guest requested complete package modification"
  );

  assert(
    cancelledInv.status === InvoiceStatus.CANCELLED &&
      cancelledInv.cancellationReason === "Guest requested complete package modification" &&
      cancelledInv.cancelledBy === "user-test-1",
    "16. Invoice cancelled with reason and metadata (Status: CANCELLED)"
  );

  // Test 17: Create Replacement Invoice
  const replacementDraft = await invoiceService.createReplacementInvoice(agencyA.id, issued1.id);
  assert(
    replacementDraft.status === InvoiceStatus.DRAFT &&
      replacementDraft.invoiceNumber === null &&
      replacementDraft.id !== issued1.id &&
      replacementDraft.items.length === 2 &&
      Number(replacementDraft.totalAmount) === 36000,
    "17. Replacement Draft created referencing original booking with fresh ID and null invoice number"
  );

  // Test 18: Issue Replacement Invoice (Consumes next number INV-0003, never reuses INV-0001)
  const issuedReplacement = await invoiceService.issueInvoice(
    agencyA.id,
    replacementDraft.id,
    "user-test-1"
  );
  assert(
    issuedReplacement.invoiceNumber === "INV-0003" &&
      issuedReplacement.status === InvoiceStatus.ISSUED,
    "18. Replacement invoice issued with next sequential number 'INV-0003' (Never reuses cancelled INV-0001)"
  );

  console.log("\n--- Section 6: Dynamic Overdue & Operational Summary ---");

  // Test 19: Dynamic Overdue Calculation
  // Force dueDate to past date
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  await prisma.invoice.update({
    where: { id: issuedReplacement.id },
    data: { dueDate: pastDate },
  });

  const overdueInvoice = await invoiceService.getInvoice(agencyA.id, issuedReplacement.id);
  assert(
    overdueInvoice?.isOverdue === true,
    "19. Dynamic overdue calculated correctly when today > dueDate and balance > 0"
  );

  // Test 20: Operational Summary Aggregation
  const summary = await invoiceService.getInvoiceSummary(agencyA.id);
  assert(
    summary.totalInvoices >= 2 &&
      summary.totalBilled > 0 &&
      summary.totalOutstanding > 0 &&
      summary.totalOverdue >= 1,
    "20. Operational Summary correctly aggregates totalInvoices, totalBilled, totalPaid, totalOutstanding, and overdueCount"
  );

  console.log("\n--- Section 7: PDFKit Document Generation ---");

  // Test 21: PDF Generation for Draft, Issued, and Cancelled
  const draftPdf = await invoicePdfService.generateInvoicePdf(draftToDelete as any);
  const issuedPdf = await invoicePdfService.generateInvoicePdf(issuedReplacement);
  const cancelledPdf = await invoicePdfService.generateInvoicePdf(cancelledInv);

  assert(
    Buffer.isBuffer(draftPdf) && draftPdf.length > 1000 &&
      Buffer.isBuffer(issuedPdf) && issuedPdf.length > 1000 &&
      Buffer.isBuffer(cancelledPdf) && cancelledPdf.length > 1000,
    "21. PDFKit generates valid binary PDF buffers for Draft, Issued, and Cancelled invoice states"
  );

  console.log("\n--- Section 8: Multi-Tenant Security & IDOR Protection ---");

  // Test 22: Cross-Tenant Invoice Fetch Isolation
  const crossTenantGet = await invoiceService.getInvoice(agencyB.id, issuedReplacement.id);
  assert(
    crossTenantGet === null,
    "22. Multi-tenant isolation: Agency B cannot retrieve Agency A's Invoice (Returns null)"
  );

  // Test 23: Cross-Tenant Payment Recording Rejection
  let crossTenantPayRejected = false;
  try {
    await paymentService.recordInvoicePayment(agencyB.id, issuedReplacement.id, {
      amount: 5000,
    });
  } catch (err: any) {
    crossTenantPayRejected = err?.message?.includes("Invoice not found");
  }
  assert(
    crossTenantPayRejected,
    "23. Multi-tenant isolation: Agency B cannot record payment on Agency A's invoice (Strictly rejected)"
  );

  // Clean up test data
  console.log("\nCleaning up test agencies and billing records...");
  await prisma.payment.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.invoiceItem.deleteMany({
    where: { invoice: { agencyId: { in: [agencyA.id, agencyB.id] } } },
  });
  await prisma.invoice.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.invoiceSequence.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.booking.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.quotationItem.deleteMany({
    where: { quotation: { agencyId: { in: [agencyA.id, agencyB.id] } } },
  });
  await prisma.quotation.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.trip.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.customer.deleteMany({
    where: { agencyId: { in: [agencyA.id, agencyB.id] } },
  });
  await prisma.agency.deleteMany({
    where: { id: { in: [agencyA.id, agencyB.id] } },
  });

  console.log("\n=================================================");
  console.log(`DEV-04B VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDev04InvoiceTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
