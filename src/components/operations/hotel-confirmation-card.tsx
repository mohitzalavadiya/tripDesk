"use client";

import * as React from "react";
import { ConfirmationStatus } from "@prisma/client";
import { HotelConfirmationWithDetails } from "@/lib/api-client";
import { HotelConfirmationStatusBadge } from "@/components/operations/operations-status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Hotel,
  Calendar,
  Building,
  Phone,
  Mail,
  Copy,
  Check,
  Send,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  Download,
} from "lucide-react";
import { HotelDialogMode } from "./hotel-confirmation-dialog";

interface HotelConfirmationCardProps {
  hotelConfirmation: HotelConfirmationWithDetails;
  isReadOnly?: boolean;
  onOpenDialog: (
    hotel: HotelConfirmationWithDetails,
    mode: HotelDialogMode
  ) => void;
}

export function HotelConfirmationCard({
  hotelConfirmation,
  isReadOnly = false,
  onOpenDialog,
}: HotelConfirmationCardProps) {
  const [copied, setCopied] = React.useState(false);

  const hotelName =
    hotelConfirmation.tripHotel?.hotel?.name ||
    "Hotel Accommodation";
  const city =
    hotelConfirmation.tripHotel?.hotel?.city ||
    "Destination";
  const plannedRoom =
    hotelConfirmation.tripHotel?.roomType || "Standard Room";
  const plannedRoomsCount =
    hotelConfirmation.tripHotel?.rooms || 1;
  const plannedMeal =
    hotelConfirmation.tripHotel?.mealPlan || "EPAI";

  const checkIn = hotelConfirmation.checkIn
    ? new Date(hotelConfirmation.checkIn)
    : hotelConfirmation.tripHotel?.checkIn
    ? new Date(hotelConfirmation.tripHotel.checkIn)
    : null;

  const checkOut = hotelConfirmation.checkOut
    ? new Date(hotelConfirmation.checkOut)
    : hotelConfirmation.tripHotel?.checkOut
    ? new Date(hotelConfirmation.tripHotel.checkOut)
    : null;

  // Calculate nights
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 1;

  const handleCopyConfirmationNumber = () => {
    if (!hotelConfirmation.confirmationNumber) return;
    navigator.clipboard.writeText(hotelConfirmation.confirmationNumber);
    setCopied(true);
    toast.success("Confirmation / Voucher # copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const status = hotelConfirmation.status;

  return (
    <div
      className={`border rounded-2xl p-5 shadow-2xs transition-all space-y-4 ${
        status === ConfirmationStatus.CONFIRMED
          ? "bg-white border-slate-200/90 hover:border-emerald-200"
          : status === ConfirmationStatus.REQUESTED
          ? "bg-blue-50/20 border-blue-200/80"
          : status === ConfirmationStatus.AMENDED
          ? "bg-amber-50/20 border-amber-200/80"
          : status === ConfirmationStatus.CANCELLED
          ? "bg-slate-50/60 border-slate-200 opacity-80"
          : "bg-white border-slate-200"
      }`}
    >
      {/* ─── CARD HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
              status === ConfirmationStatus.CONFIRMED
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : status === ConfirmationStatus.REQUESTED
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : status === ConfirmationStatus.AMENDED
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : status === ConfirmationStatus.CANCELLED
                ? "bg-slate-100 border-slate-200 text-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <Hotel className="h-5 w-5" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base text-slate-900 truncate">
                {hotelName}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                {city}
              </span>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">
                {plannedRoomsCount} Room(s) • {hotelConfirmation.roomDetails || plannedRoom}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-600">
                Plan: <strong>{hotelConfirmation.mealPlan || plannedMeal}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <HotelConfirmationStatusBadge status={status} />
        </div>
      </div>

      {/* ─── DATES & STAY DETAILS GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 border border-slate-100 rounded-xl p-3.5">
        {/* Dates */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Stay Schedule
          </span>
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {checkIn
                ? checkIn.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "TBD"}{" "}
              →{" "}
              {checkOut
                ? checkOut.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "TBD"}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium pl-5 block">
            {nights} Night{nights > 1 ? "s" : ""}
          </span>
        </div>

        {/* Voucher / Confirmation Number */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Voucher / Confirmation #
          </span>
          {hotelConfirmation.confirmationNumber ? (
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs">
                {hotelConfirmation.confirmationNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyConfirmationNumber}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-200 cursor-pointer"
                title="Copy confirmation number"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-amber-700 font-semibold text-[11px] italic">
              {status === ConfirmationStatus.REQUESTED
                ? "Awaiting supplier response"
                : "Confirmation # pending"}
            </span>
          )}
          {hotelConfirmation.confirmedAt && (
            <span className="text-[10px] text-slate-400 font-mono block">
              Confirmed on: {new Date(hotelConfirmation.confirmedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Supplier / Contact Info */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Supplier & Contact
          </span>
          <span className="font-bold text-slate-800 block truncate">
            {hotelConfirmation.supplier?.name ||
              hotelConfirmation.tripHotel?.hotel?.name ||
              "Direct Booking"}
          </span>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-0.5">
            {hotelConfirmation.supplier?.phone ||
            hotelConfirmation.tripHotel?.hotel?.phone ? (
              <a
                href={`tel:${
                  hotelConfirmation.supplier?.phone ||
                  hotelConfirmation.tripHotel?.hotel?.phone
                }`}
                className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Phone className="h-3 w-3" />
                {hotelConfirmation.supplier?.phone ||
                  hotelConfirmation.tripHotel?.hotel?.phone}
              </a>
            ) : (
              <span>No direct phone</span>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Notes */}
      {hotelConfirmation.supplierNotes && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 space-y-0.5">
          <span className="font-bold text-[11px] text-amber-800 block">
            Supplier & Reservation Remarks:
          </span>
          <p className="text-[11px] text-amber-900 leading-relaxed">
            {hotelConfirmation.supplierNotes}
          </p>
        </div>
      )}

      {/* ─── CARD ACTION BUTTONS ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
        <span className="text-[10px] font-mono text-slate-400">
          Last updated: {new Date(hotelConfirmation.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PENDING ACTIONS */}
          {status === ConfirmationStatus.PENDING && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CANCEL")}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "REQUEST")}
                className="text-xs font-bold h-8 px-3 text-blue-700 hover:bg-blue-50 border-blue-200 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Request Confirmation
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CONFIRM")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm Hotel
              </Button>
            </>
          )}

          {/* REQUESTED ACTIONS */}
          {status === ConfirmationStatus.REQUESTED && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CANCEL")}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "REQUEST")}
                className="text-xs font-semibold h-8 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Update Notes
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CONFIRM")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Enter Confirmation #
              </Button>
            </>
          )}

          {/* CONFIRMED ACTIONS */}
          {status === ConfirmationStatus.CONFIRMED && (
            <>
              <a
                href={`/api/operations/${hotelConfirmation.tripOperationId}/documents/hotel/${hotelConfirmation.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Voucher PDF
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CANCEL")}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel Booking
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "AMEND")}
                className="text-xs font-bold h-8 px-3 text-amber-700 hover:bg-amber-50 border-amber-200 cursor-pointer"
              >
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                Amend Booking
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CONFIRM")}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                Update Voucher #
              </Button>
            </>
          )}

          {/* AMENDED ACTIONS */}
          {status === ConfirmationStatus.AMENDED && (
            <>
              <a
                href={`/api/operations/${hotelConfirmation.tripOperationId}/documents/hotel/${hotelConfirmation.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold h-8 px-3 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 cursor-pointer shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Voucher PDF
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CANCEL")}
                className="text-xs font-semibold h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "AMEND")}
                className="text-xs font-semibold h-8 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Edit Details
              </Button>
              <Button
                size="sm"
                disabled={isReadOnly}
                onClick={() => onOpenDialog(hotelConfirmation, "CONFIRM")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Reconfirm Booking
              </Button>
            </>
          )}

          {/* CANCELLED ACTIONS */}
          {status === ConfirmationStatus.CANCELLED && (
            <Button
              size="sm"
              variant="outline"
              disabled={isReadOnly}
              onClick={() => onOpenDialog(hotelConfirmation, "CONFIRM")}
              className="text-xs font-bold h-8 px-3 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Re-instate / Confirm
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
