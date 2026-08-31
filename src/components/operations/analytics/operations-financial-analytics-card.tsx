"use client";

import * as React from "react";
import { FinancialAnalyticsResult } from "@/lib/api-client/operations-client";
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface OperationsFinancialAnalyticsCardProps {
  financialData?: FinancialAnalyticsResult;
  loading?: boolean;
}

export function OperationsFinancialAnalyticsCard({
  financialData,
  loading = false,
}: OperationsFinancialAnalyticsCardProps) {
  if (loading || !financialData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-40 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const isOverBudget = financialData.totalVariance > 0.01;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Financial Variance & Cost Audit
              </h3>
              <p className="text-xs text-slate-500">
                Planned supplier costs vs actual settlement reconciliations
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
              isOverBudget
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isOverBudget ? (
              <>
                <TrendingUp className="h-3.5 w-3.5" /> Overrun (+{financialData.averageVariancePercent}%)
              </>
            ) : (
              <>
                <TrendingDown className="h-3.5 w-3.5" /> Under Budget ({financialData.averageVariancePercent}%)
              </>
            )}
          </div>
        </div>

        {/* Cost Summary Highlights */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
            <div className="text-[11px] font-medium text-slate-500">Total Planned</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(financialData.totalPlannedCost)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
            <div className="text-[11px] font-medium text-slate-500">Total Actual</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(financialData.totalActualCost)}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 border ${isOverBudget ? "bg-rose-50/50 border-rose-200 text-rose-900" : "bg-emerald-50/50 border-emerald-200 text-emerald-900"}`}>
            <div className="text-[11px] font-medium opacity-80">Net Variance</div>
            <div className="text-base font-bold mt-0.5">
              {formatCurrency(financialData.totalVariance)}
            </div>
          </div>
        </div>

        {/* Variance Breakdown Tables */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Top Cost Variance Tours
          </div>
          {financialData.overBudgetOperations.length === 0 && financialData.savingsOperations.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              All tours reconciled precisely at planned baseline costs.
            </div>
          ) : (
            <div className="space-y-2">
              {financialData.overBudgetOperations.slice(0, 3).map((op) => (
                <div
                  key={op.operationId}
                  className="rounded-lg border border-rose-100 bg-rose-50/40 p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{op.tripNumber}</span>
                    <span className="text-slate-500 text-[11px] ml-2 truncate max-w-[150px]">
                      {op.tripTitle}
                    </span>
                    {op.varianceReason && (
                      <div className="text-[10px] text-rose-700 mt-0.5 italic">
                        &ldquo;{op.varianceReason}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-700">
                      +{formatCurrency(op.varianceAmount)}
                    </span>
                    <div className="text-[10px] text-slate-400">
                      Plan: {formatCurrency(op.plannedCost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
