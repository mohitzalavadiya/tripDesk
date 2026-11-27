"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enquiryClient, EnquiryWithRelations } from "@/lib/api-client";
import { classifyEnquiryUrgency, STRUCTURED_CONTACT_OUTCOMES } from "@/lib/utils/crm-urgency";
import { getErrorMessage } from "@/lib/utils";
import {
  EnquiryPriority,
  FollowUpStatus,
  FollowUpType,
} from "@prisma/client";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface QuickLogModalProps {
  enquiry: EnquiryWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isReadOnly?: boolean;
  initialFollowUpId?: string | null;
  customerId?: string | null;
}

const INTERACTION_TYPES: { type: FollowUpType; label: string; icon: React.ElementType }[] = [
  { type: FollowUpType.CALL, label: "Phone Call", icon: Phone },
  { type: FollowUpType.WHATSAPP, label: "WhatsApp", icon: MessageSquare },
  { type: FollowUpType.EMAIL, label: "Email", icon: Mail },
  { type: FollowUpType.MEETING, label: "Meeting", icon: Users },
  { type: FollowUpType.OTHER, label: "Other", icon: MoreHorizontal },
];

const OUTCOME_PRESETS: { code: string; label: string; qualifying: boolean }[] = [
  { code: STRUCTURED_CONTACT_OUTCOMES.CONNECTED_MEANINGFUL, label: "Connected / Discussed", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.QUOTATION_DISCUSSED, label: "Quote Discussed", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.REQUIREMENTS_GATHERED, label: "Requirements Gathered", qualifying: true },
  { code: STRUCTURED_CONTACT_OUTCOMES.NO_ANSWER, label: "No Answer", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.BUSY, label: "Busy", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.WRONG_NUMBER, label: "Wrong Number", qualifying: false },
  { code: STRUCTURED_CONTACT_OUTCOMES.MESSAGE_LEFT, label: "Left Message", qualifying: false },
];

export function QuickLogModal({
  enquiry,
  isOpen,
  onClose,
  onSuccess,
  isReadOnly = false,
  initialFollowUpId,
  customerId,
}: QuickLogModalProps) {
  // Classification of current enquiry urgency and primary next action
  const urgencyInfo = React.useMemo(() => {
    if (!enquiry) return null;
    return classifyEnquiryUrgency(enquiry);
  }, [enquiry]);

  // Target pending task: either specifically requested via initialFollowUpId or the primary urgency task
  const primaryTask = urgencyInfo?.primaryNextAction;
  const targetTask = React.useMemo(() => {
    if (initialFollowUpId && enquiry?.followUps) {
      const match = enquiry.followUps.find(
        (f) => f.id === initialFollowUpId && f.status === FollowUpStatus.PENDING && !f.archivedAt
      );
      if (match) {
        return {
          id: match.id,
          type: match.type,
          scheduledAt: new Date(match.scheduledAt),
          notes: match.notes,
          outcome: match.outcome,
          priority: match.priority,
        };
      }
    }
    return primaryTask || null;
  }, [initialFollowUpId, enquiry?.followUps, primaryTask]);

  const toLocalIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Form states
  const [selectedType, setSelectedType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [interactionAt, setInteractionAt] = React.useState<string>(toLocalIso(new Date()));
  const [useCustomTime, setUseCustomTime] = React.useState(false);
  const [outcome, setOutcome] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [completePending, setCompletePending] = React.useState(true);
  const [scheduleNext, setScheduleNext] = React.useState(false);
  const [nextScheduledAt, setNextScheduledAt] = React.useState("");
  const [nextType, setNextType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [nextPriority, setNextPriority] = React.useState<EnquiryPriority>(EnquiryPriority.MEDIUM);
  const [nextNotes, setNextNotes] = React.useState("");

  // Network and retry states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = React.useState("");

  // Initialize or reset form when modal opens for an enquiry
  React.useEffect(() => {
    if (isOpen && enquiry) {
      setSelectedType(targetTask?.type || FollowUpType.CALL);
      setInteractionAt(toLocalIso(new Date()));
      setUseCustomTime(false);
      setOutcome("");
      setNotes("");
      setScheduleNext(false);
      setNextScheduledAt("");
      setNextType(FollowUpType.CALL);
      setNextPriority(EnquiryPriority.MEDIUM);
      setNextNotes("");
      setSubmitError(null);
      setIsSubmitting(false);

      // Pre-select completePending if there is an active pending task
      const hasPending = Boolean(targetTask);
      setCompletePending(hasPending);

      // Generate a single stable idempotency key for this interaction attempt
      const safeCryptoKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setIdempotencyKey(safeCryptoKey);
    }
  }, [isOpen, enquiry?.id, initialFollowUpId]);

  if (!enquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSubmitting) return;

    // Validation
    if (scheduleNext && !nextScheduledAt) {
      setSubmitError("Please select a date and time for the scheduled follow-up.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        type: selectedType,
        interactionAt: useCustomTime && interactionAt ? new Date(interactionAt) : new Date(),
        outcome: outcome.trim() || undefined,
        notes: notes.trim() || undefined,
        customerId: customerId || enquiry.customerId || undefined,
        completePendingFollowUpId: completePending && targetTask ? targetTask.id : undefined,
        completeFollowUpId: completePending && targetTask ? targetTask.id : undefined,
        scheduleNext,
        nextScheduledAt: scheduleNext && nextScheduledAt ? new Date(nextScheduledAt) : undefined,
        nextFollowUpAt: scheduleNext && nextScheduledAt ? new Date(nextScheduledAt) : undefined,
        nextType: scheduleNext ? nextType : undefined,
        nextFollowUpType: scheduleNext ? nextType : undefined,
        nextPriority: scheduleNext ? nextPriority : undefined,
        nextNotes: scheduleNext && nextNotes.trim() ? nextNotes.trim() : undefined,
        nextFollowUpNotes: scheduleNext && nextNotes.trim() ? nextNotes.trim() : undefined,
        idempotencyKey: idempotencyKey || undefined,
      };

      const res = await enquiryClient.logInteraction(enquiry.id, payload);

      if (res.success) {
        toast.success("Interaction logged successfully");
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.error?.message || "Failed to log interaction.");
      }
    } catch (err: any) {
      setSubmitError(getErrorMessage(err, "Failed to log interaction. You can retry."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="w-[calc(100vw-1.25rem)] sm:max-w-md max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-xl rounded-xl p-4 sm:p-5">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Log Contact & Interaction
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {enquiry.customer?.name} • <span className="font-mono text-slate-600">{enquiry.enquiryNumber}</span> ({enquiry.destination})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Existing pending task hint if present */}
        {targetTask && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Existing Action: {targetTask.type}
              </span>
              <span className={`px-1.5 py-0.2 rounded font-medium ${
                urgencyInfo?.urgency === "OVERDUE"
                  ? "bg-rose-100 text-rose-700"
                  : urgencyInfo?.urgency === "DUE_TODAY"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {urgencyInfo?.badgeLabel}
              </span>
            </div>
            {targetTask.notes && (
              <p className="text-[11px] text-slate-600 italic">
                &ldquo;{targetTask.notes}&rdquo;
              </p>
            )}
            <label className="flex items-center gap-2 pt-1 cursor-pointer font-medium text-slate-800 select-none text-[11px]">
              <input
                type="checkbox"
                checked={completePending}
                onChange={(e) => setCompletePending(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Mark this pending task as completed with this log
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Interaction Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Interaction Channel</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {INTERACTION_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedType(item.type)}
                    className={`flex flex-col items-center justify-center min-w-0 p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-50 border-teal-500 text-teal-800 shadow-2xs ring-1 ring-teal-400"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-1 shrink-0 ${isSelected ? "text-teal-600" : "text-slate-500"}`} />
                    <span className="text-[10px] sm:text-[11px] leading-tight text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedType === FollowUpType.WHATSAPP && (
              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-md p-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>
                  Logging a WhatsApp interaction records this customer touchpoint in your CRM. It does not send an outbound WhatsApp message.
                </span>
              </p>
            )}
          </div>

          {/* Interaction Timestamp & Time Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] bg-slate-50/70 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              Timestamp: <strong className="text-slate-800">{useCustomTime ? "Custom" : "Just now"}</strong>
            </span>
            <button
              type="button"
              onClick={() => setUseCustomTime(!useCustomTime)}
              className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline text-[10px]"
            >
              {useCustomTime ? "Use Current Time" : "Change Time"}
            </button>
          </div>

          {useCustomTime && (
            <div className="space-y-1 animate-in fade-in-50 duration-150">
              <Label htmlFor="interaction-time" className="text-[11px] font-semibold text-slate-700">
                Recorded Interaction Time
              </Label>
              <Input
                id="interaction-time"
                type="datetime-local"
                value={interactionAt}
                onChange={(e) => setInteractionAt(e.target.value)}
                className="text-xs h-8 bg-white"
              />
            </div>
          )}

          {/* Outcome / Summary */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
              <Label htmlFor="interaction-outcome" className="text-xs font-semibold text-slate-700">
                Outcome Summary
              </Label>
              <span className="text-[10px] text-slate-400">Select preset or type below</span>
            </div>

            {/* Structured outcome preset chips */}
            <div className="flex flex-wrap gap-1">
              {OUTCOME_PRESETS.map((p) => {
                const isActive = outcome === p.code || outcome === p.label;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setOutcome(p.code)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                      isActive
                        ? p.qualifying
                          ? "bg-teal-100 text-teal-800 border-teal-300 font-semibold shadow-2xs"
                          : "bg-rose-100 text-rose-800 border-rose-300 font-semibold shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <Input
              id="interaction-outcome"
              placeholder="e.g. Discussed 5-star packages, client asked for revised quotes"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="text-xs h-9 bg-white"
            />

            {/* Informative notice for non-qualifying contact attempts */}
            {OUTCOME_PRESETS.some((p) => !p.qualifying && (outcome === p.code || outcome.toLowerCase().includes(p.label.toLowerCase()))) && (
              <p className="text-[10px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Unsuccessful contact attempt will complete this task, but does not reset the 7-day stale clock.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="interaction-notes" className="text-xs font-semibold text-slate-700">
              Detailed Notes <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="interaction-notes"
              rows={3}
              placeholder="Record any specific requirements, budget preferences, or conversation details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-white resize-none"
            />
          </div>

          {/* Schedule Next Follow-up Option */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-slate-800 select-none">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Calendar className="h-3.5 w-3.5 text-teal-600" />
              Schedule next follow-up action
            </label>

            {scheduleNext && (
              <div className="bg-teal-50/40 border border-teal-100 rounded-lg p-3 space-y-2.5 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="next-date" className="text-[11px] font-semibold text-slate-700">
                        Scheduled Date & Time *
                      </Label>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      {[
                        { label: "Tomorrow", offset: 1 },
                        { label: "+2 Days", offset: 2 },
                        { label: "+1 Week", offset: 7 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const target = new Date();
                            target.setDate(target.getDate() + preset.offset);
                            target.setHours(10, 0, 0, 0);
                            setNextScheduledAt(toLocalIso(target));
                          }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer shadow-2xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <Input
                      id="next-date"
                      type="datetime-local"
                      required={scheduleNext}
                      value={nextScheduledAt}
                      onChange={(e) => setNextScheduledAt(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="next-type" className="text-[11px] font-semibold text-slate-700">
                      Channel
                    </Label>
                    <Select
                      value={nextType}
                      onValueChange={(val) => setNextType(val as FollowUpType)}
                    >
                      <SelectTrigger id="next-type" className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FollowUpType.CALL}>Phone Call</SelectItem>
                        <SelectItem value={FollowUpType.WHATSAPP}>WhatsApp</SelectItem>
                        <SelectItem value={FollowUpType.EMAIL}>Email</SelectItem>
                        <SelectItem value={FollowUpType.MEETING}>Meeting</SelectItem>
                        <SelectItem value={FollowUpType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="next-notes" className="text-[11px] font-semibold text-slate-700">
                    Follow-up Instructions <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="next-notes"
                    placeholder="e.g. Call to finalize flight selection"
                    value={nextNotes}
                    onChange={(e) => setNextNotes(e.target.value)}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error display if submission fails (retains state) */}
          {submitError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Save Failed</p>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full sm:w-auto justify-center text-xs h-8"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isReadOnly}
              className="w-full sm:w-auto justify-center text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 cursor-pointer gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {submitError ? "Retry Save" : "Save Interaction"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
