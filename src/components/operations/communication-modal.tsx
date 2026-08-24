"use client";

import * as React from "react";
import { TripOperation, TransportOperation } from "@/types";
import {
  generateCommunicationTemplate,
  CommunicationTemplateType,
} from "@/lib/operations/operations-service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, MessageSquare, Copy, Check, Send } from "lucide-react";

interface CommunicationModalProps {
  operation: TripOperation;
  transport?: TransportOperation;
  initialType?: CommunicationTemplateType;
  isOpen: boolean;
  onClose: () => void;
}

export function CommunicationModal({
  operation,
  transport,
  initialType = "DRIVER_PICKUP",
  isOpen,
  onClose,
}: CommunicationModalProps) {
  const [templateType, setTemplateType] =
    React.useState<CommunicationTemplateType>(initialType);
  const [copied, setCopied] = React.useState(false);

  const messageText = React.useMemo(() => {
    return generateCommunicationTemplate(templateType, operation, transport);
  }, [templateType, operation, transport]);

  const [customText, setCustomText] = React.useState(messageText);

  React.useEffect(() => {
    setCustomText(messageText);
  }, [messageText]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    toast.success("Message copied to clipboard! Ready to paste into WhatsApp / SMS.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = (operation.customerSnapshot.phone || "").replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(customText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Communication Templates</h3>
              <p className="text-xs text-slate-500 font-mono">
                To: {operation.customerSnapshot.name} ({operation.customerSnapshot.phone})
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

        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Select Template Scenario</label>
          <Select
            value={templateType}
            onValueChange={(val) => setTemplateType(val as CommunicationTemplateType)}
          >
            <SelectTrigger className="h-9.5 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="DRIVER_PICKUP">🚐 Chauffeur & Pickup Details</SelectItem>
              <SelectItem value="HOTEL_CHECKIN">🏨 Hotel Check-in Instructions</SelectItem>
              <SelectItem value="TOMORROW_ITINERARY">📅 Tomorrow&apos;s Daily Itinerary</SelectItem>
              <SelectItem value="DELAY_NOTIFICATION">⚠️ Chauffeur Delay Notification</SelectItem>
              <SelectItem value="TRIP_WELCOME">🎉 Trip Welcome & Emergency Contacts</SelectItem>
              <SelectItem value="TRIP_COMPLETED">⭐ Trip Completed & Review Request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message Preview & Editor */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Message Text (Customizable)</label>
          <Textarea
            rows={9}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="text-xs font-mono leading-relaxed bg-slate-50 border-slate-200"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="text-xs font-bold h-9 px-4 rounded-xl cursor-pointer bg-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Copy Message
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Open in WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
