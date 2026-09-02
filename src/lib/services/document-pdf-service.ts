import "server-only";

import PDFDocument from "pdfkit";

export interface PdfAgencyInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo?: string | null;
}

export interface PdfCustomerInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
}

export interface HotelVoucherPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber: string;
  bookingNumber?: string | null;
  hotelName: string;
  hotelAddress?: string | null;
  hotelPhone?: string | null;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  roomDetails?: string | null;
  mealPlan?: string | null;
  confirmationNumber?: string | null;
  travelersCount?: number;
  guestNames?: string[];
  notes?: string | null;
}

export interface VehicleVoucherPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber: string;
  bookingNumber?: string | null;
  vehicleName: string;
  vehicleCategory?: string | null;
  vehicleNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  pickupDate?: Date | string | null;
  pickupTime?: string | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  notes?: string | null;
}

export interface ActivityVoucherPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber: string;
  bookingNumber?: string | null;
  activityName: string;
  activityLocation?: string | null;
  activityDate?: Date | string | null;
  activityTime?: string | null;
  ticketNumber?: string | null;
  confirmationNumber?: string | null;
  participantsCount?: number;
  inclusions?: string[];
  exclusions?: string[];
  notes?: string | null;
}

export interface BookingConfirmationPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber: string;
  tripTitle: string;
  bookingNumber: string;
  bookingDate: Date | string | null;
  travelStartDate?: Date | string | null;
  travelEndDate?: Date | string | null;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  currency: string;
  hotels: Array<{
    name: string;
    city?: string | null;
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    roomType?: string | null;
  }>;
  vehicles: Array<{
    name: string;
    pickupDate?: Date | string | null;
    pickupLocation?: string | null;
  }>;
  activities: Array<{
    name: string;
    date?: Date | string | null;
  }>;
  notes?: string | null;
}

export interface CustomerItineraryPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber: string;
  tripTitle: string;
  bookingNumber?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  itineraryDays: Array<{
    dayNumber: number;
    title: string;
    description?: string | null;
    date?: Date | string | null;
  }>;
  hotels: Array<{
    name: string;
    city?: string | null;
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
    roomType?: string | null;
    mealPlan?: string | null;
  }>;
  vehicles: Array<{
    name: string;
    pickupDate?: Date | string | null;
    pickupLocation?: string | null;
    dropLocation?: string | null;
  }>;
  activities: Array<{
    name: string;
    date?: Date | string | null;
    time?: string | null;
  }>;
  emergencyContact?: string | null;
  notes?: string | null;
}

export interface PaymentReceiptPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  customer: PdfCustomerInfo;
  tripNumber?: string | null;
  bookingNumber?: string | null;
  paymentNumber: string;
  receiptNumber?: string | null;
  paymentDate: Date | string | null;
  amount: number | string;
  currency: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  totalBookingAmount?: number | string | null;
  cumulativePaidAmount?: number | string | null;
  remainingBalance?: number | string | null;
  notes?: string | null;
}

export interface SupplierVoucherPdfData {
  documentNumber: string;
  version: number;
  issuedAt?: Date | string | null;
  agency: PdfAgencyInfo;
  supplierName: string;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  guestName: string;
  guestPhone?: string | null;
  tripNumber: string;
  bookingNumber?: string | null;
  serviceType: string;
  serviceName: string;
  serviceDates: string;
  confirmationReference?: string | null;
  operationalDetails: string[];
  notes?: string | null;
}

export class DocumentPdfService {
  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return "TBD";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(date);
    }
  }

  private formatAmount(val: number | string | null | undefined, currency = "INR"): string {
    if (val === null || val === undefined) return "₹0";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0";
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HOTEL VOUCHER
  // ═══════════════════════════════════════════════════════════════════════════

  async renderHotelVoucher(data: HotelVoucherPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Hotel Voucher - ${data.hotelName}`,
            Author: data.agency.name,
            Subject: `Voucher ${data.documentNumber} v${data.version}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#0F766E";
        const darkColor = "#042F2E";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#99F6E4")
          .text("OFFICIAL HOTEL ACCOMMODATION VOUCHER", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#CCFBF1")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`VOUCHER #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Version: v${data.version} • Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Trip Ref: ${data.tripNumber} ${data.bookingNumber ? `• Booking: ${data.bookingNumber}` : ""}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Guest Card
        doc.rect(margin, y, contentWidth, 50).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("PRIMARY GUEST / LEAD TRAVELER", margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.customer.name, margin + 15, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          [data.customer.phone, data.customer.email, data.customer.city].filter(Boolean).join(" • "),
          margin + 15,
          y + 36
        );

        if (data.confirmationNumber) {
          doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("HOTEL CONFIRMATION REF", margin + contentWidth - 200, y + 10, { width: 185, align: "right" });
          doc.fillColor(brandColor).fontSize(12).font("Helvetica-Bold").text(data.confirmationNumber, margin + contentWidth - 200, y + 23, { width: 185, align: "right" });
        }

        y += 62;

        // Property Card
        doc.rect(margin, y, contentWidth, 80).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(13).font("Helvetica-Bold").text(data.hotelName, margin + 15, y + 12);
        if (data.hotelAddress) {
          doc.fillColor("#64748B").fontSize(8.5).font("Helvetica").text(data.hotelAddress, margin + 15, y + 28, { width: contentWidth - 30 });
        }

        // Dates Strip
        const checkInStr = this.formatDate(data.checkIn);
        const checkOutStr = this.formatDate(data.checkOut);

        doc.rect(margin + 15, y + 46, (contentWidth - 40) / 2, 24).fill("#F1F5F9");
        doc.fillColor("#475569").fontSize(8).font("Helvetica").text(`Check-in: ${checkInStr}`, margin + 22, y + 54);

        doc.rect(margin + 20 + (contentWidth - 40) / 2, y + 46, (contentWidth - 40) / 2, 24).fill("#F1F5F9");
        doc.fillColor("#475569").fontSize(8).font("Helvetica").text(`Check-out: ${checkOutStr}`, margin + 27 + (contentWidth - 40) / 2, y + 54);

        y += 92;

        // Room & Board Details
        doc.rect(margin, y, contentWidth, 60).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Room Category & Meal Plan", margin + 15, y + 10);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Room Type: ${data.roomDetails || "Standard Room"}`, margin + 15, y + 26);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Meal Plan: ${data.mealPlan || "Room Only"}`, margin + 15, y + 40);

        y += 72;

        // Special Instructions & Terms
        doc.rect(margin, y, contentWidth, 80).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Important Hotel Instructions", margin + 15, y + 10);
        const instructions = [
          "• Please present this voucher along with a valid government photo ID for all adult guests at check-in.",
          "• Standard check-in time is usually 14:00 and check-out is 11:00 (subject to hotel policies).",
          "• Personal incidentals, mini-bar, laundry, and room service charges must be settled directly with the hotel.",
          data.notes ? `• Special Request: ${data.notes}` : null,
        ].filter(Boolean);

        let iy = y + 24;
        for (const inst of instructions) {
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica").text(inst as string, margin + 15, iy, { width: contentWidth - 30 });
          iy += 11;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • For emergency support call ${data.agency.phone || "your travel advisor"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VEHICLE / TRANSPORT VOUCHER
  // ═══════════════════════════════════════════════════════════════════════════

  async renderVehicleVoucher(data: VehicleVoucherPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Vehicle Voucher - ${data.vehicleName}`,
            Author: data.agency.name,
            Subject: `Voucher ${data.documentNumber} v${data.version}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#1D4ED8"; // Blue 700
        const darkColor = "#1E1B4B"; // Indigo 950

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#93C5FD")
          .text("OFFICIAL TRANSPORT & TRANSFER VOUCHER", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#DBEAFE")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`VOUCHER #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Version: v${data.version} • Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Trip Ref: ${data.tripNumber} ${data.bookingNumber ? `• Booking: ${data.bookingNumber}` : ""}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Guest Card
        doc.rect(margin, y, contentWidth, 50).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("PASSENGER / CONTACT PERSON", margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.customer.name, margin + 15, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          [data.customer.phone, data.customer.email].filter(Boolean).join(" • "),
          margin + 15,
          y + 36
        );

        y += 62;

        // Vehicle & Transfer Details
        doc.rect(margin, y, contentWidth, 75).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(13).font("Helvetica-Bold").text(data.vehicleName, margin + 15, y + 12);
        doc.fillColor("#64748B").fontSize(8.5).font("Helvetica").text(`Category: ${data.vehicleCategory || "Private AC Vehicle"}`, margin + 15, y + 28);

        if (data.vehicleNumber) {
          doc.fillColor("#334155").fontSize(8.5).font("Helvetica-Bold").text(`Vehicle Reg: ${data.vehicleNumber}`, margin + 15, y + 42);
        }

        // Driver contact if available
        if (data.driverName) {
          doc.fillColor("#0F172A").fontSize(9).font("Helvetica-Bold").text("Assigned Chauffeur / Driver:", margin + contentWidth - 220, y + 12, { width: 205, align: "right" });
          doc.fillColor(brandColor).fontSize(11).font("Helvetica-Bold").text(data.driverName, margin + contentWidth - 220, y + 26, { width: 205, align: "right" });
          if (data.driverPhone) {
            doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(data.driverPhone, margin + contentWidth - 220, y + 40, { width: 205, align: "right" });
          }
        }

        y += 87;

        // Schedule & Pickup Route
        doc.rect(margin, y, contentWidth, 70).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Transfer Route & Schedule", margin + 15, y + 10);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Pickup Date & Time: ${this.formatDate(data.pickupDate)} at ${data.pickupTime || "As scheduled"}`, margin + 15, y + 26);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Pickup Location: ${data.pickupLocation || "Airport / Hotel Lobby"}`, margin + 15, y + 38);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Drop Location: ${data.dropLocation || "As per confirmed itinerary"}`, margin + 15, y + 50);

        y += 82;

        // Important Transfer Instructions
        doc.rect(margin, y, contentWidth, 80).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Important Transfer Notes", margin + 15, y + 10);
        const instructions = [
          "• Driver contact numbers will also be re-confirmed via WhatsApp prior to scheduled pickup.",
          "• Standard waiting time at airports is 60 minutes post flight landing; for hotels 15 minutes.",
          "• Toll, parking, and state permits are covered as per booking confirmation.",
          data.notes ? `• Note: ${data.notes}` : null,
        ].filter(Boolean);

        let iy = y + 24;
        for (const inst of instructions) {
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica").text(inst as string, margin + 15, iy, { width: contentWidth - 30 });
          iy += 11;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Helpline: ${data.agency.phone || "Available on portal"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ACTIVITY VOUCHER
  // ═══════════════════════════════════════════════════════════════════════════

  async renderActivityVoucher(data: ActivityVoucherPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Activity Voucher - ${data.activityName}`,
            Author: data.agency.name,
            Subject: `Voucher ${data.documentNumber} v${data.version}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#7C3AED"; // Purple 600
        const darkColor = "#3B0764"; // Purple 950

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#DDD6FE")
          .text("OFFICIAL ACTIVITY & SIGHTSEEING PASS", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#EDE9FE")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`VOUCHER #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Version: v${data.version} • Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Trip Ref: ${data.tripNumber} ${data.bookingNumber ? `• Booking: ${data.bookingNumber}` : ""}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Guest Card
        doc.rect(margin, y, contentWidth, 50).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("PASS HOLDER", margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.customer.name, margin + 15, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          [data.customer.phone, data.customer.email].filter(Boolean).join(" • "),
          margin + 15,
          y + 36
        );

        if (data.ticketNumber || data.confirmationNumber) {
          doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("TICKET / PASS REF", margin + contentWidth - 200, y + 10, { width: 185, align: "right" });
          doc.fillColor(brandColor).fontSize(12).font("Helvetica-Bold").text(data.ticketNumber || data.confirmationNumber || "", margin + contentWidth - 200, y + 23, { width: 185, align: "right" });
        }

        y += 62;

        // Activity Card
        doc.rect(margin, y, contentWidth, 65).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(13).font("Helvetica-Bold").text(data.activityName, margin + 15, y + 12);
        doc.fillColor("#64748B").fontSize(8.5).font("Helvetica").text(`Location / Venue: ${data.activityLocation || "As confirmed"}`, margin + 15, y + 28);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Date & Time: ${this.formatDate(data.activityDate)} at ${data.activityTime || "Confirmed slot"}`, margin + 15, y + 42);

        y += 77;

        // Inclusions & Highlights
        if (data.inclusions && data.inclusions.length > 0) {
          doc.rect(margin, y, contentWidth, 60).fillAndStroke("#F8FAFC", "#E2E8F0");
          doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Confirmed Inclusions", margin + 15, y + 10);
          let inY = y + 26;
          for (const inc of data.inclusions.slice(0, 3)) {
            doc.fillColor("#334155").fontSize(8).font("Helvetica").text(`✓ ${inc}`, margin + 15, inY);
            inY += 11;
          }
          y += 72;
        }

        // Instructions
        doc.rect(margin, y, contentWidth, 75).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Visitor Guidelines", margin + 15, y + 10);
        const instructions = [
          "• Please arrive at the meeting point or ticket counter at least 15 minutes prior to scheduled start time.",
          "• Display this digital or printed pass along with a valid ID proof for verification.",
          data.notes ? `• Special Note: ${data.notes}` : null,
        ].filter(Boolean);

        let iy = y + 24;
        for (const inst of instructions) {
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica").text(inst as string, margin + 15, iy, { width: contentWidth - 30 });
          iy += 11;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Contact: ${data.agency.phone || "Available on customer portal"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BOOKING CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════

  async renderBookingConfirmation(data: BookingConfirmationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Booking Confirmation - ${data.bookingNumber}`,
            Author: data.agency.name,
            Subject: `Confirmation ${data.documentNumber}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#047857"; // Emerald 700
        const darkColor = "#064E3B"; // Emerald 900

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#A7F3D0")
          .text("OFFICIAL TRAVEL BOOKING CONFIRMATION", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#D1FAE5")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`DOC #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Booking: ${data.bookingNumber} • Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Trip Ref: ${data.tripNumber}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Trip & Customer Overview Card
        doc.rect(margin, y, contentWidth, 65).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(12).font("Helvetica-Bold").text(data.tripTitle, margin + 15, y + 10);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(
          `Travel Dates: ${this.formatDate(data.travelStartDate)} — ${this.formatDate(data.travelEndDate)}`,
          margin + 15,
          y + 26
        );
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          `Primary Traveler: ${data.customer.name} • ${data.customer.phone || ""} • ${data.customer.email || ""}`,
          margin + 15,
          y + 40
        );

        y += 77;

        // Financial Summary Box (Zero Commercial Cost Leakage)
        doc.rect(margin, y, contentWidth, 48).fillAndStroke("#ECFDF5", "#A7F3D0");
        doc.fillColor("#065F46").fontSize(8).font("Helvetica-Bold").text("TOTAL PACKAGE INVESTMENT", margin + 15, y + 10);
        doc.fillColor("#064E3B").fontSize(13).font("Helvetica-Bold").text(this.formatAmount(data.totalAmount, data.currency), margin + 15, y + 24);

        doc.fillColor("#065F46").fontSize(8).font("Helvetica-Bold").text("AMOUNT RECEIVED", margin + 180, y + 10);
        doc.fillColor("#047857").fontSize(13).font("Helvetica-Bold").text(this.formatAmount(data.paidAmount, data.currency), margin + 180, y + 24);

        doc.fillColor("#065F46").fontSize(8).font("Helvetica-Bold").text("BALANCE DUE", margin + 340, y + 10);
        doc.fillColor(Number(data.balanceAmount) > 0 ? "#DC2626" : "#047857").fontSize(13).font("Helvetica-Bold").text(this.formatAmount(data.balanceAmount, data.currency), margin + 340, y + 24);

        y += 60;

        // Confirmed Inclusions Summary
        doc.rect(margin, y, contentWidth, 140).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Confirmed Travel Components", margin + 15, y + 10);

        let cy = y + 26;

        // Hotel components
        if (data.hotels && data.hotels.length > 0) {
          doc.fillColor(brandColor).fontSize(8.5).font("Helvetica-Bold").text("Accommodations:", margin + 15, cy);
          cy += 12;
          for (const h of data.hotels.slice(0, 3)) {
            doc.fillColor("#334155").fontSize(7.5).font("Helvetica").text(
              `• ${h.name} (${h.city || "Destination"}) | ${this.formatDate(h.checkIn)} to ${this.formatDate(h.checkOut)} | ${h.roomType || "Standard"}`,
              margin + 20,
              cy
            );
            cy += 11;
          }
        }

        // Vehicle components
        if (data.vehicles && data.vehicles.length > 0) {
          cy += 4;
          doc.fillColor(brandColor).fontSize(8.5).font("Helvetica-Bold").text("Transport & Transfers:", margin + 15, cy);
          cy += 12;
          for (const v of data.vehicles.slice(0, 2)) {
            doc.fillColor("#334155").fontSize(7.5).font("Helvetica").text(
              `• ${v.name} | Date: ${this.formatDate(v.pickupDate)} | Pickup: ${v.pickupLocation || "Scheduled"}`,
              margin + 20,
              cy
            );
            cy += 11;
          }
        }

        // Activities
        if (data.activities && data.activities.length > 0) {
          cy += 4;
          doc.fillColor(brandColor).fontSize(8.5).font("Helvetica-Bold").text("Sightseeing & Tours:", margin + 15, cy);
          cy += 12;
          for (const a of data.activities.slice(0, 2)) {
            doc.fillColor("#334155").fontSize(7.5).font("Helvetica").text(
              `• ${a.name} (${this.formatDate(a.date)})`,
              margin + 20,
              cy
            );
            cy += 11;
          }
        }

        y += 152;

        // Terms & Conditions
        doc.rect(margin, y, contentWidth, 65).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica-Bold").text("Booking Terms & Policy", margin + 15, y + 8);
        const terms = [
          "• Individual hotel and transport vouchers are attached and also accessible via your traveler portal.",
          "• Flight/Train tickets and government ID proofs must be carried by all travelers.",
          "• Standard cancellation and amendment policies apply as communicated in your quotation.",
        ];
        let ty = y + 22;
        for (const t of terms) {
          doc.fillColor("#475569").fontSize(7).font("Helvetica").text(t, margin + 15, ty, { width: contentWidth - 30 });
          ty += 10;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Contact: ${data.agency.phone || "Available on portal"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PAYMENT RECEIPT
  // ═══════════════════════════════════════════════════════════════════════════

  async renderPaymentReceipt(data: PaymentReceiptPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Payment Receipt - ${data.paymentNumber}`,
            Author: data.agency.name,
            Subject: `Receipt ${data.documentNumber}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#0284C7"; // Sky 600
        const darkColor = "#082F49"; // Sky 950

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#BAE6FD")
          .text("OFFICIAL PAYMENT RECEIPT & ACKNOWLEDGEMENT", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#E0F2FE")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`RECEIPT #: ${data.receiptNumber || data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Date: ${this.formatDate(data.paymentDate || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Payment Ref: ${data.paymentNumber}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Customer Details
        doc.rect(margin, y, contentWidth, 50).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("RECEIVED FROM", margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.customer.name, margin + 15, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          [data.customer.phone, data.customer.email].filter(Boolean).join(" • "),
          margin + 15,
          y + 36
        );

        if (data.bookingNumber) {
          doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("BOOKING REFERENCE", margin + contentWidth - 200, y + 10, { width: 185, align: "right" });
          doc.fillColor(brandColor).fontSize(12).font("Helvetica-Bold").text(data.bookingNumber, margin + contentWidth - 200, y + 23, { width: 185, align: "right" });
        }

        y += 62;

        // Payment Amount Callout
        doc.rect(margin, y, contentWidth, 65).fillAndStroke("#F0F9FF", "#BAE6FD");
        doc.fillColor("#0369A1").fontSize(9).font("Helvetica-Bold").text("AMOUNT RECEIVED", margin + 15, y + 12);
        doc.fillColor("#0C4A6E").fontSize(20).font("Helvetica-Bold").text(this.formatAmount(data.amount, data.currency), margin + 15, y + 28);

        doc.fillColor("#0369A1").fontSize(8.5).font("Helvetica").text(`Payment Mode: ${data.paymentMethod}`, margin + contentWidth - 220, y + 16, { width: 205, align: "right" });
        if (data.referenceNumber) {
          doc.fillColor("#0C4A6E").fontSize(8.5).font("Helvetica-Bold").text(`Txn Ref: ${data.referenceNumber}`, margin + contentWidth - 220, y + 32, { width: 205, align: "right" });
        }

        y += 77;

        // Ledger Summary
        doc.rect(margin, y, contentWidth, 75).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Booking Account Status", margin + 15, y + 10);

        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text("Total Booking Contract Value:", margin + 15, y + 28);
        doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica-Bold").text(this.formatAmount(data.totalBookingAmount, data.currency), margin + 180, y + 28);

        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text("Cumulative Paid to Date:", margin + 15, y + 42);
        doc.fillColor("#0284C7").fontSize(8.5).font("Helvetica-Bold").text(this.formatAmount(data.cumulativePaidAmount, data.currency), margin + 180, y + 42);

        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text("Remaining Outstanding Balance:", margin + 15, y + 56);
        const remBalance = Number(data.remainingBalance || 0);
        doc.fillColor(remBalance > 0 ? "#DC2626" : "#059669").fontSize(8.5).font("Helvetica-Bold").text(this.formatAmount(data.remainingBalance, data.currency), margin + 180, y + 56);

        y += 87;

        // Authorization Notes
        doc.rect(margin, y, contentWidth, 65).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(8.5).font("Helvetica-Bold").text("Acknowledgement & Terms", margin + 15, y + 8);
        const notes = [
          "• This is an official computer-generated receipt issued by TripDesk on behalf of the agency.",
          "• Payments made by cheque or bank transfer are subject to realization.",
          data.notes ? `• Note: ${data.notes}` : null,
        ].filter(Boolean);

        let ny = y + 22;
        for (const n of notes) {
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica").text(n as string, margin + 15, ny, { width: contentWidth - 30 });
          ny += 11;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Contact: ${data.agency.phone || "Available on portal"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CUSTOMER ITINERARY (TRAVEL KIT)
  // ═══════════════════════════════════════════════════════════════════════════

  async renderCustomerItinerary(data: CustomerItineraryPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Itinerary & Travel Kit - ${data.tripTitle}`,
            Author: data.agency.name,
            Subject: `Itinerary ${data.documentNumber}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#0F766E";
        const darkColor = "#042F2E";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#99F6E4")
          .text("COMPREHENSIVE ITINERARY & TRAVEL KIT", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#CCFBF1")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`DOC #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Version: v${data.version} • Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Trip Ref: ${data.tripNumber}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Trip Overview Box
        doc.rect(margin, y, contentWidth, 50).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(12).font("Helvetica-Bold").text(data.tripTitle, margin + 15, y + 10);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          `Travel Dates: ${this.formatDate(data.startDate)} to ${this.formatDate(data.endDate)} • Primary Traveler: ${data.customer.name}`,
          margin + 15,
          y + 26
        );

        y += 62;

        // Day-by-Day Section
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text("Day-by-Day Journey", margin, y);
        y += 18;

        for (const item of data.itineraryDays.slice(0, 6)) {
          if (y > 700) break;
          doc.rect(margin, y, contentWidth, 36).fillAndStroke("#FFFFFF", "#E2E8F0");
          doc.fillColor(brandColor).fontSize(9).font("Helvetica-Bold").text(`Day ${item.dayNumber}: ${item.title}`, margin + 12, y + 8);
          if (item.description) {
            doc.fillColor("#475569").fontSize(7.5).font("Helvetica").text(item.description, margin + 12, y + 21, { width: contentWidth - 24, ellipsis: true });
          }
          y += 42;
        }

        // Hotels Section
        if (data.hotels && data.hotels.length > 0 && y < 650) {
          y += 8;
          doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text("Confirmed Accommodations", margin, y);
          y += 15;
          for (const h of data.hotels.slice(0, 3)) {
            doc.rect(margin, y, contentWidth, 24).fillAndStroke("#F8FAFC", "#E2E8F0");
            doc.fillColor("#1E293B").fontSize(8).font("Helvetica-Bold").text(`${h.name} (${h.city || "Stay"})`, margin + 10, y + 7);
            doc.fillColor("#64748B").fontSize(7.5).font("Helvetica").text(
              `${this.formatDate(h.checkIn)} - ${this.formatDate(h.checkOut)} | ${h.roomType || "Standard"} | ${h.mealPlan || "Room Only"}`,
              margin + 200,
              y + 7,
              { width: contentWidth - 210, align: "right" }
            );
            y += 28;
          }
        }

        // Emergency Contacts Box
        doc.rect(margin, 710, contentWidth, 45).fillAndStroke("#FEF2F2", "#FECACA");
        doc.fillColor("#991B1B").fontSize(8.5).font("Helvetica-Bold").text("24x7 Emergency Assistance", margin + 15, 718);
        doc.fillColor("#7F1D1D").fontSize(8).font("Helvetica").text(
          `For on-ground support during your trip, contact: ${data.emergencyContact || data.agency.phone || "Agency Concierge Desk"}`,
          margin + 15,
          730
        );

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Contact: ${data.agency.phone || "Available on portal"}`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SUPPLIER VOUCHER (OPERATIONAL REQUIREMENT WITHOUT CLIENT MARGINS)
  // ═══════════════════════════════════════════════════════════════════════════

  async renderSupplierVoucher(data: SupplierVoucherPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Supplier Operational Voucher - ${data.serviceName}`,
            Author: data.agency.name,
            Subject: `Voucher ${data.documentNumber}`,
            Creator: "TripDesk Document Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const contentWidth = 595.28 - margin * 2;
        const brandColor = "#475569"; // Slate 600
        const darkColor = "#0F172A"; // Slate 900

        // Header Banner
        doc.rect(margin, margin, contentWidth, 75).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.agency.name, margin + 15, margin + 15, { width: 320 });

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text("SUPPLIER SERVICE ORDER & OPERATIONAL VOUCHER", margin + 15, margin + 35);

        doc
          .fontSize(8)
          .fillColor("#CBD5E1")
          .text([data.agency.phone, data.agency.email].filter(Boolean).join(" | "), margin + 15, margin + 49);

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(`ORDER #: ${data.documentNumber}`, margin + contentWidth - 215, margin + 15, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Issued: ${this.formatDate(data.issuedAt || new Date())}`, margin + contentWidth - 215, margin + 31, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .text(`Booking Ref: ${data.bookingNumber || data.tripNumber}`, margin + contentWidth - 215, margin + 45, {
            width: 200,
            align: "right",
          });

        let y = margin + 90;

        // Supplier & Guest Card
        doc.rect(margin, y, contentWidth, 55).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("SERVICE PROVIDER / SUPPLIER", margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.supplierName, margin + 15, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(
          [data.supplierPhone, data.supplierEmail].filter(Boolean).join(" • "),
          margin + 15,
          y + 36
        );

        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("GUEST / TRAVELER NAME", margin + contentWidth - 200, y + 10, { width: 185, align: "right" });
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold").text(data.guestName, margin + contentWidth - 200, y + 23, { width: 185, align: "right" });
        if (data.guestPhone) {
          doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(data.guestPhone, margin + contentWidth - 200, y + 36, { width: 185, align: "right" });
        }

        y += 67;

        // Service Requirement Card
        doc.rect(margin, y, contentWidth, 75).fillAndStroke("#FFFFFF", "#E2E8F0");
        doc.fillColor(brandColor).fontSize(9).font("Helvetica-Bold").text(`SERVICE TYPE: ${data.serviceType}`, margin + 15, y + 10);
        doc.fillColor("#0F172A").fontSize(12).font("Helvetica-Bold").text(data.serviceName, margin + 15, y + 24);
        doc.fillColor("#334155").fontSize(8.5).font("Helvetica").text(`Service Dates / Timing: ${data.serviceDates}`, margin + 15, y + 42);
        if (data.confirmationReference) {
          doc.fillColor("#047857").fontSize(8.5).font("Helvetica-Bold").text(`Supplier Confirmation Ref: ${data.confirmationReference}`, margin + 15, y + 56);
        }

        y += 87;

        // Operational Instructions
        doc.rect(margin, y, contentWidth, 90).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#0F172A").fontSize(9.5).font("Helvetica-Bold").text("Operational Requirements & Service Checklist", margin + 15, y + 10);
        let oy = y + 26;
        for (const op of data.operationalDetails.slice(0, 4)) {
          doc.fillColor("#334155").fontSize(8).font("Helvetica").text(`• ${op}`, margin + 15, oy);
          oy += 12;
        }

        // Footer
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `Generated securely via TripDesk • ${data.agency.name} • Internal Accounts Desk`,
            margin,
            780,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const documentPdfService = new DocumentPdfService();
