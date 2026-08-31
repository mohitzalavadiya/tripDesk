"use client";

import * as React from "react";
import { SupplierAnalyticsResult } from "@/lib/api-client/operations-client";
import { Building2, UserCheck, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface OperationsSupplierScorecardProps {
  supplierData?: SupplierAnalyticsResult;
  loading?: boolean;
}

export function OperationsSupplierScorecard({
  supplierData,
  loading = false,
}: OperationsSupplierScorecardProps) {
  const [activeTab, setActiveTab] = React.useState<"SUPPLIERS" | "DRIVERS">("SUPPLIERS");

  if (loading || !supplierData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Supplier & Driver Performance
              </h3>
              <p className="text-xs text-slate-500">
                Confirmation rates, amendments, cancellations and duty fulfillment
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setActiveTab("SUPPLIERS")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "SUPPLIERS"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Suppliers ({supplierData.suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab("DRIVERS")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "DRIVERS"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Drivers ({supplierData.drivers.length})
            </button>
          </div>
        </div>

        {activeTab === "SUPPLIERS" ? (
          <div className="overflow-x-auto">
            {supplierData.suppliers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No supplier confirmations recorded in this date range.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium select-none">
                    <th className="py-2 px-2">Supplier Name</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2 text-center">Services</th>
                    <th className="py-2 px-2 text-center">Confirmed</th>
                    <th className="py-2 px-2">Confirmation Rate</th>
                    <th className="py-2 px-2 text-right">Amended / Cancelled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {supplierData.suppliers.slice(0, 5).map((s) => (
                    <tr key={s.supplierId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-slate-900">{s.supplierName}</td>
                      <td className="py-2.5 px-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {s.supplierType}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                        {s.totalServices}
                      </td>
                      <td className="py-2.5 px-2 text-center text-emerald-700 font-medium">
                        {s.confirmedServices}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                s.confirmationRate >= 80 ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${s.confirmationRate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-800">{s.confirmationRate}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-500">
                        {s.amendedCount} amended • {s.cancelledCount} cancelled
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {supplierData.drivers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No driver dispatches recorded in this date range.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium select-none">
                    <th className="py-2 px-2">Driver Name</th>
                    <th className="py-2 px-2">Contact</th>
                    <th className="py-2 px-2 text-center">Total Trips</th>
                    <th className="py-2 px-2 text-center">Completed</th>
                    <th className="py-2 px-2">Fulfillment Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {supplierData.drivers.slice(0, 5).map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 font-medium text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        {d.driverName}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">
                        {d.driverPhone || "N/A"}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                        {d.totalDispatches}
                      </td>
                      <td className="py-2.5 px-2 text-center text-emerald-700 font-medium">
                        {d.completedDispatches}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${d.completionRate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-800">{d.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
