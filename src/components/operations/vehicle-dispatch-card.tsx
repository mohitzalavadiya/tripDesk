"use client";

import * as React from "react";
import { DispatchStatus } from "@prisma/client";
import { VehicleDispatchWithDetails } from "@/lib/api-client";
import { TransportStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  Download,
} from "lucide-react";

interface VehicleDispatchCardProps {
  dispatch: VehicleDispatchWithDetails;
  isReadOnly?: boolean;
  onAssignDriver: (dispatch: VehicleDispatchWithDetails) => void;
  onReportDelay: (dispatch: VehicleDispatchWithDetails) => void;
  onConfirmDispatch: (dispatch: VehicleDispatchWithDetails) => void;
  onStartDuty: (dispatch: VehicleDispatchWithDetails) => void;
  onCompleteDuty: (dispatch: VehicleDispatchWithDetails) => void;
  onCancelDispatch: (dispatch: VehicleDispatchWithDetails) => void;
}

export function VehicleDispatchCard({
  dispatch,
  isReadOnly = false,
  onAssignDriver,
  onReportDelay,
  onConfirmDispatch,
  onStartDuty,
  onCompleteDuty,
  onCancelDispatch,
}: VehicleDispatchCardProps) {
  const [copied, setCopied] = React.useState(false);

  const vehicleName =
    dispatch.tripVehicle?.vehicleName ||
    dispatch.vehicle?.name ||
    "Tour Vehicle";
  const vehicleType =
    dispatch.tripVehicle?.vehicleType ||
    dispatch.vehicle?.type ||
    "Standard Vehicle";

  const pickupDate = dispatch.pickupDate
    ? new Date(dispatch.pickupDate)
    : dispatch.tripVehicle?.startDate
    ? new Date(dispatch.tripVehicle.startDate)
    : null;

  const pickupLocation =
    dispatch.pickupLocation ||
    dispatch.tripVehicle?.pickupLocation ||
    "Designated Pickup Point";

  const dropLocation =
    dispatch.dropLocation ||
    dispatch.tripVehicle?.dropLocation ||
    "Designated Drop Point";

  const vehiclePlate =
    dispatch.vehicleNumber ||
    dispatch.vehicle?.registrationNumber ||
    null;

  const handleCopyPlate = () => {
    if (!vehiclePlate) return;
    navigator.clipboard.writeText(vehiclePlate);
    setCopied(true);
    toast.success("Vehicle plate number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const status = dispatch.status;

  return (
    <div
      className={`border rounded-2xl p-5 shadow-2xs transition-all space-y-4 ${
        status === DispatchStatus.COMPLETED
          ? "bg-white border-slate-200/90"
          : status === DispatchStatus.ON_DUTY
          ? "bg-blue-50/30 border-blue-200/90"
          : status === DispatchStatus.CONFIRMED
          ? "bg-emerald-50/20 border-emerald-200/90"
          : status === DispatchStatus.ASSIGNED
          ? "bg-indigo-50/20 border-indigo-200/80"
          : status === DispatchStatus.CANCELLED
          ? "bg-slate-50/60 border-slate-200 opacity-80"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ─── CARD HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
              status === DispatchStatus.COMPLETED
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : status === DispatchStatus.ON_DUTY
                ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse"
                : status === DispatchStatus.CONFIRMED
                ? "bg-teal-50 border-teal-200 text-teal-600"
                : status === DispatchStatus.ASSIGNED
                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                : status === DispatchStatus.CANCELLED
                ? "bg-slate-100 border-slate-200 text-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <Car className="h-5 w-5" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base text-slate-900 truncate">
                {vehicleName}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {vehicleType}
              </span>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700">{pickupLocation}</span>
              <span className="text-slate-400">→</span>
              <span className="font-medium text-slate-700">{dropLocation}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <TransportStatusBadge status={status} />
        </div>
      </div>

      {/* ─── OPERATIONAL & SCHEDULE DETAILS GRID ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 border border-slate-100 rounded-xl p-3.5">
        {/* Schedule */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pickup Timing
          </span>
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {pickupDate
                ? pickupDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Scheduled Date TBD"}
            </span>
          </div>
          <div className="font-semibold text-indigo-600 flex items-center gap-1 text-[11px] pt-0.5">
            <Clock className="h-3 w-3" />
            <span>{dispatch.pickupTime || "09:00 AM (Default)"}</span>
          </div>
        </div>

        {/* Chauffeur Information */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Assigned Chauffeur
          </span>
          {dispatch.driverName ? (
            <div>
              <span className="font-bold text-slate-800 block truncate">
                {dispatch.driverName}
              </span>
              {dispatch.driverPhone ? (
                <div className="flex items-center gap-2 text-[11px] pt-0.5">
                  <a
                    href={`tel:${dispatch.driverPhone}`}
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Phone className="h-3 w-3" />
                    {dispatch.driverPhone}
                  </a>
                </div>
              ) : (
                <span className="text-slate-400 text-[11px]">No phone number</span>
              )}
            </div>
          ) : (
            <span className="text-amber-700 font-semibold text-[11px] italic">
              Unassigned — Chauffeur needed
            </span>
          )}
        </div>

        {/* Vehicle Registration Number */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Vehicle Registration #
          </span>
          {vehiclePlate ? (
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs">
                {vehiclePlate}
              </span>
              <button
                type="button"
                onClick={handleCopyPlate}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-200 cursor-pointer"
                title="Copy registration number"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px] italic">
              Plate # pending
            </span>
          )}
          {dispatch.tripVehicle?.capacity && (
            <span className="text-[10px] text-slate-400 block pt-0.5">
              Capacity: {dispatch.tripVehicle.capacity} Passengers
            </span>
          )}
        </div>
      </div>

      {/* Operational Remarks & Special Instructions */}
      {dispatch.notes && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 space-y-0.5">
          <span className="font-bold text-[11px] text-amber-800 block">
            Dispatch Instructions & Route Notes:
          </span>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            {dispatch.notes}
          </p>
        </div>
      )}

      {/* ─── ACTION BUTTONS ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
        <span className="text-[10px] font-mono text-slate-400">
          Last updated: {new Date(dispatch.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PENDING ACTIONS */}
          {status === DispatchStatus.PENDING && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onCancelDispatch(dispatch)}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onAssignDriver(dispatch)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Assign Chauffeur & Vehicle
              </Button>
            </>
          )}

          {/* ASSIGNED ACTIONS */}
          {status === DispatchStatus.ASSIGNED && (
            <>
              <a
                href={`/api/operations/${dispatch.tripOperationId}/documents/vehicle/${dispatch.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Voucher PDF
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onCancelDispatch(dispatch)}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onAssignDriver(dispatch)}
                className="text-xs font-bold h-8 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Edit Assignment
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onConfirmDispatch(dispatch)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm Dispatch
              </Button>
            </>
          )}

          {/* CONFIRMED ACTIONS */}
          {status === DispatchStatus.CONFIRMED && (
            <>
              <a
                href={`/api/operations/${dispatch.tripOperationId}/documents/vehicle/${dispatch.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Voucher PDF
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onCancelDispatch(dispatch)}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onAssignDriver(dispatch)}
                className="text-xs font-semibold h-8 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Edit
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onStartDuty(dispatch)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                Start Duty (On Duty)
              </Button>
            </>
          )}

          {/* ON_DUTY ACTIONS */}
          {status === DispatchStatus.ON_DUTY && (
            <>
              <a
                href={`/api/operations/${dispatch.tripOperationId}/documents/vehicle/${dispatch.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Voucher PDF
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onReportDelay(dispatch)}
                className="text-xs font-bold h-8 px-3 text-amber-700 hover:bg-amber-50 border-amber-200 cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Report Delay
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onCompleteDuty(dispatch)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Complete Duty
              </Button>
            </>
          )}

          {/* COMPLETED ACTIONS */}
          {status === DispatchStatus.COMPLETED && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Duty Completed
            </span>
          )}

          {/* CANCELLED ACTIONS */}
          {status === DispatchStatus.CANCELLED && (
            <Button
              size="sm"
              variant="outline"
              disabled={isReadOnly}
              onClick={() => onAssignDriver(dispatch)}
              className="text-xs font-bold h-8 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Re-assign / Re-instate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
