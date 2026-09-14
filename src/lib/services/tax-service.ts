/**
 * TRIPDESK — TAX V1 CALCULATION SERVICE
 *
 * Authoritative, deterministic, Decimal-safe calculation service for TripDesk Tax V1.
 *
 * Rules:
 * 1. ONE quotation/package-level tax rate.
 * 2. Order of operations: Supplier Cost -> Markup -> Selling Price -> Discount -> Taxable Amount -> Tax -> Final Customer Price.
 * 3. EXCLUSIVE mode: Tax Amount = Taxable Amount * (Rate / 100); Final Amount = Taxable Amount + Tax Amount.
 * 4. INCLUSIVE mode: Taxable Amount = Gross Amount / (1 + Rate / 100); Tax Amount = Gross Amount - Taxable Amount; Final Amount = Gross Amount.
 * 5. GST Treatments:
 *    - INTRA_STATE: CGST = 50% of Tax, SGST = 50% of Tax (with deterministic odd-paise reconciliation), IGST = 0.
 *    - INTER_STATE: IGST = 100% of Tax, CGST = 0, SGST = 0.
 *    - NON_GST_EXEMPT: Tax = 0, CGST = 0, SGST = 0, IGST = 0, Final = Taxable Amount.
 * 6. Zero tax rate (0%) returns zero tax for both exclusive and inclusive modes without division-by-zero.
 * 7. Pure calculation service with ZERO database access.
 */

import { Prisma, TaxMode, GstTreatment } from "@prisma/client";

export interface CalculateTaxInput {
  /**
   * The commercial selling amount (or already discount-adjusted amount if discountAmount is 0/omitted).
   */
  amount: Prisma.Decimal | number | string;

  /**
   * Tax rate percentage (e.g. 0, 5, 12, 18, 28).
   */
  taxRate: Prisma.Decimal | number | string;

  /**
   * Tax mode: EXCLUSIVE (default) or INCLUSIVE.
   */
  taxMode?: TaxMode | "EXCLUSIVE" | "INCLUSIVE";

  /**
   * GST treatment: INTRA_STATE (default), INTER_STATE, or NON_GST_EXEMPT.
   */
  gstTreatment?: GstTreatment | "INTRA_STATE" | "INTER_STATE" | "NON_GST_EXEMPT";

  /**
   * Optional discount amount deducted before tax calculation. Default: 0.
   */
  discountAmount?: Prisma.Decimal | number | string;
}

export interface TaxCalculationResult {
  taxableAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxMode: TaxMode;
  gstTreatment: GstTreatment;
  taxAmount: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  finalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  grossSellingPrice: Prisma.Decimal;
}

export class TaxService {
  /**
   * Convert any valid input value to a safe Prisma.Decimal.
   * Throws an error if invalid, non-finite, or NaN.
   */
  private toDecimal(val: Prisma.Decimal | number | string, fieldName: string): Prisma.Decimal {
    if (val === null || val === undefined) {
      throw new Error(`Invalid input for ${fieldName}: value cannot be null or undefined.`);
    }

    try {
      if (val instanceof Prisma.Decimal) {
        if (val.isNaN() || !val.isFinite()) {
          throw new Error(`Invalid numeric value for ${fieldName}: value is NaN or infinite.`);
        }
        return val;
      }

      if (typeof val === "number") {
        if (isNaN(val) || !isFinite(val)) {
          throw new Error(`Invalid numeric value for ${fieldName}: value is NaN or infinite.`);
        }
        return new Prisma.Decimal(val);
      }

      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed === "" || isNaN(Number(trimmed))) {
          throw new Error(`Invalid numeric string for ${fieldName}: "${val}".`);
        }
        const dec = new Prisma.Decimal(trimmed);
        if (dec.isNaN() || !dec.isFinite()) {
          throw new Error(`Invalid numeric value for ${fieldName}: "${val}".`);
        }
        return dec;
      }

      throw new Error(`Unsupported type for ${fieldName}.`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Failed to parse ${fieldName} as Decimal.`);
    }
  }

  /**
   * Primary calculation method for Tax V1.
   */
  public calculate(input: CalculateTaxInput): TaxCalculationResult {
    // 1. Parse and validate amount
    const grossSellingPrice = this.toDecimal(input.amount, "amount");
    if (grossSellingPrice.isNegative()) {
      throw new Error("Tax calculation error: amount cannot be negative.");
    }

    // 2. Parse and validate tax rate
    const taxRate = this.toDecimal(input.taxRate, "taxRate");
    if (taxRate.isNegative()) {
      throw new Error("Tax calculation error: taxRate cannot be negative.");
    }

    // 3. Parse and validate discount
    const discountAmount = input.discountAmount !== undefined && input.discountAmount !== null
      ? this.toDecimal(input.discountAmount, "discountAmount")
      : new Prisma.Decimal(0);

    if (discountAmount.isNegative()) {
      throw new Error("Tax calculation error: discountAmount cannot be negative.");
    }

    if (discountAmount.greaterThan(grossSellingPrice)) {
      throw new Error("Tax calculation error: discountAmount cannot exceed gross selling price.");
    }

    // 4. Validate tax mode
    const taxModeInput = input.taxMode ?? TaxMode.EXCLUSIVE;
    if (taxModeInput !== TaxMode.EXCLUSIVE && taxModeInput !== TaxMode.INCLUSIVE && taxModeInput !== "EXCLUSIVE" && taxModeInput !== "INCLUSIVE") {
      throw new Error(`Tax calculation error: unsupported taxMode "${taxModeInput}".`);
    }
    const taxMode: TaxMode = taxModeInput === "INCLUSIVE" ? TaxMode.INCLUSIVE : TaxMode.EXCLUSIVE;

    // 5. Validate GST treatment
    const gstTreatmentInput = input.gstTreatment ?? GstTreatment.INTRA_STATE;
    if (
      gstTreatmentInput !== GstTreatment.INTRA_STATE &&
      gstTreatmentInput !== GstTreatment.INTER_STATE &&
      gstTreatmentInput !== GstTreatment.NON_GST_EXEMPT &&
      gstTreatmentInput !== "INTRA_STATE" &&
      gstTreatmentInput !== "INTER_STATE" &&
      gstTreatmentInput !== "NON_GST_EXEMPT"
    ) {
      throw new Error(`Tax calculation error: unsupported gstTreatment "${gstTreatmentInput}".`);
    }
    const gstTreatment: GstTreatment =
      gstTreatmentInput === "INTER_STATE"
        ? GstTreatment.INTER_STATE
        : gstTreatmentInput === "NON_GST_EXEMPT"
        ? GstTreatment.NON_GST_EXEMPT
        : GstTreatment.INTRA_STATE;

    // 6. Base amount after discount
    const baseAfterDiscount = grossSellingPrice.minus(discountAmount);

    // 7. Handle Zero Rate or Non-GST Exempt
    if (gstTreatment === GstTreatment.NON_GST_EXEMPT || taxRate.isZero()) {
      const roundedBase = baseAfterDiscount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      return {
        taxableAmount: roundedBase,
        taxRate: taxRate.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
        taxMode,
        gstTreatment,
        taxAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
        cgstAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
        sgstAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
        igstAmount: new Prisma.Decimal(0).toDecimalPlaces(2),
        finalAmount: roundedBase,
        discountAmount: discountAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
        grossSellingPrice: grossSellingPrice.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      };
    }

    let taxableAmount: Prisma.Decimal;
    let taxAmount: Prisma.Decimal;
    let finalAmount: Prisma.Decimal;

    if (taxMode === TaxMode.EXCLUSIVE) {
      // EXCLUSIVE:
      // Taxable Amount = Selling Price - Discount
      // Tax Amount = Taxable Amount * (Rate / 100)
      // Final Amount = Taxable Amount + Tax Amount
      taxableAmount = baseAfterDiscount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const rawTax = taxableAmount.times(taxRate).dividedBy(100);
      taxAmount = rawTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      finalAmount = taxableAmount.plus(taxAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    } else {
      // INCLUSIVE:
      // Gross Amount = Selling Price - Discount
      // Taxable Amount = Gross Amount / (1 + Rate / 100)
      // Tax Amount = Gross Amount - Taxable Amount
      // Final Amount = Gross Amount
      const grossAmount = baseAfterDiscount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const divisor = new Prisma.Decimal(1).plus(taxRate.dividedBy(100));
      taxableAmount = grossAmount.dividedBy(divisor).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      // Ensure exact reconciliation: taxableAmount + taxAmount === grossAmount
      taxAmount = grossAmount.minus(taxableAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      finalAmount = grossAmount;
    }

    // 8. Calculate GST split with exact component reconciliation
    let cgstAmount = new Prisma.Decimal(0);
    let sgstAmount = new Prisma.Decimal(0);
    let igstAmount = new Prisma.Decimal(0);

    if (gstTreatment === GstTreatment.INTER_STATE) {
      igstAmount = taxAmount;
      cgstAmount = new Prisma.Decimal(0).toDecimalPlaces(2);
      sgstAmount = new Prisma.Decimal(0).toDecimalPlaces(2);
    } else if (gstTreatment === GstTreatment.INTRA_STATE) {
      igstAmount = new Prisma.Decimal(0).toDecimalPlaces(2);
      // CGST = round(taxAmount / 2)
      cgstAmount = taxAmount.dividedBy(2).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      // SGST = taxAmount - cgstAmount (Guarantees cgst + sgst === total tax exactly, resolving odd paise)
      sgstAmount = taxAmount.minus(cgstAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    return {
      taxableAmount,
      taxRate: taxRate.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      taxMode,
      gstTreatment,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      finalAmount,
      discountAmount: discountAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      grossSellingPrice: grossSellingPrice.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    };
  }

  /**
   * Helper for standard exclusive tax calculation.
   */
  public calculateExclusive(
    amount: Prisma.Decimal | number | string,
    taxRate: Prisma.Decimal | number | string,
    gstTreatment: GstTreatment | "INTRA_STATE" | "INTER_STATE" | "NON_GST_EXEMPT" = GstTreatment.INTRA_STATE,
    discountAmount: Prisma.Decimal | number | string = 0
  ): TaxCalculationResult {
    return this.calculate({
      amount,
      taxRate,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment,
      discountAmount,
    });
  }

  /**
   * Helper for inclusive tax back-calculation.
   */
  public calculateInclusive(
    grossAmount: Prisma.Decimal | number | string,
    taxRate: Prisma.Decimal | number | string,
    gstTreatment: GstTreatment | "INTRA_STATE" | "INTER_STATE" | "NON_GST_EXEMPT" = GstTreatment.INTRA_STATE,
    discountAmount: Prisma.Decimal | number | string = 0
  ): TaxCalculationResult {
    return this.calculate({
      amount: grossAmount,
      taxRate,
      taxMode: TaxMode.INCLUSIVE,
      gstTreatment,
      discountAmount,
    });
  }
}

export const taxService = new TaxService();
