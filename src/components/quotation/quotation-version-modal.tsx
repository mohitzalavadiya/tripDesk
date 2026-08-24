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
import { Quotation } from "@/types"
import { Copy, Plus, Sparkles, ShieldCheck } from "lucide-react"

interface QuotationVersionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: Quotation | null
  onConfirmVersion: () => void
}

export function QuotationVersionModal({
  open,
  onOpenChange,
  quotation,
  onConfirmVersion,
}: QuotationVersionModalProps) {
  if (!quotation) return null

  const nextVersion = (quotation.version || 1) + 1
  const cleanNumber = quotation.quotationNumber.split("-V")[0]
  const newNumber = `${cleanNumber}-V${nextVersion}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Copy className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <DialogTitle className="text-slate-900 font-bold text-base">
                Create Quotation Version {nextVersion}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-0.5">
                Generate a new revised quotation proposal while keeping previous sent records safe.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <span>Current Proposal Number:</span>
            <span className="font-mono font-bold text-slate-800">{quotation.quotationNumber}</span>
          </div>

          <div className="flex items-center justify-between text-indigo-900 font-bold border-t border-slate-200/60 pt-2">
            <span>New Version Number:</span>
            <span className="font-mono font-black text-indigo-600 text-sm">{newNumber}</span>
          </div>

          <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              The original proposal ({quotation.quotationNumber}) will remain locked in its historical state. The new version will start in <strong>Draft</strong> status for you to edit.
            </p>
          </div>
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
              onConfirmVersion()
              onOpenChange(false)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Version {nextVersion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
