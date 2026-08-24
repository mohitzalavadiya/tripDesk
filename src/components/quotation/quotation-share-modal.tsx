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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Quotation, PublicQuotation } from "@/types"
import {
  getPublicQuotationUrl,
  formatWhatsAppShareText,
  openWhatsAppShare,
  copyQuotationLink,
  shareQuotationNative,
} from "@/lib/quotation/share-helpers"
import {
  Share2,
  Copy,
  Check,
  Send,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"

interface QuotationShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: Quotation | PublicQuotation | null
  onMarkSent?: (id: string) => void
}

export function QuotationShareModal({
  open,
  onOpenChange,
  quotation,
  onMarkSent,
}: QuotationShareModalProps) {
  const [copied, setCopied] = React.useState(false)
  const [targetPhone, setTargetPhone] = React.useState("")

  if (!quotation) return null

  const shareToken = quotation.shareToken || ("quotationNumber" in quotation ? quotation.quotationNumber : "")
  const publicUrl = getPublicQuotationUrl(shareToken)
  const customerName = "customerSnapshot" in quotation ? quotation.customerSnapshot.name : quotation.customer.name
  const initialPhone = "customerSnapshot" in quotation ? quotation.customerSnapshot.phone || "" : ""

  const handleCopy = async () => {
    const success = await copyQuotationLink(shareToken)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsApp = () => {
    openWhatsAppShare(quotation, targetPhone || initialPhone, customerName)
    if (onMarkSent && "id" in quotation) {
      onMarkSent(quotation.id)
    }
    onOpenChange(false)
  }

  const handleNativeShare = async () => {
    await shareQuotationNative(quotation)
    if (onMarkSent && "id" in quotation) {
      onMarkSent(quotation.id)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Share2 className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <DialogTitle className="text-slate-900 font-bold text-base">
                Share Quotation with Customer
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-0.5">
                Generate a secure, customer-safe public link to share directly via WhatsApp, Email, or Web.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          {/* Security Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>100% Confidential:</strong> Internal supplier rates, margins, and agency notes are strictly filtered out. The customer only sees their package price and itinerary.
            </p>
          </div>

          {/* Public Link Copy Box */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700 uppercase">
              Public Quotation URL
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="h-9 text-xs bg-slate-50/60 font-mono text-slate-700 border-slate-200"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                className={`h-9 px-3.5 text-xs font-semibold shrink-0 cursor-pointer ${
                  copied ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </div>

          {/* WhatsApp Helper */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Share via WhatsApp
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Instant Chat
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-emerald-950 uppercase">Customer Phone Number</Label>
              <Input
                placeholder={initialPhone || "e.g. +91 98765 43210"}
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="h-8.5 text-xs bg-white border-emerald-200"
              />
            </div>

            <Button
              type="button"
              onClick={handleWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Open in WhatsApp & Mark as Sent
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-between sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNativeShare}
            className="bg-white border-slate-200 text-xs font-semibold"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Native Share
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white border-slate-200 text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
