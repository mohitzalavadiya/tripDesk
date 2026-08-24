"use client"

import * as React from "react"
import Link from "next/link"
import {
  CostItem,
  InternalExpense,
  CostCategory,
  RateSnapshot,
} from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import {
  Hotel,
  Car,
  Ticket,
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  RefreshCw,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface CostBreakdownTableProps {
  costItems: CostItem[]
  internalExpenses: InternalExpense[]
  isLocked?: boolean
  onAddManualCost: () => void
  onAddInternalExpense: () => void
  onEditCostItem: (item: CostItem) => void
  onDeleteCostItem: (id: string) => void
  onEditInternalExpense: (expense: InternalExpense) => void
  onDeleteInternalExpense: (id: string) => void
  onRefreshRateCheck?: (item: CostItem) => void
}

export function CostBreakdownTable({
  costItems,
  internalExpenses,
  isLocked = false,
  onAddManualCost,
  onAddInternalExpense,
  onEditCostItem,
  onDeleteCostItem,
  onEditInternalExpense,
  onDeleteInternalExpense,
  onRefreshRateCheck,
}: CostBreakdownTableProps) {
  const [filterCategory, setFilterCategory] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<"default" | "high-to-low" | "low-to-high">("default")

  // Filter cost items
  const filteredCostItems = React.useMemo(() => {
    return costItems.filter((item) => {
      // Category Filter
      if (filterCategory !== "all") {
        if (filterCategory === "hotels" && item.category !== "Hotel") return false
        if (filterCategory === "transport" && item.category !== "Transport" && item.category !== "Driver") return false
        if (filterCategory === "activities" && item.category !== "Activity") return false
        if (filterCategory === "other" && ["Hotel", "Transport", "Driver", "Activity"].includes(item.category)) return false
        if (filterCategory === "internal") return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchCategory = item.category.toLowerCase().includes(q)
        const matchSupplier = (item.supplierName || "").toLowerCase().includes(q)
        const matchDesc = (item.description || "").toLowerCase().includes(q)
        if (!matchName && !matchCategory && !matchSupplier && !matchDesc) return false
      }

      return true
    })
  }, [costItems, filterCategory, searchQuery])

  // Filter internal expenses
  const filteredInternalExpenses = React.useMemo(() => {
    if (filterCategory !== "all" && filterCategory !== "internal" && filterCategory !== "other") {
      return []
    }

    return internalExpenses.filter((exp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = exp.name.toLowerCase().includes(q)
        const matchCategory = exp.category.toLowerCase().includes(q)
        const matchNotes = (exp.notes || "").toLowerCase().includes(q)
        if (!matchName && !matchCategory && !matchNotes) return false
      }
      return true
    })
  }, [internalExpenses, filterCategory, searchQuery])

  // Sort cost items
  const sortedCostItems = React.useMemo(() => {
    const list = [...filteredCostItems]
    if (sortBy === "high-to-low") {
      return list.sort((a, b) => b.totalCost - a.totalCost)
    }
    if (sortBy === "low-to-high") {
      return list.sort((a, b) => a.totalCost - b.totalCost)
    }
    return list
  }, [filteredCostItems, sortBy])

  const totalSupplierSum = React.useMemo(() => {
    return filteredCostItems.reduce((acc, curr) => acc + curr.totalCost, 0)
  }, [filteredCostItems])

  const totalExpenseSum = React.useMemo(() => {
    return filteredInternalExpenses.reduce((acc, curr) => acc + curr.amount, 0)
  }, [filteredInternalExpenses])

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Hotel":
        return <Hotel className="h-3.5 w-3.5 text-amber-600" />
      case "Transport":
      case "Transfer":
      case "Driver":
        return <Car className="h-3.5 w-3.5 text-blue-600" />
      case "Activity":
      case "Entry Ticket":
        return <Ticket className="h-3.5 w-3.5 text-emerald-600" />
      default:
        return <Layers className="h-3.5 w-3.5 text-purple-600" />
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "Inventory":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            <FileSpreadsheet className="h-2.5 w-2.5" />
            Inventory
          </span>
        )
      case "Manual":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Manual
          </span>
        )
      case "Adjustment":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Adjustment
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {source}
          </span>
        )
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Cost Breakdown & Inventory Tariffs</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {costItems.length + internalExpenses.length} Items
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent breakdown of supplier B2B rates and internal agency overheads.
          </p>
        </div>

        {!isLocked && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddInternalExpense}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 px-3 rounded-xl cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Add Expense
            </Button>

            <Button
              size="sm"
              onClick={onAddManualCost}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-3.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Cost Line
            </Button>
          </div>
        )}
      </div>

      {/* Filter Chips & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "All Items", count: costItems.length + internalExpenses.length },
            { id: "hotels", label: "Hotels", count: costItems.filter((c) => c.category === "Hotel").length },
            { id: "transport", label: "Transport", count: costItems.filter((c) => ["Transport", "Driver", "Transfer"].includes(c.category)).length },
            { id: "activities", label: "Activities", count: costItems.filter((c) => c.category === "Activity").length },
            { id: "other", label: "Other / Toll / Fees", count: costItems.filter((c) => !["Hotel", "Transport", "Driver", "Activity"].includes(c.category)).length },
            { id: "internal", label: "Internal Expenses", count: internalExpenses.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                filterCategory === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  filterCategory === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Input */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search service, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8.5 text-xs bg-slate-50/60 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl px-2.5 font-medium text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value="default">Sort: Default</option>
            <option value="high-to-low">Highest Cost</option>
            <option value="low-to-high">Lowest Cost</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider select-none">
              <tr>
                <th className="py-3 px-4">Category & Service</th>
                <th className="py-3 px-4">Supplier / Partner</th>
                <th className="py-3 px-4">Unit Rate</th>
                <th className="py-3 px-4">Calculation / Units</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-center">Source</th>
                {!isLocked && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {/* Supplier Cost Items */}
              {sortedCostItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Category & Service */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{item.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.category}
                          </span>
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.description}
                          </div>
                        )}
                        {item.dateFrom && (
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            <span>
                              {item.dateFrom}
                              {item.dateTo ? ` → ${item.dateTo}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-3.5 px-4">
                    {item.supplierName ? (
                      <div className="text-slate-800 font-semibold">
                        {item.supplierId ? (
                          <Link
                            href={`/suppliers/${item.supplierId}`}
                            className="text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Building2 className="h-3 w-3 text-indigo-400" />
                            <span>{item.supplierName}</span>
                          </Link>
                        ) : (
                          item.supplierName
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Direct / In-house</span>
                    )}
                    {item.rateSnapshot?.rateSheetName && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.rateSnapshot.rateSheetName}
                      </div>
                    )}
                  </td>

                  {/* Unit Rate */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      {formatCurrency(item.unitCost, item.currency)}
                    </div>
                    {item.unit && (
                      <div className="text-[10px] text-slate-400">
                        / {item.unit}
                      </div>
                    )}
                  </td>

                  {/* Calculation / Units */}
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {item.duration && item.duration > 1 ? (
                      <div>
                        {item.quantity} {item.unit || "unit(s)"} × {item.duration} {item.category === "Hotel" ? "nights" : "days"}
                      </div>
                    ) : (
                      <div>
                        {item.quantity} {item.unit || "unit(s)"}
                      </div>
                    )}
                  </td>

                  {/* Total Cost */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {formatCurrency(item.totalCost, item.currency)}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="py-3.5 px-4 text-center">
                    {getSourceBadge(item.sourceType)}
                  </td>

                  {/* Actions */}
                  {!isLocked && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.sourceType === "Manual" && (
                          <button
                            onClick={() => onEditCostItem(item)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit manual item"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteCostItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Remove cost line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* Internal Expenses */}
              {filteredInternalExpenses.map((exp) => (
                <tr key={exp.id} className="bg-purple-50/20 hover:bg-purple-50/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Layers className="h-3.5 w-3.5 text-purple-700" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{exp.name}</span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-1.5 py-0.2 rounded">
                            {exp.category}
                          </span>
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {exp.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 italic">
                    Agency Internal Expense
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {formatCurrency(exp.amount, exp.currency)}
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    Internal Overhead
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="font-extrabold text-purple-900 text-sm">
                      {formatCurrency(exp.amount, exp.currency)}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                      Internal
                    </span>
                  </td>

                  {!isLocked && (
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditInternalExpense(exp)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Edit expense"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteInternalExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Remove expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty state if nothing matches filter */}
              {sortedCostItems.length === 0 && filteredInternalExpenses.length === 0 && (
                <tr>
                  <td colSpan={isLocked ? 6 : 7} className="py-8 text-center text-xs text-slate-400">
                    No cost items match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer */}
            <tfoot className="bg-slate-50/90 border-t border-slate-200 font-bold text-xs text-slate-800">
              <tr>
                <td colSpan={4} className="py-3 px-4">
                  <span>Aggregated Total Cost (Supplier + Internal Expenses):</span>
                </td>
                <td className="py-3 px-4 text-right text-sm text-slate-900 font-black">
                  {formatCurrency(totalSupplierSum + totalExpenseSum)}
                </td>
                <td colSpan={isLocked ? 1 : 2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
