"use client";

import * as React from "react";
import { Booking, BookingItem, CustomerPayment, BookingDocument } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/costing-engine";
import { triggerDocumentPrint } from "@/lib/booking/document-templates";
import {
  X,
  Printer,
  FileText,
  Hotel,
  Car,
  Ticket,
  CheckCircle2,
  MapPin,
  Calendar,
  Users,
  Compass,
  Phone,
  Mail,
} from "lucide-react";

interface DocumentPreviewModalProps {
  booking: Booking;
  docType: BookingDocument["type"];
  selectedItem?: BookingItem | null;
  selectedPayment?: CustomerPayment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  booking,
  docType,
  selectedItem,
  selectedPayment,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  const agency = booking.agencySnapshot || {
    name: "TripDesk Travel Studio",
    tagline: "Tailor-Made Luxury & Experiential Journeys",
    phone: "+91 98470 12345",
    email: "holidays@tripdesk.in",
    address: "Suite 402, Trade Tower, MG Road, Kochi, Kerala",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-150 print:border-none print:shadow-none print:m-0 print:p-4">
        {/* Modal Toolbar (hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Document Preview
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-indigo-600">{docType}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => triggerDocumentPrint()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── PRINTABLE DOCUMENT BODY ────────────────────────────────────── */}
        <div className="space-y-6 text-slate-900" id="printable-booking-doc">
          {/* Header & Branding */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  <Compass className="h-4 w-4" />
                </div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">{agency.name}</h1>
              </div>
              {agency.tagline && (
                <p className="text-[11px] text-slate-500 italic">{agency.tagline}</p>
              )}
              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                {agency.address && <p>{agency.address}</p>}
                <p>Phone: {agency.phone} | Email: {agency.email}</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                {docType}
              </span>
              <p className="text-xs font-mono font-bold text-slate-900">
                Ref: {booking.bookingNumber}
              </p>
              <p className="text-[10px] text-slate-400">
                Date: {new Date().toISOString().split("T")[0]}
              </p>
            </div>
          </div>

          {/* Customer & Trip Meta Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer Details
              </span>
              <p className="font-bold text-slate-900 text-sm">{booking.customerSnapshot.name}</p>
              <p className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3 w-3 text-slate-400" />
                {booking.customerSnapshot.phone}
              </p>
              {booking.customerSnapshot.email && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {booking.customerSnapshot.email}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Trip Details
              </span>
              <p className="font-bold text-slate-900 text-sm">{booking.title}</p>
              <p className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3 w-3 text-slate-400" />
                {booking.startDate} to {booking.endDate}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-slate-400" />
                {booking.adults} Adults{booking.children > 0 ? `, ${booking.children} Children` : ""}
              </p>
            </div>
          </div>

          {/* ─── DYNAMIC DOCUMENT TYPE CONTENT ───────────────────────────── */}

          {/* 1. HOTEL VOUCHER */}
          {docType === "Hotel Voucher" && selectedItem && (
            <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Hotel className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedItem.title}</h3>
                    <p className="text-xs text-slate-500">{selectedItem.destination}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Confirmation No</span>
                  <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {selectedItem.confirmationNumber || "CONFIRMED"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Check-In</span>
                  <span className="font-bold text-slate-800">{selectedItem.startDate || booking.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Check-Out</span>
                  <span className="font-bold text-slate-800">{selectedItem.endDate || booking.endDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Room Category</span>
                  <span className="font-bold text-slate-800">{selectedItem.roomType || "Deluxe"} ({selectedItem.numberOfRooms || 1} Rooms)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Meal Plan</span>
                  <span className="font-bold text-slate-800">{selectedItem.mealPlan || "CP (Breakfast)"}</span>
                </div>
              </div>

              {selectedItem.notes && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600">
                  <strong>Special Requests / Remarks:</strong> {selectedItem.notes}
                </div>
              )}
            </div>
          )}

          {/* 2. VEHICLE CONFIRMATION */}
          {docType === "Vehicle Confirmation" && selectedItem && (
            <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedItem.title}</h3>
                    <p className="text-xs text-slate-500">{selectedItem.subtitle || "Private Chauffeur Driven Vehicle"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Duty Slip / Ref #</span>
                  <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {selectedItem.confirmationNumber || "CONFIRMED"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Pickup Location</span>
                  <span className="font-bold text-slate-800">{selectedItem.pickupLocation || booking.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Drop Location</span>
                  <span className="font-bold text-slate-800">{selectedItem.dropLocation || booking.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Reporting Time</span>
                  <span className="font-bold text-slate-800">{selectedItem.pickupTime || "As per Flight/Train Arrival"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Chauffeur</span>
                  <span className="font-bold text-slate-800">{selectedItem.driverName || "Driver details shared 4 hrs prior"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Driver Contact</span>
                  <span className="font-bold text-slate-800">{selectedItem.driverPhone || "Will be updated"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. PAYMENT RECEIPT */}
          {docType === "Payment Receipt" && (
            <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Receipt Number</span>
                  <p className="text-xs font-mono font-bold text-slate-900">
                    {selectedPayment?.receiptNumber || `RCPT-2026-0001`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Date</span>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedPayment?.date || new Date().toISOString().split("T")[0]}
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-center space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Amount Received
                </span>
                <p className="text-2xl font-black text-emerald-700">
                  {formatCurrency(selectedPayment?.amount || booking.paidAmount)}
                </p>
                <p className="text-xs text-slate-600">
                  Method: <strong>{selectedPayment?.method || "UPI"}</strong>
                  {selectedPayment?.transactionId && ` (Txn ID: ${selectedPayment.transactionId})`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Total Package</span>
                  <span className="font-bold text-slate-800">{formatCurrency(booking.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Total Paid So Far</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(booking.paidAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Balance Due</span>
                  <span className="font-bold text-amber-600">{formatCurrency(booking.pendingAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. FULL BOOKING CONFIRMATION */}
          {docType === "Booking Confirmation" && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Confirmed Inclusions & Services
              </h3>

              <div className="space-y-2.5">
                {booking.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        {item.type === "Hotel" ? (
                          <Hotel className="h-3.5 w-3.5" />
                        ) : item.type === "Vehicle" ? (
                          <Car className="h-3.5 w-3.5" />
                        ) : (
                          <Ticket className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{item.title}</span>
                        {item.subtitle && <span className="text-[11px] text-slate-500">{item.subtitle}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        <CheckCircle2 className="h-3 w-3" />
                        {item.confirmationNumber || item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Total Package Investment:</span>
                  <span className="text-slate-500 text-[11px]">Includes all taxes, transfers, and confirmed hotel stays.</span>
                </div>
                <span className="text-base font-black text-slate-900">{formatCurrency(booking.totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Footer Terms */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 space-y-1">
            <p>• Please present this official confirmation voucher along with government-issued photo IDs at hotel check-in and pickup.</p>
            <p>• For 24/7 on-tour emergency coordination, contact our guest support helpline at {agency.phone}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
