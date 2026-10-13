import "dotenv/config";
import { PaymentMethod, PaymentType } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { financeService } from "../src/lib/services/finance-service";

async function runQA() {
  console.log("=================================================");
  console.log("PHASE 210: OVERPAYMENT VALIDATION QA SUITE");
  console.log("=================================================\n");

  const timestamp = Date.now();
  const testAgency = await prisma.agency.create({
    data: {
      name: `QA Agency Phase 210 ${timestamp}`,
      email: `qa210_${timestamp}@test.com`,
      phone: "9999999999",
    },
  });

  const testUser = await prisma.user.create({
    data: {
      id: `user_210_${timestamp}`,
      agencyId: testAgency.id,
      email: `user210_${timestamp}@test.com`,
      name: "QA User 210",
      role: "AGENCY_OWNER",
    },
  });

  const testCustomer = await prisma.customer.create({
    data: {
      agencyId: testAgency.id,
      name: "QA Customer 210",
      phone: `99900${Math.floor(10000 + Math.random() * 90000)}`,
    },
  });

  const testTrip = await prisma.trip.create({
    data: {
      agencyId: testAgency.id,
      customerId: testCustomer.id,
      tripNumber: `TRIP-210-${timestamp}`,
      title: "QA Trip 210",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 5),
    },
  });

  console.log(`[SETUP] Created temporary test agency: ${testAgency.id}`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ` - ${detail}` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    // ═════════════════════════════════════════════════════════════════
    // CUSTOMER PAYMENT QA MATRIX
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- CUSTOMER PAYMENT QA MATRIX ---");

    // Test Booking 1: Total 15,000
    const b1 = await prisma.booking.create({
      data: {
        agencyId: testAgency.id,
        tripId: testTrip.id,
        customerId: testCustomer.id,
        bookingNumber: `B210-1-${timestamp}`,
        totalAmount: 15000,
        paidAmount: 0,
        balanceAmount: 15000,
      },
    });

    // A1: Outstanding ₹15,000 -> payment ₹10,000 -> PASS
    try {
      const p1 = await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b1.id,
        amount: 10000,
        paymentType: PaymentType.PARTIAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      const b1Updated = await prisma.booking.findUnique({ where: { id: b1.id } });
      assert(
        p1 !== null && Number(b1Updated?.balanceAmount) === 5000,
        "A1: Outstanding ₹15,000 -> payment ₹10,000 -> PASS",
        `New balance: ₹${b1Updated?.balanceAmount}`
      );
    } catch (e: any) {
      assert(false, "A1: Outstanding ₹15,000 -> payment ₹10,000 -> PASS", e.message);
    }

    // A2: Outstanding ₹5,000 -> payment ₹5,000 -> PASS
    try {
      const p2 = await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b1.id,
        amount: 5000,
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      const b1Updated = await prisma.booking.findUnique({ where: { id: b1.id } });
      assert(
        p2 !== null && Number(b1Updated?.balanceAmount) === 0,
        "A2: Outstanding ₹5,000 -> payment ₹5,000 -> PASS",
        `New balance: ₹${b1Updated?.balanceAmount}`
      );
    } catch (e: any) {
      assert(false, "A2: Outstanding ₹5,000 -> payment ₹5,000 -> PASS", e.message);
    }

    // Test Booking 2: Total 15,000
    const b2 = await prisma.booking.create({
      data: {
        agencyId: testAgency.id,
        tripId: testTrip.id,
        customerId: testCustomer.id,
        bookingNumber: `B210-2-${timestamp}`,
        totalAmount: 15000,
        paidAmount: 0,
        balanceAmount: 15000,
      },
    });

    // A3: Outstanding ₹15,000 -> payment ₹15,000.01 -> REJECT
    try {
      await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b2.id,
        amount: 15000.01,
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      assert(false, "A3: Outstanding ₹15,000 -> payment ₹15,000.01 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding due"),
        "A3: Outstanding ₹15,000 -> payment ₹15,000.01 -> REJECT",
        e.message
      );
    }

    // A4: Outstanding ₹15,000 -> payment ₹20,000 -> REJECT
    try {
      await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b2.id,
        amount: 20000,
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      assert(false, "A4: Outstanding ₹15,000 -> payment ₹20,000 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding due"),
        "A4: Outstanding ₹15,000 -> payment ₹20,000 -> REJECT",
        e.message
      );
    }

    // A5: Outstanding ₹0 -> payment ₹1 -> REJECT (b1 is fully paid, balance = 0)
    try {
      await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b1.id,
        amount: 1,
        paymentType: PaymentType.PARTIAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      assert(false, "A5: Outstanding ₹0 -> payment ₹1 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("already fully paid"),
        "A5: Outstanding ₹0 -> payment ₹1 -> REJECT",
        e.message
      );
    }

    // A8: Stale-dialog scenario -> REJECT
    // b2 is currently 15,000. Background user records 5,000, leaving 10,000. Stale dialog tries to submit 15,000.
    await financeService.recordCustomerPayment(testAgency.id, {
      bookingId: b2.id,
      amount: 5000,
      paymentType: PaymentType.PARTIAL,
      paymentMethod: PaymentMethod.UPI,
    }, testUser.id);

    try {
      await financeService.recordCustomerPayment(testAgency.id, {
        bookingId: b2.id,
        amount: 15000, // Stale amount submitted
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
      }, testUser.id);
      assert(false, "A8: Stale-dialog scenario -> REJECT", "Should have rejected stale 15,000 submission");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding due"),
        "A8: Stale-dialog scenario -> REJECT",
        e.message
      );
    }

    // A9: Concurrent ₹10,000 + ₹10,000 against ₹15,000 -> one succeeds, one rejects
    const bConc = await prisma.booking.create({
      data: {
        agencyId: testAgency.id,
        tripId: testTrip.id,
        customerId: testCustomer.id,
        bookingNumber: `B210-CONC-${timestamp}`,
        totalAmount: 15000,
        paidAmount: 0,
        balanceAmount: 15000,
      },
    });

    const reqA = financeService.recordCustomerPayment(testAgency.id, {
      bookingId: bConc.id,
      amount: 10000,
      paymentType: PaymentType.PARTIAL,
      paymentMethod: PaymentMethod.UPI,
    }, testUser.id);

    const reqB = financeService.recordCustomerPayment(testAgency.id, {
      bookingId: bConc.id,
      amount: 10000,
      paymentType: PaymentType.PARTIAL,
      paymentMethod: PaymentMethod.UPI,
    }, testUser.id);

    const results = await Promise.allSettled([reqA, reqB]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    const bConcFinal = await prisma.booking.findUnique({ where: { id: bConc.id } });
    assert(
      fulfilled.length === 1 && rejected.length === 1 && Number(bConcFinal?.paidAmount) === 10000,
      "A9: Concurrent ₹10,000 + ₹10,000 against ₹15,000 -> one succeeds, one rejects",
      `Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}, Paid: ₹${bConcFinal?.paidAmount}`
    );

    // ═════════════════════════════════════════════════════════════════
    // PAYABLE DISBURSEMENT QA MATRIX
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- PAYABLE DISBURSEMENT QA MATRIX ---");

    // Payable 1: Actual 11,000
    const p1 = await prisma.supplierPayable.create({
      data: {
        agencyId: testAgency.id,
        payableNumber: `PAY210-1-${timestamp}`,
        description: "Hotel booking payable QA",
        plannedAmount: 11000,
        actualAmount: 11000,
        paidAmount: 0,
        outstandingAmount: 11000,
        status: "PENDING",
      },
    });

    // B1: Outstanding ₹11,000 -> payment ₹8,000 -> PASS
    try {
      const sp1 = await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p1.id,
        amount: 8000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      const p1Updated = await prisma.supplierPayable.findUnique({ where: { id: p1.id } });
      assert(
        sp1 !== null && Number(p1Updated?.outstandingAmount) === 3000,
        "B1: Outstanding ₹11,000 -> payment ₹8,000 -> PASS",
        `Outstanding remaining: ₹${p1Updated?.outstandingAmount}`
      );
    } catch (e: any) {
      assert(false, "B1: Outstanding ₹11,000 -> payment ₹8,000 -> PASS", e.message);
    }

    // B2: Outstanding ₹3,000 -> payment ₹3,000 -> PASS
    try {
      const sp2 = await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p1.id,
        amount: 3000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      const p1Updated = await prisma.supplierPayable.findUnique({ where: { id: p1.id } });
      assert(
        sp2 !== null && Number(p1Updated?.outstandingAmount) === 0 && p1Updated?.status === "PAID",
        "B2: Outstanding ₹3,000 -> payment ₹3,000 -> PASS",
        `Outstanding: ₹${p1Updated?.outstandingAmount}, Status: ${p1Updated?.status}`
      );
    } catch (e: any) {
      assert(false, "B2: Outstanding ₹3,000 -> payment ₹3,000 -> PASS", e.message);
    }

    // Payable 2: Actual 11,000
    const p2 = await prisma.supplierPayable.create({
      data: {
        agencyId: testAgency.id,
        payableNumber: `PAY210-2-${timestamp}`,
        description: "Vehicle payable QA",
        plannedAmount: 11000,
        actualAmount: 11000,
        paidAmount: 0,
        outstandingAmount: 11000,
        status: "PENDING",
      },
    });

    // B3: Outstanding ₹11,000 -> payment ₹11,000.01 -> REJECT
    try {
      await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p2.id,
        amount: 11000.01,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      assert(false, "B3: Outstanding ₹11,000 -> payment ₹11,000.01 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding payable"),
        "B3: Outstanding ₹11,000 -> payment ₹11,000.01 -> REJECT",
        e.message
      );
    }

    // B4: Outstanding ₹11,000 -> payment ₹12,000 -> REJECT
    try {
      await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p2.id,
        amount: 12000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      assert(false, "B4: Outstanding ₹11,000 -> payment ₹12,000 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding payable"),
        "B4: Outstanding ₹11,000 -> payment ₹12,000 -> REJECT",
        e.message
      );
    }

    // B5: Outstanding ₹0 -> payment ₹1 -> REJECT (p1 is fully paid)
    try {
      await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p1.id,
        amount: 1,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      assert(false, "B5: Outstanding ₹0 -> payment ₹1 -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("already fully settled"),
        "B5: Outstanding ₹0 -> payment ₹1 -> REJECT",
        e.message
      );
    }

    // B8: Stale-dialog scenario for payable -> REJECT
    // p2 is currently 11,000. Background user disburses 5,000, leaving 6,000. Stale dialog tries to submit 11,000.
    await financeService.recordSupplierPayment(testAgency.id, {
      payableId: p2.id,
      amount: 5000,
      currency: "INR",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }, testUser.id);

    try {
      await financeService.recordSupplierPayment(testAgency.id, {
        payableId: p2.id,
        amount: 11000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }, testUser.id);
      assert(false, "B8: Payable stale-dialog scenario -> REJECT", "Should have rejected stale 11,000 submission");
    } catch (e: any) {
      assert(
        e.message.includes("cannot exceed the current outstanding payable"),
        "B8: Payable stale-dialog scenario -> REJECT",
        e.message
      );
    }

    // B9: Concurrent ₹10,000 + ₹10,000 against ₹15,000 payable -> one succeeds, one rejects
    const pConc = await prisma.supplierPayable.create({
      data: {
        agencyId: testAgency.id,
        payableNumber: `PAY210-CONC-${timestamp}`,
        description: "Concurrent payable QA",
        plannedAmount: 15000,
        actualAmount: 15000,
        paidAmount: 0,
        outstandingAmount: 15000,
        status: "PENDING",
      },
    });

    const pReqA = financeService.recordSupplierPayment(testAgency.id, {
      payableId: pConc.id,
      amount: 10000,
      currency: "INR",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }, testUser.id);

    const pReqB = financeService.recordSupplierPayment(testAgency.id, {
      payableId: pConc.id,
      amount: 10000,
      currency: "INR",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }, testUser.id);

    const pResults = await Promise.allSettled([pReqA, pReqB]);
    const pFulfilled = pResults.filter((r) => r.status === "fulfilled");
    const pRejected = pResults.filter((r) => r.status === "rejected");

    const pConcFinal = await prisma.supplierPayable.findUnique({ where: { id: pConc.id } });
    assert(
      pFulfilled.length === 1 && pRejected.length === 1 && Number(pConcFinal?.paidAmount) === 10000,
      "B9: Concurrent ₹10,000 + ₹10,000 against ₹15,000 payable -> one succeeds, one rejects",
      `Fulfilled: ${pFulfilled.length}, Rejected: ${pRejected.length}, Paid: ₹${pConcFinal?.paidAmount}`
    );

    // ═════════════════════════════════════════════════════════════════
    // PAYABLE EDIT OBLIGATION QA MATRIX
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- PAYABLE EDIT OBLIGATION QA MATRIX ---");

    // Create a fresh payable for edit tests: Actual 20,000, Paid 8,000
    const pEdit = await prisma.supplierPayable.create({
      data: {
        agencyId: testAgency.id,
        payableNumber: `PAY210-EDIT-${timestamp}`,
        description: "Editable payable QA",
        plannedAmount: 20000,
        actualAmount: 20000,
        paidAmount: 0,
        outstandingAmount: 20000,
        status: "PENDING",
      },
    });

    // Record 8,000 payment against pEdit
    await financeService.recordSupplierPayment(testAgency.id, {
      payableId: pEdit.id,
      amount: 8000,
      currency: "INR",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }, testUser.id);

    // G: Edit actual amount to ₹7,999 (below paid ₹8,000) -> REJECT
    try {
      await financeService.updateSupplierPayable(testAgency.id, pEdit.id, {
        actualAmount: 7999,
        description: "Updated description",
      }, testUser.id);
      assert(false, "G: Edit actual to ₹7,999 (below paid ₹8,000) -> REJECT", "Should have thrown error");
    } catch (e: any) {
      assert(
        e.message.includes("cannot be less than the amount already paid of ₹8,000.00"),
        "G: Edit actual to ₹7,999 (below paid ₹8,000) -> REJECT",
        e.message
      );
    }

    // H: Edit actual amount to ₹8,000 (equal to paid ₹8,000) -> ALLOW
    try {
      const updatedH = await financeService.updateSupplierPayable(testAgency.id, pEdit.id, {
        actualAmount: 8000,
        description: "Updated description H",
      }, testUser.id);
      assert(
        Number(updatedH.actualAmount) === 8000 &&
        Number(updatedH.outstandingAmount) === 0 &&
        updatedH.status === "PAID",
        "H: Edit actual to ₹8,000 (equal to paid ₹8,000) -> ALLOW",
        `Outstanding: ₹${updatedH.outstandingAmount}, Status: ${updatedH.status}`
      );
    } catch (e: any) {
      assert(false, "H: Edit actual to ₹8,000 (equal to paid ₹8,000) -> ALLOW", e.message);
    }

    // I: Edit actual amount to ₹25,000 (above paid ₹8,000) -> ALLOW
    try {
      const updatedI = await financeService.updateSupplierPayable(testAgency.id, pEdit.id, {
        actualAmount: 25000,
        description: "Updated description I",
      }, testUser.id);
      assert(
        Number(updatedI.actualAmount) === 25000 &&
        Number(updatedI.outstandingAmount) === 17000,
        "I: Edit actual to ₹25,000 (above paid ₹8,000) -> ALLOW",
        `Outstanding: ₹${updatedI.outstandingAmount}`
      );
    } catch (e: any) {
      assert(false, "I: Edit actual to ₹25,000 (above paid ₹8,000) -> ALLOW", e.message);
    }

    // K: Stale paid amount protection (tries 7,000 after background paid 8,000) -> REJECT
    try {
      await financeService.updateSupplierPayable(testAgency.id, pEdit.id, {
        actualAmount: 7000,
        description: "Stale edit attempt",
      }, testUser.id);
      assert(false, "K: Stale paid amount protection -> REJECT", "Should have rejected attempt to edit actual below paid");
    } catch (e: any) {
      assert(
        e.message.includes("cannot be less than the amount already paid"),
        "K: Stale paid amount protection -> REJECT",
        e.message
      );
    }

    // ═════════════════════════════════════════════════════════════════
    // TENANT ISOLATION QA
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- TENANT ISOLATION QA ---");

    const otherAgency = await prisma.agency.create({
      data: {
        name: `QA Other Agency Phase 210 ${timestamp}`,
        email: `other210_${timestamp}@test.com`,
        phone: "8888888888",
      },
    });

    try {
      // Attempt to record payment against testAgency's booking using otherAgency's ID
      await financeService.recordCustomerPayment(otherAgency.id, {
        bookingId: b2.id,
        amount: 1000,
        paymentType: PaymentType.PARTIAL,
        paymentMethod: PaymentMethod.UPI,
      });
      assert(false, "Tenant Isolation: Customer Payment across agencies -> REJECT", "Should have rejected cross-agency booking");
    } catch (e: any) {
      assert(
        e.message.includes("Booking not found or does not belong to your agency"),
        "Tenant Isolation: Customer Payment across agencies -> REJECT",
        e.message
      );
    }

    try {
      // Attempt to record disbursement against testAgency's payable using otherAgency's ID
      await financeService.recordSupplierPayment(otherAgency.id, {
        payableId: pConc.id,
        amount: 1000,
        currency: "INR",
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });
      assert(false, "Tenant Isolation: Supplier Disbursement across agencies -> REJECT", "Should have rejected cross-agency payable");
    } catch (e: any) {
      assert(
        e.message.includes("Payable record not found"),
        "Tenant Isolation: Supplier Disbursement across agencies -> REJECT",
        e.message
      );
    }

    try {
      // Attempt to edit testAgency's payable using otherAgency's ID (R)
      await financeService.updateSupplierPayable(otherAgency.id, pEdit.id, {
        actualAmount: 30000,
        description: "Cross-agency edit attempt",
      });
      assert(false, "R: Tenant Isolation: Payable Edit across agencies -> REJECT", "Should have rejected cross-agency payable edit");
    } catch (e: any) {
      assert(
        e.message.includes("Payable record not found"),
        "R: Tenant Isolation: Payable Edit across agencies -> REJECT",
        e.message
      );
    }

    // Clean up second test agency
    await prisma.agency.delete({ where: { id: otherAgency.id } });

  } finally {
    // Clean up temporary test data completely
    console.log("\n[CLEANUP] Cleaning up temporary test data...");
    await prisma.supplierPayment.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.supplierPayable.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.payment.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.booking.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.trip.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.customer.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.user.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.agency.delete({ where: { id: testAgency.id } });
    console.log("[CLEANUP] Temporary test data completely cleaned up.");
  }

  console.log(`\n=================================================`);
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runQA()
  .catch((err) => {
    console.error("QA script error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
