"use client"

import * as React from "react"
import {
  PricingSettings,
  CostingSummary,
  TaxRule,
} from "@/types"
import {
  formatCurrency,
  evaluateMarginHealth,
} from "@/lib/costing-engine"
import {
  Percent,
  DollarSign,
  Tag,
  Receipt,
  Settings2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calculator,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PricingControlPanelProps {
  settings: PricingSettings
  summary: CostingSummary
  taxRules: TaxRule[]
  isLocked?: boolean
  onUpdateSettings: (settings: Partial<PricingSettings>) => void
  onLockCosting: () => void
  onUnlockCosting: () => void
  onRecalculate: () => void
}

export function PricingControlPanel({
  settings,
  summary,
  taxRules,
  isLocked = false,
  onUpdateSettings,
  onLockCosting,
  onUnlockCosting,
  onRecalculate,
}: PricingControlPanelProps) {
  const marginHealth = evaluateMarginHealth(
    summary.marginPercent,
    summary.sellingPrice,
    summary.totalCost,
    settings.lowMarginThreshold
  )

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header & Lock State */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calculator className="h-5 w-5 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Pricing Engine & Commercial Margins
              </h3>
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure agency markups, customer discounts, tax treatment and selling price overrides.
            </p>
          </div>
        </div>

        {/* Lock / Recalculate Controls */}
        <div className="flex items-center gap-2">
          {!isLocked ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculate}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Recalculate
              </Button>
              <Button
                size="sm"
                onClick={onLockCosting}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl cursor-pointer shadow-xs"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Lock Costing
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnlockCosting}
              className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700 text-xs font-semibold h-8.5 px-3.5 rounded-xl cursor-pointer shadow-2xs"
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
              Unlock Costing
            </Button>
          )}
        </div>
      </div>

      {/* Grid: 3 Pricing Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Markup Configuration */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-indigo-600" />
              Agency Markup
            </span>
            <span className="text-[11px] font-extrabold text-indigo-600">
              +{formatCurrency(summary.markupAmount)}
            </span>
          </div>

          {/* Markup Type Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSettings({ markupType: "percentage" })}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                settings.markupType === "percentage"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSettings({ markupType: "fixed" })}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                settings.markupType === "fixed"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fixed Amount (₹)
            </button>
          </div>

          {/* Markup Value Input */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">
              {settings.markupType === "percentage" ? "Markup Percentage" : "Fixed Markup Amount"}
            </Label>
            <div className="relative">
              <Input
                type="number"
                disabled={isLocked}
                min={0}
                value={settings.markupValue}
                onChange={(e) => onUpdateSettings({ markupValue: Number(e.target.value) || 0 })}
                className="bg-white border-slate-200 h-9 text-xs font-semibold focus-visible:ring-indigo-500"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                {settings.markupType === "percentage" ? "%" : "INR"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {settings.markupType === "percentage"
                ? `Adds ${settings.markupValue}% on Total Cost (${formatCurrency(summary.totalCost)})`
                : "Adds fixed profit buffer to total package"}
            </p>
          </div>
        </div>

        {/* Column 2: Discounts & Taxes */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-amber-600" />
              Discount & Tax
            </span>
            <span className="text-[11px] font-extrabold text-amber-700">
              -{formatCurrency(summary.discountAmount)}
            </span>
          </div>

          {/* Discount Mode */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>Customer Discount</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onUpdateSettings({ discountType: "fixed" })}
                  className={`text-[10px] cursor-pointer ${settings.discountType === "fixed" ? "font-bold text-indigo-600 underline" : "text-slate-400"}`}
                >
                  Fixed (₹)
                </button>
                <span>•</span>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onUpdateSettings({ discountType: "percentage" })}
                  className={`text-[10px] cursor-pointer ${settings.discountType === "percentage" ? "font-bold text-indigo-600 underline" : "text-slate-400"}`}
                >
                  Percentage (%)
                </button>
              </div>
            </div>

            <Input
              type="number"
              disabled={isLocked}
              min={0}
              placeholder="0"
              value={settings.discountValue || ""}
              onChange={(e) => onUpdateSettings({ discountValue: Number(e.target.value) || 0 })}
              className="bg-white border-slate-200 h-9 text-xs font-semibold"
            />
          </div>

          {/* Tax Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>GST / Tax Rule</span>
              <span className="text-indigo-600">+{formatCurrency(summary.taxAmount)}</span>
            </div>

            <select
              disabled={isLocked}
              value={settings.taxRuleId || "TAX-ZERO"}
              onChange={(e) => onUpdateSettings({ taxRuleId: e.target.value })}
              className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-2.5 font-medium text-slate-800 cursor-pointer focus:outline-none"
            >
              {taxRules.map((tax) => (
                <option key={tax.id} value={tax.id}>
                  {tax.name} ({tax.rate}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Column 3: Pricing Mode & Selling Price Override */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Final Selling Price
            </span>
            <span className="text-[11px] font-extrabold text-slate-900">
              {formatCurrency(summary.sellingPrice)}
            </span>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white border border-slate-200 rounded-lg">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSettings({ pricingMode: "automatic" })}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                settings.pricingMode === "automatic"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Automatic Price
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSettings({ pricingMode: "manual" })}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                settings.pricingMode === "manual"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Manual Override
            </button>
          </div>

          {/* If manual mode, show custom input */}
          {settings.pricingMode === "manual" ? (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <Label className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                <span>Customer Quoted Price (Override)</span>
                <span className="text-[10px] text-amber-600 font-normal">Auto: {formatCurrency(summary.calculatedSellingPrice)}</span>
              </Label>
              <Input
                type="number"
                disabled={isLocked}
                min={0}
                value={settings.manualSellingPrice || ""}
                onChange={(e) => onUpdateSettings({ manualSellingPrice: Number(e.target.value) || 0 })}
                className="bg-white border-amber-300 focus-visible:ring-amber-500 h-9 text-xs font-bold text-slate-900"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Calculated Selling Price:</span>
                <span className="font-bold text-slate-800">{formatCurrency(summary.calculatedSellingPrice)}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Formula: Total Cost + Markup − Discount + Tax
              </div>
            </div>
          )}

          {/* Rounding & Threshold Controls */}
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Min Margin</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  disabled={isLocked}
                  min={0}
                  max={100}
                  value={settings.lowMarginThreshold}
                  onChange={(e) => onUpdateSettings({ lowMarginThreshold: Number(e.target.value) || 10 })}
                  className="w-12 h-6 text-center text-xs font-bold bg-white border border-slate-200 rounded"
                />
                <span className="text-slate-400 text-[10px]">%</span>
              </div>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Rounding</span>
              <select
                disabled={isLocked}
                value={settings.roundPriceTo || 0}
                onChange={(e) => onUpdateSettings({ roundPriceTo: Number(e.target.value) || 0 })}
                className="h-6 text-[11px] bg-white border border-slate-200 rounded px-1.5 font-semibold text-slate-700 cursor-pointer"
              >
                <option value={0}>Exact</option>
                <option value={100}>Nearest ₹100</option>
                <option value={500}>Nearest ₹500</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* Financial Pipeline Flow Strip */}
      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Supplier:</span>
          <span className="font-bold text-slate-800">{formatCurrency(summary.supplierCost)}</span>
        </div>
        <span className="text-slate-300">+</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Overheads:</span>
          <span className="font-bold text-slate-800">{formatCurrency(summary.internalExpense)}</span>
        </div>
        <span className="text-slate-300">+</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Markup:</span>
          <span className="font-bold text-indigo-600">+{formatCurrency(summary.markupAmount)}</span>
        </div>
        <span className="text-slate-300">−</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Discount:</span>
          <span className="font-bold text-amber-700">−{formatCurrency(summary.discountAmount)}</span>
        </div>
        <span className="text-slate-300">+</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Tax:</span>
          <span className="font-bold text-slate-800">+{formatCurrency(summary.taxAmount)}</span>
        </div>
        <span className="text-slate-300">=</span>
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-900">
          <span>Final Price:</span>
          <span className="text-indigo-600 font-extrabold">{formatCurrency(summary.sellingPrice)}</span>
        </div>
      </div>
    </div>
  )
}
