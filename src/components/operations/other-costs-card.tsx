"use client";

import * as React from "react";
import { SupplierPayable, SupplierPayment } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Plus,
  Edit,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  FileText,
} from "lucide-react";

interface OtherCostsCardProps {
  payables: Array<
    SupplierPayable & {
      payments?: SupplierPayment[];
      supplier?: { id: string; name: string; type?: string | null; phone?: string | null } | null;
    }
  >;
  isReadOnly?: boolean;
  onAddOtherCost: () => void;
  onEditPayable: (payable: any) => void;
  onRecordPayment: (payable: any) => void;
}

export function OtherCostsCard({
  payables,
  isReadOnly = false,
  onAddOtherCost,
  onEditPayable,
  onRecordPayment,
}: OtherCostsCardProps) {
  // Filter for manual / other costs
  const otherCosts = payables.filter(
    (p) =>
      p.origin === "MANUAL" ||
      p.serviceType === "MANUAL" ||
      p.serviceType === "OTHER" ||
      (!p.serviceReferenceId && p.serviceType !== "HOTEL" && p.serviceType !== "VEHICLE")
  );

  const totalAmount = otherCosts.reduce((sum, p) => sum + Number(p.actualAmount || 0), 0);
  const totalPaid = otherCosts.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
  const totalOutstanding = otherCosts.reduce(
    (sum, p) => sum + (p.status !== "CANCELLED" ? Number(p.outstandingAmount || 0) : 0),
    0
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-5">
      {/* ─── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-600" />
            Other Operational Costs & Manual Payables ({otherCosts.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational obligations for local guides, monument fees, entry permits, parking, tolls, and miscellaneous tour costs.
          </p>
        </div>

        {!isReadOnly && (
          <Button
            size="sm"
            onClick={onAddOtherCost}
            className="h-8.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Other Cost
          </Button>
        )}
      </div>

      {/* ─── SUMMARY KPI STRIP ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Other Costs</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Total Paid</p>
          <p className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-lg font-black text-amber-600 mt-0.5">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* ─── COSTS LIST ───────────────────────────────────────────────────── */}
      {otherCosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-2">
          <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">No other operational costs recorded</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Add manual obligations for local guides, entry tickets, tolls, or permits for this tour.
          </p>
          {!isReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddOtherCost}
              className="text-xs font-semibold h-8 mt-2 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Cost
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {otherCosts.map((cost) => {
            const isCancelled = cost.status === "CANCELLED";
            const isPaid = cost.status === "PAID";
            const isPartial = cost.status === "PARTIALLY_PAID";

            return (
              <div
                key={cost.id}
                className={`rounded-xl border p-4 transition-all space-y-3 ${
                  isCancelled
                    ? "bg-slate-50/60 border-slate-200 opacity-70"
                    : isPaid
                    ? "bg-white border-slate-200 hover:border-emerald-200"
                    : "bg-white border-slate-200 hover:border-indigo-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900">{cost.description}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isPartial
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isCancelled
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {isPartial
                          ? "Partially Paid"
                          : isPaid
                          ? "Paid"
                          : isCancelled
                          ? "Cancelled"
                          : "Pending"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">Payee: {cost.payeeName}</span>
                      {cost.dueDate && (
                        <>
                          <span>•</span>
                          <span>Due: {new Date(cost.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 self-start sm:self-center">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-medium">Cost Amount</p>
                      <p className="font-bold text-slate-900">{formatCurrency(Number(cost.actualAmount))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-medium">Outstanding</p>
                      <p className={`font-bold ${Number(cost.outstandingAmount) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatCurrency(Number(cost.outstandingAmount))}
                      </p>
                    </div>
                  </div>
                </div>

                {cost.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-600">Note: </span>
                    {cost.notes}
                  </p>
                )}

                {!isReadOnly && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEditPayable(cost)}
                      className="h-7 text-[11px] px-2.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit className="h-3 w-3 mr-1 text-slate-500" />
                      Edit Cost
                    </Button>
                    {!isCancelled && Number(cost.outstandingAmount) > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onRecordPayment(cost)}
                        className="h-7 text-[11px] px-2.5 font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs cursor-pointer"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
