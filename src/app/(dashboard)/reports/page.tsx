"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Building2,
  IndianRupee,
  Phone,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { reportingClient } from "@/lib/api-client/reporting-client";
import {
  AgencyBIReportResult,
  ReportExecutiveKPIs,
} from "@/lib/services/reporting-service";
import { ReportPreset, ReportType } from "@/lib/validation/reporting-schema";
import { toast } from "sonner";

export default function ReportsPage() {
  const [reportData, setReportData] = React.useState<AgencyBIReportResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<
    "OVERVIEW" | "REVENUE" | "CRM" | "DESTINATIONS" | "RECEIVABLES" | "PAYABLES" | "CUSTOMERS"
  >("OVERVIEW");

  // Date Filter State
  const [preset, setPreset] = React.useState<ReportPreset>("THIS_MONTH");
  const [showCustomInputs, setShowCustomInputs] = React.useState(false);
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");

  // Search filter for tables
  const [tableSearch, setTableSearch] = React.useState("");

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportingClient.getReport({
        preset,
        startDate: preset === "CUSTOM_RANGE" ? customStart : undefined,
        endDate: preset === "CUSTOM_RANGE" ? customEnd : undefined,
      });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePresetSelect = (val: string | null) => {
    if (!val) return;
    const selected = val as ReportPreset;
    if (selected === "CUSTOM_RANGE") {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
      setPreset(selected);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      setPreset("CUSTOM_RANGE");
      fetchReport();
    }
  };

  const kpis = reportData?.kpis;

  // Compute graph scale
  const timeSeries = reportData?.revenueTrend || [];
  const rawMax = Math.max(
    ...timeSeries.map((d) => Math.max(d.collectedAmount, d.bookingValue, d.grossProfit)),
    100000
  );
  const maxAmount = Math.ceil(rawMax / 100000) * 100000;
  const yAxisTicks = [
    maxAmount,
    Math.round(maxAmount * 0.75),
    Math.round(maxAmount * 0.5),
    Math.round(maxAmount * 0.25),
    0,
  ];

  const formatShortRupees = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 pb-24">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ─── PAGE HEADER & EXPORT ACTIONS ─────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Agency BI & Accounting Reports
              </h1>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                PostgreSQL Live
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time executive telemetry, sales conversion, profit margins, receivables, and vendor liabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReport()}
              disabled={loading}
              className="h-9 text-xs font-bold gap-1.5 cursor-pointer bg-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>

            {/* Export CSV Dropdown */}
            <Select
              onValueChange={(val) => {
                if (val) {
                  window.open(
                    reportingClient.getExportUrl(
                      {
                        preset,
                        startDate: preset === "CUSTOM_RANGE" ? customStart : undefined,
                        endDate: preset === "CUSTOM_RANGE" ? customEnd : undefined,
                      },
                      val as ReportType
                    ),
                    "_blank"
                  );
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs font-bold bg-white border-slate-300 w-[140px]">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                <SelectValue placeholder="Export CSV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OVERVIEW">Overview CSV</SelectItem>
                <SelectItem value="RECEIVABLES">Receivables CSV</SelectItem>
                <SelectItem value="PAYABLES">Payables CSV</SelectItem>
                <SelectItem value="DESTINATIONS">Destinations CSV</SelectItem>
              </SelectContent>
            </Select>

            {/* Export PDF Button */}
            <a
              href={reportingClient.getPdfUrl({
                preset,
                startDate: preset === "CUSTOM_RANGE" ? customStart : undefined,
                endDate: preset === "CUSTOM_RANGE" ? customEnd : undefined,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors gap-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" /> Export PDF
            </a>
          </div>
        </div>

        {/* ─── TIME HORIZON DATE FILTER ───────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-bold shrink-0">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span>Time Horizon:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
              {[
                { id: "TODAY", label: "Today" },
                { id: "THIS_WEEK", label: "This Week" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "LAST_MONTH", label: "Last Month" },
                { id: "THIS_QUARTER", label: "Quarter" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "ALL_TIME", label: "All Time" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setShowCustomInputs(false);
                    setPreset(p.id as ReportPreset);
                  }}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    preset === p.id && !showCustomInputs
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomInputs(!showCustomInputs)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showCustomInputs
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Custom...
              </button>
            </div>

            {/* Mobile Dropdown */}
            <div className="sm:hidden w-full">
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
                  <SelectItem value="ALL_TIME">All Time</SelectItem>
                  <SelectItem value="CUSTOM_RANGE">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Range Inputs */}
            {showCustomInputs && (
              <form onSubmit={handleApplyCustom} className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs w-[135px] bg-slate-50 border-slate-200"
                  required
                />
                <span className="text-slate-400 text-xs">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs w-[135px] bg-slate-50 border-slate-200"
                  required
                />
                <Button size="sm" type="submit" disabled={loading} className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 font-bold">
                  Apply
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* ─── 6 EXECUTIVE SUMMARY KPI SCORECARDS ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Gross Booking Value (GBV) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Bookings</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : formatCurrency(kpis?.grossBookingValue || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {kpis?.confirmedBookings || 0} confirmed bookings
            </p>
          </div>

          {/* 2. Collections Received */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Collections</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
              {loading ? "..." : formatCurrency(kpis?.amountCollected || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Actual net payments</p>
          </div>

          {/* 3. Outstanding Receivables */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Receivables</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
              {loading ? "..." : formatCurrency(kpis?.outstandingReceivables || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Pending customer balances</p>
          </div>

          {/* 4. Gross Profit & Margin */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Profit</span>
              <PieChart className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
              {loading ? "..." : formatCurrency(kpis?.grossProfit || 0)}
            </p>
            <p className="text-[11px] text-purple-600 font-semibold">
              {kpis?.grossMarginPercent || 0}% profit margin
            </p>
          </div>

          {/* 5. Supplier Payables */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Payables</span>
              <Building2 className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
              {loading ? "..." : formatCurrency(kpis?.supplierOutstanding || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              of {formatCurrency(kpis?.supplierPayables || 0)} total
            </p>
          </div>

          {/* 6. CRM Conversion Rate */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Conversion</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-700 tracking-tight">
              {loading ? "..." : `${kpis?.enquiryConversionRate || 0}%`}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {kpis?.wonEnquiries || 0} won of {kpis?.totalEnquiries || 0} leads
            </p>
          </div>
        </div>

        {/* ─── TAB NAVIGATION BAR ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
          {[
            { id: "OVERVIEW", label: "Executive Overview", icon: Layers },
            { id: "REVENUE", label: "Revenue & Profit", icon: TrendingUp },
            { id: "CRM", label: "CRM & Funnel", icon: Users },
            { id: "DESTINATIONS", label: "Destinations", icon: MapPin },
            { id: "RECEIVABLES", label: "Customer Receivables", icon: CreditCard },
            { id: "PAYABLES", label: "Supplier Payables", icon: Building2 },
            { id: "CUSTOMERS", label: "Customer Retention", icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: EXECUTIVE OVERVIEW ─────────────────────────────────── */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Visual Canvas: Revenue & Collections Trend */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span>Revenue, Collections & Profit Trajectory</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gross booking volume, real customer cash collections, and estimated gross profit.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-indigo-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Bookings
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Collections
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Profit
                  </div>
                </div>
              </div>

              {/* Chart Canvas */}
              {timeSeries.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                  No transaction records found for this period.
                </div>
              ) : (
                <div className="relative w-full h-[220px] flex pt-2">
                  <div className="w-14 h-full flex flex-col justify-between text-[10px] text-slate-400 pr-2 text-right font-mono select-none">
                    {yAxisTicks.map((t) => (
                      <span key={t}>{formatShortRupees(t)}</span>
                    ))}
                  </div>
                  <div className="flex-1 h-full relative border-l border-b border-slate-100">
                    <div className="absolute inset-0 flex items-end justify-around px-1 pt-4">
                      {timeSeries.map((point) => {
                        const bH = maxAmount > 0 ? (point.bookingValue / maxAmount) * 100 : 0;
                        const cH = maxAmount > 0 ? (point.collectedAmount / maxAmount) * 100 : 0;
                        const pH = maxAmount > 0 ? (point.grossProfit / maxAmount) * 100 : 0;

                        return (
                          <div
                            key={point.label}
                            className="relative flex flex-col items-center h-full justify-end group px-1 flex-1 max-w-[55px] cursor-pointer"
                          >
                            <div className="flex items-end gap-1 w-full justify-center">
                              <div
                                className="w-2.5 bg-indigo-500 rounded-t-sm transition-all duration-300 group-hover:bg-indigo-600"
                                style={{ height: `${Math.max(4, bH)}%` }}
                              />
                              <div
                                className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-600"
                                style={{ height: `${Math.max(4, cH)}%` }}
                              />
                              <div
                                className="w-2.5 bg-purple-500 rounded-t-sm transition-all duration-300 group-hover:bg-purple-600"
                                style={{ height: `${Math.max(4, pH)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold mt-2 truncate w-full text-center">
                              {point.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2-Column Section: CRM Funnel & Top Destinations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CRM Funnel */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span>CRM Lead Conversion Pipeline</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Pipeline: {formatCurrency(kpis?.pipelineValue || 0)}
                  </span>
                </div>

                <div className="space-y-3">
                  {(reportData?.salesFunnel || []).map((stage) => (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{stage.label}</span>
                        <span>
                          {stage.count} leads ({stage.conversionPercent}%) • {formatCurrency(stage.value)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                          style={{ width: `${Math.max(4, Math.min(100, stage.conversionPercent))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Destinations */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>Top Demand Destinations</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Ranked by revenue</span>
                </div>

                <div className="space-y-2.5">
                  {(reportData?.destinations || []).slice(0, 5).map((dest, i) => (
                    <div
                      key={dest.destination}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{dest.destination}</p>
                          <p className="text-[11px] text-slate-500">
                            {dest.tripsCount} trips • {dest.bookingsCount} bookings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatCurrency(dest.revenue)}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold">
                          {dest.marginPercent}% margin
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: REVENUE & PROFIT ───────────────────────────────────── */}
        {activeTab === "REVENUE" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Revenue & Collections Periodic Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Time Period</th>
                    <th className="px-4 py-3">Bookings Count</th>
                    <th className="px-4 py-3">Gross Booking Value</th>
                    <th className="px-4 py-3">Collections Received</th>
                    <th className="px-4 py-3">Est. Gross Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeSeries.map((row) => (
                    <tr key={row.dateKey} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.label}</td>
                      <td className="px-4 py-3 text-slate-700">{row.bookingsCount}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-700">{formatCurrency(row.bookingValue)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(row.collectedAmount)}</td>
                      <td className="px-4 py-3 font-semibold text-purple-700">{formatCurrency(row.grossProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: CRM & FUNNEL ───────────────────────────────────────── */}
        {activeTab === "CRM" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">CRM Lead Conversion Stages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(reportData?.salesFunnel || []).map((stage) => (
                <div key={stage.stage} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-indigo-600">{stage.label}</span>
                  <p className="text-2xl font-black text-slate-900">{stage.count}</p>
                  <p className="text-xs text-slate-500 font-medium">Est: {formatCurrency(stage.value)}</p>
                  <p className="text-xs text-emerald-600 font-bold">{stage.conversionPercent}% of total</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: DESTINATIONS ───────────────────────────────────────── */}
        {activeTab === "DESTINATIONS" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Destination Commercial Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Trips Count</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Gross Revenue</th>
                    <th className="px-4 py-3">Gross Profit</th>
                    <th className="px-4 py-3">Avg Booking Value</th>
                    <th className="px-4 py-3">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData?.destinations || []).map((d) => (
                    <tr key={d.destination} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{d.destination}</td>
                      <td className="px-4 py-3 text-slate-700">{d.tripsCount}</td>
                      <td className="px-4 py-3 text-slate-700">{d.bookingsCount}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(d.revenue)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(d.grossProfit)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(d.averageBookingValue)}</td>
                      <td className="px-4 py-3 font-bold text-purple-700">{d.marginPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5: RECEIVABLES ────────────────────────────────────────── */}
        {activeTab === "RECEIVABLES" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Receivables & Outstanding Balances</h3>
                <p className="text-xs text-slate-500">
                  Total Outstanding: <span className="font-bold text-amber-600">{formatCurrency(kpis?.outstandingReceivables || 0)}</span>
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter customer, booking #..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Booking #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Travel Date</th>
                    <th className="px-4 py-3">Booking Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance Due</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData?.receivables || [])
                    .filter(
                      (r) =>
                        r.customerName.toLowerCase().includes(tableSearch.toLowerCase()) ||
                        r.bookingNumber.toLowerCase().includes(tableSearch.toLowerCase())
                    )
                    .map((r) => (
                      <tr key={r.bookingId} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.bookingNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{r.customerName}</p>
                          <p className="text-[11px] text-slate-500">{r.customerPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.tripTitle}</td>
                        <td className="px-4 py-3 text-slate-600">{r.travelStartDate || "—"}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{formatCurrency(r.totalAmount)}</td>
                        <td className="px-4 py-3 text-emerald-700 font-medium">{formatCurrency(r.paidAmount)}</td>
                        <td className="px-4 py-3 font-bold text-rose-700">{formatCurrency(r.balanceAmount)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-[10px] font-bold ${
                              r.isOverdue
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {r.isOverdue ? "OVERDUE" : r.paymentStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 6: SUPPLIER PAYABLES ──────────────────────────────────── */}
        {activeTab === "PAYABLES" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supplier Liabilities & Payables</h3>
                <p className="text-xs text-slate-500">
                  Total Outstanding: <span className="font-bold text-rose-600">{formatCurrency(kpis?.supplierOutstanding || 0)}</span>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Payable #</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Planned</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData?.payables || []).map((p) => (
                    <tr key={p.payableId} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.payableNumber}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{p.supplierName}</td>
                      <td className="px-4 py-3 text-slate-700">{p.serviceType}</td>
                      <td className="px-4 py-3 text-slate-700">{p.tripTitle || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCurrency(p.plannedAmount)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(p.actualAmount)}</td>
                      <td className="px-4 py-3 text-emerald-700 font-medium">{formatCurrency(p.paidAmount)}</td>
                      <td className="px-4 py-3 font-bold text-rose-700">{formatCurrency(p.outstandingAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 7: CUSTOMERS ──────────────────────────────────────────── */}
        {activeTab === "CUSTOMERS" && (
          <div className="space-y-6">
            {/* Customer Retention KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">Total Customer Base</span>
                <p className="text-2xl font-black text-slate-900">{reportData?.customers.totalCustomers || 0}</p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase text-indigo-600">Repeat Customers</span>
                <p className="text-2xl font-black text-indigo-700">{reportData?.customers.repeatCustomers || 0}</p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase text-emerald-600">Repeat Booking Rate</span>
                <p className="text-2xl font-black text-emerald-700">{reportData?.customers.repeatRatePercent || 0}%</p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase text-purple-600">Average Customer LTV</span>
                <p className="text-2xl font-black text-purple-700">
                  {formatCurrency(reportData?.customers.averageCustomerLTV || 0)}
                </p>
              </div>
            </div>

            {/* Top VIP Spenders Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Top VIP Customers by Lifetime Value (LTV)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Customer Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Completed Bookings</th>
                      <th className="px-4 py-3">Total Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reportData?.customers.topCustomers || []).map((c) => (
                      <tr key={c.customerId} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                        <td className="px-4 py-3 text-slate-700">{c.phone}</td>
                        <td className="px-4 py-3 text-slate-600">{c.city || "—"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{c.totalBookings}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(c.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
