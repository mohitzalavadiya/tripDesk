"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSaaS } from "@/context/saas-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
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
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RotateCcw,
  Eye,
  Calendar,
  IndianRupee,
  Layers,
} from "lucide-react";

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const { subscriptions, agencies, agencyOwners, plans, getPlatformStats } = useSaaS();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const stats = getPlatformStats();

  const filteredSubscriptions = React.useMemo(() => {
    return subscriptions.filter((sub) => {
      const agency = agencies.find((a) => a.id === sub.agencyId);
      const owner = agencyOwners.find((o) => o.agencyId === sub.agencyId);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mAgency = agency?.name.toLowerCase().includes(q);
        const mOwner = owner?.name.toLowerCase().includes(q);
        if (!mAgency && !mOwner) return false;
      }

      if (statusFilter !== "ALL" && sub.status !== statusFilter) return false;

      return true;
    });
  }, [subscriptions, agencies, agencyOwners, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Subscriptions"
          description="Track agency subscription lifecycles, billing cycles, renewals, and recurring revenue."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Subscriptions" }]}
        />

        {/* ─── 4 HEALTH CARDS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Subscriptions</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {subscriptions.filter((s) => s.status === "ACTIVE").length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Paying subscriber accounts</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">In 7-Day Trial</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              {subscriptions.filter((s) => s.status === "TRIAL").length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Free evaluation stage</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-orange-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Past Due</span>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-700 tracking-tight">
              {subscriptions.filter((s) => s.status === "PAST_DUE").length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Payment verification pending</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Monthly MRR</span>
              <IndianRupee className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-700 tracking-tight">
              {formatCurrency(stats.mrr)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">ARR: {formatCurrency(stats.arr)}</p>
          </div>
        </div>

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Agency or Owner Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="Subscription Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Subscriptions</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAST_DUE">Past Due</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── SUBSCRIPTIONS TABLE ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Subscription Records ({filteredSubscriptions.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {filteredSubscriptions.map((sub) => {
              const agency = agencies.find((a) => a.id === sub.agencyId);
              const owner = agencyOwners.find((o) => o.agencyId === sub.agencyId);
              const plan = plans.find((p) => p.id === sub.planId);

              return (
                <div
                  key={sub.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {agency?.name || "Unknown Agency"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          sub.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : sub.status === "TRIAL"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : sub.status === "PAST_DUE"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {sub.status === "PAST_DUE" ? "Payment Required" : sub.status}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {plan?.name || "Starter"} Plan ({sub.billingCycle})
                      </span>
                    </div>

                    <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Owner: <strong>{owner?.name || "Agency Owner"}</strong></span>
                      <span>•</span>
                      <span>Started: {sub.startDate}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-5 self-end lg:self-center shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Amount
                      </span>
                      <span className="font-black text-sm text-slate-900 font-mono">
                        {formatCurrency(sub.amount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Renewal / Expiry
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {sub.renewalDate}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/agencies/${sub.agencyId}`)}
                      className="h-8.5 text-xs font-semibold cursor-pointer bg-white"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      View Agency
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
