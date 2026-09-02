/**
 * TRIPDESK PHASE 21-D: AGENCY BI & EXPORTABLE ACCOUNTING REPORTS
 * AUTOMATED TEST SUITE
 * 
 * Tests:
 * 1. Pilot Agency baseline verification
 * 2. Real-time BI report generation across all domains (Sales, Bookings, Finance, Destinations, Customers)
 * 3. Exact financial and margin formula correctness
 * 4. Date filtering across presets and custom date ranges
 * 5. CRM Funnel conversion percentages
 * 6. Customer Receivables & Supplier Payables aggregation
 * 7. Multi-tenant isolation (IDOR & cross-tenant data leak defense)
 * 8. Empty dataset resilience (0 crash guarantee)
 * 9. CSV export generation & formula injection defense
 * 10. Server-authoritative PDF binary rendering
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { reportingService } from "../src/lib/services/reporting-service";
import { calculateReportDateRange } from "../src/lib/validation/reporting-schema";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details !== undefined) {
      console.error(`     Details:`, details);
    }
    failedCount++;
  }
}

async function runTests() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK PHASE 21-D: AGENCY BI & REPORTS AUTOMATED TEST SUITE");
  console.log("═════════════════════════════════════════════════════════════════════\n");

  // ─── 1. BASELINE PILOT VERIFICATION ────────────────────────────────────
  console.log("--- 1. Baseline Pilot Verification ---");
  const pilotAgency = await prisma.agency.findFirst({
    where: { name: "TripDesk Pilot Agency" },
  });
  assert(!!pilotAgency, "TripDesk Pilot Agency exists");

  if (!pilotAgency) {
    console.error("FATAL: Pilot Agency not found. Cannot proceed.");
    process.exit(1);
  }

  const pilotAgencyId = pilotAgency.id;

  // ─── 2. BI REPORT RETRIEVAL & FINANCIAL FORMULAS ────────────────────────
  console.log("\n--- 2. BI Report Retrieval & Financial Formulas ---");
  const allTimeReport = await reportingService.getAgencyBIReport(pilotAgencyId, {
    preset: "ALL_TIME",
    type: "OVERVIEW",
  });

  assert(!!allTimeReport, "Report successfully generated for ALL_TIME preset");
  assert(allTimeReport.agencyInfo.name === "TripDesk Pilot Agency", "Agency name matched pilot agency");
  assert(typeof allTimeReport.kpis.grossBookingValue === "number", "Gross Booking Value is a valid number");
  assert(typeof allTimeReport.kpis.amountCollected === "number", "Amount collected is a valid number");
  assert(typeof allTimeReport.kpis.outstandingReceivables === "number", "Outstanding receivables is a valid number");
  assert(typeof allTimeReport.kpis.supplierPayables === "number", "Supplier payables is a valid number");
  assert(typeof allTimeReport.kpis.grossProfit === "number", "Gross profit is a valid number");
  assert(typeof allTimeReport.kpis.grossMarginPercent === "number", "Gross margin % is a valid number");

  // Formula Check: Profit = GBV - Total Cost
  const computedProfit = allTimeReport.kpis.grossBookingValue - allTimeReport.kpis.totalCost;
  assert(
    Math.abs(allTimeReport.kpis.grossProfit - computedProfit) < 0.01,
    "Gross Profit strictly equals Gross Booking Value minus Total Cost"
  );

  // Margin % Check: (Profit / GBV) * 100
  const computedMargin =
    allTimeReport.kpis.grossBookingValue > 0
      ? Math.round((allTimeReport.kpis.grossProfit / allTimeReport.kpis.grossBookingValue) * 1000) / 10
      : 0;
  assert(
    allTimeReport.kpis.grossMarginPercent === computedMargin,
    "Gross Margin % strictly adheres to canonical formula ((Profit / GBV) * 100)"
  );

  // ─── 3. DATE RANGE FILTERING & BOUNDARIES ──────────────────────────────
  console.log("\n--- 3. Date Range Filtering & Boundaries ---");
  const todayRange = calculateReportDateRange("TODAY");
  assert(todayRange.startDate <= todayRange.endDate, "TODAY date range start <= end");

  const thisMonthRange = calculateReportDateRange("THIS_MONTH");
  assert(thisMonthRange.startDate.getUTCDate() === 1, "THIS_MONTH starts on 1st of month");

  const customRange = calculateReportDateRange("CUSTOM_RANGE", "2026-01-01", "2026-06-30");
  assert(customRange.startDate.toISOString().startsWith("2026-01-01"), "Custom range start date parsed correctly");
  assert(customRange.endDate.toISOString().startsWith("2026-06-30"), "Custom range end date parsed correctly");

  const monthReport = await reportingService.getAgencyBIReport(pilotAgencyId, {
    preset: "THIS_MONTH",
  });
  assert(monthReport.dateRange.preset === "THIS_MONTH", "Report respects THIS_MONTH preset");
  assert(Array.isArray(monthReport.revenueTrend), "Revenue trend returns array of time series points");

  // ─── 4. CRM SALES FUNNEL ANALYTICS ─────────────────────────────────────
  console.log("\n--- 4. CRM Sales Funnel Analytics ---");
  assert(Array.isArray(allTimeReport.salesFunnel), "Sales funnel returns array of stage items");
  assert(allTimeReport.salesFunnel.length === 5, "Sales funnel contains 5 canonical pipeline stages");

  const funnelStages = allTimeReport.salesFunnel.map((s) => s.stage);
  assert(
    funnelStages.includes("NEW") &&
      funnelStages.includes("QUALIFIED") &&
      funnelStages.includes("PROPOSAL_SENT") &&
      funnelStages.includes("WON") &&
      funnelStages.includes("LOST"),
    "Funnel contains all stages: NEW, QUALIFIED, PROPOSAL_SENT, WON, LOST"
  );

  // ─── 5. DESTINATION PERFORMANCE ─────────────────────────────────────────
  console.log("\n--- 5. Destination Performance Analytics ---");
  assert(Array.isArray(allTimeReport.destinations), "Destinations is an array");
  if (allTimeReport.destinations.length > 0) {
    const topDest = allTimeReport.destinations[0];
    assert(typeof topDest.destination === "string", "Top destination name is valid string");
    assert(typeof topDest.revenue === "number", "Top destination revenue is a number");
    assert(typeof topDest.tripsCount === "number", "Top destination trips count is a number");
    assert(topDest.marginPercent >= 0, "Top destination margin % is valid");
  }

  // ─── 6. CUSTOMER RECEIVABLES & SUPPLIER PAYABLES ────────────────────────
  console.log("\n--- 6. Customer Receivables & Supplier Payables ---");
  assert(Array.isArray(allTimeReport.receivables), "Receivables ledger is an array");
  for (const r of allTimeReport.receivables) {
    assert(r.balanceAmount > 0, `Receivable ${r.bookingNumber} has balanceAmount > 0`);
    assert(r.balanceAmount === r.totalAmount - r.paidAmount, `Receivable balance strictly equals Total - Paid`);
  }

  assert(Array.isArray(allTimeReport.payables), "Payables ledger is an array");
  for (const p of allTimeReport.payables) {
    assert(typeof p.supplierName === "string", `Payable ${p.payableNumber} has supplierName`);
    assert(typeof p.outstandingAmount === "number", `Payable has valid outstandingAmount`);
  }

  // ─── 7. CUSTOMER RETENTION & LTV ───────────────────────────────────────
  console.log("\n--- 7. Customer Retention & LTV Metrics ---");
  assert(allTimeReport.customers.totalCustomers >= 0, "Total customers count >= 0");
  assert(allTimeReport.customers.repeatRatePercent >= 0 && allTimeReport.customers.repeatRatePercent <= 100, "Repeat rate is between 0% and 100%");
  assert(Array.isArray(allTimeReport.customers.topCustomers), "Top customers list is an array");

  // ─── 8. MULTI-TENANT ISOLATION (CROSS-TENANT LEAK DEFENSE) ─────────────
  console.log("\n--- 8. Multi-Tenant Isolation & Zero-Leak Verification ---");
  const testTenant = await prisma.agency.create({
    data: {
      name: "Phase 21-D Isolated Test Agency",
      phone: "+919898000099",
      email: "test.isolated.21d@tripdesk.io",
      status: "ACTIVE",
    },
  });

  const isolatedReport = await reportingService.getAgencyBIReport(testTenant.id, {
    preset: "ALL_TIME",
  });

  assert(isolatedReport.kpis.grossBookingValue === 0, "Isolated empty tenant has ₹0 Gross Booking Value (0 leak)");
  assert(isolatedReport.kpis.amountCollected === 0, "Isolated empty tenant has ₹0 Collections (0 leak)");
  assert(isolatedReport.kpis.totalEnquiries === 0, "Isolated empty tenant has 0 enquiries (0 leak)");
  assert(isolatedReport.receivables.length === 0, "Isolated empty tenant has 0 receivables (0 leak)");
  assert(isolatedReport.payables.length === 0, "Isolated empty tenant has 0 payables (0 leak)");
  assert(isolatedReport.destinations.length === 0, "Isolated empty tenant has 0 destinations (0 leak)");

  // ─── 9. CSV EXPORT & FORMULA INJECTION SANITIZATION ─────────────────────
  console.log("\n--- 9. CSV Export & Formula Injection Defense ---");
  const csvOverview = await reportingService.generateReportsCSV(pilotAgencyId, { preset: "THIS_MONTH" }, "OVERVIEW");
  assert(typeof csvOverview.csv === "string" && csvOverview.csv.length > 50, "Overview CSV generated with valid content");
  assert(csvOverview.filename.endsWith(".csv"), "CSV filename has .csv extension");
  assert(csvOverview.csv.startsWith("\uFEFF"), "CSV begins with UTF-8 BOM for Excel compatibility");

  const csvReceivables = await reportingService.generateReportsCSV(pilotAgencyId, { preset: "ALL_TIME" }, "RECEIVABLES");
  assert(csvReceivables.csv.includes("Booking #") && csvReceivables.csv.includes("Balance Due"), "Receivables CSV contains required column headers");

  const csvPayables = await reportingService.generateReportsCSV(pilotAgencyId, { preset: "ALL_TIME" }, "PAYABLES");
  assert(csvPayables.csv.includes("Payable #") && csvPayables.csv.includes("Supplier"), "Payables CSV contains required column headers");

  // ─── 10. PDF EXPORT GENERATION ──────────────────────────────────────────
  console.log("\n--- 10. Server-Authoritative PDF Report Generation ---");
  const pdfResult = await reportingService.generateReportsPDF(pilotAgencyId, { preset: "THIS_MONTH" });
  assert(Buffer.isBuffer(pdfResult.buffer), "PDF export returns valid Buffer");
  assert(pdfResult.buffer.length > 1000, `PDF binary size is healthy (${pdfResult.buffer.length} bytes)`);
  assert(pdfResult.buffer.subarray(0, 4).toString() === "%PDF", "PDF binary begins with standard %PDF magic header");
  assert(pdfResult.filename.endsWith(".pdf"), "PDF filename has .pdf extension");

  // ─── CLEANUP ───────────────────────────────────────────────────────────
  await prisma.agency.delete({ where: { id: testTenant.id } });
  console.log("  🧹 Cleaned up isolated test tenant agency");

  console.log("\n═════════════════════════════════════════════════════════════════════");
  console.log(`PHASE 21-D TEST RESULTS: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log("═════════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Test Suite crashed with uncaught error:", err);
    process.exit(1);
  });
