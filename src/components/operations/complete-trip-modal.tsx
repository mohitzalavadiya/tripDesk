"use client";

import * as React from "react";
import { OperationStatus, IssueStatus } from "@prisma/client";
import { operationsClient, OperationDetailWithRelations } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Star,
  Hotel,
  Car,
  Compass,
  FileCheck2,
} from "lucide-react";

interface CompleteTripModalProps {
  operation: OperationDetailWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompleteTripModal({
  operation,
  isOpen,
  onClose,
  onSuccess,
}: CompleteTripModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [rating, setRating] = React.useState<number>(5);
  const [closingNotes, setClosingNotes] = React.useState(
    "Guests successfully completed tour. All hotel, transfer, and excursion services delivered seamlessly."
  );

  if (!isOpen) return null;

  const openIssues = operation.issues?.filter(
    (i) => i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS
  ) || [];

  const totalHotels = operation.hotelConfirmations?.length || 0;
  const confirmedHotels =
    operation.hotelConfirmations?.filter(
      (h) => h.status === "CONFIRMED" || h.status === "AMENDED"
    ).length || 0;

  const totalVehicles = operation.vehicleDispatches?.length || 0;
  const completedVehicles =
    operation.vehicleDispatches?.filter(
      (v) => v.status === "COMPLETED" || v.status === "CONFIRMED" || v.status === "ON_DUTY"
    ).length || 0;

  const totalActivities = operation.activityConfirmations?.length || 0;
  const confirmedActivities =
    operation.activityConfirmations?.filter(
      (a) => a.status === "CONFIRMED" || a.status === "AMENDED"
    ).length || 0;

  const handleConfirmCompletion = async () => {
    try {
      setLoading(true);
      const notesWithRating = `[Rating: ${rating}/5 Stars] ${closingNotes.trim()}`;

      await operationsClient.updateOperation(operation.id, {
        status: OperationStatus.COMPLETED,
        notes: notesWithRating,
      });

      toast.success(
        `Tour "${operation.trip.title}" successfully completed & reconciled!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete tour. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Post-Tour Completion & Settlement</h3>
              <p className="text-xs text-slate-500 font-mono">
                {operation.trip.tripNumber} • {operation.trip.customer.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning if open issues exist */}
        {openIssues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Attention: {openIssues.length} Unresolved Operational Issue(s)
              </span>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Completing the tour will finalize the operation. We recommend verifying or closing open operational issues.
              </p>
            </div>
          </div>
        )}

        {/* Operational Service Delivery Breakdown */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Operational Delivery Checklist
          </span>
          <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
            <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-center">
              <Hotel className="h-3.5 w-3.5 mx-auto text-indigo-500 mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold block">Hotels</span>
              <span className="font-bold text-slate-900">{confirmedHotels}/{totalHotels} Confirmed</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-center">
              <Car className="h-3.5 w-3.5 mx-auto text-emerald-500 mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold block">Fleet & Driver</span>
              <span className="font-bold text-slate-900">{completedVehicles}/{totalVehicles} Dispatched</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-center">
              <Compass className="h-3.5 w-3.5 mx-auto text-purple-500 mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold block">Activities</span>
              <span className="font-bold text-slate-900">{confirmedActivities}/{totalActivities} Delivered</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <FileCheck2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Underlying <strong>Trip</strong> and <strong>Booking</strong> records will automatically be marked <strong>COMPLETED</strong>.</span>
          </div>
        </div>

        {/* Customer Satisfaction Rating */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Overall Guest Satisfaction Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform cursor-pointer"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200 fill-slate-50"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-slate-700 ml-2">
              {rating === 5 && "Excellent (5/5)"}
              {rating === 4 && "Very Good (4/5)"}
              {rating === 3 && "Average (3/5)"}
              {rating === 2 && "Needs Improvement (2/5)"}
              {rating === 1 && "Poor (1/5)"}
            </span>
          </div>
        </div>

        {/* Closing Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Operations Debrief & Settlement Notes</label>
          <Textarea
            rows={3}
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Add any post-tour reconciliation remarks or feedback..."
            className="text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCompletion}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Completing...
              </>
            ) : (
              "Complete Tour & Settle"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
