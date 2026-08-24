"use client"

import * as React from "react"
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Percent,
} from "lucide-react"
import { CostingSummary, PricingSettings } from "@/types"
import { formatCurrency, evaluateMarginHealth } from "@/lib/costing-engine"

interface CostingSummaryCardsProps {
  summary: CostingSummary
  settings: PricingSettings
  isLocked?: boolean
}

export function CostingSummaryCards({
  summary,
  settings,
  isLocked = false,
}: CostingSummaryCardsProps) {
  const marginHealth = evaluateMarginHealth(
    summary.marginPercent,
    summary.sellingPrice,
    summary.totalCost,
    settings.lowMarginThreshold
  )

  return (
    <div className="space-y-4">
      {/* Prominent Health / Loss Alert Banner if Warning exists */}
      {marginHealth.isWarning && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border animate-in fade-in duration-200 ${
            marginHealth.isLoss
              ? "bg-rose-50/90 border-rose-200 text-rose-900"
              : "bg-amber-50/90 border-amber-200 text-amber-900"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            <AlertTriangle
              className={`h-5 w-5 ${
                marginHealth.isLoss ? "text-rose-600 animate-pulse" : "text-amber-600"
              }`}
            />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold flex items-center gap-2">
              <span>{marginHealth.label}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  marginHealth.isLoss
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}
              >
                {summary.marginPercent.toFixed(2)}% Margin
              </span>
            </div>
            <p className="mt-0.5 leading-relaxed font-medium">{marginHealth.message}</p>
          </div>
        </div>
      )}

      {/* 5 Financial Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Supplier Net Cost */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
              Supplier Cost
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Contract
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(summary.supplierCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Net B2B Services Payable
            </div>
          </div>
        </div>

        {/* Card 2: Total Internal Cost */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Total Cost
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
              Base Cost
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(summary.totalCost)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>+ {formatCurrency(summary.internalExpense)} Overheads</span>
            </div>
          </div>
        </div>

        {/* Card 3: Customer Selling Price */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4.5 shadow-xs relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 pointer-events-none" />

          <div className="flex items-center justify-between z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-indigo-400" />
              Selling Price
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                settings.pricingMode === "manual"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-indigo-700 text-indigo-100"
              }`}
            >
              {settings.pricingMode === "manual" ? "Manual Override" : "Calculated"}
            </span>
          </div>

          <div className="mt-3 z-10">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formatCurrency(summary.sellingPrice)}
            </div>
            <div className="text-[11px] text-indigo-200 mt-0.5">
              Customer Package Quoted Price
            </div>
          </div>
        </div>

        {/* Card 4: Gross Profit */}
        <div
          className={`bg-white border rounded-2xl p-4.5 shadow-2xs relative overflow-hidden flex flex-col justify-between ${
            summary.grossProfit < 0
              ? "border-rose-200 bg-rose-50/20"
              : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Gross Profit
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                summary.grossProfit < 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {summary.grossProfit < 0 ? "Loss" : `+${summary.markupPercent.toFixed(1)}% Markup`}
            </span>
          </div>

          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                summary.grossProfit < 0 ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {formatCurrency(summary.grossProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Price − Total Internal Cost
            </div>
          </div>
        </div>

        {/* Card 5: Profit Margin % */}
        <div
          className={`bg-white border rounded-2xl p-4.5 shadow-2xs relative overflow-hidden flex flex-col justify-between ${
            marginHealth.isLoss
              ? "border-rose-200 bg-rose-50/30"
              : marginHealth.isWarning
              ? "border-amber-200 bg-amber-50/30"
              : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-purple-600" />
              Profit Margin
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${marginHealth.badgeClass}`}>
              {marginHealth.status}
            </span>
          </div>

          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                marginHealth.isLoss
                  ? "text-rose-600"
                  : marginHealth.isWarning
                  ? "text-amber-800"
                  : "text-slate-900"
              }`}
            >
              {summary.marginPercent.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Target: {settings.lowMarginThreshold}% minimum
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
