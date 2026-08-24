"use client";

import * as React from "react";
import { TripOperation } from "@/types";
import { useOperations } from "@/context/operations-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Star,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface CompleteTripModalProps {
  operation: TripOperation;
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteTripModal({
  operation,
  isOpen,
  onClose,
}: CompleteTripModalProps) {
  const { completeTrip, submitFeedback } = useOperations();

  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState(
    "Guests had a wonderful and seamless experience in Kerala! Excellent chauffeur service and great hotels."
  );
  const [recommend, setRecommend] = React.useState(true);

  if (!isOpen) return null;

  const openIssues = operation.issues.filter(
    (i) => i.status === "Open" || i.status === "In Progress"
  );

  const handleConfirmCompletion = () => {
    completeTrip(operation.tripId);
    if (rating && comment.trim()) {
      submitFeedback(operation.tripId, rating, comment.trim(), recommend);
    }
    toast.success(
      `Trip ${operation.bookingNumber} (${operation.title}) marked as Completed!`
    );
    onClose();
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
              <h3 className="text-base font-bold text-slate-900">Mark Trip Completed</h3>
              <p className="text-xs text-slate-500 font-mono">
                {operation.bookingNumber} • {operation.customerSnapshot.name}
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
          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Warning: {openIssues.length} Unresolved Issue(s)
              </span>
              <p className="text-rose-700 text-[11px] mt-0.5">
                You can still complete the trip, but we recommend resolving open customer or supplier tickets first.
              </p>
            </div>
          </div>
        )}

        {/* Completion Checklist */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Trip Completion Verification
          </span>
          <div className="space-y-1.5 text-slate-700">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>All hotel check-outs finalized</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Airport drop / return transfer completed</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Customer safely completed itinerary</span>
            </p>
          </div>
        </div>

        {/* Post-Trip Feedback Section */}
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Customer Experience Rating
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">Guest Review / Feedback Notes</label>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="e.g. Guest praised the houseboat experience and driver punctuality..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium select-none">
            <input
              type="checkbox"
              checked={recommend}
              onChange={(e) => setRecommend(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer"
            />
            <span>Guest would recommend TripDesk / Travel Agency</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCompletion}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
          >
            Confirm & Complete Trip
          </Button>
        </div>
      </div>
    </div>
  );
}
