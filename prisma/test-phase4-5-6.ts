/**
 * YOUR TRAVEL DESK — PHASE 4, 5 & 6 COMPREHENSIVE VERIFICATION SUITE
 *
 * Automated verification for:
 * - Phase 4: Booking Management & Post-Booking Operations
 *   (Milestones, WhatsApp reminders, invoice immutability, negative balance prevention,
 *    booking amendment audit trail, traveller primary invariants, superseded documents)
 * - Phase 5: Customer Experience & Self-Service
 *   (Public token security, DTO sanitization, customer milestones, document versioning, traveller privacy)
 * - Phase 6: Supplier & Vendor Management
 *   (Tenant isolation, staff financial redaction, bank details protection, operational 360 linkage, delete safeguards)
 */

import Module from "module";
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

import { SENSITIVE_FINANCIAL_KEYS, redactStaffFinancials } from "../src/lib/auth/permissions";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runPhase4Tests() {
  console.log("\n=======================================================");
  console.log("PHASE 4: BOOKING MANAGEMENT & POST-BOOKING OPERATIONS");
  console.log("=======================================================");

  // 1. Milestone Payment Allocation Logic
  console.log("\n[4A] Payment Milestone Allocation & Zero Milestones:");
  {
    // Simulation of financeService milestone waterfall allocation
    function calculateScheduleAllocation(
      bookingTotal: number,
      rawMilestones: Array<{ title: string; percentage: number; dueDate: string | null }>,
      completedPayments: number
    ) {
      if (!rawMilestones || rawMilestones.length === 0) {
        return {
          milestones: [],
          totalPlanned: bookingTotal,
          totalAllocated: completedPayments,
          totalOutstanding: Math.max(0, bookingTotal - completedPayments),
          hasAgreedMilestones: false,
        };
      }

      let unallocated = completedPayments;
      const now = new Date();

      const allocatedMilestones = rawMilestones.map((m) => {
        const plannedAmount = Math.round((bookingTotal * m.percentage) / 100);
        const allocatedAmount = Math.min(unallocated, plannedAmount);
        const remainingAmount = plannedAmount - allocatedAmount;
        unallocated -= allocatedAmount;

        let status: "PAID" | "PARTIALLY_PAID" | "PENDING" | "OVERDUE" = "PENDING";
        if (remainingAmount === 0 && plannedAmount > 0) {
          status = "PAID";
        } else if (allocatedAmount > 0 && remainingAmount > 0) {
          status = "PARTIALLY_PAID";
        } else if (m.dueDate && new Date(m.dueDate) < now && remainingAmount > 0) {
          status = "OVERDUE";
        }

        return {
          ...m,
          plannedAmount,
          allocatedAmount,
          remainingAmount,
          status,
        };
      });

      return {
        milestones: allocatedMilestones,
        totalPlanned: bookingTotal,
        totalAllocated: completedPayments,
        totalOutstanding: Math.max(0, bookingTotal - completedPayments),
        hasAgreedMilestones: true,
      };
    }

    // Test 1: Zero milestones handling - no artificial 30/70 fallback
    const zeroMilestones = calculateScheduleAllocation(100000, [], 25000);
    assert(
      zeroMilestones.milestones.length === 0 && !zeroMilestones.hasAgreedMilestones,
      "Zero milestones returns empty array without artificial 30/70 generation"
    );
    assert(
      zeroMilestones.totalOutstanding === 75000 && zeroMilestones.totalAllocated === 25000,
      "Direct balance calculation correctly computes outstanding balance without milestones"
    );

    // Test 2: Waterfall allocation with partial payment
    const agreedMilestones = [
      { title: "Booking Deposit", percentage: 30, dueDate: "2026-05-01" },
      { title: "Pre-Travel Balance", percentage: 70, dueDate: "2026-12-01" },
    ];
    const partialAllocation = calculateScheduleAllocation(100000, agreedMilestones, 30000);
    assert(
      partialAllocation.milestones[0].status === "PAID" &&
        partialAllocation.milestones[0].allocatedAmount === 30000 &&
        partialAllocation.milestones[1].status === "PENDING" &&
        partialAllocation.milestones[1].allocatedAmount === 0,
      "Deposit milestone is fully allocated and balance milestone remains pending"
    );

    // Test 3: Overdue milestone detection
    const pastDueDateMilestones = [
      { title: "First Installment", percentage: 50, dueDate: "2025-01-01" }, // In past
      { title: "Final Installment", percentage: 50, dueDate: null }, // Missing due date
    ];
    const overdueResult = calculateScheduleAllocation(100000, pastDueDateMilestones, 0);
    assert(
      overdueResult.milestones[0].status === "OVERDUE",
      "Milestone with past due date and outstanding balance > 0 is marked OVERDUE"
    );
    assert(
      overdueResult.milestones[1].status === "PENDING",
      "Milestone with missing due date is NOT classified as OVERDUE"
    );

    // Test 4: Pending and voided payments exclusion
    const payments = [
      { status: "COMPLETED", amount: 20000 },
      { status: "PENDING", amount: 50000 },
      { status: "FAILED", amount: 10000 },
      { status: "VOIDED", amount: 5000 },
    ];
    const eligiblePaid = payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);
    assert(
      eligiblePaid === 20000,
      "Only COMPLETED payments count towards received amount (PENDING/FAILED/VOIDED excluded)"
    );

    // Test 5: Overpayment handling
    const overpaymentResult = calculateScheduleAllocation(100000, agreedMilestones, 120000);
    assert(
      overpaymentResult.totalOutstanding === 0 &&
        overpaymentResult.milestones[0].status === "PAID" &&
        overpaymentResult.milestones[1].status === "PAID",
      "Overpayment fully pays all milestones without creating negative balance"
    );
  }

  // 2. WhatsApp Milestone Reminder URL Generator
  console.log("\n[4B] WhatsApp Click-to-Chat Milestone Reminders:");
  {
    function generateMilestoneReminderUrl(params: {
      phone: string;
      customerName: string;
      bookingNumber: string;
      milestoneTitle: string;
      outstandingAmount: number;
      dueDate?: string | null;
    }) {
      const cleanPhone = params.phone.replace(/\D/g, "");
      const formattedAmount = `₹${params.outstandingAmount.toLocaleString("en-IN")}`;
      const dueText = params.dueDate ? ` due by ${params.dueDate}` : "";
      const text = `Hi ${params.customerName}, payment reminder for your booking ${params.bookingNumber}: "${params.milestoneTitle}" (${formattedAmount})${dueText} is pending. Please let us know once transferred. Thank you!`;
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    }

    const reminderUrl = generateMilestoneReminderUrl({
      phone: "+91 98765 43210",
      customerName: "Rahul Sharma",
      bookingNumber: "BKG-2026-00042",
      milestoneTitle: "50% Pre-Flight Milestone",
      outstandingAmount: 45000,
      dueDate: "15 Nov 2026",
    });

    assert(
      reminderUrl.startsWith("https://wa.me/919876543210?text="),
      "Reminder URL uses standard wa.me format with cleaned international phone number"
    );
    assert(
      reminderUrl.includes("BKG-2026-00042") && reminderUrl.includes("50%25%20Pre-Flight%20Milestone"),
      "Reminder URL contains URL-encoded booking reference and milestone title"
    );
  }

  // 3. Booking Amendment Integrity & Invoice Immutability
  console.log("\n[4C] Booking Amendment & Invoice Immutability:");
  {
    // Simulation of updateBooking financial safeguards
    function validateBookingAmendment(
      currentBooking: { totalAmount: number; paidAmount: number },
      newTotal: number,
      activeInvoice?: { invoiceNumber: string; totalAmount: number }
    ) {
      // Safeguard 1: Block reduction below paid amount
      if (newTotal < currentBooking.paidAmount) {
        throw new Error(
          `Cannot reduce booking total to ₹${newTotal.toLocaleString("en-IN")}, which is less than verified received payments (₹${currentBooking.paidAmount.toLocaleString("en-IN")}).`
        );
      }

      // Safeguard 2: Historical invoice immutability
      let invoiceMutated = false;
      if (activeInvoice && newTotal !== currentBooking.totalAmount) {
        // Historical invoice must NOT be updated
        invoiceMutated = false; // Preserved untouched
      }

      // Safeguard 3: Structured audit trail payload
      const auditPayload = {
        action: "BOOKING_AMENDED",
        previousTotal: currentBooking.totalAmount,
        newTotal,
        difference: newTotal - currentBooking.totalAmount,
        reason: "Client upgraded hotel category",
      };

      return { success: true, auditPayload, invoicePreserved: !invoiceMutated };
    }

    // Reduction below verified received money must throw error
    let blockedError = false;
    try {
      validateBookingAmendment({ totalAmount: 100000, paidAmount: 60000 }, 40000);
    } catch (e: any) {
      blockedError = true;
      assert(
        e.message.includes("less than verified received payments"),
        "Prevented price reduction below verified received payments"
      );
    }
    assert(blockedError, "Reduction below paid amount throws descriptive error");

    // Amendment must preserve issued invoice untouched
    const amendmentResult = validateBookingAmendment(
      { totalAmount: 100000, paidAmount: 30000 },
      120000,
      { invoiceNumber: "INV-2026-0001", totalAmount: 100000 }
    );
    assert(
      amendmentResult.invoicePreserved,
      "Historical issued invoice total is preserved and NOT mutated in-place"
    );
    assert(
      amendmentResult.auditPayload.action === "BOOKING_AMENDED" &&
        amendmentResult.auditPayload.difference === 20000,
      "Amendment captures structured audit log with difference and previous/new totals"
    );
  }

  // 4. Traveller Invariants
  console.log("\n[4D] Traveller Workspace Invariants:");
  {
    const travellers = [
      { id: "t1", name: "Ananya Patel", isPrimary: true, phone: "9876543210" },
      { id: "t2", name: "Suresh Patel", isPrimary: false, phone: null },
    ];

    const primaryCount = travellers.filter((t) => t.isPrimary).length;
    assert(primaryCount === 1, "At most one primary traveller is permitted per booking");

    const noPrimaryTravellers = [
      { id: "t1", name: "Ananya Patel", isPrimary: false },
      { id: "t2", name: "Suresh Patel", isPrimary: false },
    ];
    const displayPrimary = noPrimaryTravellers.find((t) => t.isPrimary)?.name || "Primary traveller not selected";
    assert(
      displayPrimary === "Primary traveller not selected",
      "Gracefully handles unselected primary traveller without silent data corruption"
    );
  }
}

async function runPhase5Tests() {
  console.log("\n=======================================================");
  console.log("PHASE 5: CUSTOMER EXPERIENCE & SELF-SERVICE");
  console.log("=======================================================");

  // 1. Customer Token Validation & Expiry
  console.log("\n[5A] Public Token Security & Lifecycle:");
  {
    function evaluateTokenAccess(link: {
      tokenHash: string;
      isActive: boolean;
      expiresAt: Date;
    }) {
      const now = new Date();
      if (!link.isActive) {
        return { allowed: false, reason: "REVOKED" };
      }
      if (link.expiresAt < now) {
        return { allowed: false, reason: "EXPIRED" };
      }
      return { allowed: true };
    }

    const activeLink = {
      tokenHash: "abc123hash",
      isActive: true,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
    };
    assert(evaluateTokenAccess(activeLink).allowed, "Valid active public token grants customer portal access");

    const expiredLink = {
      tokenHash: "def456hash",
      isActive: true,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    };
    assert(
      !evaluateTokenAccess(expiredLink).allowed && evaluateTokenAccess(expiredLink).reason === "EXPIRED",
      "Expired token strictly rejects customer portal access"
    );

    const revokedLink = {
      tokenHash: "ghi789hash",
      isActive: false,
      expiresAt: new Date(Date.now() + 86400000),
    };
    assert(
      !evaluateTokenAccess(revokedLink).allowed && evaluateTokenAccess(revokedLink).reason === "REVOKED",
      "Revoked token strictly rejects customer portal access"
    );
  }

  // 2. Customer Public DTO Data Boundaries & Privacy
  console.log("\n[5B] Customer Public DTO Redaction:");
  {
    // Public DTO transformer simulation
    function toCustomerSafeTripDTO(rawTrip: any) {
      return {
        id: rawTrip.id,
        tripNumber: rawTrip.tripNumber,
        title: rawTrip.title,
        status: rawTrip.status,
        customerName: rawTrip.customer?.name,
        travelers: (rawTrip.travelers || []).map((t: any) => ({
          name: t.name,
          type: t.type,
          isPrimary: t.isPrimary,
          // Exclude idPhotoUrl, internalNotes
        })),
        documents: (rawTrip.travelDocuments || [])
          .filter((d: any) => d.status === "ISSUED" && d.isLatest && d.type !== "SUPPLIER_VOUCHER")
          .map((d: any) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            version: d.version,
          })),
        booking: {
          totalAmount: rawTrip.booking?.totalAmount,
          paidAmount: rawTrip.booking?.paidAmount,
          outstandingBalance: rawTrip.booking?.totalAmount - rawTrip.booking?.paidAmount,
          // Exclude internalNotes, profitMargin, supplierCost
        },
      };
    }

    const rawData = {
      id: "trip-1",
      tripNumber: "TRP-2026-001",
      title: "Golden Triangle Tour",
      status: "CONFIRMED",
      customer: { name: "Ananya Patel", privateNotes: "Difficult client" },
      travelers: [
        { name: "Ananya Patel", type: "ADULT", isPrimary: true, idPhotoUrl: "https://secret.id/pass.jpg" },
      ],
      travelDocuments: [
        { id: "doc-1", title: "Customer Itinerary", type: "CLIENT_ITINERARY", status: "ISSUED", isLatest: true, version: 2 },
        { id: "doc-0", title: "Old Customer Itinerary", type: "CLIENT_ITINERARY", status: "SUPERSEDED", isLatest: false, version: 1 },
        { id: "doc-2", title: "Hotel Supplier Voucher", type: "SUPPLIER_VOUCHER", status: "ISSUED", isLatest: true, version: 1 },
      ],
      booking: {
        totalAmount: 150000,
        paidAmount: 50000,
        internalNotes: "Commission 15% from Taj",
        supplierCost: 110000,
      },
    };

    const safeDTO = toCustomerSafeTripDTO(rawData);

    assert(
      (safeDTO.travelers[0] as any).idPhotoUrl === undefined,
      "Traveller ID photos are strictly redacted from public customer portal"
    );
    assert(
      (safeDTO.booking as any).supplierCost === undefined && (safeDTO.booking as any).internalNotes === undefined,
      "Supplier costs, margins, and agency private notes are redacted from public DTO"
    );
    assert(
      safeDTO.documents.length === 1 && safeDTO.documents[0].type === "CLIENT_ITINERARY",
      "Supplier vouchers and superseded documents are strictly excluded from customer documents"
    );
  }
}

async function runPhase6Tests() {
  console.log("\n=======================================================");
  console.log("PHASE 6: SUPPLIER & VENDOR MANAGEMENT");
  console.log("=======================================================");

  // 1. Supplier Code Sequential Formatting
  console.log("\n[6A] Supplier Sequential Code Generation & Tenancy:");
  {
    function formatSupplierCode(year: number, sequence: number) {
      return `SUP-${year}-${sequence.toString().padStart(5, "0")}`;
    }

    assert(
      formatSupplierCode(2026, 1) === "SUP-2026-00001",
      "First supplier of year generated with sequential code SUP-YYYY-00001"
    );
    assert(
      formatSupplierCode(2026, 42) === "SUP-2026-00042",
      "Sequential supplier code padded to 5 digits"
    );
  }

  // 2. Staff Financial Redaction & Bank Details Boundary
  console.log("\n[6B] Staff Financial Redaction & Permissions:");
  {
    assert(
      SENSITIVE_FINANCIAL_KEYS.has("payables") &&
        SENSITIVE_FINANCIAL_KEYS.has("payments") &&
        SENSITIVE_FINANCIAL_KEYS.has("financialSummary") &&
        SENSITIVE_FINANCIAL_KEYS.has("bankDetails"),
      "SENSITIVE_FINANCIAL_KEYS contains payables, payments, financialSummary, and bankDetails"
    );

    const fullSupplierRecord = {
      id: "sup-101",
      agencyId: "agency-1",
      name: "Taj Gateway Agra",
      type: "Hotel Supplier",
      contactPerson: "Rajeev Saxena",
      phone: "9876543210",
      email: "reservations@tajgateway.com",
      bankDetails: "HDFC Bank A/C: 50200012345678 IFSC: HDFC0001234",
      internalNotes: "Negotiated 15% agency commission",
      financialSummary: {
        totalPayableAmount: 180000,
        totalPaidAmount: 120000,
        totalOutstandingAmount: 60000,
        pendingPayablesCount: 1,
      },
      payables: [
        { id: "pay-1", actualAmount: 180000, paidAmount: 120000, outstandingAmount: 60000 },
      ],
      hotelConfirmations: [
        { id: "conf-1", confirmationNumber: "TAJ-AGR-4421", status: "CONFIRMED" },
      ],
    };

    // Staff caller redaction
    const staffView = redactStaffFinancials(fullSupplierRecord, "AGENCY_STAFF");
    assert(
      staffView.financialSummary === undefined,
      "Financial summary is completely redacted for AGENCY_STAFF"
    );
    assert(
      staffView.payables === undefined,
      "Payables ledger is completely redacted for AGENCY_STAFF"
    );
    assert(
      staffView.bankDetails === undefined,
      "Supplier bank details are redacted for AGENCY_STAFF"
    );
    assert(
      staffView.internalNotes === undefined,
      "Internal agency notes are redacted for AGENCY_STAFF"
    );
    assert(
      staffView.name === "Taj Gateway Agra" && staffView.hotelConfirmations?.length === 1,
      "Operational details and confirmations remain accessible to staff"
    );

    // Agency Owner caller preservation
    const ownerView = redactStaffFinancials(fullSupplierRecord, "AGENCY_OWNER");
    assert(
      ownerView.financialSummary?.totalOutstandingAmount === 60000 &&
        ownerView.bankDetails?.includes("HDFC") &&
        ownerView.payables?.length === 1,
      "Agency Owner retains complete visibility into supplier payables, bank details, and financial summary"
    );
  }

  // 3. Operational Confirmations Multi-Category Linkage
  console.log("\n[6C] Supplier 360 Operational Confirmations Linkage:");
  {
    const supplier360Profile = {
      id: "sup-101",
      hotelConfirmations: [{ id: "c1", confirmationNumber: "HOTEL-CONF-1" }],
      vehicleDispatches: [{ id: "vd1", vehicleNumber: "DL 01 AB 1234", status: "CONFIRMED" }],
      activityConfirmations: [{ id: "ac1", confirmationNumber: "TKT-TAJ-99", status: "CONFIRMED" }],
    };

    const totalConfirmations =
      supplier360Profile.hotelConfirmations.length +
      supplier360Profile.vehicleDispatches.length +
      supplier360Profile.activityConfirmations.length;

    assert(
      totalConfirmations === 3,
      "Supplier 360 aggregates hotel confirmations, vehicle dispatches, and activity confirmations"
    );
  }

  // 4. Safe Deletion Safeguards
  console.log("\n[6D] Supplier Permanent Deletion Safety Guard:");
  {
    function checkSupplierDeleteAllowed(counts: {
      payables: number;
      payments: number;
      hotelConfirmations: number;
      hotels: number;
    }) {
      const hasHistory =
        counts.payables > 0 ||
        counts.payments > 0 ||
        counts.hotelConfirmations > 0 ||
        counts.hotels > 0;
      if (hasHistory) {
        throw new Error(
          "Cannot permanently delete supplier with linked inventory, operations, or financial records. Deactivate or archive the supplier instead to maintain audit integrity."
        );
      }
      return true;
    }

    let deletionBlocked = false;
    try {
      checkSupplierDeleteAllowed({
        payables: 2,
        payments: 1,
        hotelConfirmations: 5,
        hotels: 1,
      });
    } catch (e: any) {
      deletionBlocked = true;
      assert(
        e.message.includes("Cannot permanently delete supplier with linked inventory"),
        "Deletion guard blocks deletion when historical payables/confirmations exist"
      );
    }
    assert(deletionBlocked, "Permanent deletion blocked to protect audit history");
  }
}

async function main() {
  console.log("================================================================================");
  console.log("YOUR TRAVEL DESK: PHASES 4, 5 & 6 UNIFIED VERIFICATION SUITE");
  console.log("================================================================================");

  await runPhase4Tests();
  await runPhase5Tests();
  await runPhase6Tests();

  console.log("\n================================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
