"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Building,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import {
  AccountsReceivableAnalytics,
  SupplierPayableAnalytics,
} from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ReceivablesPayablesCardProps {
  receivables?: AccountsReceivableAnalytics | null;
  payables?: SupplierPayableAnalytics | null;
  loading?: boolean;
}

export function ReceivablesPayablesCard({
  receivables,
  payables,
  loading = false,
}: ReceivablesPayablesCardProps) {
  const formatRupees = (val?: number) => {
    if (!val || isNaN(val)) return "₹0";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-64" />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-64" />
      </div>
    );
  }

  const topReceivables = receivables?.topOverdueReceivables || [];
  const topSuppliers = payables?.topSuppliers || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Accounts Receivable & Overdue Cash Inflow */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="truncate">Customer Receivables</span>
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
                Pending customer collections and overdue balances.
              </p>
            </div>
            <Link href="/payments" className="shrink-0">
              <Button size="sm" variant="ghost" className="text-xs h-8 text-rose-600 hover:bg-rose-50 cursor-pointer">
                View Ledger <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Aging Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3">
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Due</span>
              <strong className="text-sm sm:text-base text-rose-900 font-mono font-bold block sm:mt-0.5">
                {formatRupees(receivables?.totalOutstanding)}
              </strong>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Overdue</span>
              <strong className="text-sm sm:text-base text-amber-900 font-mono font-bold block sm:mt-0.5">
                {formatRupees(receivables?.overdueAmount)}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Overdue Count</span>
              <strong className="text-sm sm:text-base text-slate-900 font-mono font-bold block sm:mt-0.5">
                {receivables?.overdueBookingsCount ?? 0} bookings
              </strong>
            </div>
          </div>

          {/* Overdue Items List */}
          <div className="pt-3 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Top Customer Balances
            </h4>
            {topReceivables.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                No outstanding customer balances found.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                {topReceivables.slice(0, 4).map((r) => (
                  <Link
                    key={r.bookingId}
                    href={`/bookings/${r.bookingId}`}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-bold text-slate-800 truncate">{r.customerName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{r.bookingNumber} • {r.tripTitle}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className="font-bold text-rose-700">{formatRupees(r.balanceAmount)}</div>
                      <div className="text-[10px] text-slate-400">Total: {formatRupees(r.totalAmount)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Supplier Payables & Vendor Commitments */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">Supplier Payables</span>
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
                Hotel, fleet, and activity vendor commitments.
              </p>
            </div>
            <Link href="/suppliers" className="shrink-0">
              <Button size="sm" variant="ghost" className="text-xs h-8 text-indigo-600 hover:bg-indigo-50 cursor-pointer">
                Vendors <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Payables Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3">
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total Cost</span>
              <strong className="text-sm sm:text-base text-indigo-900 font-mono font-bold block sm:mt-0.5">
                {formatRupees(payables?.totalPayable)}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Paid Out</span>
              <strong className="text-sm sm:text-base text-emerald-900 font-mono font-bold block sm:mt-0.5">
                {formatRupees(payables?.paidAmount)}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Outstanding</span>
              <strong className="text-sm sm:text-base text-slate-900 font-mono font-bold block sm:mt-0.5">
                {formatRupees(payables?.outstandingAmount)}
              </strong>
            </div>
          </div>

          {/* Top Suppliers List */}
          <div className="pt-3 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Top Vendor Payables
            </h4>
            {topSuppliers.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                No active supplier payables recorded.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                {topSuppliers.slice(0, 4).map((s) => (
                  <Link
                    key={s.supplierId}
                    href={`/suppliers/${s.supplierId}`}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-bold text-slate-800 truncate">{s.supplierName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.supplierType}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className="font-bold text-indigo-700">{formatRupees(s.outstandingAmount)}</div>
                      <div className="text-[10px] text-slate-400">Total: {formatRupees(s.plannedAmount)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
