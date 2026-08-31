"use client";

import * as React from "react";
import Link from "next/link";
import {
  OperationalRiskAnalyticsResult,
  OperationalRiskItem,
  RiskLevel,
} from "@/lib/api-client/operations-client";
import { ShieldAlert, ShieldCheck, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OperationsRiskCardProps {
  riskData?: OperationalRiskAnalyticsResult;
  loading?: boolean;
}

export function OperationsRiskCard({ riskData, loading = false }: OperationsRiskCardProps) {
  if (loading || !riskData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-96">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-20 bg-slate-100 rounded-lg mb-4" />
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const getRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            CRITICAL ({score})
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            HIGH ({score})
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            MEDIUM ({score})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            LOW ({score})
          </span>
        );
    }
  };

  const totalEvaluated =
    riskData.riskDistribution.low +
    riskData.riskDistribution.medium +
    riskData.riskDistribution.high +
    riskData.riskDistribution.critical;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Operational Risk & Health Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic risk scoring based on readiness, departure proximity & active blockers
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {totalEvaluated} Tours Evaluated
          </span>
        </div>

        {/* Risk Distribution Bar */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-center">
            <div className="text-xs font-medium text-emerald-700">LOW RISK</div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">
              {riskData.riskDistribution.low}
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200/80 p-2.5 text-center">
            <div className="text-xs font-medium text-blue-700">MEDIUM</div>
            <div className="text-lg font-bold text-blue-900 mt-0.5">
              {riskData.riskDistribution.medium}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-center">
            <div className="text-xs font-medium text-amber-700">HIGH</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">
              {riskData.riskDistribution.high}
            </div>
          </div>
          <div className="rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-center">
            <div className="text-xs font-medium text-rose-700">CRITICAL</div>
            <div className="text-lg font-bold text-rose-900 mt-0.5">
              {riskData.riskDistribution.critical}
            </div>
          </div>
        </div>

        {/* Top Risk Tours Table */}
        <div className="overflow-x-auto">
          {riskData.highestRiskOperations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              No high-risk operations identified in this period.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium select-none">
                  <th className="py-2 px-2">Tour / Customer</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Readiness</th>
                  <th className="py-2 px-2">Risk Level</th>
                  <th className="py-2 px-2">Key Drivers</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {riskData.highestRiskOperations.slice(0, 5).map((op) => (
                  <tr key={op.operationId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-slate-900">{op.tripNumber}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {op.customerName}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-medium text-slate-700">{op.status}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              op.readinessScore >= 80
                                ? "bg-emerald-500"
                                : op.readinessScore >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${op.readinessScore}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">
                          {op.readinessScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      {getRiskBadge(op.riskLevel, op.riskScore)}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="text-[11px] text-slate-600 max-w-[220px] truncate">
                        {op.factors[0]}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Link href={`/operations/${op.tripId}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1 text-blue-600 hover:text-blue-700">
                          Inspect <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
