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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  enquiryClient,
  EnquiryWithRelations,
  EnquiryAssignee,
} from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface AssignLeadModalProps {
  enquiry: EnquiryWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: EnquiryWithRelations) => void;
  isReadOnly?: boolean;
}

export function AssignLeadModal({
  enquiry,
  isOpen,
  onClose,
  onSuccess,
  isReadOnly = false,
}: AssignLeadModalProps) {
  const [assignees, setAssignees] = React.useState<EnquiryAssignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = React.useState(false);
  const [selectedAssigneeKey, setSelectedAssigneeKey] = React.useState<string>("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load authorized assignees when dialog opens
  React.useEffect(() => {
    if (!isOpen || !enquiry) return;

    setError(null);
    setReason("");
    setLoadingAssignees(true);

    enquiryClient
      .getAssignees()
      .then((res) => {
        const list = res.data || [];
        setAssignees(list);
        // Do not silently reinterpret an arbitrary historical string as an authenticated user
        setSelectedAssigneeKey("");
      })
      .catch((err) => {
        console.error("Failed to load agency assignees:", err);
        setError("Failed to load agency team members. Please try again.");
      })
      .finally(() => {
        setLoadingAssignees(false);
      });
  }, [isOpen, enquiry]);

  if (!enquiry) return null;

  const currentOwner = enquiry.assignedTo?.trim() || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isSubmitting) return;

    if (!selectedAssigneeKey) {
      setError("Please select a proposed owner or choose Unassigned before confirming.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let targetName: string | null = null;
      let targetUserId: string | null = null;

      if (selectedAssigneeKey === "__unassigned__") {
        targetName = null;
        targetUserId = null;
      } else if (selectedAssigneeKey.startsWith("user:")) {
        const userId = selectedAssigneeKey.replace("user:", "");
        const matched = assignees.find((a) => a.id === userId);
        targetUserId = userId;
        targetName = matched ? matched.name : null;
      } else if (selectedAssigneeKey.startsWith("name:")) {
        targetName = selectedAssigneeKey.replace("name:", "");
        targetUserId = null;
      } else if (selectedAssigneeKey) {
        targetName = selectedAssigneeKey;
        targetUserId = null;
      }

      const res = await enquiryClient.assignEnquiry(enquiry.id, {
        assignedTo: targetName,
        assignedToUserId: targetUserId,
        currentAssignedTo: enquiry.assignedTo || null,
        reason: reason.trim() || undefined,
      });

      const updated = res.data;
      const newOwnerLabel = updated.assignedTo ? `"${updated.assignedTo}"` : "Unassigned";

      toast.success(
        updated.assignedTo
          ? `Lead reassigned to ${newOwnerLabel}`
          : "Lead unassigned successfully"
      );

      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl select-none">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>Lead Ownership & Handoff</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-1">
              Reassign {enquiry.customer?.name || "this lead"}&apos;s enquiry ({enquiry.enquiryNumber}) to an authorized team member.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <div className="space-y-4 mt-4 text-xs">
            {/* Current vs Proposed Owner Visual Badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Assignment Handoff
              </span>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentOwner ? currentOwner.slice(0, 2).toUpperCase() : <UserX className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-400">Current Owner</span>
                    <span className="font-bold text-slate-800 truncate text-xs">
                      {currentOwner || "Unassigned"}
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />

                <div className="flex items-center gap-2 min-w-0 text-right">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-slate-400">Proposed Owner</span>
                    <span className="font-bold text-indigo-700 truncate text-xs">
                      {selectedAssigneeKey === "__unassigned__"
                        ? "Unassigned"
                        : selectedAssigneeKey.startsWith("user:")
                        ? assignees.find((a) => a.id === selectedAssigneeKey.replace("user:", ""))?.name || "Team Member"
                        : selectedAssigneeKey.replace("name:", "") || "Select below"}
                    </span>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedAssigneeKey === "__unassigned__" ? (
                      <UserMinus className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Assignee Dropdown */}
            <div>
              <Label className="font-bold text-slate-700 block mb-1.5">
                New Owner / Assignee *
              </Label>
              {loadingAssignees ? (
                <div className="flex items-center justify-center h-10 bg-slate-50 rounded-lg border border-slate-200 text-slate-400 text-xs gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                  <span>Loading agency team members...</span>
                </div>
              ) : (
                <Select
                  value={selectedAssigneeKey}
                  onValueChange={(val) => val && setSelectedAssigneeKey(val)}
                  disabled={isReadOnly || isSubmitting}
                >
                  <SelectTrigger className="h-9.5 text-xs bg-white border-slate-200 shadow-2xs">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-xs shadow-lg max-h-56">
                    <SelectItem value="__unassigned__" className="text-amber-700 font-semibold cursor-pointer">
                      <div className="flex items-center gap-2">
                        <UserMinus className="h-3.5 w-3.5 text-amber-600" />
                        <span>Unassigned (Keep in pool)</span>
                      </div>
                    </SelectItem>

                    {assignees.map((a) => {
                      const val = a.id ? `user:${a.id}` : `name:${a.name}`;
                      return (
                        <SelectItem key={val} value={val} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="font-medium text-slate-800 truncate">{a.name}</span>
                              {a.email && a.name !== a.email && (
                                <span className="text-[10px] text-slate-400 truncate">{a.email}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {a.isUser ? "Agency Team" : "Historical"}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Optional Handoff Context / Reason */}
            <div>
              <Label className="font-bold text-slate-700 block mb-1.5">
                Handoff Note / Context (Optional)
              </Label>
              <Textarea
                placeholder="e.g. Reassigning to luxury specialist for customized European honeymoon package..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isReadOnly || isSubmitting}
                rows={2}
                className="bg-slate-50 border-slate-200 text-xs resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Recorded permanently in the enquiry timeline for agency audit integrity.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="bg-white border-slate-200 text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isReadOnly || isSubmitting || loadingAssignees || !selectedAssigneeKey}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 cursor-pointer gap-1.5 shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm Handoff</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
