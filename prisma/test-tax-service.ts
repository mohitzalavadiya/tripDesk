import "dotenv/config";
import { taxService } from "../src/lib/services/tax-service";
import { Prisma, TaxMode, GstTreatment } from "@prisma/client";

async function runTaxServiceTests() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK TAX V1: BATCH 2 TAX CALCULATION SERVICE TEST SUITE");
  console.log("═════════════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  try {
    // ─── 1. EXCLUSIVE TAX TESTS ───────────────────────────────────────
    console.log("--- 1. Exclusive Tax Mode Tests ---");

    // Test 1: ₹10,000 at 18% Exclusive Intra-State
    const res1 = taxService.calculate({
      amount: 10000,
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res1.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res1.taxAmount.equals(new Prisma.Decimal(1800)) &&
      res1.finalAmount.equals(new Prisma.Decimal(11800)) &&
      res1.cgstAmount.equals(new Prisma.Decimal(900)) &&
      res1.sgstAmount.equals(new Prisma.Decimal(900)) &&
      res1.igstAmount.equals(new Prisma.Decimal(0)),
      "₹10,000 at 18% exclusive: Taxable=10,000, Tax=1,800, Final=11,800, CGST=900, SGST=900",
      `Got Taxable=${res1.taxableAmount}, Tax=${res1.taxAmount}, Final=${res1.finalAmount}, CGST=${res1.cgstAmount}, SGST=${res1.sgstAmount}`
    );

    // Test 2: ₹10,000 at 5% Exclusive
    const res2 = taxService.calculate({
      amount: 10000,
      taxRate: 5,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res2.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res2.taxAmount.equals(new Prisma.Decimal(500)) &&
      res2.finalAmount.equals(new Prisma.Decimal(10500)) &&
      res2.cgstAmount.equals(new Prisma.Decimal(250)) &&
      res2.sgstAmount.equals(new Prisma.Decimal(250)),
      "₹10,000 at 5% exclusive: Taxable=10,000, Tax=500, Final=10,500, CGST=250, SGST=250"
    );

    // Test 3: ₹10,000 at 0% Exclusive
    const res3 = taxService.calculate({
      amount: 10000,
      taxRate: 0,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res3.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res3.taxAmount.equals(new Prisma.Decimal(0)) &&
      res3.finalAmount.equals(new Prisma.Decimal(10000)) &&
      res3.cgstAmount.equals(new Prisma.Decimal(0)) &&
      res3.sgstAmount.equals(new Prisma.Decimal(0)),
      "₹10,000 at 0% exclusive: Taxable=10,000, Tax=0, Final=10,000"
    );

    // Test 4: Fractional Amount ₹14,572.85 at 18%
    const res4 = taxService.calculate({
      amount: "14572.85",
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    // 14572.85 * 0.18 = 2623.113 -> 2623.11, Final = 17195.96
    assert(
      res4.taxAmount.equals(new Prisma.Decimal("2623.11")) &&
      res4.finalAmount.equals(new Prisma.Decimal("17195.96")),
      "Fractional ₹14,572.85 at 18%: Tax=2,623.11, Final=17,195.96",
      `Got Tax=${res4.taxAmount}, Final=${res4.finalAmount}`
    );

    // Test 5: Fractional Tax Rate 7.5% on ₹10,000
    const res5 = taxService.calculate({
      amount: 10000,
      taxRate: "7.5",
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res5.taxAmount.equals(new Prisma.Decimal(750)) &&
      res5.finalAmount.equals(new Prisma.Decimal(10750)),
      "Fractional Rate 7.5% on ₹10,000: Tax=750, Final=10,750"
    );

    // ─── 2. INCLUSIVE TAX TESTS ───────────────────────────────────────
    console.log("\n--- 2. Inclusive Tax Mode Tests ---");

    // Test 6: ₹11,800 Gross at 18% Inclusive
    const res6 = taxService.calculate({
      amount: 11800,
      taxRate: 18,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res6.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res6.taxAmount.equals(new Prisma.Decimal(1800)) &&
      res6.finalAmount.equals(new Prisma.Decimal(11800)) &&
      res6.cgstAmount.equals(new Prisma.Decimal(900)) &&
      res6.sgstAmount.equals(new Prisma.Decimal(900)),
      "₹11,800 gross at 18% inclusive: Taxable=10,000, Tax=1,800, Final=11,800, CGST=900, SGST=900"
    );

    // Test 7: ₹10,500 Gross at 5% Inclusive
    const res7 = taxService.calculate({
      amount: 10500,
      taxRate: 5,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res7.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res7.taxAmount.equals(new Prisma.Decimal(500)) &&
      res7.finalAmount.equals(new Prisma.Decimal(10500)),
      "₹10,500 gross at 5% inclusive: Taxable=10,000, Tax=500, Final=10,500"
    );

    // Test 8: Zero-Rate Inclusive ₹10,000 at 0%
    const res8 = taxService.calculate({
      amount: 10000,
      taxRate: 0,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res8.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res8.taxAmount.equals(new Prisma.Decimal(0)) &&
      res8.finalAmount.equals(new Prisma.Decimal(10000)),
      "Zero-rate inclusive ₹10,000 at 0%: Taxable=10,000, Tax=0, Final=10,000"
    );

    // Test 9: Fractional Gross Amount ₹15,660.50 at 18% Inclusive
    const res9 = taxService.calculate({
      amount: "15660.50",
      taxRate: 18,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    // 15660.50 / 1.18 = 13271.61016... -> 13271.61, Tax = 15660.50 - 13271.61 = 2388.89
    assert(
      res9.taxableAmount.equals(new Prisma.Decimal("13271.61")) &&
      res9.taxAmount.equals(new Prisma.Decimal("2388.89")) &&
      res9.finalAmount.equals(new Prisma.Decimal("15660.50")),
      "Fractional ₹15,660.50 gross at 18% inclusive: Taxable=13,271.61, Tax=2,388.89, Final=15,660.50"
    );

    // ─── 3. GST TREATMENTS ────────────────────────────────────────────
    console.log("\n--- 3. GST Treatment Tests ---");

    // Test 10: INTRA_STATE (CGST 50% / SGST 50% / IGST 0)
    const res10 = taxService.calculate({
      amount: 20000,
      taxRate: 12,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res10.taxAmount.equals(new Prisma.Decimal(2400)) &&
      res10.cgstAmount.equals(new Prisma.Decimal(1200)) &&
      res10.sgstAmount.equals(new Prisma.Decimal(1200)) &&
      res10.igstAmount.equals(new Prisma.Decimal(0)),
      "INTRA_STATE at 12%: Total Tax=2,400, CGST=1,200, SGST=1,200, IGST=0"
    );

    // Test 11: INTER_STATE (IGST 100% / CGST 0 / SGST 0)
    const res11 = taxService.calculate({
      amount: 20000,
      taxRate: 12,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTER_STATE,
    });
    assert(
      res11.taxAmount.equals(new Prisma.Decimal(2400)) &&
      res11.igstAmount.equals(new Prisma.Decimal(2400)) &&
      res11.cgstAmount.equals(new Prisma.Decimal(0)) &&
      res11.sgstAmount.equals(new Prisma.Decimal(0)),
      "INTER_STATE at 12%: Total Tax=2,400, IGST=2,400, CGST=0, SGST=0"
    );

    // Test 12: NON_GST_EXEMPT (All taxes 0, final = taxable)
    const res12 = taxService.calculate({
      amount: 20000,
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.NON_GST_EXEMPT,
    });
    assert(
      res12.taxAmount.equals(new Prisma.Decimal(0)) &&
      res12.cgstAmount.equals(new Prisma.Decimal(0)) &&
      res12.sgstAmount.equals(new Prisma.Decimal(0)) &&
      res12.igstAmount.equals(new Prisma.Decimal(0)) &&
      res12.finalAmount.equals(new Prisma.Decimal(20000)),
      "NON_GST_EXEMPT at 18%: Tax=0, CGST=0, SGST=0, IGST=0, Final=20,000"
    );

    // ─── 4. DISCOUNT-ADJUSTED CALCULATION ─────────────────────────────
    console.log("\n--- 4. Discount-Adjusted Calculation Tests ---");

    // Test 13: ₹10,000 Selling Price - ₹1,000 Discount at 18% Exclusive
    const res13 = taxService.calculate({
      amount: 10000,
      discountAmount: 1000,
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res13.grossSellingPrice.equals(new Prisma.Decimal(10000)) &&
      res13.discountAmount.equals(new Prisma.Decimal(1000)) &&
      res13.taxableAmount.equals(new Prisma.Decimal(9000)) &&
      res13.taxAmount.equals(new Prisma.Decimal(1620)) &&
      res13.finalAmount.equals(new Prisma.Decimal(10620)),
      "₹10,000 Selling - ₹1,000 Discount at 18% Exclusive: Taxable=9,000, Tax=1,620, Final=10,620"
    );

    // Test 14: Zero Discount
    const res14 = taxService.calculate({
      amount: 10000,
      discountAmount: 0,
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res14.taxableAmount.equals(new Prisma.Decimal(10000)) &&
      res14.taxAmount.equals(new Prisma.Decimal(1800)) &&
      res14.finalAmount.equals(new Prisma.Decimal(11800)),
      "Zero discount at 18% Exclusive: Taxable=10,000, Tax=1,800, Final=11,800"
    );

    // Test 15: Full 100% Discount (₹10,000 - ₹10,000)
    const res15 = taxService.calculate({
      amount: 10000,
      discountAmount: 10000,
      taxRate: 18,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(
      res15.taxableAmount.equals(new Prisma.Decimal(0)) &&
      res15.taxAmount.equals(new Prisma.Decimal(0)) &&
      res15.finalAmount.equals(new Prisma.Decimal(0)),
      "Full discount (10,000 - 10,000): Taxable=0, Tax=0, Final=0"
    );

    // ─── 5. INPUT VALIDATION TESTS ────────────────────────────────────
    console.log("\n--- 5. Input Validation Tests ---");

    // Test 16: Negative Amount
    let err16 = false;
    try {
      taxService.calculate({ amount: -100, taxRate: 18 });
    } catch {
      err16 = true;
    }
    assert(err16, "Rejects negative amount");

    // Test 17: Negative Tax Rate
    let err17 = false;
    try {
      taxService.calculate({ amount: 1000, taxRate: -5 });
    } catch {
      err17 = true;
    }
    assert(err17, "Rejects negative tax rate");

    // Test 18: Negative Discount
    let err18 = false;
    try {
      taxService.calculate({ amount: 1000, discountAmount: -50, taxRate: 18 });
    } catch {
      err18 = true;
    }
    assert(err18, "Rejects negative discount");

    // Test 19: Discount Exceeding Selling Price
    let err19 = false;
    try {
      taxService.calculate({ amount: 1000, discountAmount: 1500, taxRate: 18 });
    } catch {
      err19 = true;
    }
    assert(err19, "Rejects discount exceeding selling price");

    // Test 20: Invalid Tax Mode
    let err20 = false;
    try {
      taxService.calculate({ amount: 1000, taxRate: 18, taxMode: "INVALID" as any });
    } catch {
      err20 = true;
    }
    assert(err20, "Rejects invalid tax mode");

    // Test 21: Invalid GST Treatment
    let err21 = false;
    try {
      taxService.calculate({ amount: 1000, taxRate: 18, gstTreatment: "INVALID" as any });
    } catch {
      err21 = true;
    }
    assert(err21, "Rejects invalid GST treatment");

    // Test 22: NaN / Non-numeric strings
    let err22 = false;
    try {
      taxService.calculate({ amount: "abc", taxRate: 18 });
    } catch {
      err22 = true;
    }
    assert(err22, "Rejects NaN / non-numeric string amount");

    // ─── 6. RECONCILIATION & ROUNDING INTEGRITY ──────────────────────
    console.log("\n--- 6. Reconciliation & Rounding Integrity Tests ---");

    // Test 23: Mandatory Section 20 Inclusive Rounding (₹100.00 Gross at 18% Inclusive)
    // 100 / 1.18 = 84.7457627... -> Taxable=84.75, Tax=15.25.
    // Exact check: 84.75 + 15.25 = 100.00
    const res23 = taxService.calculate({
      amount: 100,
      taxRate: 18,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    const sumInclusive = res23.taxableAmount.plus(res23.taxAmount);
    assert(
      res23.taxableAmount.equals(new Prisma.Decimal("84.75")) &&
      res23.taxAmount.equals(new Prisma.Decimal("15.25")) &&
      sumInclusive.equals(new Prisma.Decimal("100.00")) &&
      res23.finalAmount.equals(new Prisma.Decimal("100.00")),
      "Section 20 Inclusive Rounding: ₹100 @ 18% -> Taxable 84.75 + Tax 15.25 = Gross 100.00 exact",
      `Got Taxable=${res23.taxableAmount}, Tax=${res23.taxAmount}, Sum=${sumInclusive}`
    );

    // Test 24: Mandatory Section 21 Odd-Paise CGST/SGST Split in Exclusive Mode (₹15.00 at 5%)
    // 15 * 0.05 = 0.75 Tax.
    // CGST = 0.75 / 2 = 0.375 -> 0.38
    // SGST = 0.75 - 0.38 = 0.37
    // Reconcile: 0.38 + 0.37 = 0.75 exact!
    const res24 = taxService.calculate({
      amount: 15,
      taxRate: 5,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });
    const splitSum24 = res24.cgstAmount.plus(res24.sgstAmount);
    assert(
      res24.taxAmount.equals(new Prisma.Decimal("0.75")) &&
      res24.cgstAmount.equals(new Prisma.Decimal("0.38")) &&
      res24.sgstAmount.equals(new Prisma.Decimal("0.37")) &&
      splitSum24.equals(res24.taxAmount),
      "Section 21 Odd-Paise GST Split: Tax 0.75 -> CGST 0.38 + SGST 0.37 = 0.75 exact",
      `Got CGST=${res24.cgstAmount}, SGST=${res24.sgstAmount}, Sum=${splitSum24}`
    );

    // Test 25: Odd-Paise CGST/SGST Split in Inclusive Mode (₹100 at 18% Inclusive)
    // Tax = 15.25.
    // CGST = 15.25 / 2 = 7.625 -> 7.63
    // SGST = 15.25 - 7.63 = 7.62
    // Reconcile: 7.63 + 7.62 = 15.25 exact!
    const splitSum25 = res23.cgstAmount.plus(res23.sgstAmount);
    assert(
      res23.cgstAmount.equals(new Prisma.Decimal("7.63")) &&
      res23.sgstAmount.equals(new Prisma.Decimal("7.62")) &&
      splitSum25.equals(res23.taxAmount),
      "Odd-Paise GST Split on Inclusive: Tax 15.25 -> CGST 7.63 + SGST 7.62 = 15.25 exact",
      `Got CGST=${res23.cgstAmount}, SGST=${res23.sgstAmount}, Sum=${splitSum25}`
    );

    // Test 26: Exclusive Final Amount Exact Reconciliation Across 20 Random Presets
    const rates = [0, 5, 12, 18, 28];
    const amounts = [123.45, 999.99, 4567.89, 35000, 150000.75];
    let exclusiveReconciledAll = true;
    for (const amt of amounts) {
      for (const r of rates) {
        const res = taxService.calculateExclusive(amt, r, GstTreatment.INTRA_STATE);
        const sum = res.taxableAmount.plus(res.taxAmount);
        const gstSum = res.cgstAmount.plus(res.sgstAmount);
        if (!sum.equals(res.finalAmount) || !gstSum.equals(res.taxAmount)) {
          exclusiveReconciledAll = false;
        }
      }
    }
    assert(exclusiveReconciledAll, "25 multi-value exclusive calculations reconcile perfectly (Taxable + Tax = Final, CGST + SGST = Tax)");

    // Test 27: Inclusive Final Amount Exact Reconciliation Across 20 Random Presets
    let inclusiveReconciledAll = true;
    for (const amt of amounts) {
      for (const r of rates) {
        const res = taxService.calculateInclusive(amt, r, GstTreatment.INTRA_STATE);
        const sum = res.taxableAmount.plus(res.taxAmount);
        const gstSum = res.cgstAmount.plus(res.sgstAmount);
        if (!sum.equals(res.finalAmount) || !gstSum.equals(res.taxAmount) || !res.finalAmount.equals(new Prisma.Decimal(amt).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP))) {
          inclusiveReconciledAll = false;
        }
      }
    }
    assert(inclusiveReconciledAll, "25 multi-value inclusive calculations reconcile perfectly (Taxable + Tax = Final = Gross, CGST + SGST = Tax)");

    console.log("\n═════════════════════════════════════════════════════════════════════");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
    console.log("═════════════════════════════════════════════════════════════════════");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test suite encountered unhandled error:", error);
    process.exit(1);
  }
}

runTaxServiceTests();
