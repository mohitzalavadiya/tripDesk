"use client"

import * as React from "react"
import { TrendingUp, FileDown, Calendar } from "lucide-react"
import { mockRevenueOverview } from "@/data/demo"

export function RevenueChart() {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null)
  
  const maxAmount = Math.max(...mockRevenueOverview.map((d) => d.amount))
  const yAxisTicks = [500000, 375000, 250000, 125000, 0]

  const formatRupees = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`
    }
    return `₹${val.toLocaleString("en-IN")}`
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Revenue Overview
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly bookings value comparison
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last 6 Months</span>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-foreground cursor-pointer transition-colors"
            title="Export Report"
          >
            <FileDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end mt-4">
        <div className="relative w-full h-[180px] flex">
          {/* Y-Axis Label Ticks */}
          <div className="w-12 h-full flex flex-col justify-between text-[10px] text-muted-foreground pr-2 text-right select-none">
            {yAxisTicks.map((tick) => (
              <span key={tick}>{formatRupees(tick)}</span>
            ))}
          </div>

          {/* SVG Canvas Area */}
          <div className="flex-1 h-full relative border-l border-b border-slate-100">
            {/* Grid Line Marks */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none">
              {yAxisTicks.map((tick, i) => (
                <div 
                  key={tick} 
                  className={`w-full border-t border-dashed border-slate-100/80 ${i === yAxisTicks.length - 1 ? "border-t-0" : ""}`}
                  style={{ height: "1px" }}
                />
              ))}
            </div>

            {/* Bars and Values */}
            <div className="absolute inset-0 flex items-end justify-around px-2 pt-4">
              {mockRevenueOverview.map((item, idx) => {
                const heightPercent = (item.amount / maxAmount) * 100
                const isHovered = hoveredIdx === idx

                return (
                  <div
                    key={item.month}
                    className="flex flex-col items-center flex-1 max-w-[48px] h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Tooltip dialog overlay */}
                    {isHovered && (
                      <div className="absolute bottom-[calc(heightPercent+8px)] left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg pointer-events-none z-10 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                        <div className="font-semibold">{item.month}</div>
                        <div>{formatRupees(item.amount)}</div>
                      </div>
                    )}

                    {/* Main Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered 
                          ? "bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.3)]" 
                          : "bg-indigo-600/85 hover:bg-indigo-600"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* X-Axis labels */}
        <div className="flex pl-12 pt-2 justify-around text-[10px] text-muted-foreground font-medium select-none">
          {mockRevenueOverview.map((item, idx) => (
            <span 
              key={item.month} 
              className={`flex-1 text-center max-w-[48px] transition-colors ${hoveredIdx === idx ? "text-indigo-600 font-semibold" : ""}`}
            >
              {item.month.substring(0, 3)}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-50 pt-3 mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-sm">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>+16% growth</span>
        </div>
        <span className="text-muted-foreground">Average monthly: ₹3.88L</span>
      </div>
    </div>
  )
}
