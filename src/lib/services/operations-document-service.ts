import "server-only";

import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import {
  ConfirmationStatus,
  DispatchStatus,
  Prisma,
} from "@prisma/client";

export interface DocumentSummaryItem {
  id: string;
  type: "HOTEL_VOUCHER" | "VEHICLE_VOUCHER" | "ACTIVITY_VOUCHER" | "BOOKING_CONFIRMATION" | "TRAVEL_KIT";
  title: string;
  subtitle: string;
  status: string;
  documentNumber: string;
  isReady: boolean;
  downloadUrl: string;
  warnings?: string[];
}

export interface OperationsDocumentsSummary {
  operationId: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  readinessScore: number;
  isFullyReady: boolean;
  documents: DocumentSummaryItem[];
}

export class OperationsDocumentService {
  /**
   * Generates a safe, agency-scoped voucher sequence number
   */
  private generateDocumentNumber(prefix: string, tripNumber: string, seq = 1): string {
    const year = new Date().getFullYear();
    const cleanTrip = tripNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
    return `${prefix}-${year}-${cleanTrip}-${String(seq).padStart(2, "0")}`;
  }

  /**
   * Helper to format dates cleanly
   */
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

  /**
   * Helper to format time cleanly
   */
  private formatTime(time: string | null | undefined): string {
    if (!time) return "TBD";
    return time;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HOTEL VOUCHER PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateHotelVoucher(
    agencyId: string,
    operationId: string,
    confirmationId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
          },
        },
        hotelConfirmations: {
          where: { id: confirmationId },
          include: {
            tripHotel: {
              include: {
                hotel: true,
              },
            },
          },
        },
      },
    });

    if (!operation || !operation.hotelConfirmations || operation.hotelConfirmations.length === 0) {
      throw new Error("Hotel confirmation not found or unauthorized.");
    }

    const hotelConf = operation.hotelConfirmations[0];
    const hotel = hotelConf.tripHotel?.hotel;
    const documentNumber = this.generateDocumentNumber("THV", operation.trip.tripNumber || "0001", 1);
    const filename = `Hotel-Voucher-${hotelConf.confirmationNumber || documentNumber}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
          bufferPages: true,
          compress: false,
          info: {
            Title: `Hotel Voucher - ${hotel?.name || "Hotel Accommodation"}`,
            Author: operation.agency.name,
            Subject: `Hotel Voucher ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        // Elegant Modern Color Palette aligned with Quotation PDF
        const brandDark = "#0F172A"; // Slate 900
        const brandAccent = "#0D9488"; // Teal 600
        const brandLight = "#F0FDFA"; // Teal 50
        const textDark = "#0F172A"; // Slate 900
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgCard = "#F8FAFC"; // Slate 50
        const borderLight = "#E2E8F0"; // Slate 200
        const emeraldBg = "#ECFDF5";
        const emeraldBorder = "#A7F3D0";
        const emeraldText = "#065F46";

        // Page break helper
        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        // Section Header Helper
        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight = 44) => {
          ensureSpace(36 + minContentHeight);
          doc.y += 16;
          doc.x = margin;

          doc.fillColor(textDark).fontSize(10.5).font("Helvetica-Bold").text(title, { characterSpacing: 0.5 });
          if (subtitle) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(subtitle, { lineGap: 1 });
          }

          const lineY = doc.y + 4;
          doc
            .moveTo(margin, lineY)
            .lineTo(margin + 32, lineY)
            .strokeColor(brandAccent)
            .lineWidth(2)
            .stroke();

          doc.y = lineY + 8;
        };

        // ─── HERO HEADER BANNER ──────────────────────────────────────────────
        const agencyName = operation.agency.name || "TripDesk Travel Partner";
        const agencyContact = [operation.agency.phone, operation.agency.email, operation.agency.address]
          .filter(Boolean)
          .join(" • ");

        const leftWidth = contentWidth - 210;
        doc.font("Helvetica-Bold").fontSize(14);
        const nameH = doc.heightOfString(agencyName, { width: leftWidth });
        doc.font("Helvetica").fontSize(7.5);
        const contactH = agencyContact ? doc.heightOfString(agencyContact, { width: leftWidth }) : 0;
        const leftContentH = nameH + contactH + 46;

        // Right Badge text & dynamic height measurement
        const docNumText = `VOUCHER #: ${documentNumber}`;
        const dateText = `Issued: ${this.formatDate(new Date())}`;
        const refText = `Trip Ref: ${operation.trip.tripNumber || "N/A"}`;
        const statusText = hotelConf.status === "CONFIRMED" ? "CONFIRMED STAY" : `STATUS: ${hotelConf.status}`;

        doc.font("Helvetica-Bold").fontSize(9.5);
        const docNumH = doc.heightOfString(docNumText, { width: 155, align: "center" });

        doc.font("Helvetica").fontSize(7.5);
        const dateH = doc.heightOfString(dateText, { width: 155, align: "center" });
        const refH = doc.heightOfString(refText, { width: 155, align: "center" });

        const pillH = 14;
        const totalRightContentH = docNumH + 3 + dateH + 2 + refH + 5 + pillH;
        const minRightBoxH = totalRightContentH + 16;

        const bannerHeight = Math.max(88, leftContentH, minRightBoxH + 28);

        // Slate 900 Hero Container with rounded corners
        doc.roundedRect(margin, margin, contentWidth, bannerHeight, 8).fill(brandDark);

        // Left: Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, { width: leftWidth });

        doc
          .fillColor("#99F6E4")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text("OFFICIAL HOTEL ACCOMMODATION VOUCHER", margin + 18, doc.y + 3);

        if (agencyContact) {
          doc
            .fillColor("#94A3B8")
            .fontSize(7.5)
            .font("Helvetica")
            .text(agencyContact, margin + 18, doc.y + 4, { width: leftWidth, lineGap: 1 });
        }

        // Right: Voucher Number & Status Pill
        const rightX = margin + contentWidth - 190;
        const rightY = margin + 14;
        const rightBoxH = bannerHeight - 28;
        doc.roundedRect(rightX, rightY, 175, rightBoxH, 6).fillAndStroke("#1E293B", "#334155");

        const rightStartY = rightY + Math.max(8, (rightBoxH - totalRightContentH) / 2);
        let curRightY = rightStartY;

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(docNumText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += docNumH + 3;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dateText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += dateH + 2;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(refText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += refH + 5;

        // Status Badge Pill
        const pillX = rightX + (175 - 125) / 2;
        doc.roundedRect(pillX, curRightY, 125, pillH, 7).fillAndStroke("#064E3B", "#059669");
        doc
          .fillColor("#A7F3D0")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(statusText, pillX, curRightY + 3.5, { width: 125, align: "center" });

        doc.y = margin + bannerHeight + 14;

        // ─── PRIMARY GUEST & TRAVELER DETAILS ────────────────────────────────
        const leadGuestName = operation.trip.customer?.name || "Valued Guest";
        const guestContact = [operation.trip.customer?.phone, operation.trip.customer?.email]
          .filter(Boolean)
          .join(" • ");
        const coTravelers = operation.trip.travelers?.map((t) => t.name).join(", ");
        const totalPax = operation.trip.travelers?.length || 1;

        const colW = (contentWidth - 36) / 2;
        doc.font("Helvetica").fontSize(8);
        const travelersTextH = coTravelers ? doc.heightOfString(`Co-Travelers: ${coTravelers}`, { width: colW }) : 0;
        const guestCardHeight = Math.max(58, 38 + travelersTextH);

        ensureSpace(guestCardHeight);
        doc.roundedRect(margin, doc.y, contentWidth, guestCardHeight, 6).fillAndStroke(bgCard, borderLight);

        const cardTopY = doc.y + 10;
        // Left Column: Lead Guest
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("PRIMARY GUEST / LEAD TRAVELER", margin + 14, cardTopY);
        doc.fillColor(textDark).fontSize(11).font("Helvetica-Bold").text(leadGuestName, margin + 14, cardTopY + 12);
        if (guestContact) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(guestContact, margin + 14, cardTopY + 26, { width: colW });
        }

        // Right Column: Party Info
        const rightColX = margin + colW + 22;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("PARTY & ITINERARY REFERENCE", rightColX, cardTopY);
        doc
          .fillColor(textDark)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`Total Travelers: ${totalPax} Pax`, rightColX, cardTopY + 12);
        if (coTravelers) {
          doc
            .fillColor(textMuted)
            .fontSize(7.5)
            .font("Helvetica")
            .text(`Co-Travelers: ${coTravelers}`, rightColX, cardTopY + 25, { width: colW, lineGap: 1 });
        }

        doc.y = cardTopY + guestCardHeight - 2;

        // ─── HOTEL RESERVATION DETAILS ───────────────────────────────────────
        drawSectionHeader("HOTEL RESERVATION & ACCOMMODATION", "Official verified stay details and room arrangements", 150);

        const hotelNameStr = hotel?.name || "Hotel Accommodation";
        const hotelLocationStr = [hotel?.address, hotel?.city, hotel?.state, hotel?.country].filter(Boolean).join(", ");
        const checkInDate = hotelConf.checkIn || hotelConf.tripHotel?.checkIn;
        const checkOutDate = hotelConf.checkOut || hotelConf.tripHotel?.checkOut;
        const roomTypeStr = hotelConf.roomDetails || hotelConf.tripHotel?.roomType || "Standard Room";
        const roomCount = hotelConf.tripHotel?.rooms || 1;
        const mealPlanStr = hotelConf.mealPlan || hotelConf.tripHotel?.mealPlan || "Room Only";

        // Calculate nights
        let nightsCount = 1;
        if (checkInDate && checkOutDate) {
          const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
          nightsCount = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
        }

        doc.font("Helvetica-Bold").fontSize(12.5);
        const hNameH = doc.heightOfString(hotelNameStr, { width: contentWidth - 32 });
        doc.font("Helvetica").fontSize(8);
        const hLocH = hotelLocationStr ? doc.heightOfString(hotelLocationStr, { width: contentWidth - 32 }) : 0;
        const stayBoxHeight = hNameH + hLocH + 130;

        ensureSpace(stayBoxHeight);
        const stayBoxY = doc.y;
        doc.roundedRect(margin, stayBoxY, contentWidth, stayBoxHeight, 6).fillAndStroke("#FFFFFF", borderLight);

        // Hotel Name & Address
        doc
          .fillColor(textDark)
          .fontSize(12.5)
          .font("Helvetica-Bold")
          .text(hotelNameStr, margin + 16, stayBoxY + 14, { width: contentWidth - 32 });

        if (hotelLocationStr) {
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font("Helvetica")
            .text(hotelLocationStr, margin + 16, doc.y + 2, { width: contentWidth - 32 });
        }

        // Horizontal Separator
        const sepY = doc.y + 10;
        doc
          .moveTo(margin + 16, sepY)
          .lineTo(margin + contentWidth - 16, sepY)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // 4-Column Stay Grid
        const gridY = sepY + 10;
        const colWidth = (contentWidth - 32) / 4;
        const c1 = margin + 16;
        const c2 = c1 + colWidth;
        const c3 = c2 + colWidth;
        const c4 = c3 + colWidth;

        // Col 1: Check-in
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CHECK-IN", c1, gridY);
        doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(this.formatDate(checkInDate), c1, gridY + 11);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text("From 14:00 hrs", c1, gridY + 24);

        // Col 2: Check-out
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CHECK-OUT", c2, gridY);
        doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(this.formatDate(checkOutDate), c2, gridY + 11);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text("Until 11:00 hrs", c2, gridY + 24);

        // Col 3: Duration & Rooms
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("DURATION & ROOMS", c3, gridY);
        doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(`${nightsCount} Night(s) • ${roomCount} Room`, c3, gridY + 11, { width: colWidth - 8 });
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(roomTypeStr, c3, gridY + 24, { width: colWidth - 8 });

        // Col 4: Meal Plan
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("MEAL PLAN / BOARD", c4, gridY);
        doc.fillColor(brandAccent).fontSize(9.5).font("Helvetica-Bold").text(mealPlanStr, c4, gridY + 11, { width: colWidth - 8 });
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text("Pre-booked Plan", c4, gridY + 24);

        // Confirmation Bar inside Box
        const confBarY = gridY + 44;
        doc
          .roundedRect(margin + 16, confBarY, contentWidth - 32, 42, 6)
          .fillAndStroke(bgCard, "#CBD5E1");

        doc
          .fillColor("#0F766E")
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text("HOTEL CONFIRMATION NUMBER / BOOKING ID", margin + 28, confBarY + 8);

        doc
          .fillColor(brandDark)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(hotelConf.confirmationNumber || "CONFIRMED ON ARRIVAL", margin + 28, confBarY + 20);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(`Operational Status: ${hotelConf.status}`, margin + contentWidth - 180, confBarY + 20, {
            width: 150,
            align: "right",
          });

        doc.y = stayBoxY + stayBoxHeight + 14;

        // ─── IMPORTANT HOTEL GUIDELINES ──────────────────────────────────────
        ensureSpace(90);
        doc
          .fillColor(textDark)
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text("IMPORTANT HOTEL CHECK-IN GUIDELINES & POLICIES", margin, doc.y);

        const guidelines = [
          "• Government-approved photo identification (Passport, Aadhaar, Driving License, or Voter ID) is mandatory for all adult guests upon check-in.",
          "• Early check-in or late check-out is strictly subject to hotel availability and may incur additional charges directly payable to the property.",
          "• Incidental expenses such as telephone calls, room service, laundry, mini-bar, and optional spa services must be settled directly with the reception upon departure.",
          "• Please present this official confirmation voucher along with valid photo ID at the hotel reception desk upon arrival.",
        ];

        doc.y += 6;
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica");
        for (const line of guidelines) {
          ensureSpace(16);
          doc.text(line, margin, doc.y, { width: contentWidth, lineGap: 2.5 });
          doc.y += 2;
        }

        // ─── 24/7 SUPPORT & ASSISTANCE BOX ──────────────────────────────────
        ensureSpace(60);
        doc.y += 8;
        const supportBoxY = doc.y;
        doc.roundedRect(margin, supportBoxY, contentWidth, 54, 6).fillAndStroke(bgCard, borderLight);

        doc
          .fillColor(brandDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 GUEST OPERATIONS & CONCIERGE ASSISTANCE", margin + 16, supportBoxY + 10);

        doc
          .fillColor(textMuted)
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            `For on-ground assistance, itinerary modifications, or urgent hotel coordination, please contact ${operation.agency.name} Concierge Desk at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.`,
            margin + 16,
            supportBoxY + 23,
            { width: contentWidth - 32, lineGap: 1.5 }
          );

        // ─── TWO-PASS PAGE NUMBERING & RUNNING FOOTER ────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          // Top running header on multi-page documents
          if (i > 0) {
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(textLight)
              .text(`Hotel Voucher • ${documentNumber} • ${hotelNameStr}`, margin, margin - 14, {
                width: contentWidth,
                align: "left",
              });
            doc
              .moveTo(margin, margin - 6)
              .lineTo(margin + contentWidth, margin - 6)
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .stroke();
          }

          // Bottom Running Footer
          const footerY = pageHeight - 34;
          doc
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .stroke();

          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(textLight)
            .text(
              `Generated securely via TripDesk • Confidential Travel Document • ${operation.agency.name}`,
              margin,
              footerY + 8,
              { width: contentWidth - 80, align: "left" }
            );

          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(textLight)
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 75, footerY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Audit Event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "HOTEL_VOUCHER_GENERATED",
        description: `Generated Hotel Voucher for ${hotel?.name || "Hotel"} (${documentNumber})`,
        createdBy: actorName || "Operations Lead",
        metadata: {
          confirmationId,
          documentNumber,
          hotelName: hotel?.name,
          confirmationNumber: hotelConf.confirmationNumber,
        },
      },
    });

    return { buffer, filename, documentNumber };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VEHICLE / TRANSPORT VOUCHER PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateVehicleVoucher(
    agencyId: string,
    operationId: string,
    dispatchId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
          },
        },
        vehicleDispatches: {
          where: { id: dispatchId },
          include: {
            tripVehicle: {
              include: {
                vehicle: true,
              },
            },
            vehicle: true,
          },
        },
      },
    });

    if (!operation || !operation.vehicleDispatches || operation.vehicleDispatches.length === 0) {
      throw new Error("Vehicle dispatch not found or unauthorized.");
    }

    const dispatch = operation.vehicleDispatches[0];
    const vehicle = dispatch.vehicle || dispatch.tripVehicle?.vehicle;
    const documentNumber = this.generateDocumentNumber("TVV", operation.trip.tripNumber || "0001", 1);
    const filename = `Vehicle-Voucher-${documentNumber}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
          bufferPages: true,
          compress: false,
          info: {
            Title: `Vehicle Voucher - ${vehicle?.name || "Transport Service"}`,
            Author: operation.agency.name,
            Subject: `Transport Voucher ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        // Colors
        const brandDark = "#0F172A"; // Slate 900
        const brandAccent = "#2563EB"; // Blue 600
        const brandLight = "#EFF6FF"; // Blue 50
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const textLight = "#94A3B8";
        const bgCard = "#F8FAFC";
        const borderLight = "#E2E8F0";

        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight = 44) => {
          ensureSpace(36 + minContentHeight);
          doc.y += 16;
          doc.x = margin;

          doc.fillColor(textDark).fontSize(10.5).font("Helvetica-Bold").text(title, { characterSpacing: 0.5 });
          if (subtitle) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(subtitle, { lineGap: 1 });
          }

          const lineY = doc.y + 4;
          doc
            .moveTo(margin, lineY)
            .lineTo(margin + 32, lineY)
            .strokeColor(brandAccent)
            .lineWidth(2)
            .stroke();

          doc.y = lineY + 8;
        };

        // ─── HERO HEADER BANNER ──────────────────────────────────────────────
        const agencyName = operation.agency.name || "TripDesk Travel Partner";
        const agencyContact = [operation.agency.phone, operation.agency.email, operation.agency.address]
          .filter(Boolean)
          .join(" • ");

        const leftWidth = contentWidth - 210;
        doc.font("Helvetica-Bold").fontSize(14);
        const nameH = doc.heightOfString(agencyName, { width: leftWidth });
        doc.font("Helvetica").fontSize(7.5);
        const contactH = agencyContact ? doc.heightOfString(agencyContact, { width: leftWidth }) : 0;
        const leftContentH = nameH + contactH + 46;

        // Right Badge text & dynamic height measurement
        const docNumText = `VOUCHER #: ${documentNumber}`;
        const dateText = `Issued: ${this.formatDate(new Date())}`;
        const refText = `Trip Ref: ${operation.trip.tripNumber || "N/A"}`;
        const statusText = dispatch.status === "ASSIGNED" || dispatch.status === "CONFIRMED"
          ? "DISPATCH CONFIRMED"
          : `STATUS: ${dispatch.status}`;

        doc.font("Helvetica-Bold").fontSize(9.5);
        const docNumH = doc.heightOfString(docNumText, { width: 155, align: "center" });

        doc.font("Helvetica").fontSize(7.5);
        const dateH = doc.heightOfString(dateText, { width: 155, align: "center" });
        const refH = doc.heightOfString(refText, { width: 155, align: "center" });

        const pillH = 14;
        const totalRightContentH = docNumH + 3 + dateH + 2 + refH + 5 + pillH;
        const minRightBoxH = totalRightContentH + 16;

        const bannerHeight = Math.max(88, leftContentH, minRightBoxH + 28);

        doc.roundedRect(margin, margin, contentWidth, bannerHeight, 8).fill(brandDark);

        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, { width: leftWidth });

        doc
          .fillColor("#93C5FD")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text("OFFICIAL TRANSPORTATION & CHAUFFEUR VOUCHER", margin + 18, doc.y + 3);

        if (agencyContact) {
          doc
            .fillColor("#94A3B8")
            .fontSize(7.5)
            .font("Helvetica")
            .text(agencyContact, margin + 18, doc.y + 4, { width: leftWidth, lineGap: 1 });
        }

        // Right Badge
        const rightX = margin + contentWidth - 190;
        const rightY = margin + 14;
        const rightBoxH = bannerHeight - 28;
        doc.roundedRect(rightX, rightY, 175, rightBoxH, 6).fillAndStroke("#1E293B", "#334155");

        const rightStartY = rightY + Math.max(8, (rightBoxH - totalRightContentH) / 2);
        let curRightY = rightStartY;

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(docNumText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += docNumH + 3;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dateText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += dateH + 2;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(refText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += refH + 5;

        const pillX = rightX + (175 - 125) / 2;
        doc.roundedRect(pillX, curRightY, 125, pillH, 7).fillAndStroke("#1E3A8A", "#3B82F6");
        doc
          .fillColor("#BFDBFE")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(statusText, pillX, curRightY + 3.5, { width: 125, align: "center" });

        doc.y = margin + bannerHeight + 14;

        // ─── PASSENGER DETAILS CARD ──────────────────────────────────────────
        const leadGuestName = operation.trip.customer?.name || "Valued Passenger";
        const guestContact = [operation.trip.customer?.phone, operation.trip.customer?.email]
          .filter(Boolean)
          .join(" • ");
        const coTravelers = operation.trip.travelers?.map((t) => t.name).join(", ");
        const totalPax = operation.trip.travelers?.length || 1;

        const colW = (contentWidth - 36) / 2;
        doc.font("Helvetica").fontSize(8);
        const travelersTextH = coTravelers ? doc.heightOfString(`Passengers: ${coTravelers}`, { width: colW }) : 0;
        const guestCardHeight = Math.max(58, 38 + travelersTextH);

        ensureSpace(guestCardHeight);
        doc.roundedRect(margin, doc.y, contentWidth, guestCardHeight, 6).fillAndStroke(bgCard, borderLight);

        const cardTopY = doc.y + 10;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("LEAD PASSENGER & CONTACT", margin + 14, cardTopY);
        doc.fillColor(textDark).fontSize(11).font("Helvetica-Bold").text(leadGuestName, margin + 14, cardTopY + 12);
        if (guestContact) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(guestContact, margin + 14, cardTopY + 26, { width: colW });
        }

        const rightColX = margin + colW + 22;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("BOOKING & LOGISTICS REFERENCE", rightColX, cardTopY);
        doc
          .fillColor(textDark)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`Passenger Count: ${totalPax} Pax`, rightColX, cardTopY + 12);
        if (coTravelers) {
          doc
            .fillColor(textMuted)
            .fontSize(7.5)
            .font("Helvetica")
            .text(`Passengers: ${coTravelers}`, rightColX, cardTopY + 25, { width: colW, lineGap: 1 });
        }

        doc.y = cardTopY + guestCardHeight - 2;

        // ─── ASSIGNED VEHICLE & CHAUFFEUR ────────────────────────────────────
        drawSectionHeader("ASSIGNED VEHICLE & CHAUFFEUR LOGISTICS", "Official fleet allocation and transfer schedule", 160);

        const vehicleNameStr = vehicle?.name || dispatch.tripVehicle?.vehicle?.name || "Private Dedicated Vehicle";
        const vehicleNumberStr = dispatch.vehicleNumber || "ASSIGNED UPON DISPATCH";
        const driverNameStr = dispatch.driverName || "Chauffeur details will be shared prior to departure";
        const driverPhoneStr = dispatch.driverPhone || "Will be shared via SMS / WhatsApp";
        const pickupDateStr = this.formatDate(dispatch.pickupDate || operation.trip.startDate);
        const pickupTimeStr = this.formatTime(dispatch.pickupTime || "As per Schedule");
        const pickupLocStr = dispatch.pickupLocation || "Scheduled Hotel / Airport Terminal";
        const dropLocStr = dispatch.dropLocation || "As per Tour Itinerary";

        // Dynamic height measurements for grid and route
        const col3W = (contentWidth - 32) / 3;
        doc.font("Helvetica-Bold").fontSize(10.5);
        const dNameH = doc.heightOfString(driverNameStr, { width: col3W - 10 });
        const dPhoneH = doc.heightOfString(driverPhoneStr, { width: col3W - 10 });
        const gridContentH = Math.max(16, dNameH, dPhoneH);
        const gridH = 12 + gridContentH;

        // Clean route formatting without unicode arrow
        const routeText = `From: ${pickupLocStr}\nTo: ${dropLocStr}`;
        doc.font("Helvetica").fontSize(8);
        const routeTextH = doc.heightOfString(routeText, { width: contentWidth - 52, lineGap: 2.5 });
        const routeStripH = 34 + routeTextH + 10;

        // Total calculated parent container height
        const vBoxHeight = 14 + 14 + 12 + 21 + gridH + 12 + routeStripH + 14;

        ensureSpace(vBoxHeight);
        const vBoxY = doc.y;
        doc.roundedRect(margin, vBoxY, contentWidth, vBoxHeight, 6).fillAndStroke("#FFFFFF", borderLight);

        // Vehicle Title
        doc
          .fillColor(textDark)
          .fontSize(12.5)
          .font("Helvetica-Bold")
          .text(vehicleNameStr, margin + 16, vBoxY + 14, { width: contentWidth - 32 });

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text("Dedicated Air-Conditioned Private Transport Service", margin + 16, vBoxY + 30);

        const sepY = vBoxY + 44;
        doc
          .moveTo(margin + 16, sepY)
          .lineTo(margin + contentWidth - 16, sepY)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // 3-Column Grid: Reg Plate, Driver Name, Driver Phone
        const gridY = sepY + 10;
        const vc1 = margin + 16;
        const vc2 = vc1 + col3W;
        const vc3 = vc2 + col3W;

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("VEHICLE REGISTRATION NUMBER", vc1, gridY);
        doc.fillColor(brandDark).fontSize(10.5).font("Helvetica-Bold").text(vehicleNumberStr, vc1, gridY + 12);

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("ASSIGNED CHAUFFEUR / DRIVER", vc2, gridY);
        doc.fillColor(brandDark).fontSize(10.5).font("Helvetica-Bold").text(driverNameStr, vc2, gridY + 12, { width: col3W - 10 });

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CHAUFFEUR CONTACT NUMBER", vc3, gridY);
        doc.fillColor(brandAccent).fontSize(10.5).font("Helvetica-Bold").text(driverPhoneStr, vc3, gridY + 12, { width: col3W - 10 });

        // Route & Schedule Strip inside parent card
        const routeStripY = gridY + gridH + 12;
        doc
          .roundedRect(margin + 16, routeStripY, contentWidth - 32, routeStripH, 6)
          .fillAndStroke(bgCard, "#CBD5E1");

        doc.fillColor("#1D4ED8").fontSize(7.5).font("Helvetica-Bold").text("PICKUP SCHEDULE & ROUTE ITINERARY", margin + 26, routeStripY + 8);
        doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(`${pickupDateStr} at ${pickupTimeStr}`, margin + 26, routeStripY + 20);
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(
          routeText,
          margin + 26,
          routeStripY + 34,
          { width: contentWidth - 52, lineGap: 2.5 }
        );

        doc.y = vBoxY + vBoxHeight + 14;

        // ─── PASSENGER PICKUP GUIDELINES ─────────────────────────────────────
        ensureSpace(90);
        doc
          .fillColor(textDark)
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text("PASSENGER PICKUP GUIDELINES & LOGISTICS TERMS", margin, doc.y);

        const driverInstructions = [
          "• Please be present at the designated pickup hotel lobby or meeting point 10 minutes prior to scheduled departure.",
          "• For airport and railway station pickups, your assigned chauffeur will display a personalized guest placard at the arrival exit gate.",
          "• Standard parking fees, toll taxes, interstate state permits, and chauffeur allowances for scheduled itinerary points are fully included.",
          "• Any unscheduled detour, additional sightseeing, or extended night duty outside agreed trip itinerary may incur standard excess charges.",
        ];

        doc.y += 6;
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica");
        for (const line of driverInstructions) {
          ensureSpace(16);
          doc.text(line, margin, doc.y, { width: contentWidth, lineGap: 2.5 });
          doc.y += 2;
        }

        // ─── 24/7 FLEET DISPATCH SUPPORT BOX ─────────────────────────────────
        ensureSpace(60);
        doc.y += 8;
        const supportBoxY = doc.y;
        doc.roundedRect(margin, supportBoxY, contentWidth, 54, 6).fillAndStroke(bgCard, borderLight);

        doc
          .fillColor(brandDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 FLEET DISPATCH & EMERGENCY SUPPORT", margin + 16, supportBoxY + 10);

        doc
          .fillColor(textMuted)
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            `For real-time dispatch updates, driver tracking, or schedule modifications, contact ${operation.agency.name} Transport Desk at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.`,
            margin + 16,
            supportBoxY + 23,
            { width: contentWidth - 32, lineGap: 1.5 }
          );

        // ─── TWO-PASS PAGE NUMBERING & RUNNING FOOTER ────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          if (i > 0) {
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(textLight)
              .text(`Transport Voucher • ${documentNumber} • ${vehicleNameStr}`, margin, margin - 14, {
                width: contentWidth,
                align: "left",
              });
            doc
              .moveTo(margin, margin - 6)
              .lineTo(margin + contentWidth, margin - 6)
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .stroke();
          }

          const footerY = pageHeight - 34;
          doc
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .stroke();

          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(textLight)
            .text(
              `Generated securely via TripDesk • Confidential Travel Document • ${operation.agency.name}`,
              margin,
              footerY + 8,
              { width: contentWidth - 80, align: "left" }
            );

          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(textLight)
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 75, footerY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Audit Event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "VEHICLE_VOUCHER_GENERATED",
        description: `Generated Vehicle Voucher for ${vehicle?.name || "Transport"} (${documentNumber})`,
        createdBy: actorName || "Operations Lead",
        metadata: {
          dispatchId,
          documentNumber,
          driverName: dispatch.driverName,
          vehicleNumber: dispatch.vehicleNumber,
        },
      },
    });

    return { buffer, filename, documentNumber };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ACTIVITY / EXCURSION VOUCHER PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateActivityVoucher(
    agencyId: string,
    operationId: string,
    confirmationId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
          },
        },
        activityConfirmations: {
          where: { id: confirmationId },
          include: {
            tripActivity: {
              include: {
                activity: true,
              },
            },
            activity: true,
          },
        },
      },
    });

    if (!operation || !operation.activityConfirmations || operation.activityConfirmations.length === 0) {
      throw new Error("Activity confirmation not found or unauthorized.");
    }

    const activityConf = operation.activityConfirmations[0];
    const activity = activityConf.activity || activityConf.tripActivity?.activity;
    const documentNumber = this.generateDocumentNumber("TAV", operation.trip.tripNumber || "0001", 1);
    const filename = `Activity-Voucher-${activityConf.ticketNumber || documentNumber}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
          bufferPages: true,
          compress: false,
          info: {
            Title: `Activity Voucher - ${activity?.name || "Excursion Experience"}`,
            Author: operation.agency.name,
            Subject: `Activity Voucher ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        const brandDark = "#0F172A"; // Slate 900
        const brandAccent = "#7C3AED"; // Purple 600
        const brandLight = "#FAF5FF"; // Purple 50
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const textLight = "#94A3B8";
        const bgCard = "#F8FAFC";
        const borderLight = "#E2E8F0";

        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight = 44) => {
          ensureSpace(36 + minContentHeight);
          doc.y += 16;
          doc.x = margin;

          doc.fillColor(textDark).fontSize(10.5).font("Helvetica-Bold").text(title, { characterSpacing: 0.5 });
          if (subtitle) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(subtitle, { lineGap: 1 });
          }

          const lineY = doc.y + 4;
          doc
            .moveTo(margin, lineY)
            .lineTo(margin + 32, lineY)
            .strokeColor(brandAccent)
            .lineWidth(2)
            .stroke();

          doc.y = lineY + 8;
        };

        // ─── HERO HEADER BANNER ──────────────────────────────────────────────
        const agencyName = operation.agency.name || "TripDesk Travel Partner";
        const agencyContact = [operation.agency.phone, operation.agency.email, operation.agency.address]
          .filter(Boolean)
          .join(" • ");

        const leftWidth = contentWidth - 210;
        doc.font("Helvetica-Bold").fontSize(14);
        const nameH = doc.heightOfString(agencyName, { width: leftWidth });
        doc.font("Helvetica").fontSize(7.5);
        const contactH = agencyContact ? doc.heightOfString(agencyContact, { width: leftWidth }) : 0;
        const leftContentH = nameH + contactH + 46;

        // Right Badge text & dynamic height measurement
        const docNumText = `PASS #: ${documentNumber}`;
        const dateText = `Issued: ${this.formatDate(new Date())}`;
        const refText = `Trip Ref: ${operation.trip.tripNumber || "N/A"}`;
        const statusText = activityConf.status === "CONFIRMED" ? "ADMISSION CONFIRMED" : `STATUS: ${activityConf.status}`;

        doc.font("Helvetica-Bold").fontSize(9.5);
        const docNumH = doc.heightOfString(docNumText, { width: 155, align: "center" });

        doc.font("Helvetica").fontSize(7.5);
        const dateH = doc.heightOfString(dateText, { width: 155, align: "center" });
        const refH = doc.heightOfString(refText, { width: 155, align: "center" });

        const pillH = 14;
        const totalRightContentH = docNumH + 3 + dateH + 2 + refH + 5 + pillH;
        const minRightBoxH = totalRightContentH + 16;

        const bannerHeight = Math.max(88, leftContentH, minRightBoxH + 28);

        doc.roundedRect(margin, margin, contentWidth, bannerHeight, 8).fill(brandDark);

        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, { width: leftWidth });

        doc
          .fillColor("#DDD6FE")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text("OFFICIAL ACTIVITY & EXCURSION PASS", margin + 18, doc.y + 3);

        if (agencyContact) {
          doc
            .fillColor("#94A3B8")
            .fontSize(7.5)
            .font("Helvetica")
            .text(agencyContact, margin + 18, doc.y + 4, { width: leftWidth, lineGap: 1 });
        }

        // Right Badge
        const rightX = margin + contentWidth - 190;
        const rightY = margin + 14;
        const rightBoxH = bannerHeight - 28;
        doc.roundedRect(rightX, rightY, 175, rightBoxH, 6).fillAndStroke("#1E293B", "#334155");

        const rightStartY = rightY + Math.max(8, (rightBoxH - totalRightContentH) / 2);
        let curRightY = rightStartY;

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(docNumText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += docNumH + 3;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dateText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += dateH + 2;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(refText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += refH + 5;

        const pillX = rightX + (175 - 125) / 2;
        doc.roundedRect(pillX, curRightY, 125, pillH, 7).fillAndStroke("#4C1D95", "#8B5CF6");
        doc
          .fillColor("#DDD6FE")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(statusText, pillX, curRightY + 3.5, { width: 125, align: "center" });

        doc.y = margin + bannerHeight + 14;

        // ─── PARTICIPANT DETAILS CARD ────────────────────────────────────────
        const leadGuestName = operation.trip.customer?.name || "Valued Guest";
        const guestContact = [operation.trip.customer?.phone, operation.trip.customer?.email]
          .filter(Boolean)
          .join(" • ");
        const coTravelers = operation.trip.travelers?.map((t) => t.name).join(", ");
        const totalPax = operation.trip.travelers?.length || 1;

        const colW = (contentWidth - 36) / 2;
        doc.font("Helvetica").fontSize(8);
        const travelersTextH = coTravelers ? doc.heightOfString(`Participants: ${coTravelers}`, { width: colW }) : 0;
        const guestCardHeight = Math.max(58, 38 + travelersTextH);

        ensureSpace(guestCardHeight);
        doc.roundedRect(margin, doc.y, contentWidth, guestCardHeight, 6).fillAndStroke(bgCard, borderLight);

        const cardTopY = doc.y + 10;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("LEAD PARTICIPANT & CONTACT", margin + 14, cardTopY);
        doc.fillColor(textDark).fontSize(11).font("Helvetica-Bold").text(leadGuestName, margin + 14, cardTopY + 12);
        if (guestContact) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(guestContact, margin + 14, cardTopY + 26, { width: colW });
        }

        const rightColX = margin + colW + 22;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("PARTICIPATION ROSTER", rightColX, cardTopY);
        doc
          .fillColor(textDark)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`Total Participants: ${totalPax} Pax`, rightColX, cardTopY + 12);
        if (coTravelers) {
          doc
            .fillColor(textMuted)
            .fontSize(7.5)
            .font("Helvetica")
            .text(`Participants: ${coTravelers}`, rightColX, cardTopY + 25, { width: colW, lineGap: 1 });
        }

        doc.y = cardTopY + guestCardHeight - 2;

        // ─── EXCURSION & ENTRY PASS DETAILS ──────────────────────────────────
        drawSectionHeader("EXCURSION & ADMISSION DETAILS", "Verified entry credentials and experience schedule", 150);

        const activityTitleStr = activity?.name || activityConf.tripActivity?.activity?.name || "Sightseeing & Excursion Experience";
        const locationStr = activity?.location || activityConf.tripActivity?.location || (activity as any)?.address || "Designated Activity Venue";
        const activityDateStr = this.formatDate(activityConf.tripActivity?.date || operation.trip.startDate);
        const activityTimeStr = activityConf.tripActivity?.time || "Standard Operating Hours";
        const ticketNumStr = activityConf.ticketNumber || "TKT-CONFIRMED";
        const confNumStr = activityConf.confirmationNumber || "CONFIRMED";

        doc.font("Helvetica-Bold").fontSize(12.5);
        const aNameH = doc.heightOfString(activityTitleStr, { width: contentWidth - 32 });
        doc.font("Helvetica").fontSize(8);
        const aLocH = locationStr ? doc.heightOfString(`Location / Meeting Point: ${locationStr}`, { width: contentWidth - 32 }) : 0;
        const actBoxHeight = aNameH + aLocH + 130;

        ensureSpace(actBoxHeight);
        const actBoxY = doc.y;
        doc.roundedRect(margin, actBoxY, contentWidth, actBoxHeight, 6).fillAndStroke("#FFFFFF", borderLight);

        doc
          .fillColor(textDark)
          .fontSize(12.5)
          .font("Helvetica-Bold")
          .text(activityTitleStr, margin + 16, actBoxY + 14, { width: contentWidth - 32 });

        if (locationStr) {
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font("Helvetica")
            .text(`Location / Meeting Point: ${locationStr}`, margin + 16, doc.y + 2, { width: contentWidth - 32 });
        }

        const sepY = doc.y + 10;
        doc
          .moveTo(margin + 16, sepY)
          .lineTo(margin + contentWidth - 16, sepY)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // 3-Column Grid: Date & Time, E-Ticket #, Provider Confirmation
        const gridY = sepY + 10;
        const col3W = (contentWidth - 32) / 3;
        const ac1 = margin + 16;
        const ac2 = ac1 + col3W;
        const ac3 = ac2 + col3W;

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("ACTIVITY DATE & SCHEDULED TIME", ac1, gridY);
        doc.fillColor(brandDark).fontSize(9.5).font("Helvetica-Bold").text(activityDateStr, ac1, gridY + 11);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(activityTimeStr, ac1, gridY + 24, { width: col3W - 8 });

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("E-TICKET / PASS NUMBER", ac2, gridY);
        doc.fillColor(brandAccent).fontSize(10.5).font("Helvetica-Bold").text(ticketNumStr, ac2, gridY + 11);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text("Official Admission Pass", ac2, gridY + 24);

        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CONFIRMATION NUMBER", ac3, gridY);
        doc.fillColor(brandDark).fontSize(10.5).font("Helvetica-Bold").text(confNumStr, ac3, gridY + 11);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`Status: ${activityConf.status}`, ac3, gridY + 24);

        // Verification Bar inside Box
        const confBarY = gridY + 44;
        doc
          .roundedRect(margin + 16, confBarY, contentWidth - 32, 42, 6)
          .fillAndStroke(bgCard, "#CBD5E1");

        doc
          .fillColor("#7C3AED")
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text("VERIFIED RESERVATION STATUS", margin + 28, confBarY + 8);

        doc
          .fillColor(brandDark)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("PRE-PAID & GUARANTEED ADMISSION", margin + 28, confBarY + 20);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(`Operational Status: ${activityConf.status}`, margin + contentWidth - 180, confBarY + 20, {
            width: 150,
            align: "right",
          });

        doc.y = actBoxY + actBoxHeight + 14;

        // ─── ACTIVITY GUIDELINES ─────────────────────────────────────────────
        ensureSpace(90);
        doc
          .fillColor(textDark)
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text("EXPERIENCE GUIDELINES & ENTRY INSTRUCTIONS", margin, doc.y);

        const actInstructions = [
          "• Please present this electronic or printed pass at the entry gate, visitor center, or tour guide meeting desk.",
          "• Dress code & gear: Comfortable walking shoes, sunscreen, and modest clothing recommended for outdoor excursions.",
          "• Security check: A valid government photo ID may be requested by venue security prior to entry.",
          "• Please arrive 15 minutes prior to your scheduled time slot for safety briefing and entry formalities.",
        ];

        doc.y += 6;
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica");
        for (const line of actInstructions) {
          ensureSpace(16);
          doc.text(line, margin, doc.y, { width: contentWidth, lineGap: 2.5 });
          doc.y += 2;
        }

        // ─── 24/7 SUPPORT BOX ────────────────────────────────────────────────
        ensureSpace(60);
        doc.y += 8;
        const supportBoxY = doc.y;
        doc.roundedRect(margin, supportBoxY, contentWidth, 54, 6).fillAndStroke(bgCard, borderLight);

        doc
          .fillColor(brandDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 GUEST SUPPORT & ASSISTANCE", margin + 16, supportBoxY + 10);

        doc
          .fillColor(textMuted)
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            `For queries, tour guide coordination, or immediate support during your excursion, call ${operation.agency.name} at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.`,
            margin + 16,
            supportBoxY + 23,
            { width: contentWidth - 32, lineGap: 1.5 }
          );

        // ─── TWO-PASS PAGE NUMBERING & RUNNING FOOTER ────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          if (i > 0) {
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(textLight)
              .text(`Activity Pass • ${documentNumber} • ${activityTitleStr}`, margin, margin - 14, {
                width: contentWidth,
                align: "left",
              });
            doc
              .moveTo(margin, margin - 6)
              .lineTo(margin + contentWidth, margin - 6)
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .stroke();
          }

          const footerY = pageHeight - 34;
          doc
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .stroke();

          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(textLight)
            .text(
              `Generated securely via TripDesk • Confidential Travel Document • ${operation.agency.name}`,
              margin,
              footerY + 8,
              { width: contentWidth - 80, align: "left" }
            );

          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(textLight)
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 75, footerY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Audit Event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "ACTIVITY_VOUCHER_GENERATED",
        description: `Generated Activity Voucher for ${activity?.name || "Activity"} (${documentNumber})`,
        createdBy: actorName || "Operations Lead",
        metadata: {
          confirmationId,
          documentNumber,
          activityName: activity?.name,
          ticketNumber: activityConf.ticketNumber,
        },
      },
    });

    return { buffer, filename, documentNumber };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CUSTOMER BOOKING CONFIRMATION PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateBookingConfirmation(
    agencyId: string,
    operationId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        booking: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
            tripHotels: {
              include: { hotel: true },
            },
            tripVehicles: {
              include: { vehicle: true },
            },
            tripActivities: {
              include: { activity: true },
            },
          },
        },
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
          },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: { include: { vehicle: true } },
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
        },
      },
    });

    if (!operation) {
      throw new Error("Trip operation not found or unauthorized.");
    }

    const documentNumber = this.generateDocumentNumber("TBC", operation.trip.tripNumber || "0001", 1);
    const filename = `Booking-Confirmation-${operation.trip.tripNumber || documentNumber}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
          bufferPages: true,
          compress: false,
          info: {
            Title: `Booking Confirmation - ${operation.trip.title}`,
            Author: operation.agency.name,
            Subject: `Booking Confirmation ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        const brandDark = "#0F172A"; // Slate 900
        const brandAccent = "#0284C7"; // Sky 600
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const textLight = "#94A3B8";
        const bgCard = "#F8FAFC";
        const borderLight = "#E2E8F0";

        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight = 44) => {
          ensureSpace(36 + minContentHeight);
          doc.y += 16;
          doc.x = margin;

          doc.fillColor(textDark).fontSize(10.5).font("Helvetica-Bold").text(title, { characterSpacing: 0.5 });
          if (subtitle) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(subtitle, { lineGap: 1 });
          }

          const lineY = doc.y + 4;
          doc
            .moveTo(margin, lineY)
            .lineTo(margin + 32, lineY)
            .strokeColor(brandAccent)
            .lineWidth(2)
            .stroke();

          doc.y = lineY + 8;
        };

        // ─── HERO HEADER BANNER ──────────────────────────────────────────────
        const agencyName = operation.agency.name || "TripDesk Travel Partner";
        const agencyContact = [operation.agency.phone, operation.agency.email, operation.agency.address]
          .filter(Boolean)
          .join(" • ");

        const leftWidth = contentWidth - 210;
        doc.font("Helvetica-Bold").fontSize(14);
        const nameH = doc.heightOfString(agencyName, { width: leftWidth });
        doc.font("Helvetica").fontSize(7.5);
        const contactH = agencyContact ? doc.heightOfString(agencyContact, { width: leftWidth }) : 0;
        const leftContentH = nameH + contactH + 46;

        // Right Badge text & dynamic height measurement
        const docNumText = `CONFIRMATION #: ${documentNumber}`;
        const dateText = `Date: ${this.formatDate(new Date())}`;
        const refText = `Booking Ref: ${operation.booking?.bookingNumber || operation.trip.tripNumber || "N/A"}`;
        const statusText = "BOOKING CONFIRMED";

        doc.font("Helvetica-Bold").fontSize(9.5);
        const docNumH = doc.heightOfString(docNumText, { width: 155, align: "center" });

        doc.font("Helvetica").fontSize(7.5);
        const dateH = doc.heightOfString(dateText, { width: 155, align: "center" });
        const refH = doc.heightOfString(refText, { width: 155, align: "center" });

        const pillH = 14;
        const totalRightContentH = docNumH + 3 + dateH + 2 + refH + 5 + pillH;
        const minRightBoxH = totalRightContentH + 16;

        const bannerHeight = Math.max(88, leftContentH, minRightBoxH + 28);

        doc.roundedRect(margin, margin, contentWidth, bannerHeight, 8).fill(brandDark);

        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, { width: leftWidth });

        doc
          .fillColor("#BAE6FD")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text("OFFICIAL TRAVEL BOOKING CONFIRMATION", margin + 18, doc.y + 3);

        if (agencyContact) {
          doc
            .fillColor("#94A3B8")
            .fontSize(7.5)
            .font("Helvetica")
            .text(agencyContact, margin + 18, doc.y + 4, { width: leftWidth, lineGap: 1 });
        }

        // Right Badge
        const rightX = margin + contentWidth - 190;
        const rightY = margin + 14;
        const rightBoxH = bannerHeight - 28;
        doc.roundedRect(rightX, rightY, 175, rightBoxH, 6).fillAndStroke("#1E293B", "#334155");

        const rightStartY = rightY + Math.max(8, (rightBoxH - totalRightContentH) / 2);
        let curRightY = rightStartY;

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(docNumText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += docNumH + 3;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dateText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += dateH + 2;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(refText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += refH + 5;

        const pillX = rightX + (175 - 125) / 2;
        doc.roundedRect(pillX, curRightY, 125, pillH, 7).fillAndStroke("#064E3B", "#059669");
        doc
          .fillColor("#A7F3D0")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(statusText, pillX, curRightY + 3.5, { width: 125, align: "center" });

        doc.y = margin + bannerHeight + 14;

        // ─── TRIP & CUSTOMER OVERVIEW CARD ───────────────────────────────────
        const leadGuestName = operation.trip.customer?.name || "Valued Passenger";
        const guestContact = [operation.trip.customer?.phone, operation.trip.customer?.email]
          .filter(Boolean)
          .join(" • ");
        const coTravelers = operation.trip.travelers?.map((t) => t.name).join(", ");
        const totalPax = operation.trip.travelers?.length || 1;
        const tripDates = `${this.formatDate(operation.trip.startDate)} — ${this.formatDate(operation.trip.endDate)}`;

        const colW = (contentWidth - 36) / 2;
        doc.font("Helvetica-Bold").fontSize(11.5);
        const titleH = doc.heightOfString(operation.trip.title, { width: colW });
        const overviewCardHeight = Math.max(64, 38 + titleH);

        ensureSpace(overviewCardHeight);
        doc.roundedRect(margin, doc.y, contentWidth, overviewCardHeight, 6).fillAndStroke(bgCard, borderLight);

        const cardTopY = doc.y + 10;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("CONFIRMED TOUR ITINERARY", margin + 14, cardTopY);
        doc.fillColor(textDark).fontSize(11.5).font("Helvetica-Bold").text(operation.trip.title, margin + 14, cardTopY + 12, { width: colW });
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(`Travel Dates: ${tripDates}`, margin + 14, cardTopY + 12 + titleH + 2);

        const rightColX = margin + colW + 22;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("LEAD PASSENGER & PARTY", rightColX, cardTopY);
        doc
          .fillColor(textDark)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`${leadGuestName} • ${totalPax} Pax`, rightColX, cardTopY + 12);
        if (guestContact) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(guestContact, rightColX, cardTopY + 26, { width: colW });
        }
        if (coTravelers) {
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`Co-Travelers: ${coTravelers}`, rightColX, cardTopY + 38, { width: colW, lineGap: 1 });
        }

        doc.y = cardTopY + overviewCardHeight - 2;

        // ─── 1. ACCOMMODATION SUMMARY ────────────────────────────────────────
        drawSectionHeader("1. ACCOMMODATION SUMMARY", "Confirmed hotel accommodations and stay details", 80);

        const hotels = operation.hotelConfirmations.length > 0
          ? operation.hotelConfirmations
          : operation.trip.tripHotels;

        if (hotels.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No accommodation entries recorded.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const h of hotels) {
            const hotelName = (h as any).tripHotel?.hotel?.name || (h as any).hotel?.name || "Hotel Accommodation";
            const checkIn = this.formatDate((h as any).checkIn || (h as any).tripHotel?.checkIn);
            const checkOut = this.formatDate((h as any).checkOut || (h as any).tripHotel?.checkOut);
            const roomType = (h as any).roomDetails || (h as any).tripHotel?.roomType || (h as any).roomType || "Standard Room";
            const mealPlan = (h as any).mealPlan || (h as any).tripHotel?.mealPlan || (h as any).mealPlan || "Room Only";
            const confNo = (h as any).confirmationNumber ? `Ref: ${(h as any).confirmationNumber}` : "Confirmed";

            let nightsCount = 1;
            const ci = (h as any).checkIn || (h as any).tripHotel?.checkIn;
            const co = (h as any).checkOut || (h as any).tripHotel?.checkOut;
            if (ci && co) {
              const diff = new Date(co).getTime() - new Date(ci).getTime();
              nightsCount = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
            }

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke("#FFFFFF", borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(hotelName, margin + 14, itemY + 8, { width: contentWidth - 170 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `Stay: ${checkIn} to ${checkOut} • ${nightsCount} Night(s) | Room: ${roomType} | Plan: ${mealPlan}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 170 }
            );

            // Ref Badge
            doc.roundedRect(margin + contentWidth - 144, itemY + 12, 130, 20, 4).fillAndStroke("#F0FDFA", "#99F6E4");
            doc.fillColor("#0F766E").fontSize(8).font("Helvetica-Bold").text(confNo, margin + contentWidth - 144, itemY + 17, { width: 130, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── 2. TRANSPORTATION & LOGISTICS ───────────────────────────────────
        drawSectionHeader("2. TRANSPORTATION & LOGISTICS", "Dedicated vehicle allocations and transfer schedule", 80);

        const vehicles = operation.vehicleDispatches.length > 0
          ? operation.vehicleDispatches
          : operation.trip.tripVehicles;

        if (vehicles.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No transport services scheduled.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const v of vehicles) {
            const vName = (v as any).vehicle?.name || (v as any).tripVehicle?.vehicle?.name || "Private Dedicated Vehicle";
            const vPlate = (v as any).vehicleNumber ? `Reg: ${(v as any).vehicleNumber}` : "Dedicated Vehicle";
            const driver = (v as any).driverName ? `Chauffeur: ${(v as any).driverName} (${(v as any).driverPhone || "Contact on file"})` : "Chauffeur allocated prior to pickup";
            const pickup = (v as any).pickupDate ? `Pickup: ${this.formatDate((v as any).pickupDate)} at ${this.formatTime((v as any).pickupTime)}` : "As per Tour Schedule";
            const routeStr = (v as any).pickupLocation && (v as any).dropLocation
              ? `Route: ${(v as any).pickupLocation} to ${(v as any).dropLocation}`
              : "Route: As per Tour Itinerary";

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke("#FFFFFF", borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(`${vName} (${vPlate})`, margin + 14, itemY + 8, { width: contentWidth - 160 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `${pickup} | ${routeStr} | ${driver}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 160 }
            );

            doc.roundedRect(margin + contentWidth - 134, itemY + 12, 120, 20, 4).fillAndStroke("#EFF6FF", "#BFDBFE");
            doc.fillColor("#1D4ED8").fontSize(8).font("Helvetica-Bold").text("ALLOCATED", margin + contentWidth - 134, itemY + 17, { width: 120, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── 3. SIGHTSEEING & EXPERIENCES ────────────────────────────────────
        drawSectionHeader("3. SIGHTSEEING & EXPERIENCES", "Confirmed entry passes and scheduled excursions", 80);

        const activities = operation.activityConfirmations.length > 0
          ? operation.activityConfirmations
          : operation.trip.tripActivities;

        if (activities.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No excursion entries included.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const a of activities) {
            const aName = (a as any).activity?.name || (a as any).tripActivity?.activity?.name || "Sightseeing Experience";
            const ticket = (a as any).ticketNumber ? `Pass: ${(a as any).ticketNumber}` : "Admission Confirmed";
            const dateStr = this.formatDate((a as any).tripActivity?.date || operation.trip.startDate);
            const venue = (a as any).activity?.location || (a as any).tripActivity?.location || "Designated Experience Venue";

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke("#FFFFFF", borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(aName, margin + 14, itemY + 8, { width: contentWidth - 170 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `Scheduled: ${dateStr} | Venue: ${venue}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 170 }
            );

            doc.roundedRect(margin + contentWidth - 144, itemY + 12, 130, 20, 4).fillAndStroke("#FAF5FF", "#E9D5FF");
            doc.fillColor("#7C3AED").fontSize(8).font("Helvetica-Bold").text(ticket, margin + contentWidth - 144, itemY + 17, { width: 130, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── IMPORTANT POLICIES & 24/7 SUPPORT ──────────────────────────────
        ensureSpace(70);
        doc.y += 8;
        const footerBoxY = doc.y;
        doc.roundedRect(margin, footerBoxY, contentWidth, 60, 6).fillAndStroke(bgCard, borderLight);

        doc
          .fillColor(brandDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("IMPORTANT TRAVEL INFORMATION & 24/7 ASSISTANCE", margin + 16, footerBoxY + 10);

        doc
          .fillColor(textMuted)
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            `• For 24/7 on-ground concierge support, contact ${operation.agency.name} at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.\n• Please carry valid government-approved photo identification (Passport / Aadhaar / Voter ID) for all guests throughout the trip.\n• Standard check-in time is 14:00 hrs and check-out time is 11:00 hrs unless specified otherwise by the hotel.`,
            margin + 16,
            footerBoxY + 22,
            { width: contentWidth - 32, lineGap: 1.5 }
          );

        // ─── TWO-PASS PAGE NUMBERING & RUNNING FOOTER ────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          if (i > 0) {
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(textLight)
              .text(`Booking Confirmation • ${documentNumber} • ${operation.trip.title}`, margin, margin - 14, {
                width: contentWidth,
                align: "left",
              });
            doc
              .moveTo(margin, margin - 6)
              .lineTo(margin + contentWidth, margin - 6)
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .stroke();
          }

          const footerY = pageHeight - 34;
          doc
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .stroke();

          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(textLight)
            .text(
              `Generated securely via TripDesk • Official Booking Confirmation • ${operation.agency.name}`,
              margin,
              footerY + 8,
              { width: contentWidth - 80, align: "left" }
            );

          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(textLight)
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 75, footerY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Audit Event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "BOOKING_CONFIRMATION_GENERATED",
        description: `Generated Booking Confirmation for ${operation.trip.title} (${documentNumber})`,
        createdBy: actorName || "Operations Lead",
        metadata: {
          documentNumber,
          tripNumber: operation.trip.tripNumber,
          bookingNumber: operation.booking?.bookingNumber,
        },
      },
    });

    return { buffer, filename, documentNumber };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. FINAL TRAVEL KIT / COMPREHENSIVE ITINERARY PDF GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateTravelKit(
    agencyId: string,
    operationId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        booking: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
            itineraryItems: {
              orderBy: { dayNumber: "asc" },
            },
            tripHotels: {
              include: { hotel: true },
            },
            tripVehicles: {
              include: { vehicle: true },
            },
            tripActivities: {
              include: { activity: true },
            },
          },
        },
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
          },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: { include: { vehicle: true } },
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
        },
      },
    });

    if (!operation) {
      throw new Error("Trip operation not found or unauthorized.");
    }

    const documentNumber = this.generateDocumentNumber("TTK", operation.trip.tripNumber || "0001", 1);
    const filename = `Travel-Kit-${operation.trip.tripNumber || documentNumber}.pdf`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
          bufferPages: true,
          compress: false,
          info: {
            Title: `Travel Kit - ${operation.trip.title}`,
            Author: operation.agency.name,
            Subject: `Final Travel Kit & Itinerary ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        const brandDark = "#0F172A"; // Slate 900
        const brandIndigo = "#4338CA"; // Indigo 700
        const brandAccent = "#6366F1"; // Indigo 500
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const textLight = "#94A3B8";
        const bgCard = "#F8FAFC";
        const borderLight = "#E2E8F0";

        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight = 44) => {
          ensureSpace(36 + minContentHeight);
          doc.y += 16;
          doc.x = margin;

          doc.fillColor(textDark).fontSize(10.5).font("Helvetica-Bold").text(title, { characterSpacing: 0.5 });
          if (subtitle) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(subtitle, { lineGap: 1 });
          }

          const lineY = doc.y + 4;
          doc
            .moveTo(margin, lineY)
            .lineTo(margin + 32, lineY)
            .strokeColor(brandAccent)
            .lineWidth(2)
            .stroke();

          doc.y = lineY + 8;
        };

        // ─── HERO HEADER BANNER ──────────────────────────────────────────────
        const agencyName = operation.agency.name || "TripDesk Travel Partner";
        const agencyContact = [operation.agency.phone, operation.agency.email, operation.agency.address]
          .filter(Boolean)
          .join(" • ");

        const leftWidth = contentWidth - 210;
        doc.font("Helvetica-Bold").fontSize(14);
        const nameH = doc.heightOfString(agencyName, { width: leftWidth });
        doc.font("Helvetica").fontSize(7.5);
        const contactH = agencyContact ? doc.heightOfString(agencyContact, { width: leftWidth }) : 0;
        const leftContentH = nameH + contactH + 48;

        // Right Badge text & dynamic height measurement
        const docNumText = `KIT #: ${documentNumber}`;
        const dateText = `Issued: ${this.formatDate(new Date())}`;
        const refText = `Booking: ${operation.booking?.bookingNumber || operation.trip.tripNumber || "CONFIRMED"}`;
        const statusText = "TRAVEL READY";

        doc.font("Helvetica-Bold").fontSize(9.5);
        const docNumH = doc.heightOfString(docNumText, { width: 155, align: "center" });

        doc.font("Helvetica").fontSize(7.5);
        const dateH = doc.heightOfString(dateText, { width: 155, align: "center" });
        const refH = doc.heightOfString(refText, { width: 155, align: "center" });

        const pillH = 14;
        const totalRightContentH = docNumH + 3 + dateH + 2 + refH + 5 + pillH;
        const minRightBoxH = totalRightContentH + 16;

        const bannerHeight = Math.max(92, leftContentH, minRightBoxH + 28);

        doc.roundedRect(margin, margin, contentWidth, bannerHeight, 8).fill(brandDark);

        doc
          .fillColor("#FFFFFF")
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, { width: leftWidth });

        doc
          .fillColor("#C7D2FE")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text("FINAL TRAVEL KIT & OFFICIAL ITINERARY PACK", margin + 18, doc.y + 3);

        if (agencyContact) {
          doc
            .fillColor("#94A3B8")
            .fontSize(7.5)
            .font("Helvetica")
            .text(agencyContact, margin + 18, doc.y + 4, { width: leftWidth, lineGap: 1 });
        }

        // Right Badge
        const rightX = margin + contentWidth - 190;
        const rightY = margin + 14;
        const rightBoxH = bannerHeight - 28;
        doc.roundedRect(rightX, rightY, 175, rightBoxH, 6).fillAndStroke("#1E293B", "#334155");

        const rightStartY = rightY + Math.max(8, (rightBoxH - totalRightContentH) / 2);
        let curRightY = rightStartY;

        doc
          .fillColor("#FFFFFF")
          .fontSize(9.5)
          .font("Helvetica-Bold")
          .text(docNumText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += docNumH + 3;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dateText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += dateH + 2;

        doc
          .fillColor("#94A3B8")
          .fontSize(7.5)
          .font("Helvetica")
          .text(refText, rightX + 10, curRightY, { width: 155, align: "center" });
        curRightY += refH + 5;

        const pillX = rightX + (175 - 125) / 2;
        doc.roundedRect(pillX, curRightY, 125, pillH, 7).fillAndStroke("#312E81", "#6366F1");
        doc
          .fillColor("#E0E7FF")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(statusText, pillX, curRightY + 3.5, { width: 125, align: "center" });

        doc.y = margin + bannerHeight + 14;

        // ─── JOURNEY OVERVIEW CARD ───────────────────────────────────────────
        const leadGuestName = operation.trip.customer?.name || "Valued Passenger";
        const guestContact = [operation.trip.customer?.phone, operation.trip.customer?.email]
          .filter(Boolean)
          .join(" • ");
        const coTravelers = operation.trip.travelers?.map((t) => t.name).join(", ");
        const totalPax = operation.trip.travelers?.length || 1;
        const tripDates = `${this.formatDate(operation.trip.startDate)} — ${this.formatDate(operation.trip.endDate)}`;

        const colW = (contentWidth - 36) / 2;
        doc.font("Helvetica-Bold").fontSize(12);
        const titleH = doc.heightOfString(operation.trip.title, { width: colW });
        const journeyCardHeight = Math.max(68, 40 + titleH);

        ensureSpace(journeyCardHeight);
        doc.roundedRect(margin, doc.y, contentWidth, journeyCardHeight, 6).fillAndStroke(bgCard, borderLight);

        const cardTopY = doc.y + 10;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("JOURNEY TITLE & DURATION", margin + 14, cardTopY);
        doc.fillColor(textDark).fontSize(12).font("Helvetica-Bold").text(operation.trip.title, margin + 14, cardTopY + 12, { width: colW });
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(`Travel Dates: ${tripDates}`, margin + 14, cardTopY + 12 + titleH + 2);

        const rightColX = margin + colW + 22;
        doc.fillColor("#64748B").fontSize(7.5).font("Helvetica-Bold").text("GUEST ROSTER & CONTACT", rightColX, cardTopY);
        doc
          .fillColor(textDark)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`${leadGuestName} • ${totalPax} Pax`, rightColX, cardTopY + 12);
        if (guestContact) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(guestContact, rightColX, cardTopY + 26, { width: colW });
        }
        if (coTravelers) {
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`Travelers: ${coTravelers}`, rightColX, cardTopY + 38, { width: colW, lineGap: 1 });
        }

        doc.y = cardTopY + journeyCardHeight - 2;

        // ─── DAY-BY-DAY ITINERARY ────────────────────────────────────────────
        drawSectionHeader("DAY-BY-DAY TOUR ITINERARY", "Complete scheduled day-wise programme and experiences", 100);

        const days = operation.trip.itineraryItems;
        if (days.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("Itinerary schedule is prepared and coordinated on ground.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const day of days) {
            const desc = day.description || "Sightseeing, transfers, and leisure activities as planned.";
            doc.font("Helvetica").fontSize(8);
            const descH = doc.heightOfString(desc, { width: contentWidth - 28, lineGap: 2.5 });
            const totalDayBoxH = 24 + descH + 16;

            ensureSpace(totalDayBoxH + 6);
            const dayCardY = doc.y;

            // Day Header Pill
            doc.roundedRect(margin, dayCardY, contentWidth, 22, 4).fill(brandIndigo);
            doc.fillColor("#FFFFFF").fontSize(8.5).font("Helvetica-Bold").text(
              `DAY ${day.dayNumber}: ${day.title}`,
              margin + 12,
              dayCardY + 6,
              { width: contentWidth - 24 }
            );

            // Day Description Box
            doc
              .roundedRect(margin, dayCardY + 22, contentWidth, descH + 16, 4)
              .fillAndStroke("#FFFFFF", borderLight);

            doc.fillColor(textDark).fontSize(8).font("Helvetica").text(
              desc,
              margin + 14,
              dayCardY + 30,
              { width: contentWidth - 28, lineGap: 2.5 }
            );

            doc.y = dayCardY + totalDayBoxH + 6;
          }
        }

        // ─── CONFIRMED HOTEL ACCOMMODATIONS ──────────────────────────────────
        drawSectionHeader("CONFIRMED HOTEL ACCOMMODATIONS", "Hotel check-in details, room arrangements, and meal plans", 80);

        const hotels = operation.hotelConfirmations.length > 0
          ? operation.hotelConfirmations
          : operation.trip.tripHotels;

        if (hotels.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No accommodation entries recorded.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const h of hotels) {
            const hotelName = (h as any).tripHotel?.hotel?.name || (h as any).hotel?.name || "Hotel Property";
            const checkIn = this.formatDate((h as any).checkIn || (h as any).tripHotel?.checkIn);
            const checkOut = this.formatDate((h as any).checkOut || (h as any).tripHotel?.checkOut);
            const roomType = (h as any).roomDetails || (h as any).tripHotel?.roomType || (h as any).roomType || "Standard Room";
            const mealPlan = (h as any).mealPlan || (h as any).tripHotel?.mealPlan || (h as any).mealPlan || "Room Only";
            const confNo = (h as any).confirmationNumber ? `Conf #: ${(h as any).confirmationNumber}` : "Confirmed";

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke(bgCard, borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(hotelName, margin + 14, itemY + 8, { width: contentWidth - 170 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `Stay: ${checkIn} to ${checkOut} | Room: ${roomType} | Plan: ${mealPlan}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 170 }
            );

            doc.roundedRect(margin + contentWidth - 144, itemY + 12, 130, 20, 4).fillAndStroke("#F0FDFA", "#99F6E4");
            doc.fillColor("#0F766E").fontSize(8).font("Helvetica-Bold").text(confNo, margin + contentWidth - 144, itemY + 17, { width: 130, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── TRANSPORT & CHAUFFEUR ALLOCATION ────────────────────────────────
        drawSectionHeader("TRANSPORTATION & CHAUFFEUR ALLOCATION", "Dedicated fleet logistics, chauffeur details, and pickup points", 80);

        const vehicles = operation.vehicleDispatches.length > 0
          ? operation.vehicleDispatches
          : operation.trip.tripVehicles;

        if (vehicles.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No transport services scheduled.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const v of vehicles) {
            const vName = (v as any).vehicle?.name || (v as any).tripVehicle?.vehicle?.name || "Private Dedicated Vehicle";
            const vPlate = (v as any).vehicleNumber || "Assigned On Dispatch";
            const driver = (v as any).driverName ? `Chauffeur: ${(v as any).driverName} (${(v as any).driverPhone || "Contact on file"})` : "Chauffeur details coordinated prior to arrival";
            const pickup = (v as any).pickupDate ? `Pickup: ${this.formatDate((v as any).pickupDate)} at ${this.formatTime((v as any).pickupTime)}` : "Pickup as per itinerary";
            const routeStr = (v as any).pickupLocation && (v as any).dropLocation
              ? `Route: ${(v as any).pickupLocation} to ${(v as any).dropLocation}`
              : "Route: As per Tour Itinerary";

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke(bgCard, borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(`${vName} (${vPlate})`, margin + 14, itemY + 8, { width: contentWidth - 160 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `${pickup} | ${routeStr} | ${driver}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 160 }
            );

            doc.roundedRect(margin + contentWidth - 134, itemY + 12, 120, 20, 4).fillAndStroke("#EFF6FF", "#BFDBFE");
            doc.fillColor("#1D4ED8").fontSize(8).font("Helvetica-Bold").text("ALLOCATED", margin + contentWidth - 134, itemY + 17, { width: 120, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── ACTIVITIES & EXCURSION PASSES ───────────────────────────────────
        drawSectionHeader("ACTIVITIES & EXCURSION PASSES", "Confirmed entry passes and sightseeing schedule", 80);

        const activities = operation.activityConfirmations.length > 0
          ? operation.activityConfirmations
          : operation.trip.tripActivities;

        if (activities.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No excursion entries included.", margin, doc.y);
          doc.y += 12;
        } else {
          for (const a of activities) {
            const aName = (a as any).activity?.name || (a as any).tripActivity?.activity?.name || "Sightseeing Experience";
            const ticket = (a as any).ticketNumber ? `Pass: ${(a as any).ticketNumber}` : "Admission Confirmed";
            const dateStr = this.formatDate((a as any).tripActivity?.date || operation.trip.startDate);
            const venue = (a as any).activity?.location || (a as any).tripActivity?.location || "Designated Experience Venue";

            const itemHeight = 44;
            ensureSpace(itemHeight + 6);
            const itemY = doc.y;
            doc.roundedRect(margin, itemY, contentWidth, itemHeight, 6).fillAndStroke(bgCard, borderLight);

            doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(aName, margin + 14, itemY + 8, { width: contentWidth - 170 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
              `Scheduled: ${dateStr} | Venue: ${venue}`,
              margin + 14,
              itemY + 22,
              { width: contentWidth - 170 }
            );

            doc.roundedRect(margin + contentWidth - 144, itemY + 12, 130, 20, 4).fillAndStroke("#FAF5FF", "#E9D5FF");
            doc.fillColor("#7C3AED").fontSize(8).font("Helvetica-Bold").text(ticket, margin + contentWidth - 144, itemY + 17, { width: 130, align: "center" });

            doc.y = itemY + itemHeight + 6;
          }
        }

        // ─── 24/7 GUEST CONCIERGE & EMERGENCY ASSISTANCE ────────────────────
        ensureSpace(70);
        doc.y += 8;
        const helpBoxY = doc.y;
        doc.roundedRect(margin, helpBoxY, contentWidth, 60, 6).fillAndStroke("#F0FDF4", "#BBF7D0");

        doc.fillColor("#166534").fontSize(8).font("Helvetica-Bold").text("24/7 GUEST CONCIERGE & EMERGENCY ASSISTANCE", margin + 16, helpBoxY + 10);
        doc.fillColor("#14532D").fontSize(7.5).font("Helvetica").text(
          `• Dedicated Operations Desk: ${operation.agency.phone || "+91 98800 11223"} | Email: ${operation.agency.email || "concierge@tripdesk.com"}\n• Please carry valid government photo IDs for all passengers throughout the journey.\n• For flight or train delays, notify your travel coordinator promptly for seamless pickup rescheduling.`,
          margin + 16,
          helpBoxY + 22,
          { width: contentWidth - 32, lineGap: 1.5 }
        );

        // ─── TWO-PASS PAGE NUMBERING & RUNNING FOOTER ────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
          doc.switchToPage(i);

          if (i > 0) {
            doc
              .fontSize(7)
              .font("Helvetica")
              .fillColor(textLight)
              .text(`Final Travel Kit • ${documentNumber} • ${operation.trip.title}`, margin, margin - 14, {
                width: contentWidth,
                align: "left",
              });
            doc
              .moveTo(margin, margin - 6)
              .lineTo(margin + contentWidth, margin - 6)
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .stroke();
          }

          const footerY = pageHeight - 34;
          doc
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .stroke();

          doc
            .fontSize(7.5)
            .font("Helvetica")
            .fillColor(textLight)
            .text(
              `Generated securely via TripDesk • Final Travel Kit & Itinerary • ${operation.agency.name}`,
              margin,
              footerY + 8,
              { width: contentWidth - 80, align: "left" }
            );

          doc
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .fillColor(textLight)
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 75, footerY + 8, {
              width: 75,
              align: "right",
            });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Audit Event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "TRAVEL_KIT_GENERATED",
        description: `Generated Comprehensive Travel Kit for ${operation.trip.title} (${documentNumber})`,
        createdBy: actorName || "Operations Lead",
        metadata: {
          documentNumber,
          tripNumber: operation.trip.tripNumber,
        },
      },
    });

    return { buffer, filename, documentNumber };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DOCUMENTS SUMMARY & READINESS METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  async getDocumentsSummary(agencyId: string, operationId: string): Promise<OperationsDocumentsSummary> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        trip: {
          include: {
            customer: true,
          },
        },
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
          },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: { include: { vehicle: true } },
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
        },
        issues: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        },
      },
    });

    if (!operation) {
      throw new Error("Trip operation not found or unauthorized.");
    }

    const documents: DocumentSummaryItem[] = [];

    // Hotel Vouchers
    operation.hotelConfirmations.forEach((h, index) => {
      const hotelName = h.tripHotel?.hotel?.name || "Hotel Accommodation";
      const isConfirmed = h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED;
      const warnings: string[] = [];
      if (!isConfirmed) warnings.push(`Hotel status is ${h.status}`);
      if (!h.confirmationNumber) warnings.push("Missing confirmation number");

      documents.push({
        id: h.id,
        type: "HOTEL_VOUCHER",
        title: `Hotel Voucher: ${hotelName}`,
        subtitle: `Check-in: ${this.formatDate(h.checkIn || h.tripHotel?.checkIn)} | Rooms: ${h.tripHotel?.rooms || 1}`,
        status: h.status,
        documentNumber: this.generateDocumentNumber("THV", operation.trip.tripNumber || "0001", index + 1),
        isReady: isConfirmed,
        downloadUrl: `/api/operations/${operation.id}/documents/hotel/${h.id}/pdf`,
        warnings,
      });
    });

    // Vehicle Vouchers
    operation.vehicleDispatches.forEach((v, index) => {
      const vName = v.vehicle?.name || v.tripVehicle?.vehicle?.name || "Private Dedicated Vehicle";
      const isAssigned = v.status === DispatchStatus.ASSIGNED || v.status === DispatchStatus.CONFIRMED || v.status === DispatchStatus.ON_DUTY || v.status === DispatchStatus.COMPLETED;
      const warnings: string[] = [];
      if (!v.driverName) warnings.push("Chauffeur not assigned");
      if (!v.vehicleNumber) warnings.push("Vehicle number missing");

      documents.push({
        id: v.id,
        type: "VEHICLE_VOUCHER",
        title: `Transport Voucher: ${vName}`,
        subtitle: `Chauffeur: ${v.driverName || "TBD"} (${v.vehicleNumber || "Plate TBD"})`,
        status: v.status,
        documentNumber: this.generateDocumentNumber("TVV", operation.trip.tripNumber || "0001", index + 1),
        isReady: isAssigned,
        downloadUrl: `/api/operations/${operation.id}/documents/vehicle/${v.id}/pdf`,
        warnings,
      });
    });

    // Activity Vouchers
    operation.activityConfirmations.forEach((a, index) => {
      const aName = a.activity?.name || a.tripActivity?.activity?.name || "Activity Experience";
      const isConfirmed = a.status === ConfirmationStatus.CONFIRMED;
      const warnings: string[] = [];
      if (!isConfirmed) warnings.push(`Activity status is ${a.status}`);

      documents.push({
        id: a.id,
        type: "ACTIVITY_VOUCHER",
        title: `Activity Pass: ${aName}`,
        subtitle: `Pass #: ${a.ticketNumber || a.confirmationNumber || "TBD"}`,
        status: a.status,
        documentNumber: this.generateDocumentNumber("TAV", operation.trip.tripNumber || "0001", index + 1),
        isReady: isConfirmed,
        downloadUrl: `/api/operations/${operation.id}/documents/activity/${a.id}/pdf`,
        warnings,
      });
    });

    // Consolidated Booking Confirmation
    documents.push({
      id: "booking-confirmation",
      type: "BOOKING_CONFIRMATION",
      title: "Customer Booking Confirmation",
      subtitle: `Consolidated booking document for ${operation.trip.title}`,
      status: "READY",
      documentNumber: this.generateDocumentNumber("TBC", operation.trip.tripNumber || "0001", 1),
      isReady: true,
      downloadUrl: `/api/operations/${operation.id}/documents/booking/pdf`,
    });

    // Final Travel Kit
    const totalHotels = operation.hotelConfirmations.length;
    const confirmedHotels = operation.hotelConfirmations.filter((h) => h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED).length;
    const totalVehicles = operation.vehicleDispatches.length;
    const assignedVehicles = operation.vehicleDispatches.filter((v) => v.driverName && v.vehicleNumber).length;
    const criticalIssues = operation.issues.filter((i) => i.priority === "CRITICAL" || i.priority === "HIGH").length;

    let score = 100;
    if (totalHotels > 0) score -= ((totalHotels - confirmedHotels) / totalHotels) * 40;
    if (totalVehicles > 0) score -= ((totalVehicles - assignedVehicles) / totalVehicles) * 30;
    if (criticalIssues > 0) score -= 30;
    score = Math.max(0, Math.round(score));

    const travelKitWarnings: string[] = [];
    if (totalHotels > 0 && confirmedHotels < totalHotels) {
      travelKitWarnings.push(`${totalHotels - confirmedHotels} hotel(s) unconfirmed`);
    }
    if (totalVehicles > 0 && assignedVehicles < totalVehicles) {
      travelKitWarnings.push(`${totalVehicles - assignedVehicles} vehicle(s) missing driver details`);
    }
    if (criticalIssues > 0) {
      travelKitWarnings.push(`${criticalIssues} high/critical issue(s) unresolved`);
    }

    documents.push({
      id: "travel-kit",
      type: "TRAVEL_KIT",
      title: "Final Travel Kit & Itinerary Pack",
      subtitle: `Comprehensive guest pack (${score}% operational readiness)`,
      status: score >= 80 ? "READY" : "INCOMPLETE",
      documentNumber: this.generateDocumentNumber("TTK", operation.trip.tripNumber || "0001", 1),
      isReady: score >= 70,
      downloadUrl: `/api/operations/${operation.id}/documents/travel-kit/pdf`,
      warnings: travelKitWarnings,
    });

    return {
      operationId: operation.id,
      tripId: operation.trip.id,
      tripNumber: operation.trip.tripNumber || "N/A",
      tripTitle: operation.trip.title,
      customerName: operation.trip.customer.name,
      readinessScore: score,
      isFullyReady: score >= 90,
      documents,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. OPERATIONS CLOSURE & FINANCIAL RECONCILIATION REPORT (INTERNAL)
  // ═══════════════════════════════════════════════════════════════════════════

  async generateClosureSummary(
    agencyId: string,
    operationId: string,
    actorName?: string
  ): Promise<{ buffer: Buffer; filename: string; documentNumber: string }> {
    const operation = await prisma.tripOperation.findFirst({
      where: { id: operationId, agencyId },
      include: {
        agency: true,
        trip: {
          include: {
            customer: true,
            travelers: true,
            tripHotels: { include: { hotel: true } },
            tripVehicles: { include: { vehicle: true } },
            tripActivities: { include: { activity: true } },
          },
        },
        booking: true,
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
            supplier: true,
          },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: { include: { vehicle: true } },
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
        },
        issues: {
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!operation) {
      throw new Error("Trip operation not found or unauthorized.");
    }

    const documentNumber = this.generateDocumentNumber(
      "TOC",
      operation.trip.tripNumber || "0001",
      1
    );
    const filename = `Operations-Closure-${operation.trip.tripNumber || documentNumber}.pdf`;

    // Extract review & reconciliation metadata
    const reviewEvent = operation.events.find((e) =>
      ["POST_TOUR_REVIEW_SAVED", "POST_TOUR_REVIEW_UPDATED"].includes(e.eventType)
    );
    const reviewData = reviewEvent?.metadata as any;

    const financialEvent = operation.events.find(
      (e) => e.eventType === "FINANCIAL_RECONCILIATION_SAVED"
    );
    const financialData = financialEvent?.metadata as any;

    const finalizedEvent = operation.events.find(
      (e) => e.eventType === "OPERATION_FINALIZED"
    );
    const finalizedData = finalizedEvent?.metadata as any;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Operations Closure - ${operation.trip.title}`,
            Author: operation.agency.name,
            Subject: `Internal Operations Closure Report ${documentNumber}`,
            Creator: "TripDesk Operations Suite",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        const checkPageBreak = (neededHeight: number) => {
          if (doc.y + neededHeight > pageHeight - 65) {
            doc.addPage();
            return true;
          }
          return false;
        };

        const primaryColor = "#0F766E"; // Teal 700
        const darkColor = "#134E4A"; // Teal 900
        const textDark = "#0F172A";
        const textMuted = "#64748B";
        const bgLight = "#F0FDFA";
        const borderLight = "#CCFBF1";

        // ─── HEADER ──────────────────────────────────────────────────────────
        doc.rect(margin, margin, contentWidth, 80).fill(darkColor);

        // Internal Watermark banner
        doc
          .fillColor("#FEF08A")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("INTERNAL OPERATIONS DOCUMENT — STRICTLY CONFIDENTIAL", margin + 18, margin + 12, {
            characterSpacing: 0.5,
          });

        doc
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .fontSize(16)
          .text("OPERATIONS CLOSURE & RECONCILIATION", margin + 18, margin + 28);

        doc
          .fillColor("#99F6E4")
          .font("Helvetica")
          .fontSize(9)
          .text(
            `${operation.agency.name} • Operations Desk • Ref: ${documentNumber}`,
            margin + 18,
            margin + 52
          );

        // Finalization Stamp in Header
        const finalStatus = finalizedEvent ? "FINALIZED & CLOSED" : "COMPLETED / IN REVIEW";
        doc
          .roundedRect(pageWidth - margin - 150, margin + 22, 135, 36, 6)
          .fillAndStroke(finalizedEvent ? "#047857" : "#0284C7", "#FFFFFF");

        doc
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(finalStatus, pageWidth - margin - 150, margin + 34, {
            width: 135,
            align: "center",
          });

        doc.y = margin + 95;

        // ─── TOUR & CUSTOMER SUMMARY ─────────────────────────────────────────
        doc
          .roundedRect(margin, doc.y, contentWidth, 68, 8)
          .fillAndStroke(bgLight, borderLight);

        const summaryY = doc.y + 10;
        doc.fillColor(textDark).font("Helvetica-Bold").fontSize(10);
        doc.text(operation.trip.title, margin + 14, summaryY);

        doc.fillColor(textMuted).font("Helvetica").fontSize(8.5);
        doc.text(
          `Customer: ${operation.trip.customer.name} (${operation.trip.customer.phone || "No phone"}) | Trip #: ${operation.trip.tripNumber || "N/A"}`,
          margin + 14,
          summaryY + 16
        );

        const startStr = this.formatDate(operation.trip.startDate);
        const endStr = this.formatDate(operation.trip.endDate);
        doc.text(
          `Travel Dates: ${startStr} → ${endStr} | Travelers: ${operation.trip.travelers.length || 1} Adult(s)`,
          margin + 14,
          summaryY + 30
        );

        const bookingTotal = operation.booking
          ? `₹${Number(operation.booking.totalAmount).toLocaleString("en-IN")}`
          : "N/A";
        doc.text(
          `Booking Ref: ${operation.booking?.bookingNumber || "Unattached"} | Revenue: ${bookingTotal}`,
          margin + 14,
          summaryY + 44
        );

        doc.y = summaryY + 70;

        // ─── SERVICE DELIVERY AUDIT ──────────────────────────────────────────
        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11);
        doc.text("1. SERVICE DELIVERY AUDIT & RECONCILIATION", margin, doc.y);
        doc.y += 6;

        // Hotels Table
        doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9).text("Accommodations (Hotels):", margin, doc.y);
        doc.y += 4;

        operation.hotelConfirmations.forEach((h) => {
          checkPageBreak(30);
          const hName = h.tripHotel?.hotel?.name || "Hotel Component";
          const hCity = h.tripHotel?.hotel?.city || "";
          const hRoom = h.roomDetails || h.tripHotel?.roomType || "Standard Room";
          const hVoucher = h.confirmationNumber || "No Voucher";
          const isDelivered = h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED;

          doc
            .roundedRect(margin, doc.y, contentWidth, 24, 4)
            .fillAndStroke("#F8FAFC", "#E2E8F0");

          const rowY = doc.y + 6;
          doc
            .fillColor(textDark)
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(`${isDelivered ? "✓" : "⚠"} ${hName} (${hCity})`, margin + 8, rowY, { width: 180 });

          doc
            .fillColor(textMuted)
            .font("Helvetica")
            .fontSize(7.5)
            .text(`Room: ${hRoom} | Voucher: ${hVoucher}`, margin + 195, rowY, { width: 200 });

          doc
            .fillColor(isDelivered ? "#047857" : "#B91C1C")
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .text(h.status, margin + 410, rowY, { width: 90, align: "right" });

          doc.y = rowY + 22;
        });

        doc.y += 6;

        // Fleet Table
        checkPageBreak(40);
        doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9).text("Fleet & Driver Dispatches:", margin, doc.y);
        doc.y += 4;

        operation.vehicleDispatches.forEach((v) => {
          checkPageBreak(30);
          const vName = v.tripVehicle?.vehicleName || v.vehicle?.name || "Private Transport";
          const driver = v.driverName || "Unassigned";
          const plate = v.vehicle?.registrationNumber || v.vehicleNumber || "Plate TBD";
          const isDelivered = v.status === DispatchStatus.COMPLETED || v.status === DispatchStatus.CONFIRMED;

          doc
            .roundedRect(margin, doc.y, contentWidth, 24, 4)
            .fillAndStroke("#F8FAFC", "#E2E8F0");

          const rowY = doc.y + 6;
          doc
            .fillColor(textDark)
            .font("Helvetica-Bold")
            .fontSize(8)
            .text(`${isDelivered ? "✓" : "⚠"} ${vName}`, margin + 8, rowY, { width: 180 });

          doc
            .fillColor(textMuted)
            .font("Helvetica")
            .fontSize(7.5)
            .text(`Driver: ${driver} (${plate})`, margin + 195, rowY, { width: 200 });

          doc
            .fillColor(isDelivered ? "#047857" : "#B91C1C")
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .text(v.status, margin + 410, rowY, { width: 90, align: "right" });

          doc.y = rowY + 22;
        });

        doc.y += 6;

        // Activities Table
        if (operation.activityConfirmations.length > 0) {
          checkPageBreak(40);
          doc.fillColor(textDark).font("Helvetica-Bold").fontSize(9).text("Activities & Excursions:", margin, doc.y);
          doc.y += 4;

          operation.activityConfirmations.forEach((a) => {
            checkPageBreak(30);
            const aName = a.tripActivity?.name || a.activity?.name || "Activity";
            const pass = a.ticketNumber || a.confirmationNumber || "Pass TBD";
            const isDelivered = a.status === ConfirmationStatus.CONFIRMED || a.status === ConfirmationStatus.AMENDED;

            doc
              .roundedRect(margin, doc.y, contentWidth, 24, 4)
              .fillAndStroke("#F8FAFC", "#E2E8F0");

            const rowY = doc.y + 6;
            doc
              .fillColor(textDark)
              .font("Helvetica-Bold")
              .fontSize(8)
              .text(`${isDelivered ? "✓" : "⚠"} ${aName}`, margin + 8, rowY, { width: 180 });

            doc
              .fillColor(textMuted)
              .font("Helvetica")
              .fontSize(7.5)
              .text(`Pass #: ${pass}`, margin + 195, rowY, { width: 200 });

            doc
              .fillColor(isDelivered ? "#047857" : "#B91C1C")
              .font("Helvetica-Bold")
              .fontSize(7.5)
              .text(a.status, margin + 410, rowY, { width: 90, align: "right" });

            doc.y = rowY + 22;
          });
        }

        doc.y += 10;

        // ─── POST-TOUR QUALITY & DEBRIEF REVIEW ───────────────────────────────
        checkPageBreak(90);
        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11);
        doc.text("2. POST-TOUR QUALITY & DEBRIEF REVIEW", margin, doc.y);
        doc.y += 6;

        doc
          .roundedRect(margin, doc.y, contentWidth, 60, 6)
          .fillAndStroke("#F8FAFC", "#E2E8F0");

        const reviewY = doc.y + 8;
        const gRating = reviewData?.guestRating ? `${reviewData.guestRating}/5 Stars` : "Not recorded";
        const opRating = reviewData?.operatorRating ? `${reviewData.operatorRating}/5 Stars` : "Not recorded";
        const quality = reviewData?.serviceQuality || "STANDARD";

        doc
          .fillColor(textDark)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(`Guest Rating: ${gRating} | Operator Rating: ${opRating} | Quality Grade: ${quality}`, margin + 10, reviewY);

        const remarks = reviewData?.internalRemarks || "No internal debrief remarks recorded.";
        doc
          .fillColor(textMuted)
          .font("Helvetica")
          .fontSize(8)
          .text(`Internal Debrief: ${remarks}`, margin + 10, reviewY + 16, {
            width: contentWidth - 20,
          });

        doc.y = reviewY + 60;

        // ─── FINANCIAL RECONCILIATION & VARIANCE ──────────────────────────────
        checkPageBreak(100);
        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11);
        doc.text("3. FINANCIAL & COST RECONCILIATION (INTERNAL ONLY)", margin, doc.y);
        doc.y += 6;

        const plannedCost = financialData?.plannedCost
          ? `₹${Number(financialData.plannedCost).toLocaleString("en-IN")}`
          : "₹0";
        const actualCost = financialData?.actualCost
          ? `₹${Number(financialData.actualCost).toLocaleString("en-IN")}`
          : "₹0";
        const varianceAmount = financialData?.varianceAmount
          ? `₹${Number(financialData.varianceAmount).toLocaleString("en-IN")}`
          : "₹0";

        doc
          .roundedRect(margin, doc.y, contentWidth, 54, 6)
          .fillAndStroke("#FFFBEB", "#FDE68A");

        const finY = doc.y + 8;
        doc
          .fillColor("#92400E")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            `Planned Cost: ${plannedCost}  |  Actual Cost: ${actualCost}  |  Variance: ${varianceAmount}`,
            margin + 10,
            finY
          );

        const vReason = financialData?.varianceReason
          ? `Variance Reason: ${financialData.varianceReason}`
          : "Zero variance / Balanced cost reconciliation.";

        doc
          .fillColor("#B45309")
          .font("Helvetica")
          .fontSize(8)
          .text(vReason, margin + 10, finY + 16, { width: contentWidth - 20 });

        doc.y = finY + 54;

        // ─── FINALIZATION AUDIT SIGN-OFF ──────────────────────────────────────
        checkPageBreak(70);
        doc
          .roundedRect(margin, doc.y, contentWidth, 48, 6)
          .fillAndStroke("#F0FDF4", "#BBF7D0");

        const signY = doc.y + 8;
        doc
          .fillColor("#166534")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text("Operational Closure Sign-Off & Audit Stamp", margin + 12, signY);

        const finalDateStr = finalizedData?.finalizedAt
          ? this.formatDate(finalizedData.finalizedAt)
          : "In Review / Unfinalized";
        const finalUserStr = finalizedData?.finalizedBy || actorName || "Operations Lead";

        doc
          .fillColor("#15803D")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `Finalized On: ${finalDateStr} | Authorized By: ${finalUserStr} | Ref: ${documentNumber}`,
            margin + 12,
            signY + 16
          );

        // Footer on all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc
            .fillColor(textMuted)
            .fontSize(7.5)
            .font("Helvetica")
            .text(
              `${operation.agency.name} • Internal Operations Document • Page ${i + 1} of ${pages.count}`,
              margin,
              pageHeight - 30,
              { align: "center", width: contentWidth }
            );
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // Record audit event
    await prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: operationId,
        eventType: "CLOSURE_SUMMARY_GENERATED",
        description: `Internal Operations Closure Report PDF generated (${documentNumber})`,
        metadata: { documentNumber, filename },
        createdBy: actorName || null,
      },
    });

    return { buffer, filename, documentNumber };
  }
}

export const operationsDocumentService = new OperationsDocumentService();
