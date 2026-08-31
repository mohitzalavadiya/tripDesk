"use client";

import * as React from "react";
import {
  OperationDetailWithRelations,
  VehicleDispatchWithDetails,
  HotelConfirmationWithDetails,
  ActivityConfirmationWithDetails,
  operationsClient,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  X,
  MessageSquare,
  Copy,
  Check,
  Send,
  Car,
  Hotel,
  Compass,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";

export type CommunicationTemplateType =
  | "DRIVER_PICKUP"
  | "HOTEL_VOUCHER"
  | "ACTIVITY_PASS"
  | "WELCOME_BRIEFING"
  | "EMERGENCY_BROADCAST";

interface CommunicationModalProps {
  operation: OperationDetailWithRelations;
  initialTemplate?: CommunicationTemplateType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CommunicationModal({
  operation,
  initialTemplate = "DRIVER_PICKUP",
  isOpen,
  onClose,
  onSuccess,
}: CommunicationModalProps) {
  const [templateType, setTemplateType] =
    React.useState<CommunicationTemplateType>(initialTemplate);
  const [copied, setCopied] = React.useState(false);
  const [logging, setLogging] = React.useState(false);

  const customerName = operation.trip.customer.name;
  const customerPhone = operation.trip.customer.phone || "";
  const tripTitle = operation.trip.title;
  const tripNumber = operation.trip.tripNumber || "N/A";

  // Compute template body dynamically
  const generatedBody = React.useMemo(() => {
    const primaryDispatch = operation.vehicleDispatches?.[0];
    const primaryHotel = operation.hotelConfirmations?.[0];
    const primaryActivity = operation.activityConfirmations?.[0];

    switch (templateType) {
      case "DRIVER_PICKUP": {
        const driverName = primaryDispatch?.driverName || "Assigned Driver";
        const driverPhone = primaryDispatch?.driverPhone || "Contact Operations";
        const plate =
          primaryDispatch?.vehicle?.registrationNumber ||
          (primaryDispatch as any)?.vehiclePlate ||
          "Plate Pending";
        const vehicle =
          primaryDispatch?.tripVehicle?.vehicleName ||
          primaryDispatch?.vehicle?.name ||
          "Private AC Vehicle";
        const pickupLoc =
          primaryDispatch?.pickupLocation ||
          primaryDispatch?.tripVehicle?.pickupLocation ||
          "Airport / Hotel Lobby";
        const pickupTime =
          (primaryDispatch as any)?.scheduledTime ||
          (primaryDispatch?.tripVehicle?.startDate
            ? new Date(primaryDispatch.tripVehicle.startDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Scheduled Pickup Time");

        return `🚗 *TripDesk Chauffeur & Transfer Dispatch Details*\n\nDear *${customerName}*,\n\nYour chauffeur for *${tripTitle}* (${tripNumber}) has been dispatched:\n\n👤 *Driver Name:* ${driverName}\n📞 *Driver Contact:* ${driverPhone}\n🚙 *Vehicle:* ${vehicle} (${plate})\n📍 *Pickup Location:* ${pickupLoc}\n⏰ *Pickup Time:* ${pickupTime}\n\nPlease keep your phone reachable. For urgent coordination, contact operations desk. Have a pleasant journey!`;
      }

      case "HOTEL_VOUCHER": {
        const hotelName =
          primaryHotel?.tripHotel?.hotel?.name ||
          (primaryHotel as any)?.hotel?.name ||
          "Confirmed Accommodation";
        const city =
          primaryHotel?.tripHotel?.hotel?.city ||
          (primaryHotel as any)?.hotel?.city ||
          "Destination";
        const room = primaryHotel?.roomDetails || "Standard Room";
        const voucher =
          primaryHotel?.confirmationNumber || "Voucher Generated";

        return `🏨 *TripDesk Accommodation Confirmation*\n\nDear *${customerName}*,\n\nYour hotel stay details for *${tripTitle}* are confirmed:\n\n🏢 *Hotel:* ${hotelName}\n📍 *City:* ${city}\n🛏️ *Room Type:* ${room}\n📋 *Confirmation Voucher #:* ${voucher}\n\nPresent this message or your TripDesk Voucher PDF at the front desk during check-in. Wish you a wonderful stay!`;
      }

      case "ACTIVITY_PASS": {
        const actName =
          primaryActivity?.tripActivity?.name ||
          primaryActivity?.activity?.name ||
          "Sightseeing Excursion";
        const loc =
          primaryActivity?.tripActivity?.location ||
          primaryActivity?.activity?.location ||
          "Excursion Point";
        const passNo =
          primaryActivity?.ticketNumber ||
          primaryActivity?.confirmationNumber ||
          "E-PASS-CONFIRMED";
        const time = primaryActivity?.tripActivity?.time || "09:30 AM";

        return `🎟️ *TripDesk Activity & Sightseeing E-Pass*\n\nDear *${customerName}*,\n\nYour entry pass for *${actName}* is ready:\n\n🎯 *Activity:* ${actName}\n📍 *Meeting Point:* ${loc}\n⏰ *Reporting Time:* ${time}\n🎫 *E-Ticket / Pass #:* ${passNo}\n\nPlease arrive 15 minutes prior to the scheduled slot. Enjoy the experience!`;
      }

      case "WELCOME_BRIEFING": {
        const startDate = new Date(operation.trip.startDate).toLocaleDateString(
          "en-IN",
          { day: "numeric", month: "short", year: "numeric" }
        );
        return `🌟 *Welcome to Your Holiday Experience!*\n\nDear *${customerName}*,\n\nGreetings from TripDesk Operations! Your tour *${tripTitle}* begins on *${startDate}*.\n\nAll your hotel vouchers, transport dispatches, and excursion passes have been prepared. Your 24x7 operations emergency desk is active.\n\nHave an unforgettable journey!`;
      }

      case "EMERGENCY_BROADCAST": {
        return `⚠️ *Important Operations Notice*\n\nDear *${customerName}*,\n\nPlease note an important operational update regarding your itinerary *${tripTitle}* (${tripNumber}).\n\nOur operations support team is actively assisting you. Please reach out to your tour manager for immediate coordination.`;
      }

      default:
        return "";
    }
  }, [templateType, operation, customerName, tripTitle, tripNumber]);

  const [messageBody, setMessageBody] = React.useState(generatedBody);

  React.useEffect(() => {
    setMessageBody(generatedBody);
  }, [generatedBody]);

  if (!isOpen) return null;

  const logDispatch = async (channel: "WHATSAPP" | "SMS") => {
    try {
      setLogging(true);
      await operationsClient.logCommunication(operation.id, {
        channel,
        recipientName: customerName,
        recipientPhone: customerPhone,
        templateType,
        messageBody,
      });
      if (onSuccess) onSuccess();
    } catch {
      // Non-blocking log failure
    } finally {
      setLogging(false);
    }
  };

  const handleCopy = async () => {
    navigator.clipboard.writeText(messageBody);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    await logDispatch("SMS");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(messageBody);
    await logDispatch("WHATSAPP");
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
    toast.success("Opening WhatsApp & logged communication event.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Guest Communication</h3>
              <p className="text-xs text-slate-500 font-mono">
                {customerName} • {customerPhone || "No Phone"}
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
            <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="DRIVER_PICKUP">🚗 Chauffeur & Pickup Details</SelectItem>
              <SelectItem value="HOTEL_VOUCHER">🏨 Hotel Check-in & Voucher</SelectItem>
              <SelectItem value="ACTIVITY_PASS">🎟️ Excursion & Activity E-Pass</SelectItem>
              <SelectItem value="WELCOME_BRIEFING">🌟 Welcome Briefing & Itinerary</SelectItem>
              <SelectItem value="EMERGENCY_BROADCAST">⚠️ Operations Alert / Broadcast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message Preview / Editor */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Message Content (WhatsApp / SMS)</span>
            <span className="text-[11px] font-normal text-slate-400">Editable preview</span>
          </label>
          <Textarea
            rows={8}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            className="text-xs font-mono leading-relaxed bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            disabled={logging}
            className="text-xs font-bold h-9 px-3.5 border-slate-200 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                Copy Text
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs font-semibold h-9 px-3 text-slate-500 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={logging || !customerPhone}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
