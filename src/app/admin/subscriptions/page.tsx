"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  IndianRupee,
  Layers,
  Ban,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Extend Trial Modal State
  const [extendSub, setExtendSub] = React.useState<{ agencyId: string; agencyName: string } | null>(null);
  const [extendDays, setExtendDays] = React.useState(7);
  const [extendReason, setExtendReason] = React.useState("Promotional trial extension");
  const [extending, setExtending] = React.useState(false);

  const fetchSubscriptions = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listSubscriptions({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      if (res.success && res.data) {
        setSubscriptions(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filteredSubscriptions = React.useMemo(() => {
    if (!searchQuery.trim()) return subscriptions;
    const q = searchQuery.toLowerCase();
    return subscriptions.filter(
      (s) =>
        s.agencyName.toLowerCase().includes(q) ||
        s.agencyEmail.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q)
    );
  }, [subscriptions, searchQuery]);

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendSub) return;
    setExtending(true);
    try {
      await adminClient.extendTrial(extendSub.agencyId, extendDays, extendReason);
      toast.success(`Trial extended for ${extendSub.agencyName}`);
      setExtendSub(null);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend trial");
    } finally {
      setExtending(false);
    }
  };

  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const trialCount = subscriptions.filter((s) => s.status === "TRIAL").length;
  const expiredCount = subscriptions.filter((s) => s.status === "EXPIRED" || s.isTrialExpired).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Subscription Management"
          description="Monitor subscribed agencies, track free trial countdowns, inspect pricing tiers, and manage renewals."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Subscriptions" }]}
          primaryAction={{
            label: "Refresh Subscriptions",
            onClick: fetchSubscriptions,
            icon: RefreshCw,
          }}
        />

        {/* ─── 3 KPI TILES ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Paid Plans</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{activeCount}</p>
            <p className="text-xs text-slate-500 font-medium">Paying subscriber agencies</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Free Trials</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{trialCount}</p>
            <p className="text-xs text-slate-500 font-medium">Under 7-day evaluation</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Expired / Past Due</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{expiredCount}</p>
            <p className="text-xs text-slate-500 font-medium">Requires renewal or conversion</p>
          </div>
        </div>

        {/* ─── FILTER CONTROLS ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Agency Name, Email, Plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) setStatusFilter(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="TRIAL">In Free Trial</SelectItem>
                <SelectItem value="ACTIVE">Paid Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-slate-500 font-medium">
              ({filteredSubscriptions.length} Records)
            </span>
          </div>
        </div>

        {/* ─── SUBSCRIPTIONS TABLE ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Agency</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Plan & Pricing</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Subscription Status</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Trial / Billing Dates</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600 text-right pr-6">Controls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">
                    Loading subscriptions...
                  </TableCell>
                </TableRow>
              ) : filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-slate-400">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow
                    key={sub.id}
                    onClick={() => router.push(`/admin/agencies/${sub.agencyId}`)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                  >
                    <TableCell className="py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                          {sub.agencyName}
                        </span>
                        <p className="text-xs text-slate-500">{sub.agencyEmail}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-slate-900">{sub.planName}</span>
                        <p className="text-slate-500 font-semibold">₹{sub.planPrice} / month</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sub.status === "TRIAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {sub.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                        {sub.status === "TRIAL" && <Clock className="h-3 w-3" />}
                        {sub.status}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {sub.status === "TRIAL" ? (
                          <>
                            <p className="text-slate-700 font-medium">
                              Trial End: {sub.trialEnd ? new Date(sub.trialEnd).toLocaleDateString() : "N/A"}
                            </p>
                            <p className="text-[11px] text-amber-700 font-bold">
                              {sub.daysRemaining > 0 ? `${sub.daysRemaining} days left` : "Expired"}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-700 font-medium">
                              Period: {sub.subscriptionStart ? new Date(sub.subscriptionStart).toLocaleDateString() : "Active"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Renews: {sub.subscriptionEnd ? new Date(sub.subscriptionEnd).toLocaleDateString() : "Monthly"}
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === "TRIAL" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExtendSub({ agencyId: sub.agencyId, agencyName: sub.agencyName })
                            }
                            className="h-7 text-[11px] font-semibold border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            + Trial
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => router.push(`/admin/agencies/${sub.agencyId}`)}
                          className="h-7 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          360°
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── EXTEND TRIAL MODAL ─────────────────────────────────────────── */}
      {extendSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Extend Trial Access</h3>
            <p className="text-xs text-slate-500">
              Agency: <span className="font-semibold text-purple-700">{extendSub.agencyName}</span>
            </p>

            <form onSubmit={handleExtendTrial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Days to Add</label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        extendDays === d
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason</label>
                <Input
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Sales accommodation"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtendSub(null)}
                  disabled={extending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={extending}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {extending ? "Extending..." : "Confirm Extension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
