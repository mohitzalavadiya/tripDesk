import "dotenv/config";
import { randomUUID } from "crypto";

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
import { operationsService } from "../src/lib/services/operations-service";
import { operationsDocumentService } from "../src/lib/services/operations-document-service";
import {
  TripStatus,
  BookingStatus,
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase1013ITests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13I TEST SUITE (Operations Closure & Financial Reconciliation)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13i-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13i-b-${timestamp}@test.com`;

  // 1. Create two test agencies for multi-tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13I Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+91 98800 77889",
      address: "300 Indiranagar, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13I Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+91 98800 77890",
      address: "301 Indiranagar, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-lead-13i-a-${timestamp}@tripdesk-test.com`,
      agencyId: agencyA.id,
      name: "Operations Director A",
      role: "AGENCY_OWNER",
    },
  });

  const customerA = await prisma.customer.create({
    data: {
      agencyId: agencyA.id,
      name: "Dr. Vikram Sethi",
      email: `vikram.13i.${timestamp}@test.com`,
      phone: "+91 98450 11223",
    },
  });

  const supplierA = await prisma.supplier.create({
    data: {
      agencyId: agencyA.id,
      name: "Himalayan Luxury Hospitality & Logistics",
      type: "HOTEL",
      contactPerson: "Mr. Tashi Dorje",
      email: `tashi.13i.${timestamp}@himalayan.com`,
      phone: "+91 98765 43210",
      status: "ACTIVE",
    },
  });

  const hotelA = await prisma.hotel.create({
    data: {
      agencyId: agencyA.id,
      name: "The Grand Himalayan Heritage Palace",
      city: "Shimla",
      country: "India",
      supplierId: supplierA.id,
    },
  });

  const vehicleA = await prisma.vehicle.create({
    data: {
      agencyId: agencyA.id,
      name: "Toyota Innova Crysta ZX Premium",
      type: "SUV",
      capacity: 6,
      registrationNumber: "HP-01-AA-9988",
      supplierId: supplierA.id,
    },
  });

  const activityA = await prisma.activity.create({
    data: {
      agencyId: agencyA.id,
      name: "Kufri Private Snow Safari & Yak Ride",
      location: "Kufri Adventure Park",
      supplierId: supplierA.id,
    },
  });

  // Create Trip & Booking
  const tripA = await prisma.trip.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      title: "Royal Himachal 7D Tour Package",
      tripNumber: `TRIP-13I-${timestamp}`,
      status: TripStatus.BOOKED,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-07"),
      tripHotels: {
        create: [
          {
            hotelId: hotelA.id,
            checkIn: new Date("2026-08-01"),
            checkOut: new Date("2026-08-07"),
            roomType: "Presidential Heritage Suite",
          },
        ],
      },
      tripVehicles: {
        create: [
          {
            vehicleName: "Innova Crysta Luxury",
            vehicleType: "SUV",
            startDate: new Date("2026-08-01"),
            endDate: new Date("2026-08-07"),
            pickupLocation: "Chandigarh Airport (IXC)",
            dropLocation: "Chandigarh Airport (IXC)",
          },
        ],
      },
      tripActivities: {
        create: [
          {
            activityId: activityA.id,
            name: "Kufri Private Snow Safari",
            date: new Date("2026-08-03"),
            time: "10:00 AM",
            location: "Kufri Adventure Park",
          },
        ],
      },
    },
    include: {
      tripHotels: true,
      tripVehicles: true,
      tripActivities: true,
    },
  });

  const bookingA = await prisma.booking.create({
    data: {
      agencyId: agencyA.id,
      customerId: customerA.id,
      tripId: tripA.id,
      bookingNumber: `BK-13I-${timestamp}`,
      status: BookingStatus.CONFIRMED,
      totalAmount: 185000,
      balanceAmount: 0,
    },
  });

  console.log("----------------------------------------------------------------");
  console.log("SECTION 1: Initialization & Baseline Closure Summary");
  console.log("----------------------------------------------------------------");

  const opA = await operationsService.initializeOperation(
    agencyA.id,
    { tripId: tripA.id, bookingId: bookingA.id, status: OperationStatus.PREPARING, notes: "Phase 10.13I Test Tour" },
    userA.id
  );

  assert(!!opA, "1. TripOperation record initialized successfully");
  assert(opA.status === OperationStatus.PREPARING, "2. Initial operation status is PREPARING");

  // Fetch initial closure summary
  let closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.closureStatus === "PENDING_REVIEW", "3. Initial closure status is PENDING_REVIEW");
  assert(closure.isFinalized === false, "4. isFinalized is false initially");
  assert(closure.checklist.isCompleted === false, "5. checklist.isCompleted is false for PREPARING operation");
  assert(closure.checklist.canFinalize === false, "6. checklist.canFinalize is false");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 2: Service Confirmations & Discrepancy Detection");
  console.log("----------------------------------------------------------------");

  // Confirm Hotel
  const hotelConf = await operationsService.updateHotelConfirmation(
    agencyA.id,
    opA.id,
    opA.hotelConfirmations[0].id,
    {
      confirmationNumber: "HIM-PALACE-9944",
      status: ConfirmationStatus.CONFIRMED,
      roomDetails: "Presidential Heritage Suite (Confirmed)",
    },
    userA.id
  );
  assert(!!hotelConf, "7. Hotel confirmation updated with status CONFIRMED");

  // Assign Vehicle Dispatch
  const dispatch = await operationsService.updateVehicleDispatch(
    agencyA.id,
    opA.id,
    opA.vehicleDispatches[0].id,
    {
      driverName: "Sohan Lal Chauffeur",
      driverPhone: "+91 98111 22334",
      vehiclePlate: "HP-01-AA-9988",
      status: DispatchStatus.CONFIRMED,
    },
    userA.id
  );
  assert(!!dispatch, "8. Vehicle dispatch confirmed with driver assigned");

  // Confirm Activity
  const actConf = await operationsService.updateActivityConfirmation(
    agencyA.id,
    opA.id,
    opA.activityConfirmations[0].id,
    {
      ticketNumber: "KUFRI-PASS-8822",
      status: ConfirmationStatus.CONFIRMED,
    },
    userA.id
  );
  assert(!!actConf, "9. Activity pass confirmed");

  // Re-fetch closure summary
  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.serviceReconciliation.hotels[0].isDelivered === true, "10. Hotel delivered status is true");
  assert(closure.serviceReconciliation.hotels[0].confirmationNumber === "HIM-PALACE-9944", "11. Hotel voucher number verified in reconciliation");
  assert(closure.serviceReconciliation.fleet[0].isDelivered === true, "12. Fleet delivered status is true");
  assert(closure.serviceReconciliation.activities[0].isDelivered === true, "13. Activity delivered status is true");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 3: Operational Issues Reconciliation & Blocker Verification");
  console.log("----------------------------------------------------------------");

  // Create a CRITICAL operational issue
  const criticalIssue = await operationsService.createIssue(
    agencyA.id,
    opA.id,
    {
      title: "Mountain Landslide Blocked Highway",
      description: "Guest vehicle delayed by 3 hours due to heavy rain and highway diversion.",
      priority: IssuePriority.CRITICAL,
    },
    userA.id
  );
  assert(!!criticalIssue, "14. Critical operational issue logged");

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.issuesReconciliation.hasCriticalBlocker === true, "15. hasCriticalBlocker is true while critical issue is OPEN");
  assert(closure.issuesReconciliation.criticalIssues === 1, "16. Critical issues count verified as 1");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 4: Lifecycle Completion & Blocker Enforcement");
  console.log("----------------------------------------------------------------");

  // Advance lifecycle to READY -> ONGOING -> COMPLETED (first resolving blocker to advance)
  // Resolve critical issue to allow tour completion
  await operationsService.updateIssue(
    agencyA.id,
    opA.id,
    criticalIssue.id,
    { status: IssueStatus.RESOLVED, resolution: "Chauffeur took scenic alternate route via Kalka bypass. Guests arrived safely." },
    userA.id
  );

  await operationsService.updateOperation(agencyA.id, opA.id, { status: OperationStatus.READY }, userA.id);
  await operationsService.updateOperation(agencyA.id, opA.id, { status: OperationStatus.ONGOING }, userA.id);
  await operationsService.updateOperation(agencyA.id, opA.id, { status: OperationStatus.COMPLETED }, userA.id);

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.checklist.isCompleted === true, "17. checklist.isCompleted is true after completion");
  assert(closure.checklist.criticalIssuesResolved === true, "18. checklist.criticalIssuesResolved is true");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 5: Post-Tour Review & Service Quality Recording");
  console.log("----------------------------------------------------------------");

  // 19. Record post-tour review
  const reviewEvent = await operationsService.savePostTourReview(
    agencyA.id,
    opA.id,
    {
      guestRating: 5,
      operatorRating: 5,
      serviceQuality: "EXCELLENT",
      internalRemarks: "Guest commended the palace hospitality and Chauffeur Sohan Lal's safe driving during heavy rainfall.",
      guestFeedback: "Best luxury holiday experience we have ever had in Himachal!",
      hotelFeedback: "Heritage Palace provided complimentary royal upgrade to Presidential Suite.",
      fleetFeedback: "Punctual, spotless vehicle, very courteous chauffeur.",
    },
    userA.id
  );
  assert(!!reviewEvent, "19. Post-tour quality review recorded successfully");
  assert(reviewEvent.eventType === "POST_TOUR_REVIEW_SAVED", "20. Audit event type is POST_TOUR_REVIEW_SAVED");

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.postTourReview !== null, "21. postTourReview data retrieved in closure summary");
  assert(closure.postTourReview?.guestRating === 5, "22. Guest rating verified as 5/5");
  assert(closure.closureStatus === "UNDER_REVIEW", "23. closureStatus transitioned to UNDER_REVIEW");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 6: Financial Reconciliation & Cost Variance Audit");
  console.log("----------------------------------------------------------------");

  // 24. Mandatory variance reason validation
  let threwVarianceError = false;
  try {
    await operationsService.saveFinancialReconciliation(
      agencyA.id,
      opA.id,
      {
        plannedCost: 150000,
        actualCost: 162000,
        varianceAmount: 12000,
        varianceReason: "", // Empty reason should throw error
      },
      userA.id
    );
  } catch (err: any) {
    threwVarianceError = true;
  }
  assert(threwVarianceError, "24. Mandatory variance reason validation prevented saving blank reason on cost discrepancy");

  // 25. Save valid financial reconciliation
  const finEvent = await operationsService.saveFinancialReconciliation(
    agencyA.id,
    opA.id,
    {
      plannedCost: 150000,
      actualCost: 162000,
      varianceAmount: 12000,
      varianceReason: "Added extra mileage for Kalka scenic bypass diversion and premium palace heater charges.",
      adjustments: [
        {
          id: "adj-1",
          supplier: "Himalayan Luxury Logistics",
          category: "EXTRA_VEHICLE_KM",
          amount: 7000,
          reason: "Highway landslide bypass detour (110 km extra)",
          reference: "VOUCHER-EXTRA-KM-01",
        },
        {
          id: "adj-2",
          supplier: "The Grand Himalayan Heritage Palace",
          category: "ROOM_UPGRADE",
          amount: 5000,
          reason: "Palace central heater & room upgrade surcharge",
          reference: "HOTEL-INV-7788",
        },
      ],
      remarks: "Approved by Operations Director. Final supplier settlement released.",
    },
    userA.id
  );
  assert(!!finEvent, "25. Financial reconciliation saved with detailed adjustments");
  assert(finEvent.eventType === "FINANCIAL_RECONCILIATION_SAVED", "26. Audit event type is FINANCIAL_RECONCILIATION_SAVED");

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.closureStatus === "RECONCILED", "27. closureStatus transitioned to RECONCILED");
  assert(closure.checklist.reconciliationReviewed === true, "28. checklist.reconciliationReviewed is true");
  assert(closure.checklist.canFinalize === true, "29. checklist.canFinalize is now true");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 7: Finalization & Immutability Lock");
  console.log("----------------------------------------------------------------");

  // 30. Finalize the operation
  const finalEvent = await operationsService.finalizeOperation(
    agencyA.id,
    opA.id,
    {
      closureNotes: "All services audited, guest review verified, vendor accounts settled.",
      acknowledgedDiscrepancies: true,
    },
    userA.id
  );
  assert(!!finalEvent, "30. Tour operation finalized successfully");
  assert(finalEvent.eventType === "OPERATION_FINALIZED", "31. Audit event type is OPERATION_FINALIZED");

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.isFinalized === true, "32. isFinalized is true in summary");
  assert(closure.closureStatus === "FINALIZED", "33. closureStatus is FINALIZED");

  // 34. Test Server-Side Immutability Lock on all mutations
  let threwMutationError = false;
  try {
    await operationsService.updateOperation(
      agencyA.id,
      opA.id,
      { notes: "Attempt to modify finalized notes" },
      userA.id
    );
  } catch (err: any) {
    threwMutationError = true;
  }
  assert(threwMutationError, "34. Immutability lock blocked updateOperation on finalized tour");

  let threwIssueError = false;
  try {
    await operationsService.createIssue(
      agencyA.id,
      opA.id,
      { title: "Late issue attempt", description: "Should be blocked" },
      userA.id
    );
  } catch (err: any) {
    threwIssueError = true;
  }
  assert(threwIssueError, "35. Immutability lock blocked createIssue on finalized tour");

  let threwHotelError = false;
  try {
    await operationsService.updateHotelConfirmation(
      agencyA.id,
      opA.id,
      hotelConf.id,
      { confirmationNumber: "ILLEGAL-CHANGE" },
      userA.id
    );
  } catch (err: any) {
    threwHotelError = true;
  }
  assert(threwHotelError, "36. Immutability lock blocked updateHotelConfirmation on finalized tour");

  let threwVehicleError = false;
  try {
    await operationsService.updateVehicleDispatch(
      agencyA.id,
      opA.id,
      dispatch.id,
      { notes: "Illegal dispatch edit" },
      userA.id
    );
  } catch (err: any) {
    threwVehicleError = true;
  }
  assert(threwVehicleError, "37. Immutability lock blocked updateVehicleDispatch on finalized tour");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 8: Reopen Operation with Mandatory Reason");
  console.log("----------------------------------------------------------------");

  // 38. Attempt reopening without detailed reason
  let threwReopenBlankError = false;
  try {
    await operationsService.reopenOperation(agencyA.id, opA.id, { reopenReason: "abc" }, userA.id);
  } catch (err: any) {
    threwReopenBlankError = true;
  }
  assert(threwReopenBlankError, "38. Reopen rejected when reason is less than 5 characters");

  // 39. Reopen with valid audit reason
  const reopenEvent = await operationsService.reopenOperation(
    agencyA.id,
    opA.id,
    { reopenReason: "Supplier sent updated credit note for heater surcharge waiver." },
    userA.id
  );
  assert(!!reopenEvent, "39. Operation reopened with audit compliance reason");
  assert(reopenEvent.eventType === "OPERATION_REOPENED", "40. Audit event type is OPERATION_REOPENED");

  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.isFinalized === false, "41. isFinalized is now false after reopening");
  assert(closure.closureStatus === "REOPENED", "42. closureStatus is REOPENED");

  // 43. Re-finalizing after adjustments
  await operationsService.finalizeOperation(
    agencyA.id,
    opA.id,
    { closureNotes: "Credit note adjustments applied. Re-finalized and locked.", acknowledgedDiscrepancies: true },
    userA.id
  );
  closure = await operationsService.getClosureSummary(agencyA.id, opA.id);
  assert(closure.isFinalized === true, "43. Tour successfully re-finalized and locked");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 9: Internal Operations Closure Report PDF Generation");
  console.log("----------------------------------------------------------------");

  const pdfResult = await operationsDocumentService.generateClosureSummary(
    agencyA.id,
    opA.id,
    "Operations Director A"
  );
  assert(!!pdfResult.buffer && pdfResult.buffer.length > 1000, "44. Internal Closure Report PDF generated with valid byte buffer");
  assert(pdfResult.documentNumber.startsWith("TOC-"), "45. Document number follows standard TOC- prefix");
  assert(pdfResult.filename.includes("Operations-Closure-"), "46. PDF filename follows standard format");

  // Verify audit event logged
  const pdfEvent = await prisma.operationEvent.findFirst({
    where: { agencyId: agencyA.id, tripOperationId: opA.id, eventType: "CLOSURE_SUMMARY_GENERATED" },
  });
  assert(!!pdfEvent, "47. CLOSURE_SUMMARY_GENERATED event recorded in timeline");

  console.log("----------------------------------------------------------------");
  console.log("SECTION 10: Multi-Tenant Security & Access Control");
  console.log("----------------------------------------------------------------");

  let threwTenantError = false;
  try {
    await operationsService.getClosureSummary(agencyB.id, opA.id);
  } catch (err: any) {
    threwTenantError = true;
  }
  assert(threwTenantError, "48. Cross-agency access to Operations Closure Summary is blocked");

  let threwTenantFinalizeError = false;
  try {
    await operationsService.finalizeOperation(agencyB.id, opA.id, { acknowledgedDiscrepancies: true });
  } catch (err: any) {
    threwTenantFinalizeError = true;
  }
  assert(threwTenantFinalizeError, "49. Cross-agency finalization attempt is blocked");

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("🎉 ALL 49 PHASE 10.13I ASSERTIONS PASSED PERFECTLY! (100% PASS RATE)");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runPhase1013ITests()
  .catch((err) => {
    console.error("FATAL ERROR in Phase 10.13I Tests:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
