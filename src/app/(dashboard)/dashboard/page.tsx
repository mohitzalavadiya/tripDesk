"use client";

import { CommunicationHealthCard } from "@/components/dashboard/communication-health-card";
import { CrmActionSummary } from "@/components/dashboard/crm-action-summary";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PipelineHealthCard } from "@/components/dashboard/pipeline-health-card";
import { ReceivablesPayablesCard } from "@/components/dashboard/receivables-payables-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SalesFunnelCard } from "@/components/dashboard/sales-funnel-card";
import { TodaysFollowUpsCard } from "@/components/dashboard/todays-follow-ups-card";
import { TopDestinationsCustomersCard } from "@/components/dashboard/top-destinations-customers-card";
import { UpcomingTripsList } from "@/components/dashboard/upcoming-trips-list";
import { QuickLogModal } from "@/components/enquiries/quick-log-modal";
import { Button } from "@/components/ui/button";
import {
  DashboardApiResponse,
  dashboardClient,
  DashboardCRMApiResponse,
  DashboardFinanceApiResponse,
  DashboardOperationsApiResponse,
  enquiryClient,
  EnquiryWithRelations,
} from "@/lib/api-client";
import { CRMUpcomingFollowUpItem } from "@/lib/services/dashboard-service";
import { DashboardPreset } from "@/lib/validation/dashboard-schema";
import {
  AlertCircle,
  Calendar,
  Clock,
  Compass,
  FileDown,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { isAgencyOwner } = useAuth();

  // Filter state
  const [preset, setPreset] = React.useState<DashboardPreset>("THIS_MONTH");
  const [startDate, setStartDate] = React.useState<string | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<string | undefined>(undefined);

  // Data state
  const [data, setData] = React.useState<DashboardApiResponse | null>(null);
  const [financeData, setFinanceData] = React.useState<DashboardFinanceApiResponse | null>(null);
  const [opsData, setOpsData] = React.useState<DashboardOperationsApiResponse | null>(null);
  const [crmData, setCrmData] = React.useState<DashboardCRMApiResponse | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [crmLoading, setCrmLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [crmError, setCrmError] = React.useState<string | null>(null);

  // Request race-condition mitigation refs
  const dashboardRequestIdRef = React.useRef(0);
  const crmRequestIdRef = React.useRef(0);

  // Quick Log modal state
  const [quickLogEnquiry, setQuickLogEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [isQuickLogOpen, setIsQuickLogOpen] = React.useState(false);
  const [loadingEnquiryId, setLoadingEnquiryId] = React.useState<string | null>(null);

  // Contextual date & greeting in Asia/Kolkata
  const formattedTodayDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString("en-IN");
    }
  }, []);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchDashboardData = React.useCallback(
    async (isSilent = false) => {
      const requestId = ++dashboardRequestIdRef.current;
      try {
        if (!isSilent) setLoading(true);
        setError(null);

        const filter = { preset, startDate, endDate };

        const [summaryRes, finRes, opsRes] = await Promise.allSettled([
          dashboardClient.getSummary(filter),
          isAgencyOwner ? dashboardClient.getFinance(filter) : Promise.resolve(null),
          dashboardClient.getOperations(15),
        ]);

        if (requestId !== dashboardRequestIdRef.current) return;

        if (summaryRes.status === "fulfilled") {
          setData(summaryRes.value);
        } else {
          throw summaryRes.reason;
        }

        if (finRes.status === "fulfilled") {
          setFinanceData(finRes.value);
        }

        if (opsRes.status === "fulfilled") {
          setOpsData(opsRes.value);
        }
      } catch (err: any) {
        if (requestId !== dashboardRequestIdRef.current) return;
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load authoritative dashboard metrics.");
        if (!isSilent) toast.error("Could not refresh dashboard data.");
      } finally {
        if (requestId === dashboardRequestIdRef.current && !isSilent) {
          setLoading(false);
        }
      }
    },
    [preset, startDate, endDate, isAgencyOwner]
  );

  const fetchCrmData = React.useCallback(
    async (isSilent = false) => {
      const requestId = ++crmRequestIdRef.current;
      try {
        if (!isSilent) setCrmLoading(true);
        setCrmError(null);

        const res = await dashboardClient.getCRM();

        if (requestId !== crmRequestIdRef.current) return;

        setCrmData(res);
        setCrmError(null);
      } catch (err: any) {
        if (requestId !== crmRequestIdRef.current) return;
        console.error("Dashboard CRM fetch error:", err);
        setCrmError(err?.message || "Failed to load CRM follow-ups.");
      } finally {
        if (requestId === crmRequestIdRef.current && !isSilent) {
          setCrmLoading(false);
        }
      }
    },
    []
  );

  const handleQuickLog = async (item: CRMUpcomingFollowUpItem) => {
    try {
      setLoadingEnquiryId(item.enquiryId);
      const res = await enquiryClient.getEnquiry(item.enquiryId);
      if (res.success && res.data) {
        setQuickLogEnquiry(res.data);
        setIsQuickLogOpen(true);
      } else {
        toast.error(res.error?.message || "Failed to load enquiry details for logging.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load enquiry details.");
    } finally {
      setLoadingEnquiryId(null);
    }
  };

  const handleQuickLogSuccess = async () => {
    await Promise.allSettled([fetchCrmData(true), fetchDashboardData(true)]);
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  React.useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  const handleRefresh = async () => {
    toast.info("Refreshing live dashboard metrics...");
    await Promise.allSettled([fetchDashboardData(false), fetchCrmData(false)]);
    toast.success("Dashboard metrics updated.");
  };

  const handlePresetChange = (newPreset: DashboardPreset) => {
    setPreset(newPreset);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleCustomRangeChange = (start: string, end: string) => {
    setPreset("CUSTOM_RANGE");
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50 pb-6 md:pb-8">
      <div className="max-w-[1550px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5 sm:space-y-6">
        {/* 1. Executive Brand Header Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-teal-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          <div className="flex flex-col gap-3 sm:gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-teal-600" />
                    <span>Executive Command Center</span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>{formattedTodayDate}</span>
                    <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">(Asia/Kolkata)</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {greeting}, Travel Desk
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                  Overview of bookings, financial collections, conversion funnel, and real-time CRM follow-up obligations.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button
                  onClick={() => router.push("/enquiries/new")}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs h-9 px-3.5 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all hover:shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Enquiry</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/follow-ups")}
                  className="text-xs h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer font-medium"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Follow-ups</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/trips")}
                  className="text-xs h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer font-medium"
                >
                  <Compass className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Trips</span>
                </Button>

                {isAgencyOwner && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(dashboardClient.getExportUrl({ preset, startDate, endDate }), "_blank")}
                    className="text-xs h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer font-medium"
                    title="Export dashboard metrics to CSV"
                  >
                    <FileDown className="h-3.5 w-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="text-xs h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer font-medium"
                  title="Refresh live dashboard metrics"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Reporting Error Banner */}
        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchDashboardData()}>
              Retry
            </Button>
          </div>
        )}

        {/* CRM Action Priorities: Daily Sales Command Center */}
        <CrmActionSummary
          overdueCount={crmData?.followUps?.overdueCount}
          dueTodayCount={crmData?.followUps?.dueTodayCount}
          upcomingCount={crmData?.followUps?.upcomingCount}
          uncontactedLeadsCount={crmData?.followUps?.uncontactedLeadsCount}
          staleLeadsCount={crmData?.followUps?.staleLeadsCount}
          urgentEnquiriesCount={crmData?.followUps?.urgentEnquiriesCount}
          crmLoading={crmLoading}
          crmError={crmError}
          onRetryCrm={() => fetchCrmData()}
        />

        {/* 2. ONE Unified Primary Executive KPI Row with Date Filter */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Executive Performance &amp; Operational Priorities
              </h2>
            </div>
            <DateRangeFilter
              preset={preset}
              startDate={startDate}
              endDate={endDate}
              onPresetChange={handlePresetChange}
              onCustomRangeChange={handleCustomRangeChange}
              loading={loading}
            />
          </div>
          <KpiCards summary={data?.summary} loading={loading} />
        </div>

        {/* 3. SUBSTANTIAL VISUAL ANALYTICS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Visual Business Analytics &amp; Pipeline Conversion
            </h2>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Visual SVG Revenue & Collections Analytics Chart */}
            <div className="lg:col-span-2 min-w-0">
              <RevenueChart analytics={data?.revenueTrend} loading={loading} />
            </div>

            {/* Visual Quotation Conversion Funnel + Pipeline Velocity Health */}
            <div className="lg:col-span-1 min-w-0 space-y-4">
              <SalesFunnelCard funnel={data?.funnel} loading={loading} />
              <PipelineHealthCard summary={data?.summary} funnel={data?.funnel} loading={loading} />
            </div>
          </div>
        </div>

        {/* 5. ACTION-ORIENTED CRM & OPERATIONS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Operational Radar &amp; Follow-Up Obligations
            </h2>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Today's Follow-ups & Urgency Queue */}
            <div className="lg:col-span-2 min-w-0">
              <TodaysFollowUpsCard
                followUps={crmData?.followUps}
                loading={crmLoading}
                error={crmError}
                onRetry={() => fetchCrmData()}
                onQuickLog={handleQuickLog}
                loadingEnquiryId={loadingEnquiryId}
              />
            </div>

            {/* Upcoming Departures & Trip Status */}
            <div className="lg:col-span-1 min-w-0">
              <UpcomingTripsList trips={opsData?.upcomingDepartures} loading={loading} />
            </div>
          </div>
        </div>

        {/* 6. BUSINESS INTELLIGENCE & COMMUNICATION CHANNELS */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 min-w-0">
            <TopDestinationsCustomersCard
              destinations={data?.destinations}
              customers={data?.customers}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-1 min-w-0">
            <CommunicationHealthCard
              communication={data?.summary.communication}
              loading={loading}
            />
          </div>
        </div>

        {/* 7. DETAILED RECEIVABLES & PAYABLES FINANCIAL LEDGER */}
        {financeData && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Financial Receivables &amp; Supplier Payables
              </h2>
            </div>
            <ReceivablesPayablesCard
              receivables={financeData?.receivables}
              payables={financeData?.payables}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Quick Log Modal for CRM follow-ups */}
      <QuickLogModal
        enquiry={quickLogEnquiry}
        isOpen={isQuickLogOpen}
        onClose={() => {
          setIsQuickLogOpen(false);
          setQuickLogEnquiry(null);
        }}
        onSuccess={handleQuickLogSuccess}
      />
    </div>
  );
}
