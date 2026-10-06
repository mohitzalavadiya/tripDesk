"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useModalScrollLock } from "@/lib/scroll-lock";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Hotel,
  Car,
  Ticket,
  AlertCircle,
  X,
} from "lucide-react";

interface TravelKitReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripTitle: string;
  tripNumber: string;
  readinessScore: number;
  totalHotels: number;
  confirmedHotels: number;
  totalVehicles: number;
  assignedVehicles: number;
  totalActivities: number;
  confirmedActivities: number;
  openCriticalIssues: number;
  downloadUrl: string;
}

export function TravelKitReadinessModal({
  isOpen,
  onClose,
  tripTitle,
  tripNumber,
  readinessScore,
  totalHotels,
  confirmedHotels,
  totalVehicles,
  assignedVehicles,
  totalActivities,
  confirmedActivities,
  openCriticalIssues,
  downloadUrl,
}: TravelKitReadinessModalProps) {
  useModalScrollLock(isOpen);
  if (!isOpen) return null;

  const isFullyReady = readinessScore >= 90;
  const isSufficient = readinessScore >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                Travel Kit & Guest Pack Readiness
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {tripTitle} ({tripNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Score Card */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-2 ${
              isFullyReady
                ? "bg-emerald-50/60 border-emerald-200"
                : isSufficient
                ? "bg-blue-50/60 border-blue-200"
                : "bg-amber-50/60 border-amber-200"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isFullyReady ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 truncate">
                  {isFullyReady
                    ? "Operational Readiness: Verified"
                    : isSufficient
                    ? "Readiness: Sufficient"
                    : "Readiness: Incomplete"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {isFullyReady
                  ? "All travel services are confirmed and ready for the customer."
                  : "Some components are pending confirmation or chauffeur allocation."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black font-mono text-slate-900">
                {readinessScore}%
              </span>
            </div>
          </div>

          {/* Readiness Breakdown Checklist */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Component Verification Breakdown
            </h4>

            <div className="space-y-2 text-xs">
              {/* Hotels */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Hotel className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">Hotel Accommodations</span>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    totalHotels === 0 || confirmedHotels === totalHotels
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {confirmedHotels} / {totalHotels} confirmed
                </span>
              </div>

              {/* Fleet */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Car className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">Vehicle & Chauffeurs</span>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    totalVehicles === 0 || assignedVehicles === totalVehicles
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {assignedVehicles} / {totalVehicles} assigned
                </span>
              </div>

              {/* Issues */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">Active Critical Issues</span>
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    openCriticalIssues === 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {openCriticalIssues === 0
                    ? "0 Open Issues"
                    : `${openCriticalIssues} Blocker(s)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold h-9 px-4 w-full sm:w-auto justify-center"
          >
            Cancel
          </Button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors w-full sm:w-auto whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            Generate & Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
