"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, AlertTriangle, ShieldCheck } from "lucide-react"

interface LockCostingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: "lock" | "unlock"
  onConfirm: () => void
}

export function LockCostingModal({
  open,
  onOpenChange,
  actionType,
  onConfirm,
}: LockCostingModalProps) {
  const isLock = actionType === "lock"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                isLock ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
              }`}
            >
              {isLock ? <Lock className="h-5 w-5 stroke-[1.8]" /> : <Unlock className="h-5 w-5 stroke-[1.8]" />}
            </div>
            <div>
              <DialogTitle className="text-slate-900 font-bold text-base">
                {isLock ? "Lock Trip Costing?" : "Unlock Trip Costing?"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-0.5">
                {isLock
                  ? "Locking prevents accidental edits or automatic inventory overwrites to finalized financial values."
                  : "Unlocking allows financial rates, manual items, markups, and customer pricing to be modified again."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
          {isLock ? (
            <>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Rate snapshots and margins will be locked</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Changes to inventory or trip dates will not alter the locked costing until explicitly unlocked.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Editing controls will be re-enabled</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ensure you re-verify profit and margin after making commercial adjustments.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white border-slate-200 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={`text-white font-semibold text-xs px-5 shadow-xs ${
              isLock ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLock ? "Yes, Lock Costing" : "Unlock Costing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
