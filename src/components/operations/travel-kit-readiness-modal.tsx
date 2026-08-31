"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
  if (!isOpen) return null;

  const isFullyReady = readinessScore >= 90;
  const isSufficient = readinessScore >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Travel Kit & Guest Pack Readiness
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {tripTitle} ({tripNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Score Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isFullyReady
                ? "bg-emerald-50/60 border-emerald-200"
                : isSufficient
                ? "bg-blue-50/60 border-blue-200"
                : "bg-amber-50/60 border-amber-200"
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                {isFullyReady ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {isFullyReady
                    ? "Operational Readiness: Verified"
                    : isSufficient
                    ? "Readiness: Sufficient for Preview"
                    : "Readiness: Components Incomplete"}
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
                  <Hotel className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">Hotel Accommodations</span>
                </div>
                <span
                  className={`font-mono font-bold ${
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
                  <Car className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">Vehicle & Chauffeurs</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    totalVehicles === 0 || assignedVehicles === totalVehicles
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {assignedVehicles} / {totalVehicles} assigned
                </span>
              </div>

              {/* Activities */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Ticket className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">Activities & Passes</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    totalActivities === 0 || confirmedActivities === totalActivities
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {confirmedActivities} / {totalActivities} confirmed
                </span>
              </div>

              {/* Issues */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">Active Critical Issues</span>
                </div>
                <span
                  className={`font-mono font-bold ${
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Cancel
          </Button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Generate & Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
