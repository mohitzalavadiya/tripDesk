"use client";

import * as React from "react";
import {
  OperationsClosureSummary,
  HotelReconciliationItem,
  FleetReconciliationItem,
  ActivityReconciliationItem,
} from "@/lib/api-client";
import {
  Hotel,
  Car,
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface ServiceReconciliationCardProps {
  summary: OperationsClosureSummary;
}

export function ServiceReconciliationCard({
  summary,
}: ServiceReconciliationCardProps) {
  const { serviceReconciliation, issuesReconciliation } = summary;
  const { hotels, fleet, activities } = serviceReconciliation;

  return (
    <div className="space-y-6">
      {/* Issues Reconciliation Stats */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={`h-4 w-4 ${
                issuesReconciliation.hasCriticalBlocker
                  ? "text-rose-600"
                  : "text-emerald-600"
              }`}
            />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Operational Issues & Ticket Reconciliation
            </h3>
          </div>
          {issuesReconciliation.hasCriticalBlocker ? (
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              {issuesReconciliation.openIssues} Active Critical Blocker(s)
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              All Critical Issues Resolved
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Issues</span>
            <span className="text-base font-black text-slate-900">{issuesReconciliation.totalIssues}</span>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-rose-500 font-bold block uppercase">Critical</span>
            <span className="text-base font-black text-rose-700">{issuesReconciliation.criticalIssues}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-amber-500 font-bold block uppercase">High Priority</span>
            <span className="text-base font-black text-amber-700">{issuesReconciliation.highIssues}</span>
          </div>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-blue-500 font-bold block uppercase">Open / Active</span>
            <span className="text-base font-black text-blue-700">{issuesReconciliation.openIssues}</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-emerald-500 font-bold block uppercase">Resolved</span>
            <span className="text-base font-black text-emerald-700">{issuesReconciliation.resolvedIssues}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Closed</span>
            <span className="text-base font-black text-slate-700">{issuesReconciliation.closedIssues}</span>
          </div>
        </div>
      </div>

      {/* 1. Hotel Accommodations Delivery */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Accommodations Planned vs Actual Delivery ({hotels.length})
            </h3>
          </div>
        </div>

        {hotels.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No hotel accommodations booked for this tour.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {hotels.map((h) => (
              <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{h.hotelName}</span>
                    <span className="text-slate-500">({h.city})</span>
                    {h.isDelivered ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed Stay
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        <XCircle className="h-3 w-3" /> {h.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Planned: {h.plannedRoom}</span>
                    <span>•</span>
                    <span>Delivered: {h.confirmedRoom}</span>
                    {h.confirmationNumber && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">Voucher: {h.confirmationNumber}</span>
                      </>
                    )}
                  </div>
                  {h.discrepancy && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{h.discrepancy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Fleet & Driver Dispatches */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Fleet & Driver Dispatches ({fleet.length})
            </h3>
          </div>
        </div>

        {fleet.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No transport components booked for this tour.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {fleet.map((v) => (
              <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{v.vehicleName}</span>
                    <span className="text-slate-500">({v.vehicleType})</span>
                    {v.isDelivered ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3" /> Duty Fulfilled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Clock className="h-3 w-3" /> {v.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Driver: {v.driverName || "Unassigned"}</span>
                    <span>•</span>
                    <span>Contact: {v.driverPhone || "N/A"}</span>
                    <span>•</span>
                    <span>Plate: {v.vehiclePlate || "N/A"}</span>
                  </div>
                  {v.discrepancy && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{v.discrepancy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Activities & Excursions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Activities & Excursions Delivery ({activities.length})
            </h3>
          </div>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No sightseeing activities booked for this tour.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{a.activityName}</span>
                    {a.isDelivered ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3" /> Pass Delivered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        <XCircle className="h-3 w-3" /> {a.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Timing: {a.time}</span>
                    <span>•</span>
                    <span>Location: {a.location}</span>
                    {a.passNumber && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 font-semibold">Pass: {a.passNumber}</span>
                      </>
                    )}
                  </div>
                  {a.discrepancy && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{a.discrepancy}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
