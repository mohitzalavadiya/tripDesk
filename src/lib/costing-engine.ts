/**
 * TRIPDESK — PURE FINANCIAL COSTING & PRICING ENGINE (PHASE 5)
 * 
 * Strict separation of concerns:
 * - SUPPLIER COST: What the travel agency pays suppliers for contracted services.
 * - INTERNAL EXPENSES: Agency overheads, commissions, payment gateway fees.
 * - TOTAL COST: Supplier Cost + Internal Expenses.
 * - SELLING PRICE: What the customer pays the agency (Cost + Markup - Discount + Tax).
 * - PROFIT: Selling Price - Total Cost.
 * - MARGIN: (Profit / Selling Price) * 100.
 */

import {
  CostItem,
  InternalExpense,
  MarkupRule,
  DiscountRule,
  TaxRule,
  PricingSettings,
  CostingSummary,
  VehiclePricingType,
  ActivityPricingType,
} from "@/types"

// ─── Format Currency (Safe Indian Currency & Generic Display) ─────────
export function formatCurrency(amount: number, currency = "INR"): string {
  const safeAmount = isNaN(amount) ? 0 : amount
  const rounded = Math.round(safeAmount * 100) / 100

  if (currency === "INR") {
    // Standard Indian number format: ₹ 1,00,000.00 or ₹ 1,00,000
    const parts = rounded.toFixed(2).split(".")
    const integerPart = parts[0]
    const decimalPart = parts[1]

    const lastThree = integerPart.substring(integerPart.length - 3)
    const otherNumbers = integerPart.substring(0, integerPart.length - 3)
    const formattedInteger = otherNumbers !== ""
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree

    return decimalPart === "00"
      ? `₹${formattedInteger}`
      : `₹${formattedInteger}.${decimalPart}`
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(rounded)
}

// ─── Hotel Cost Calculation ───────────────────────────────────────────
// Formula: RATE × ROOMS × NIGHTS
export function calculateHotelCost(
  unitRate: number,
  rooms: number,
  nights: number
): number {
  if (unitRate <= 0 || rooms <= 0 || nights <= 0) return 0
  return Math.round(unitRate * rooms * nights * 100) / 100
}

// ─── Vehicle Cost Calculation ─────────────────────────────────────────
// Formula depends on Phase 4 VehiclePricingType
export function calculateVehicleCost(
  pricingType: VehiclePricingType,
  rate: number,
  days = 1,
  km = 0,
  trips = 1
): number {
  if (rate <= 0) return 0

  switch (pricingType) {
    case "PerDay":
      return Math.round(rate * Math.max(1, days) * 100) / 100
    case "PerKM":
      return Math.round(rate * Math.max(0, km) * 100) / 100
    case "PerTrip":
    case "PerTransfer":
      return Math.round(rate * Math.max(1, trips) * 100) / 100
    case "Package":
    default:
      return Math.round(rate * 100) / 100
  }
}

// ─── Activity Cost Calculation ────────────────────────────────────────
// Formula depends on Phase 4 ActivityPricingType
export function calculateActivityCost(
  pricingType: ActivityPricingType,
  rates: {
    adultRate?: number
    childRate?: number
    groupRate?: number
    vehicleRate?: number
    bookingRate?: number
  },
  adults = 1,
  children = 0
): number {
  const adultRate = rates.adultRate || 0
  const childRate = rates.childRate || 0
  const groupRate = rates.groupRate || 0
  const vehicleRate = rates.vehicleRate || 0
  const bookingRate = rates.bookingRate || 0

  switch (pricingType) {
    case "PerPerson":
    case "PerAdult": {
      const adultTotal = adultRate * Math.max(0, adults)
      const childTotal = childRate * Math.max(0, children)
      return Math.round((adultTotal + childTotal) * 100) / 100
    }
    case "PerChild":
      return Math.round(childRate * Math.max(0, children) * 100) / 100
    case "PerGroup":
      return Math.round(groupRate * 100) / 100
    case "PerVehicle":
      return Math.round(vehicleRate * 100) / 100
    case "PerBooking":
      return Math.round(bookingRate * 100) / 100
    default:
      return Math.round(adultRate * Math.max(1, adults) * 100) / 100
  }
}

// ─── Line Item Cost ───────────────────────────────────────────────────
// Formula: QUANTITY × (DURATION || 1) × UNIT_COST
export function calculateLineItemCost(
  unitCost: number,
  quantity = 1,
  duration = 1
): number {
  if (unitCost <= 0 || quantity <= 0) return 0
  const validDuration = duration > 0 ? duration : 1
  return Math.round(unitCost * quantity * validDuration * 100) / 100
}

// ─── Supplier Cost (Aggregated) ───────────────────────────────────────
export function calculateSupplierCost(costItems: CostItem[]): number {
  const sum = costItems.reduce((acc, item) => {
    // If it's an adjustment, it can be positive or negative
    if (item.sourceType === "Adjustment") {
      return acc + (item.totalCost || 0)
    }
    return acc + Math.max(0, item.totalCost || 0)
  }, 0)
  return Math.round(sum * 100) / 100
}

// ─── Internal Expenses (Aggregated) ───────────────────────────────────
export function calculateInternalExpenses(expenses: InternalExpense[]): number {
  const sum = expenses.reduce((acc, exp) => acc + Math.max(0, exp.amount || 0), 0)
  return Math.round(sum * 100) / 100
}

// ─── Total Cost ───────────────────────────────────────────────────────
// TOTAL COST = SUPPLIER COST + INTERNAL EXPENSES
export function calculateTotalCost(
  supplierCost: number,
  internalExpenses: number
): number {
  return Math.round((Math.max(0, supplierCost) + Math.max(0, internalExpenses)) * 100) / 100
}

// ─── Markup Calculation ───────────────────────────────────────────────
export function calculateMarkup(
  cost: number,
  markupRule: MarkupRule
): number {
  if (cost <= 0 || markupRule.value <= 0) return 0

  if (markupRule.type === "percentage") {
    // Percentage on cost: COST * (MARKUP% / 100)
    return Math.round(cost * (markupRule.value / 100) * 100) / 100
  }

  // Fixed markup
  return Math.round(markupRule.value * 100) / 100
}

// ─── Discount Calculation ─────────────────────────────────────────────
export function calculateDiscount(
  subtotal: number,
  discountRule?: DiscountRule
): number {
  if (!discountRule || discountRule.value <= 0 || subtotal <= 0) return 0

  if (discountRule.type === "percentage") {
    const rawDiscount = subtotal * (discountRule.value / 100)
    // Never allow discount to exceed subtotal
    return Math.round(Math.min(subtotal, rawDiscount) * 100) / 100
  }

  // Fixed discount
  return Math.round(Math.min(subtotal, discountRule.value) * 100) / 100
}

// ─── Tax Calculation ──────────────────────────────────────────────────
export function calculateTax(
  taxableAmount: number,
  taxRule?: TaxRule,
  customTaxRate?: number
): number {
  if (taxableAmount <= 0) return 0

  if (customTaxRate !== undefined && customTaxRate >= 0) {
    return Math.round(taxableAmount * (customTaxRate / 100) * 100) / 100
  }

  if (!taxRule || !taxRule.enabled || taxRule.rate <= 0) return 0

  if (taxRule.type === "percentage") {
    return Math.round(taxableAmount * (taxRule.rate / 100) * 100) / 100
  }

  return Math.round(taxRule.rate * 100) / 100
}

// ─── Final Selling Price Calculation ──────────────────────────────────
export function calculateSellingPrice(
  totalCost: number,
  markupAmount: number,
  discountAmount: number,
  taxAmount: number,
  pricingMode: "automatic" | "manual" = "automatic",
  manualPrice?: number,
  roundTo?: number
): number {
  if (pricingMode === "manual" && manualPrice !== undefined) {
    return Math.max(0, Math.round(manualPrice * 100) / 100)
  }

  const subtotalBeforeDiscount = Math.max(0, totalCost + markupAmount)
  const taxableAmount = Math.max(0, subtotalBeforeDiscount - discountAmount)
  let calculatedPrice = Math.max(0, taxableAmount + taxAmount)

  if (roundTo && roundTo > 0) {
    calculatedPrice = Math.round(calculatedPrice / roundTo) * roundTo
  }

  return Math.round(calculatedPrice * 100) / 100
}

// ─── Gross Profit ─────────────────────────────────────────────────────
// PROFIT = SELLING PRICE - TOTAL INTERNAL COST
export function calculateProfit(
  sellingPrice: number,
  totalCost: number
): number {
  return Math.round((sellingPrice - totalCost) * 100) / 100
}

// ─── Profit Margin % ──────────────────────────────────────────────────
// MARGIN = (PROFIT / SELLING PRICE) * 100
export function calculateMargin(
  profit: number,
  sellingPrice: number
): number {
  if (sellingPrice <= 0) return 0
  const margin = (profit / sellingPrice) * 100
  return Math.round(margin * 100) / 100
}

// ─── Markup Percentage ────────────────────────────────────────────────
// MARKUP % = (MARKUP / BASE COST) * 100
export function calculateMarkupPercent(
  markupAmount: number,
  baseCost: number
): number {
  if (baseCost <= 0) return 0
  const markupPercent = (markupAmount / baseCost) * 100
  return Math.round(markupPercent * 100) / 100
}

// ─── Margin Health Evaluator ──────────────────────────────────────────
export interface MarginHealth {
  status: "Healthy" | "Watch" | "Low Margin" | "Loss" | "Break-even"
  label: string
  badgeVariant: "emerald" | "amber" | "rose" | "slate"
  badgeClass: string
  message: string
  isWarning: boolean
  isLoss: boolean
}

export function evaluateMarginHealth(
  marginPercent: number,
  sellingPrice: number,
  totalCost: number,
  lowMarginThreshold = 10
): MarginHealth {
  if (sellingPrice < totalCost) {
    const lossAmount = totalCost - sellingPrice
    return {
      status: "Loss",
      label: "Loss Warning",
      badgeVariant: "rose",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      message: `Package is being sold ₹${lossAmount.toLocaleString("en-IN")} below total cost.`,
      isWarning: true,
      isLoss: true,
    }
  }

  if (Math.abs(sellingPrice - totalCost) < 0.01 || profitIsZero(marginPercent)) {
    return {
      status: "Break-even",
      label: "Break-even",
      badgeVariant: "slate",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      message: "Zero profit on this travel package.",
      isWarning: true,
      isLoss: false,
    }
  }

  if (marginPercent < lowMarginThreshold) {
    return {
      status: "Low Margin",
      label: "Low Margin",
      badgeVariant: "amber",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      message: `Package margin (${marginPercent.toFixed(1)}%) is below your recommended ${lowMarginThreshold}% threshold.`,
      isWarning: true,
      isLoss: false,
    }
  }

  if (marginPercent >= 15) {
    return {
      status: "Healthy",
      label: "Healthy Margin",
      badgeVariant: "emerald",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      message: `Strong profitability (${marginPercent.toFixed(1)}% margin).`,
      isWarning: false,
      isLoss: false,
    }
  }

  return {
    status: "Watch",
    label: "Moderate Margin",
    badgeVariant: "amber",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    message: `Acceptable margin (${marginPercent.toFixed(1)}%).`,
    isWarning: false,
    isLoss: false,
  }
}

function profitIsZero(val: number) {
  return Math.abs(val) < 0.0001
}

// ─── Master Pipeline Compute ──────────────────────────────────────────
export function computeCostingSummary(
  costItems: CostItem[],
  internalExpenses: InternalExpense[],
  settings: PricingSettings,
  taxRules: TaxRule[]
): CostingSummary {
  // 1. Supplier Cost
  const supplierCost = calculateSupplierCost(costItems)

  // 2. Internal Expenses
  const internalExpense = calculateInternalExpenses(internalExpenses)

  // 3. Total Cost
  const totalCost = calculateTotalCost(supplierCost, internalExpense)

  // 4. Markup
  const markupAmount = calculateMarkup(totalCost, {
    type: settings.markupType,
    value: settings.markupValue,
    scope: "trip",
  })

  // 5. Subtotal before discount
  const subtotal = totalCost + markupAmount

  // 6. Discount
  const discountAmount = settings.discountType && settings.discountValue
    ? calculateDiscount(subtotal, {
        type: settings.discountType,
        value: settings.discountValue,
      })
    : 0

  // 7. Taxable Amount
  const taxableAmount = Math.max(0, subtotal - discountAmount)

  // 8. Tax
  const activeTaxRule = settings.taxRuleId
    ? taxRules.find((t) => t.id === settings.taxRuleId)
    : undefined
  const taxAmount = calculateTax(taxableAmount, activeTaxRule, settings.customTaxRate)

  // 9. Calculated Selling Price
  const calculatedSellingPrice = calculateSellingPrice(
    totalCost,
    markupAmount,
    discountAmount,
    taxAmount,
    "automatic",
    undefined,
    settings.roundPriceTo
  )

  // 10. Actual Selling Price (accounting for manual override)
  const sellingPrice = calculateSellingPrice(
    totalCost,
    markupAmount,
    discountAmount,
    taxAmount,
    settings.pricingMode,
    settings.manualSellingPrice,
    settings.roundPriceTo
  )

  // 11. Gross Profit
  const grossProfit = calculateProfit(sellingPrice, totalCost)

  // 12. Profit Margin %
  const marginPercent = calculateMargin(grossProfit, sellingPrice)

  // 13. Effective Markup %
  const markupPercent = calculateMarkupPercent(markupAmount, totalCost)

  return {
    supplierCost,
    internalExpense,
    totalCost,
    markupAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    calculatedSellingPrice,
    sellingPrice,
    grossProfit,
    marginPercent,
    markupPercent,
  }
}
