"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { DashboardPreset } from "@/lib/validation/dashboard-schema";
import { Clock } from "lucide-react";
import * as React from "react";

interface DateRangeFilterProps {
  preset: DashboardPreset;
  startDate?: string;
  endDate?: string;
  onPresetChange: (preset: DashboardPreset) => void;
  onCustomRangeChange: (startDate: string, endDate: string) => void;
  loading?: boolean;
}

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeChange,
  loading = false,
}: DateRangeFilterProps) {
  const [showCustomInputs, setShowCustomInputs] = React.useState(preset === "CUSTOM_RANGE");
  const [customStart, setCustomStart] = React.useState(startDate || "");
  const [customEnd, setCustomEnd] = React.useState(endDate || "");

  const handlePresetSelect = (val: string | null) => {
    if (!val) return;
    const selected = val as DashboardPreset;
    if (selected === "CUSTOM_RANGE") {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
      onPresetChange(selected);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onCustomRangeChange(customStart, customEnd);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs max-w-full min-w-0">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold shrink-0 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
        <span>Time Horizon:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
        {/* Fast Preset Buttons for Wide Desktop */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
          {[
            { id: "TODAY", label: "Today" },
            { id: "THIS_WEEK", label: "This Week" },
            { id: "THIS_MONTH", label: "This Month" },
            { id: "LAST_MONTH", label: "Last Month" },
            { id: "THIS_QUARTER", label: "Quarter" },
            { id: "THIS_YEAR", label: "Year" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setShowCustomInputs(false);
                onPresetChange(p.id as DashboardPreset);
              }}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                preset === p.id && !showCustomInputs
                  ? "bg-white text-indigo-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustomInputs(!showCustomInputs)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              showCustomInputs
                ? "bg-white text-indigo-700 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            Custom...
          </button>
        </div>

        {/* Dropdown for Mobile / Tablet / Compact Laptop */}
        <div className="xl:hidden w-full sm:w-[190px]">
          <Select value={preset} onValueChange={handlePresetSelect} disabled={loading}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="THIS_WEEK">This Week</SelectItem>
              <SelectItem value="THIS_MONTH">This Month</SelectItem>
              <SelectItem value="LAST_MONTH">Last Month</SelectItem>
              <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
              <SelectItem value="THIS_YEAR">This Year</SelectItem>
              <SelectItem value="CUSTOM_RANGE">Custom Range...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Range Inputs */}
        {showCustomInputs && (
          <form onSubmit={handleApplyCustom} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 text-xs flex-1 sm:w-[130px] min-w-[110px] bg-slate-50 border-slate-200"
              required
            />
            <span className="text-slate-400 text-xs shrink-0">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 text-xs flex-1 sm:w-[130px] min-w-[110px] bg-slate-50 border-slate-200"
              required
            />
            <Button size="sm" type="submit" disabled={loading} className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0">
              Apply
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
