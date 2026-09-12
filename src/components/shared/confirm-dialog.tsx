"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Archive, Trash2, Loader2, LucideIcon } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  icon?: LucideIcon;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon: CustomIcon,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      // Errors handled in onConfirm caller
    }
  };

  const getIcon = () => {
    if (CustomIcon) return <CustomIcon className="h-5 w-5" />;
    if (variant === "destructive") return <Trash2 className="h-5 w-5 text-rose-600" />;
    if (variant === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    return <Archive className="h-5 w-5 text-indigo-600" />;
  };

  const getIconBg = () => {
    if (variant === "destructive") return "bg-rose-50 text-rose-600 border-rose-100";
    if (variant === "warning") return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-indigo-50 text-indigo-600 border-indigo-100";
  };

  const getConfirmButtonClasses = () => {
    if (variant === "destructive") {
      return "bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs";
    }
    if (variant === "warning") {
      return "bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs";
    }
    return "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs";
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-xl gap-5">
        <div className="flex items-start gap-4">
          <div
            className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${getIconBg()}`}
          >
            {getIcon()}
          </div>
          <div className="space-y-1.5 pt-0.5 flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                {title}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2.5 pt-2 border-t border-slate-100 bg-transparent -mx-6 -mb-6 p-4 px-6 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleConfirm}
            className={`cursor-pointer px-4 ${getConfirmButtonClasses()}`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
