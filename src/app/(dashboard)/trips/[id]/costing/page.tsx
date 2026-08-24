"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEnquiry } from "@/context/enquiry-context"
import { useInventory } from "@/context/inventory-context"
import { useCosting } from "@/context/costing-context"
import { CostingSummaryCards } from "@/components/costing/costing-summary-cards"
import { CostBreakdownTable } from "@/components/costing/cost-breakdown-table"
import { PricingControlPanel } from "@/components/costing/pricing-control-panel"
import { AddManualCostModal } from "@/components/costing/add-manual-cost-modal"
import { AddInternalExpenseModal } from "@/components/costing/add-internal-expense-modal"
import { LockCostingModal } from "@/components/costing/lock-costing-modal"
import { RateChangeModal } from "@/components/costing/rate-change-modal"
import { CostItem, InternalExpense } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calculator, Lock, DollarSign, Calendar, Users, Building2 } from "lucide-react"

export default function TripCostingDedicatedPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { trips, customers } = useEnquiry()
  const { suppliers, hotelRates, vehicleRates, activityRates } = useInventory()
  const {
    taxRules,
    getCostingForTrip,
    addCostItem,
    updateCostItem,
    deleteCostItem,
    addInternalExpense,
    updateInternalExpense,
    deleteInternalExpense,
    updatePricingSettings,
    lockCosting,
    unlockCosting,
    recalculateTripCosting,
    refreshRateSnapshot,
  } = useCosting()

  const trip = trips.find((t) => t.id === id)
  const customer = trip ? customers.find((c) => c.id === trip.customerId) : undefined
  const tripCostingData = trip ? getCostingForTrip(trip.id) : null

  // Modal States
  const [isAddManualCostOpen, setIsAddManualCostOpen] = React.useState(false)
  const [editingCostItem, setEditingCostItem] = React.useState<CostItem | null>(null)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false)
  const [editingExpense, setEditingExpense] = React.useState<InternalExpense | null>(null)
  const [isLockModalOpen, setIsLockModalOpen] = React.useState(false)
  const [lockActionType, setLockActionType] = React.useState<"lock" | "unlock">("lock")
  const [rateChangeItem, setRateChangeItem] = React.useState<CostItem | null>(null)
  const [isRateChangeModalOpen, setIsRateChangeModalOpen] = React.useState(false)

  if (!trip || !tripCostingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Trip Not Found</h2>
          <p className="text-xs text-slate-500">The requested trip costing does not exist.</p>
          <Button size="sm" onClick={() => router.push("/trips")}>
            Back to Trips
          </Button>
        </div>
      </div>
    )
  }

  const isLocked = tripCostingData.costing.status === "Locked"

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Back Link */}
        <div>
          <Link
            href={`/trips/${trip.id}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Trip Workspace ({trip.name})</span>
          </Link>
        </div>

        {/* Hero Command Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col gap-5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md">
                  {trip.id} · FINANCIAL COSTING ENGINE
                </span>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Package Costing & Margin Engine
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{trip.name}</span>
                <span>•</span>
                <span>Destination: <b className="text-slate-800">{trip.destination}</b></span>
                <span>•</span>
                <span>Customer: <b className="text-indigo-600">{customer?.name || "Client"}</b></span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl"
              >
                View Itinerary
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
              >
                Open Full Trip Workspace
              </Button>
            </div>
          </div>
        </div>

        {/* 5 Hero Financial KPI Cards */}
        <CostingSummaryCards
          summary={tripCostingData.summary}
          settings={tripCostingData.costing.settings}
          isLocked={isLocked}
        />

        {/* Commercial Pricing & Margin Control Panel */}
        <PricingControlPanel
          settings={tripCostingData.costing.settings}
          summary={tripCostingData.summary}
          taxRules={taxRules}
          isLocked={isLocked}
          onUpdateSettings={(settings) => updatePricingSettings(trip.id, settings)}
          onLockCosting={() => {
            setLockActionType("lock")
            setIsLockModalOpen(true)
          }}
          onUnlockCosting={() => {
            setLockActionType("unlock")
            setIsLockModalOpen(true)
          }}
          onRecalculate={() => recalculateTripCosting(trip.id)}
        />

        {/* Cost Breakdown Table */}
        <CostBreakdownTable
          costItems={tripCostingData.costItems}
          internalExpenses={tripCostingData.internalExpenses}
          isLocked={isLocked}
          onAddManualCost={() => {
            setEditingCostItem(null)
            setIsAddManualCostOpen(true)
          }}
          onAddInternalExpense={() => {
            setEditingExpense(null)
            setIsAddExpenseOpen(true)
          }}
          onEditCostItem={(item) => {
            setEditingCostItem(item)
            setIsAddManualCostOpen(true)
          }}
          onDeleteCostItem={(itemId) => deleteCostItem(itemId)}
          onEditInternalExpense={(exp) => {
            setEditingExpense(exp)
            setIsAddExpenseOpen(true)
          }}
          onDeleteInternalExpense={(expId) => deleteInternalExpense(expId)}
          onRefreshRateCheck={(item) => {
            setRateChangeItem(item)
            setIsRateChangeModalOpen(true)
          }}
        />

        {/* Costing Modals */}
        <AddManualCostModal
          open={isAddManualCostOpen}
          onOpenChange={setIsAddManualCostOpen}
          tripId={trip.id}
          suppliers={suppliers}
          editingItem={editingCostItem}
          onSubmitCost={(data) => addCostItem(data)}
          onUpdateCost={(itemId, updates) => updateCostItem(itemId, updates)}
        />

        <AddInternalExpenseModal
          open={isAddExpenseOpen}
          onOpenChange={setIsAddExpenseOpen}
          tripId={trip.id}
          editingExpense={editingExpense}
          onSubmitExpense={(data) => addInternalExpense(data)}
          onUpdateExpense={(expId, updates) => updateInternalExpense(expId, updates)}
        />

        <LockCostingModal
          open={isLockModalOpen}
          onOpenChange={setIsLockModalOpen}
          actionType={lockActionType}
          onConfirm={() => {
            if (lockActionType === "lock") {
              lockCosting(trip.id)
            } else {
              unlockCosting(trip.id)
            }
          }}
        />

        <RateChangeModal
          open={isRateChangeModalOpen}
          onOpenChange={setIsRateChangeModalOpen}
          costItem={rateChangeItem}
          currentInventoryRate={
            rateChangeItem?.serviceType === "Hotel"
              ? hotelRates.find((hr) => hr.id === rateChangeItem.rateId)?.baseRate || rateChangeItem.unitCost
              : rateChangeItem?.serviceType === "Vehicle"
              ? vehicleRates.find((vr) => vr.id === rateChangeItem.rateId)?.baseRate || rateChangeItem.unitCost
              : rateChangeItem?.serviceType === "Activity"
              ? activityRates.find((ar) => ar.id === rateChangeItem.rateId)?.adultRate || rateChangeItem.unitCost
              : rateChangeItem?.unitCost || 0
          }
          onUpdateRate={(costItemId, newRate) => refreshRateSnapshot(costItemId, newRate)}
        />

      </div>
    </div>
  )
}
