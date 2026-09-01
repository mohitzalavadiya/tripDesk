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
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Eye,
  Phone,
  Mail,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ban,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { AdminAgencyListItem } from "@/lib/services/admin-service";

export default function AdminAgenciesPage() {
  const router = useRouter();
  const [agencies, setAgencies] = React.useState<AdminAgencyListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [subStatusFilter, setSubStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Extend Trial Modal State
  const [extendAgency, setExtendAgency] = React.useState<{ id: string; name: string } | null>(null);
  const [extendDays, setExtendDays] = React.useState(7);
  const [extendReason, setExtendReason] = React.useState("Promotional trial extension");
  const [extending, setExtending] = React.useState(false);

  // Suspend Modal State
  const [suspendAgencyTarget, setSuspendAgencyTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [suspending, setSuspending] = React.useState(false);

  const fetchAgencies = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.listAgencies({
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
        subscriptionStatus: subStatusFilter !== "ALL" ? (subStatusFilter as any) : undefined,
        page,
        limit: 15,
      });

      if (res.success && res.data) {
        setAgencies(res.data.items);
        setTotalPages(res.data.pagination.totalPages);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, subStatusFilter, page]);

  React.useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendAgency) return;
    setExtending(true);
    try {
      await adminClient.extendTrial(extendAgency.id, extendDays, extendReason);
      toast.success(`Trial extended for ${extendAgency.name}`);
      setExtendAgency(null);
      fetchAgencies();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend trial");
    } finally {
      setExtending(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendAgencyTarget) return;
    if (!suspendReason.trim()) {
      toast.error("Please provide a suspension reason");
      return;
    }
    setSuspending(true);
    try {
      await adminClient.suspendAgency(suspendAgencyTarget.id, suspendReason);
      toast.success(`Suspended ${suspendAgencyTarget.name}`);
      setSuspendAgencyTarget(null);
      setSuspendReason("");
      fetchAgencies();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend agency");
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    try {
      await adminClient.reactivateAgency(id);
      toast.success(`Reactivated ${name}`);
      fetchAgencies();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate agency");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Agency Directory"
          description="Manage subscribed travel agencies, inspect live usage telemetry, manage subscription trials, and enforce platform governance."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Agencies" }]}
          primaryAction={{
            label: "Refresh List",
            onClick: fetchAgencies,
            icon: RefreshCw,
          }}
        />

        {/* ─── FILTERS & SEARCH ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Agency Name, Email, Phone, Owner..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Account Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) {
                  setStatusFilter(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Agency Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Subscription Status Filter */}
            <Select
              value={subStatusFilter}
              onValueChange={(val) => {
                if (val) {
                  setSubStatusFilter(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[150px]">
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Subscriptions</SelectItem>
                <SelectItem value="TRIAL">In Free Trial</SelectItem>
                <SelectItem value="ACTIVE">Paid Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              ({totalCount} Total)
            </span>
          </div>
        </div>

        {/* ─── AGENCIES TABLE ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold uppercase text-slate-600">Agency & Contact</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Owner Profile</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Account Status</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Subscription & Trial</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600 text-center">Usage Metrics</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600 text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 text-xs">
                    Loading agency records...
                  </TableCell>
                </TableRow>
              ) : agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-slate-400 text-xs">
                    No agencies match the current filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((agency) => {
                  const sub = agency.subscription;
                  return (
                    <TableRow
                      key={agency.id}
                      onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Agency Name & Email */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                            {agency.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors block truncate">
                              {agency.name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="truncate">{agency.email}</span>
                              <span>•</span>
                              <span>{agency.phone}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Owner Info */}
                      <TableCell>
                        {agency.owner ? (
                          <div className="space-y-0.5 text-xs">
                            <p className="font-semibold text-slate-900">{agency.owner.name}</p>
                            <p className="text-slate-500 truncate">{agency.owner.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No Owner Record</span>
                        )}
                      </TableCell>

                      {/* Agency Status */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            agency.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : agency.status === "SUSPENDED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {agency.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                          {agency.status === "SUSPENDED" && <Ban className="h-3 w-3" />}
                          {agency.status}
                        </span>
                      </TableCell>

                      {/* Subscription & Trial */}
                      <TableCell>
                        {sub ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{sub.planName}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  sub.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : sub.status === "TRIAL"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            {sub.status === "TRIAL" && (
                              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {sub.daysRemaining > 0
                                  ? `${sub.daysRemaining} days left`
                                  : "Trial Expired"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No Subscription</span>
                        )}
                      </TableCell>

                      {/* Usage Metrics */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-3 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          <span title="Customers" className="text-slate-600 font-semibold">
                            👥 {agency.usage.customersCount}
                          </span>
                          <span title="Bookings" className="text-indigo-600 font-semibold">
                            📅 {agency.usage.bookingsCount}
                          </span>
                          <span title="Enquiries" className="text-purple-600 font-semibold">
                            💬 {agency.usage.enquiriesCount}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {sub?.status === "TRIAL" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExtendAgency({ id: agency.id, name: agency.name })}
                              className="h-7 text-[11px] font-semibold border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
                              title="Extend Trial Period"
                            >
                              + Trial
                            </Button>
                          )}

                          {agency.status === "ACTIVE" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSuspendAgencyTarget({ id: agency.id, name: agency.name })}
                              className="h-7 text-[11px] font-semibold border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Suspend Agency Access"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(agency.id, agency.name)}
                              className="h-7 text-[11px] font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Reactivate Agency"
                            >
                              Reactivate
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                            className="h-7 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                          >
                            360°
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {totalPages} ({totalCount} agencies)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── EXTEND TRIAL MODAL ─────────────────────────────────────────── */}
      {extendAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Extend Agency Trial</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Extend trial for <span className="font-semibold text-purple-700">{extendAgency.name}</span>
              </p>
            </div>

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
                  placeholder="e.g. Sales accommodation or VIP onboarding period"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtendAgency(null)}
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

      {/* ─── SUSPEND AGENCY MODAL ───────────────────────────────────────── */}
      {suspendAgencyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Suspend Agency Access</h3>
                <p className="text-xs text-slate-500">
                  Suspend <span className="font-semibold text-rose-700">{suspendAgencyTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
              Suspension blocks agency owners and staff from logging in and modifying records. Existing customer bookings, financial records, and operational vouchers are <strong>preserved without data deletion</strong>.
            </p>

            <form onSubmit={handleSuspend} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Suspension</label>
                <Input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Non-payment, terms violation, or agency request"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuspendAgencyTarget(null)}
                  disabled={suspending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={suspending}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {suspending ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
