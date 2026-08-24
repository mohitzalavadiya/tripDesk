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
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import { AgencyStatus } from "@/data/saas-data";

export default function AdminAgenciesPage() {
  const router = useRouter();
  const { agencies, agencyOwners, subscriptions, plans } = useSaaS();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [planFilter, setPlanFilter] = React.useState<string>("ALL");

  const filteredAgencies = React.useMemo(() => {
    return agencies.filter((a) => {
      const owner = agencyOwners.find((o) => o.agencyId === a.id);
      const sub = subscriptions.find((s) => s.agencyId === a.id);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = a.name.toLowerCase().includes(q);
        const mOwner = owner?.name.toLowerCase().includes(q);
        const mEmail = a.email.toLowerCase().includes(q) || owner?.email.toLowerCase().includes(q);
        const mPhone = a.phone.includes(q) || owner?.phone.includes(q);
        const mCity = a.city.toLowerCase().includes(q);
        if (!mName && !mOwner && !mEmail && !mPhone && !mCity) return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "Trial" && a.status !== "TRIAL") return false;
        if (statusFilter === "Active" && a.status !== "ACTIVE") return false;
        if (statusFilter === "Past Due" && a.status !== "PAST_DUE") return false;
        if (statusFilter === "Read Only" && a.status !== "READ_ONLY") return false;
        if (statusFilter === "Suspended" && a.status !== "SUSPENDED") return false;
      }

      if (planFilter !== "ALL") {
        if (planFilter === "Starter" && sub?.planId !== "starter") return false;
        if (planFilter === "Professional" && sub?.planId !== "professional") return false;
      }

      return true;
    });
  }, [agencies, agencyOwners, subscriptions, searchQuery, statusFilter, planFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Agencies"
          description="Manage TripDesk agencies, owners, plans and account status."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Agencies" }]}
          primaryAction={{
            label: "+ Create Agency",
            onClick: () => router.push("/admin/agencies/new"),
            icon: Plus,
          }}
        />

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Agency, Owner, Email, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Trial">Trial</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Past Due">Payment Required</SelectItem>
                <SelectItem value="Read Only">Read Only</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Plans</SelectItem>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "ALL" || planFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPlanFilter("ALL");
                }}
                className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── AGENCIES TABLE / DIRECTORY ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Agency Accounts ({filteredAgencies.length})
            </span>
          </div>

          {filteredAgencies.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No agencies found matching your search and filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredAgencies.map((agency) => {
                const owner = agencyOwners.find((o) => o.agencyId === agency.id);
                const sub = subscriptions.find((s) => s.agencyId === agency.id);
                const plan = plans.find((p) => p.id === sub?.planId);

                return (
                  <div
                    key={agency.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{agency.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                            agency.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : agency.status === "TRIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : agency.status === "PAST_DUE"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : agency.status === "READ_ONLY"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {agency.status === "PAST_DUE" ? "Payment Required" : agency.status.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {plan?.name || "Starter"} Plan ({sub?.billingCycle || "Monthly"})
                        </span>
                        {agency.gstin && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            GSTIN: {agency.gstin}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-slate-500">
                        <span className="font-medium text-slate-700">
                          Owner: <strong>{owner?.name || "Agency Owner"}</strong>
                        </span>
                        <span>•</span>
                        <span>{agency.phone}</span>
                        <span>•</span>
                        <span>{agency.email}</span>
                        <span>•</span>
                        <span>{agency.city}, {agency.state || agency.country}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 self-end lg:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Trial / Expiry
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {sub?.renewalDate || "—"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Created On
                        </span>
                        <span className="font-medium text-slate-600 font-mono">
                          {agency.createdAt}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                        className="h-8.5 text-xs font-semibold cursor-pointer bg-white"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
