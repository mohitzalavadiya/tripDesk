"use client"

import * as React from "react"
import {
  CostItem,
  InternalExpense,
  TaxRule,
  PricingSettings,
  TripCosting,
  CostingSummary,
  RateSnapshot,
  TripHotel,
  TripVehicle,
  TripActivity,
  HotelRate,
  VehicleRate,
  ActivityRate,
} from "@/types"
import {
  computeCostingSummary,
  calculateHotelCost,
  calculateVehicleCost,
  calculateActivityCost,
} from "@/lib/costing-engine"
import { toast } from "sonner"

// ═════════════════════════════════════════════════════════════════════
// PRELOADED CONFIGURABLE TAX RULES
// ═════════════════════════════════════════════════════════════════════

export const INITIAL_TAX_RULES: TaxRule[] = [
  {
    id: "TAX-GST-5",
    name: "GST on Tour Packages (5% without ITC)",
    rate: 5,
    type: "percentage",
    enabled: true,
    description: "Standard GST applicable on bundled domestic travel tour packages without input tax credit.",
  },
  {
    id: "TAX-GST-18",
    name: "GST on Agency Service Fee (18%)",
    rate: 18,
    type: "percentage",
    enabled: true,
    description: "Applicable on standalone travel consulting and booking commission fees.",
  },
  {
    id: "TAX-ZERO",
    name: "Zero Rated / Exempt (0%)",
    rate: 0,
    type: "percentage",
    enabled: true,
    description: "Exempt services, SEZ bookings, or tax-inclusive supplier arrangements.",
  },
]

// ═════════════════════════════════════════════════════════════════════
// INITIAL DEMO COST ITEMS & EXPENSES (Scenario: Kerala Family Holiday)
// ═════════════════════════════════════════════════════════════════════

export const INITIAL_COST_ITEMS: CostItem[] = [
  {
    id: "COST-001",
    tripId: "TRIP-001",
    category: "Hotel",
    name: "Munnar Valley Retreat (Premium Room)",
    description: "2 Rooms × 2 Nights · CPAI Plan (Breakfast Included)",
    supplierId: "SUP-002",
    supplierName: "Kerala Travel Partners",
    serviceType: "Hotel",
    serviceId: "HOTEL-002",
    rateId: "HR-002",
    quantity: 2,
    duration: 2,
    unit: "Room/Night",
    unitCost: 5500,
    totalCost: 22000,
    currency: "INR",
    sourceType: "Inventory",
    dateFrom: "2026-10-15",
    dateTo: "2026-10-17",
    rateSnapshot: {
      name: "Munnar Valley Retreat",
      supplierName: "Kerala Travel Partners",
      supplierId: "SUP-002",
      baseRate: 5500,
      currency: "INR",
      rateType: "Hotel",
      validity: "2026-10-01 → 2027-03-31",
      mealPlan: "CPAI",
      roomName: "Premium Room",
      rateSheetName: "Kerala Master Tariff 2026–27",
      sourceType: "Excel",
      details: "Net B2B CPAI Contract Rate",
    },
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "COST-002",
    tripId: "TRIP-001",
    category: "Transport",
    name: "Force Urbania (17-Seater Luxury Fleet)",
    description: "7 Days Chauffeur Driven · AC On · Dedicated Vehicle",
    supplierId: "SUP-003",
    supplierName: "ABC Travels & Fleet",
    serviceType: "Vehicle",
    serviceId: "VEH-001",
    rateId: "VR-001",
    quantity: 1,
    duration: 7,
    unit: "Day",
    unitCost: 5500,
    totalCost: 38500,
    currency: "INR",
    sourceType: "Inventory",
    dateFrom: "2026-10-15",
    dateTo: "2026-10-21",
    rateSnapshot: {
      name: "Force Urbania (17-Seater)",
      supplierName: "ABC Travels & Fleet",
      supplierId: "SUP-003",
      baseRate: 5500,
      currency: "INR",
      rateType: "PerDay",
      validity: "2026-10-01 → 2027-03-31",
      vehicleType: "Tempo Traveller",
      details: "Per Day B2B Transport Tariff (200km included/day)",
    },
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "COST-003",
    tripId: "TRIP-001",
    category: "Activity",
    name: "Mangrove Kayaking & Backwater Canoe Tour",
    description: "4 Adults · 3.5 Hours Guided Expedition",
    supplierId: "SUP-004",
    supplierName: "Kerala Adventures & Experiences",
    serviceType: "Activity",
    serviceId: "ACT-002",
    rateId: "AR-002",
    quantity: 4,
    duration: 1,
    unit: "Person",
    unitCost: 1200,
    totalCost: 4800,
    currency: "INR",
    sourceType: "Inventory",
    dateFrom: "2026-10-18",
    rateSnapshot: {
      name: "Mangrove Kayaking & Backwater Tour",
      supplierName: "Kerala Adventures & Experiences",
      supplierId: "SUP-004",
      baseRate: 1200,
      currency: "INR",
      rateType: "PerPerson",
      validity: "2026-10-01 → 2027-03-31",
      details: "Per Adult B2B Tariff with life jackets & safety guide",
    },
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "COST-004",
    tripId: "TRIP-001",
    category: "Driver",
    name: "Driver Daily Allowance / Bata",
    description: "Chauffeur food & lodging allowance (₹500 / day × 7 days)",
    supplierId: "SUP-003",
    supplierName: "ABC Travels & Fleet",
    quantity: 1,
    duration: 7,
    unit: "Day",
    unitCost: 500,
    totalCost: 3500,
    currency: "INR",
    sourceType: "Manual",
    createdAt: "2026-08-15T10:30:00.000Z",
    updatedAt: "2026-08-15T10:30:00.000Z",
  },
  {
    id: "COST-005",
    tripId: "TRIP-001",
    category: "Toll",
    name: "State Highway & Fastag Toll Taxes",
    description: "Kerala NH66 & Munnar Ghat Section Tolls Estimate",
    quantity: 1,
    duration: 1,
    unit: "Lump Sum",
    unitCost: 3000,
    totalCost: 3000,
    currency: "INR",
    sourceType: "Manual",
    createdAt: "2026-08-15T10:35:00.000Z",
    updatedAt: "2026-08-15T10:35:00.000Z",
  },
  {
    id: "COST-006",
    tripId: "TRIP-001",
    category: "Parking",
    name: "Sightseeing Spot & Airport Parking Fees",
    description: "Cochin Airport, Tea Museum, Mattupetty Dam & Backwater Jetty",
    quantity: 1,
    duration: 1,
    unit: "Lump Sum",
    unitCost: 1000,
    totalCost: 1000,
    currency: "INR",
    sourceType: "Manual",
    createdAt: "2026-08-15T10:40:00.000Z",
    updatedAt: "2026-08-15T10:40:00.000Z",
  },
]

export const INITIAL_INTERNAL_EXPENSES: InternalExpense[] = [
  {
    id: "EXP-001",
    tripId: "TRIP-001",
    category: "Payment Gateway Fee",
    name: "Payment Gateway Processing (Razorpay)",
    amount: 500,
    currency: "INR",
    notes: "Estimated 2% gateway surcharge buffer",
    createdAt: "2026-08-15T11:00:00.000Z",
    updatedAt: "2026-08-15T11:00:00.000Z",
  },
  {
    id: "EXP-002",
    tripId: "TRIP-001",
    category: "Sales Commission",
    name: "Sales Executive Lead Booking Incentive",
    amount: 1500,
    currency: "INR",
    notes: "Internal sales performance bonus",
    createdAt: "2026-08-15T11:05:00.000Z",
    updatedAt: "2026-08-15T11:05:00.000Z",
  },
]

const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  markupType: "percentage",
  markupValue: 15, // 15% Markup
  discountType: "fixed",
  discountValue: 720, // Discount to land exactly ₹85,000 package price
  pricingMode: "manual",
  manualSellingPrice: 85000,
  taxRuleId: "TAX-ZERO",
  customTaxRate: 0,
  lowMarginThreshold: 10,
  roundPriceTo: 100,
}

// ═════════════════════════════════════════════════════════════════════
// CONTEXT INTERFACE
// ═════════════════════════════════════════════════════════════════════

interface CostingContextType {
  costItems: CostItem[]
  internalExpenses: InternalExpense[]
  taxRules: TaxRule[]
  tripCostings: Record<string, TripCosting>

  // Query Helpers
  getCostingForTrip: (tripId: string) => {
    costing: TripCosting
    costItems: CostItem[]
    internalExpenses: InternalExpense[]
    summary: CostingSummary
  }

  // Cost Line Item CRUD
  addCostItem: (item: Omit<CostItem, "id" | "createdAt" | "updatedAt">) => CostItem
  updateCostItem: (id: string, updates: Partial<CostItem>) => void
  deleteCostItem: (id: string) => void

  // Internal Expense CRUD
  addInternalExpense: (expense: Omit<InternalExpense, "id" | "createdAt" | "updatedAt">) => InternalExpense
  updateInternalExpense: (id: string, updates: Partial<InternalExpense>) => void
  deleteInternalExpense: (id: string) => void

  // Pricing Controls
  updatePricingSettings: (tripId: string, settings: Partial<PricingSettings>) => void
  setPricingMode: (tripId: string, mode: "automatic" | "manual", manualPrice?: number) => void

  // Lock / Unlock Workflow
  lockCosting: (tripId: string) => void
  unlockCosting: (tripId: string) => void

  // Auto Recalculation & Service Sync
  recalculateTripCosting: (tripId: string) => void
  syncInventoryServicesToCosting: (
    tripId: string,
    services: {
      hotels: TripHotel[]
      vehicles: TripVehicle[]
      activities: TripActivity[]
    },
    inventoryRates: {
      hotelRates: HotelRate[]
      vehicleRates: VehicleRate[]
      activityRates: ActivityRate[]
    }
  ) => void
  refreshRateSnapshot: (costItemId: string, newRate: number, rateDetails?: string) => void
}

const CostingContext = React.createContext<CostingContextType | undefined>(undefined)

const COSTING_ITEMS_STORAGE_KEY = "tripdesk_cost_items_v1"
const COSTING_EXPENSES_STORAGE_KEY = "tripdesk_internal_expenses_v1"
const TRIP_COSTINGS_STORAGE_KEY = "tripdesk_trip_costings_v1"

export function CostingProvider({ children }: { children: React.ReactNode }) {
  const [costItems, setCostItems] = React.useState<CostItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(COSTING_ITEMS_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load cost items from localStorage", e)
      }
    }
    return INITIAL_COST_ITEMS
  })

  const [internalExpenses, setInternalExpenses] = React.useState<InternalExpense[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(COSTING_EXPENSES_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load internal expenses from localStorage", e)
      }
    }
    return INITIAL_INTERNAL_EXPENSES
  })

  const [taxRules] = React.useState<TaxRule[]>(INITIAL_TAX_RULES)

  const [tripCostings, setTripCostings] = React.useState<Record<string, TripCosting>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TRIP_COSTINGS_STORAGE_KEY)
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load trip costings from localStorage", e)
      }
    }

    // Default pre-computed demo costing for TRIP-001
    const trip1Items = INITIAL_COST_ITEMS.filter((ci) => ci.tripId === "TRIP-001")
    const trip1Expenses = INITIAL_INTERNAL_EXPENSES.filter((ie) => ie.tripId === "TRIP-001")
    const initialSummary = computeCostingSummary(
      trip1Items,
      trip1Expenses,
      DEFAULT_PRICING_SETTINGS,
      INITIAL_TAX_RULES
    )

    return {
      "TRIP-001": {
        id: "TC-001",
        tripId: "TRIP-001",
        status: "Calculated",
        settings: DEFAULT_PRICING_SETTINGS,
        summary: initialSummary,
        createdAt: "2026-08-15T10:00:00.000Z",
        updatedAt: "2026-08-22T06:00:00.000Z",
      },
    }
  })

  // ─── Persistence ──────────────────────────────────────────────────────
  React.useEffect(() => {
    try {
      localStorage.setItem(COSTING_ITEMS_STORAGE_KEY, JSON.stringify(costItems))
    } catch (e) {
      console.error(e)
    }
  }, [costItems])

  React.useEffect(() => {
    try {
      localStorage.setItem(COSTING_EXPENSES_STORAGE_KEY, JSON.stringify(internalExpenses))
    } catch (e) {
      console.error(e)
    }
  }, [internalExpenses])

  React.useEffect(() => {
    try {
      localStorage.setItem(TRIP_COSTINGS_STORAGE_KEY, JSON.stringify(tripCostings))
    } catch (e) {
      console.error(e)
    }
  }, [tripCostings])

  // ─── Get Costing For Trip ─────────────────────────────────────────────
  const getCostingForTrip = React.useCallback(
    (tripId: string) => {
      const thisTripItems = costItems.filter((ci) => ci.tripId === tripId)
      const thisTripExpenses = internalExpenses.filter((ie) => ie.tripId === tripId)

      let costing = tripCostings[tripId]

      if (!costing) {
        // Initialize default costing for this trip
        const newSummary = computeCostingSummary(
          thisTripItems,
          thisTripExpenses,
          DEFAULT_PRICING_SETTINGS,
          taxRules
        )
        costing = {
          id: `TC-${tripId}`,
          tripId,
          status: "Draft",
          settings: DEFAULT_PRICING_SETTINGS,
          summary: newSummary,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Recalculate summary live to ensure accurate state
        costing.summary = computeCostingSummary(
          thisTripItems,
          thisTripExpenses,
          costing.settings,
          taxRules
        )
      }

      return {
        costing,
        costItems: thisTripItems,
        internalExpenses: thisTripExpenses,
        summary: costing.summary,
      }
    },
    [costItems, internalExpenses, tripCostings, taxRules]
  )

  // ─── Cost Line Item CRUD ──────────────────────────────────────────────
  const addCostItem = React.useCallback(
    (itemData: Omit<CostItem, "id" | "createdAt" | "updatedAt">) => {
      const costing = tripCostings[itemData.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to add items.")
        throw new Error("Costing is locked.")
      }

      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
      const newItem: CostItem = {
        ...itemData,
        id: `COST-${Date.now()}-${randomSuffix}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setCostItems((prev) => [...prev, newItem])
      toast.success(`Cost item "${newItem.name}" added.`)
      return newItem
    },
    [tripCostings]
  )

  const updateCostItem = React.useCallback(
    (id: string, updates: Partial<CostItem>) => {
      const item = costItems.find((ci) => ci.id === id)
      if (!item) return

      const costing = tripCostings[item.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to edit items.")
        return
      }

      setCostItems((prev) =>
        prev.map((ci) => {
          if (ci.id !== id) return ci
          const updated = { ...ci, ...updates, updatedAt: new Date().toISOString() }
          // If quantity or unitCost changed, auto-recalculate totalCost
          if (updates.quantity !== undefined || updates.unitCost !== undefined || updates.duration !== undefined) {
            const qty = updates.quantity !== undefined ? updates.quantity : ci.quantity
            const uCost = updates.unitCost !== undefined ? updates.unitCost : ci.unitCost
            const dur = updates.duration !== undefined ? updates.duration : (ci.duration || 1)
            updated.totalCost = Math.round(qty * dur * uCost * 100) / 100
          }
          return updated
        })
      )
      toast.success("Cost item updated.")
    },
    [costItems, tripCostings]
  )

  const deleteCostItem = React.useCallback(
    (id: string) => {
      const item = costItems.find((ci) => ci.id === id)
      if (!item) return

      const costing = tripCostings[item.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to remove items.")
        return
      }

      setCostItems((prev) => prev.filter((ci) => ci.id !== id))
      toast.success("Cost item removed.")
    },
    [costItems, tripCostings]
  )

  // ─── Internal Expense CRUD ────────────────────────────────────────────
  const addInternalExpense = React.useCallback(
    (expenseData: Omit<InternalExpense, "id" | "createdAt" | "updatedAt">) => {
      const costing = tripCostings[expenseData.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to add expenses.")
        throw new Error("Costing is locked.")
      }

      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
      const newExpense: InternalExpense = {
        ...expenseData,
        id: `EXP-${Date.now()}-${randomSuffix}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setInternalExpenses((prev) => [...prev, newExpense])
      toast.success(`Expense "${newExpense.name}" added.`)
      return newExpense
    },
    [tripCostings]
  )

  const updateInternalExpense = React.useCallback(
    (id: string, updates: Partial<InternalExpense>) => {
      const exp = internalExpenses.find((ie) => ie.id === id)
      if (!exp) return

      const costing = tripCostings[exp.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to edit expenses.")
        return
      }

      setInternalExpenses((prev) =>
        prev.map((ie) => (ie.id === id ? { ...ie, ...updates, updatedAt: new Date().toISOString() } : ie))
      )
      toast.success("Internal expense updated.")
    },
    [internalExpenses, tripCostings]
  )

  const deleteInternalExpense = React.useCallback(
    (id: string) => {
      const exp = internalExpenses.find((ie) => ie.id === id)
      if (!exp) return

      const costing = tripCostings[exp.tripId]
      if (costing?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to remove expenses.")
        return
      }

      setInternalExpenses((prev) => prev.filter((ie) => ie.id !== id))
      toast.success("Internal expense removed.")
    },
    [internalExpenses, tripCostings]
  )

  // ─── Update Pricing Settings ──────────────────────────────────────────
  const updatePricingSettings = React.useCallback(
    (tripId: string, updates: Partial<PricingSettings>) => {
      const current = tripCostings[tripId]
      if (current?.status === "Locked") {
        toast.error("Costing is locked. Please unlock to edit pricing settings.")
        return
      }

      setTripCostings((prev) => {
        const existing = prev[tripId] || {
          id: `TC-${tripId}`,
          tripId,
          status: "Calculated" as const,
          settings: DEFAULT_PRICING_SETTINGS,
          summary: computeCostingSummary(
            costItems.filter((ci) => ci.tripId === tripId),
            internalExpenses.filter((ie) => ie.tripId === tripId),
            DEFAULT_PRICING_SETTINGS,
            taxRules
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const newSettings = { ...existing.settings, ...updates }
        const newSummary = computeCostingSummary(
          costItems.filter((ci) => ci.tripId === tripId),
          internalExpenses.filter((ie) => ie.tripId === tripId),
          newSettings,
          taxRules
        )

        return {
          ...prev,
          [tripId]: {
            ...existing,
            status: "Calculated",
            settings: newSettings,
            summary: newSummary,
            updatedAt: new Date().toISOString(),
          },
        }
      })
      toast.success("Pricing configuration updated.")
    },
    [costItems, internalExpenses, taxRules, tripCostings]
  )

  const setPricingMode = React.useCallback(
    (tripId: string, mode: "automatic" | "manual", manualPrice?: number) => {
      updatePricingSettings(tripId, {
        pricingMode: mode,
        manualSellingPrice: manualPrice,
      })
    },
    [updatePricingSettings]
  )

  // ─── Lock / Unlock Costing ────────────────────────────────────────────
  const lockCosting = React.useCallback(
    (tripId: string) => {
      setTripCostings((prev) => {
        const existing = prev[tripId]
        if (!existing) return prev
        return {
          ...prev,
          [tripId]: {
            ...existing,
            status: "Locked",
            lockedAt: new Date().toISOString(),
            lockedBy: "Agency Owner",
            updatedAt: new Date().toISOString(),
          },
        }
      })
      toast.success("Costing locked. Financial values are protected from modifications.")
    },
    []
  )

  const unlockCosting = React.useCallback(
    (tripId: string) => {
      setTripCostings((prev) => {
        const existing = prev[tripId]
        if (!existing) return prev
        return {
          ...prev,
          [tripId]: {
            ...existing,
            status: "Calculated",
            lockedAt: undefined,
            lockedBy: undefined,
            updatedAt: new Date().toISOString(),
          },
        }
      })
      toast.info("Costing unlocked. Financial values can now be edited.")
    },
    []
  )

  // ─── Recalculate Trip Costing ─────────────────────────────────────────
  const recalculateTripCosting = React.useCallback(
    (tripId: string) => {
      const existing = tripCostings[tripId]
      if (existing?.status === "Locked") {
        toast.warning("Cannot recalculate a locked costing. Please unlock first.")
        return
      }

      const tripItems = costItems.filter((ci) => ci.tripId === tripId)
      const tripExp = internalExpenses.filter((ie) => ie.tripId === tripId)
      const settings = existing?.settings || DEFAULT_PRICING_SETTINGS

      const newSummary = computeCostingSummary(tripItems, tripExp, settings, taxRules)

      setTripCostings((prev) => ({
        ...prev,
        [tripId]: {
          id: existing?.id || `TC-${tripId}`,
          tripId,
          status: "Calculated",
          settings,
          summary: newSummary,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }))
      toast.success("Trip costing recalculated.")
    },
    [costItems, internalExpenses, taxRules, tripCostings]
  )

  // ─── Sync Phase 4 Selected Services into Costing ──────────────────────
  const syncInventoryServicesToCosting = React.useCallback(
    (
      tripId: string,
      services: {
        hotels: TripHotel[]
        vehicles: TripVehicle[]
        activities: TripActivity[]
      },
      inventoryRates: {
        hotelRates: HotelRate[]
        vehicleRates: VehicleRate[]
        activityRates: ActivityRate[]
      }
    ) => {
      const existingCosting = tripCostings[tripId]
      if (existingCosting?.status === "Locked") {
        // Do not alter locked costing
        return
      }

      setCostItems((prev) => {
        // Preserve all manual / adjustment / internal items and other trips
        const nonInventoryOrOtherTrips = prev.filter(
          (ci) => ci.tripId !== tripId || ci.sourceType !== "Inventory"
        )

        const generatedInventoryItems: CostItem[] = []

        // 1. Map Trip Hotels
        services.hotels.forEach((th) => {
          const snapshot = th.rateSnapshot
          const nights = th.checkIn && th.checkOut
            ? Math.max(1, Math.ceil((new Date(th.checkOut).getTime() - new Date(th.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
            : 1
          const rooms = th.rooms || 1
          const unitRate = snapshot?.baseRate || 5000
          const totalCost = calculateHotelCost(unitRate, rooms, nights)

          generatedInventoryItems.push({
            id: `COST-HOTEL-${th.id}`,
            tripId,
            category: "Hotel",
            name: `${snapshot?.name || "Hotel"} (${snapshot?.roomName || "Standard Room"})`,
            description: `${rooms} Room(s) × ${nights} Night(s) · ${snapshot?.mealPlan || "CPAI"} Plan`,
            supplierId: snapshot?.supplierId,
            supplierName: snapshot?.supplierName,
            serviceType: "Hotel",
            serviceId: th.hotelId,
            rateId: th.rateId,
            quantity: rooms,
            duration: nights,
            unit: "Room/Night",
            unitCost: unitRate,
            totalCost,
            currency: snapshot?.currency || "INR",
            dateFrom: th.checkIn,
            dateTo: th.checkOut,
            sourceType: "Inventory",
            rateSnapshot: snapshot,
            createdAt: th.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })

        // 2. Map Trip Vehicles
        services.vehicles.forEach((tv) => {
          const snapshot = tv.rateSnapshot
          const days = tv.startDate && tv.endDate
            ? Math.max(1, Math.ceil((new Date(tv.endDate).getTime() - new Date(tv.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
            : 1
          const unitRate = snapshot?.baseRate || 4500
          const totalCost = calculateVehicleCost("PerDay", unitRate, days)

          generatedInventoryItems.push({
            id: `COST-VEH-${tv.id}`,
            tripId,
            category: "Transport",
            name: `${snapshot?.name || "Chauffeur Vehicle"} (${snapshot?.vehicleType || "Fleet"})`,
            description: `${days} Day(s) Chauffeur Dedicated Transport Service`,
            supplierId: snapshot?.supplierId,
            supplierName: snapshot?.supplierName,
            serviceType: "Vehicle",
            serviceId: tv.vehicleId,
            rateId: tv.rateId,
            quantity: 1,
            duration: days,
            unit: "Day",
            unitCost: unitRate,
            totalCost,
            currency: snapshot?.currency || "INR",
            dateFrom: tv.startDate,
            dateTo: tv.endDate,
            sourceType: "Inventory",
            rateSnapshot: snapshot,
            createdAt: tv.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })

        // 3. Map Trip Activities
        services.activities.forEach((ta) => {
          const snapshot = ta.rateSnapshot
          const adults = ta.adults || 1
          const children = ta.children || 0
          const unitRate = snapshot?.baseRate || 1000
          const totalCost = calculateActivityCost("PerPerson", { adultRate: unitRate }, adults, children)

          generatedInventoryItems.push({
            id: `COST-ACT-${ta.id}`,
            tripId,
            category: "Activity",
            name: snapshot?.name || "Excursion / Activity",
            description: `${adults} Adult(s)${children > 0 ? `, ${children} Child(ren)` : ""} · Guided Tour`,
            supplierId: snapshot?.supplierId,
            supplierName: snapshot?.supplierName,
            serviceType: "Activity",
            serviceId: ta.activityId,
            rateId: ta.rateId,
            quantity: adults + children,
            duration: 1,
            unit: "Person",
            unitCost: unitRate,
            totalCost,
            currency: snapshot?.currency || "INR",
            dateFrom: ta.date,
            sourceType: "Inventory",
            rateSnapshot: snapshot,
            createdAt: ta.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })

        return [...nonInventoryOrOtherTrips, ...generatedInventoryItems]
      })
    },
    [tripCostings]
  )

  // ─── Refresh Rate Snapshot with New Supplier Rate ─────────────────────
  const refreshRateSnapshot = React.useCallback(
    (costItemId: string, newRate: number, rateDetails?: string) => {
      setCostItems((prev) =>
        prev.map((ci) => {
          if (ci.id !== costItemId) return ci
          const updatedSnapshot = ci.rateSnapshot
            ? { ...ci.rateSnapshot, baseRate: newRate, details: rateDetails || ci.rateSnapshot.details }
            : undefined

          const qty = ci.quantity || 1
          const dur = ci.duration || 1
          const totalCost = Math.round(qty * dur * newRate * 100) / 100

          return {
            ...ci,
            unitCost: newRate,
            totalCost,
            rateSnapshot: updatedSnapshot,
            updatedAt: new Date().toISOString(),
          }
        })
      )
      toast.success("Rate snapshot updated to current supplier rate.")
    },
    []
  )

  return (
    <CostingContext.Provider
      value={{
        costItems,
        internalExpenses,
        taxRules,
        tripCostings,
        getCostingForTrip,
        addCostItem,
        updateCostItem,
        deleteCostItem,
        addInternalExpense,
        updateInternalExpense,
        deleteInternalExpense,
        updatePricingSettings,
        setPricingMode,
        lockCosting,
        unlockCosting,
        recalculateTripCosting,
        syncInventoryServicesToCosting,
        refreshRateSnapshot,
      }}
    >
      {children}
    </CostingContext.Provider>
  )
}

export function useCosting() {
  const context = React.useContext(CostingContext)
  if (!context) {
    throw new Error("useCosting must be used within a CostingProvider")
  }
  return context
}
