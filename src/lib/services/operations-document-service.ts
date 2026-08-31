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
            supplier: true,
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
          margin: 40,
          bufferPages: true,
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
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        // Theme colors
        const primaryColor = "#0F766E"; // Teal 700
        const darkColor = "#042F2E"; // Teal 950
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const bgLight = "#F8FAFC";
        const borderLight = "#E2E8F0";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 80).fill(darkColor);

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(operation.agency.name, margin + 20, margin + 18, { width: 300 });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#99F6E4")
          .text("OFFICIAL HOTEL ACCOMMODATION VOUCHER", margin + 20, margin + 40);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#CCFBF1")
          .text(
            [operation.agency.phone, operation.agency.email].filter(Boolean).join(" | "),
            margin + 20,
            margin + 54
          );

        // Voucher Number Badge
        doc
          .fillColor("#FFFFFF")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`VOUCHER #: ${documentNumber}`, margin + contentWidth - 220, margin + 20, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Issued: ${this.formatDate(new Date())}`, margin + contentWidth - 220, margin + 38, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`Trip Ref: ${operation.trip.tripNumber || "N/A"}`, margin + contentWidth - 220, margin + 50, {
            width: 200,
            align: "right",
          });

        doc.y = margin + 95;

        // Section: Guest & Booking Details
        doc
          .rect(margin, doc.y, contentWidth, 65)
          .fillAndStroke(bgLight, borderLight);

        const guestY = doc.y + 12;
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("PRIMARY GUEST / TRAVELER DETAILS", margin + 15, guestY);

        doc
          .fillColor(textDark)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(operation.trip.customer.name, margin + 15, guestY + 14);

        const travelersList = operation.trip.travelers.map((t) => t.name).join(", ");
        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Travelers: ${travelersList || operation.trip.customer.name} | Contact: ${operation.trip.customer.phone || "On File"}`,
            margin + 15,
            guestY + 30,
            { width: contentWidth - 30 }
          );

        doc.y = guestY + 60;

        // Section: Hotel & Stay Details Box
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("HOTEL RESERVATION DETAILS");

        const detailsBoxY = doc.y + 6;
        doc
          .rect(margin, detailsBoxY, contentWidth, 160)
          .fillAndStroke("#FFFFFF", borderLight);

        // Hotel Name
        doc
          .fillColor(textDark)
          .fontSize(13)
          .font("Helvetica-Bold")
          .text(hotel?.name || "Hotel Property", margin + 15, detailsBoxY + 14, { width: contentWidth - 30 });

        if (hotel?.city || hotel?.address) {
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font("Helvetica")
            .text(
              [hotel.address, hotel.city, hotel.state].filter(Boolean).join(", "),
              margin + 15,
              detailsBoxY + 32,
              { width: contentWidth - 30 }
            );
        }

        // Divider
        doc
          .moveTo(margin + 15, detailsBoxY + 48)
          .lineTo(margin + contentWidth - 15, detailsBoxY + 48)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // 4-Column Grid for Dates & Room
        const colY = detailsBoxY + 58;
        const col1 = margin + 15;
        const col2 = margin + 140;
        const col3 = margin + 265;
        const col4 = margin + 390;

        // Col 1: Check-in
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("CHECK-IN DATE", col1, colY);
        doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold").text(this.formatDate(hotelConf.checkIn || hotelConf.tripHotel?.checkIn), col1, colY + 12);
        doc.fillColor(textMuted).fontSize(7).font("Helvetica").text("Standard: 14:00 hrs", col1, colY + 26);

        // Col 2: Check-out
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("CHECK-OUT DATE", col2, colY);
        doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold").text(this.formatDate(hotelConf.checkOut || hotelConf.tripHotel?.checkOut), col2, colY + 12);
        doc.fillColor(textMuted).fontSize(7).font("Helvetica").text("Standard: 11:00 hrs", col2, colY + 26);

        // Col 3: Room Type
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("ROOM TYPE & ROOMS", col3, colY);
        doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(hotelConf.roomDetails || hotelConf.tripHotel?.roomType || "Standard Room", col3, colY + 12, { width: 115 });
        doc.fillColor(textMuted).fontSize(7).font("Helvetica").text(`${hotelConf.tripHotel?.rooms || 1} Room(s)`, col3, colY + 26);

        // Col 4: Meal Plan
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("MEAL PLAN", col4, colY);
        doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(hotelConf.mealPlan || hotelConf.tripHotel?.mealPlan || "Room Only", col4, colY + 12, { width: 115 });

        // Confirmation Bar inside Box
        doc
          .rect(margin + 15, detailsBoxY + 105, contentWidth - 30, 42)
          .fillAndStroke(bgLight, "#CBD5E1");

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("HOTEL CONFIRMATION NUMBER / BOOKING ID", margin + 25, detailsBoxY + 114);

        doc
          .fillColor(darkColor)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(hotelConf.confirmationNumber || "CONFIRMED ON ARRIVAL", margin + 25, detailsBoxY + 126);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(`Status: ${hotelConf.status}`, margin + contentWidth - 160, detailsBoxY + 126, {
            width: 130,
            align: "right",
          });

        doc.y = detailsBoxY + 175;

        // Section: Important Guest Instructions
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("IMPORTANT HOTEL CHECK-IN GUIDELINES");

        const instructions = [
          "• Government-approved photo identification (Passport / Aadhaar / Driving License) is mandatory for all adult guests upon check-in.",
          "• Early check-in or late check-out is subject to hotel availability and may incur additional charges directly payable to the hotel.",
          "• Incidental expenses such as room service, laundry, telephone calls, mini-bar, and optional spa services are to be settled directly with hotel reception.",
          "• Please present this official confirmation voucher along with your valid ID at the hotel reception desk.",
        ];

        doc.moveDown(0.4);
        doc.fillColor(textMuted).fontSize(8).font("Helvetica");
        for (const line of instructions) {
          doc.text(line, { lineGap: 3 });
        }

        // Emergency & Support Footer
        doc.rect(margin, 740, contentWidth, 55).fillAndStroke(bgLight, borderLight);
        doc
          .fillColor(darkColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 GUEST OPERATIONS & CONCIERGE ASSISTANCE", margin + 15, 748);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `For on-ground assistance or reservation modifications, please contact ${operation.agency.name} Concierge at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.`,
            margin + 15,
            760,
            { width: contentWidth - 30 }
          );

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
          margin: 40,
          bufferPages: true,
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
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        // Theme colors
        const primaryColor = "#1D4ED8"; // Blue 700
        const darkColor = "#1E293B"; // Slate 800
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const bgLight = "#F8FAFC";
        const borderLight = "#E2E8F0";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 80).fill(darkColor);

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(operation.agency.name, margin + 20, margin + 18, { width: 300 });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#93C5FD")
          .text("OFFICIAL TRANSPORTATION & DRIVER VOUCHER", margin + 20, margin + 40);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#BFDBFE")
          .text(
            [operation.agency.phone, operation.agency.email].filter(Boolean).join(" | "),
            margin + 20,
            margin + 54
          );

        // Voucher Number Badge
        doc
          .fillColor("#FFFFFF")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`VOUCHER #: ${documentNumber}`, margin + contentWidth - 220, margin + 20, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Issued: ${this.formatDate(new Date())}`, margin + contentWidth - 220, margin + 38, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`Trip Ref: ${operation.trip.tripNumber || "N/A"}`, margin + contentWidth - 220, margin + 50, {
            width: 200,
            align: "right",
          });

        doc.y = margin + 95;

        // Section: Guest & Booking Details
        doc
          .rect(margin, doc.y, contentWidth, 60)
          .fillAndStroke(bgLight, borderLight);

        const guestY = doc.y + 12;
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("PASSENGER & TRIP DETAILS", margin + 15, guestY);

        doc
          .fillColor(textDark)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(operation.trip.customer.name, margin + 15, guestY + 14);

        const travelersList = operation.trip.travelers.map((t) => t.name).join(", ");
        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Travelers: ${travelersList || operation.trip.customer.name} | Phone: ${operation.trip.customer.phone || "On File"}`,
            margin + 15,
            guestY + 28,
            { width: contentWidth - 30 }
          );

        doc.y = guestY + 55;

        // Section: Vehicle & Chauffeur Details Box
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("ASSIGNED VEHICLE & CHAUFFEUR");

        const vehicleBoxY = doc.y + 6;
        doc
          .rect(margin, vehicleBoxY, contentWidth, 150)
          .fillAndStroke("#FFFFFF", borderLight);

        // Vehicle Name
        doc
          .fillColor(textDark)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(
            vehicle?.name || dispatch.tripVehicle?.vehicle?.name || "Private Dedicated Vehicle",
            margin + 15,
            vehicleBoxY + 14
          );

        // 3-Column Grid: Vehicle Number, Driver Name, Driver Phone
        const vGridY = vehicleBoxY + 40;
        const vCol1 = margin + 15;
        const vCol2 = margin + 180;
        const vCol3 = margin + 350;

        // Col 1: Vehicle Number
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("VEHICLE NUMBER / REGISTRATION", vCol1, vGridY);
        doc.fillColor(darkColor).fontSize(11).font("Helvetica-Bold").text(dispatch.vehicleNumber || "ASSIGNED UPON DISPATCH", vCol1, vGridY + 12);

        // Col 2: Driver Name
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("ASSIGNED CHAUFFEUR / DRIVER", vCol2, vGridY);
        doc.fillColor(darkColor).fontSize(11).font("Helvetica-Bold").text(dispatch.driverName || "Driver to be confirmed", vCol2, vGridY + 12);

        // Col 3: Driver Phone
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("CHAUFFEUR CONTACT NUMBER", vCol3, vGridY);
        doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text(dispatch.driverPhone || "Will be shared via SMS", vCol3, vGridY + 12);

        // Divider
        doc
          .moveTo(margin + 15, vehicleBoxY + 80)
          .lineTo(margin + contentWidth - 15, vehicleBoxY + 80)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // Pickup / Drop Route Row
        const routeY = vehicleBoxY + 92;
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("PICKUP SCHEDULE & LOCATION", vCol1, routeY);
        doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(
          `${this.formatDate(dispatch.pickupDate)} at ${this.formatTime(dispatch.pickupTime)}`,
          vCol1,
          routeY + 12
        );
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(
          `From: ${dispatch.pickupLocation || "Scheduled Hotel / Airport"} → To: ${dispatch.dropLocation || "As per Itinerary"}`,
          vCol1,
          routeY + 25,
          { width: contentWidth - 30 }
        );

        doc.y = vehicleBoxY + 165;

        // Section: Transfer Instructions
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("PASSENGER PICKUP GUIDELINES");

        const driverInstructions = [
          "• Please be present at the designated pickup lobby / meeting point 10 minutes prior to scheduled departure.",
          "• For airport / railway station arrivals, your chauffeur will display a personalized name board at the exit gate.",
          "• Toll taxes, interstate permits, parking fees, and driver allowances for scheduled itinerary points are included.",
          "• Any detour or extended night hours outside agreed trip schedule may incur standard excess charges.",
        ];

        doc.moveDown(0.4);
        doc.fillColor(textMuted).fontSize(8).font("Helvetica");
        for (const line of driverInstructions) {
          doc.text(line, { lineGap: 3 });
        }

        // Emergency & Support Footer
        doc.rect(margin, 740, contentWidth, 55).fillAndStroke(bgLight, borderLight);
        doc
          .fillColor(darkColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 FLEET DISPATCH & EMERGENCY SUPPORT", margin + 15, 748);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `For real-time dispatch updates or driver coordination, contact ${operation.agency.name} Dispatch Desk at ${operation.agency.phone || "+91 98800 11223"}.`,
            margin + 15,
            760,
            { width: contentWidth - 30 }
          );

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
          margin: 40,
          bufferPages: true,
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
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        // Theme colors
        const primaryColor = "#7C3AED"; // Purple 600
        const darkColor = "#2E1065"; // Purple 950
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const bgLight = "#F8FAFC";
        const borderLight = "#E2E8F0";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 80).fill(darkColor);

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(operation.agency.name, margin + 20, margin + 18, { width: 300 });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#DDD6FE")
          .text("OFFICIAL ACTIVITY & EXCURSION PASS", margin + 20, margin + 40);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#EDE9FE")
          .text(
            [operation.agency.phone, operation.agency.email].filter(Boolean).join(" | "),
            margin + 20,
            margin + 54
          );

        // Voucher Number Badge
        doc
          .fillColor("#FFFFFF")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`PASS #: ${documentNumber}`, margin + contentWidth - 220, margin + 20, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Issued: ${this.formatDate(new Date())}`, margin + contentWidth - 220, margin + 38, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`Trip Ref: ${operation.trip.tripNumber || "N/A"}`, margin + contentWidth - 220, margin + 50, {
            width: 200,
            align: "right",
          });

        doc.y = margin + 95;

        // Section: Guest & Booking Details
        doc
          .rect(margin, doc.y, contentWidth, 60)
          .fillAndStroke(bgLight, borderLight);

        const guestY = doc.y + 12;
        doc
          .fillColor(primaryColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("PARTICIPANT / GUEST DETAILS", margin + 15, guestY);

        doc
          .fillColor(textDark)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(operation.trip.customer.name, margin + 15, guestY + 14);

        const travelersList = operation.trip.travelers.map((t) => t.name).join(", ");
        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Participants: ${travelersList || operation.trip.customer.name} | Total: ${operation.trip.travelers.length || 1} Pax`,
            margin + 15,
            guestY + 28,
            { width: contentWidth - 30 }
          );

        doc.y = guestY + 55;

        // Section: Activity Details Box
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("EXCURSION & ENTRY PASS INFORMATION");

        const actBoxY = doc.y + 6;
        doc
          .rect(margin, actBoxY, contentWidth, 160)
          .fillAndStroke("#FFFFFF", borderLight);

        // Activity Title
        doc
          .fillColor(textDark)
          .fontSize(13)
          .font("Helvetica-Bold")
          .text(
            activity?.name || activityConf.tripActivity?.activity?.name || "Exclusive Sightseeing Tour",
            margin + 15,
            actBoxY + 14,
            { width: contentWidth - 30 }
          );

        if (activity?.location || activityConf.tripActivity?.location) {
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font("Helvetica")
            .text(
              `Location: ${activity?.location || activityConf.tripActivity?.location}`,
              margin + 15,
              actBoxY + 32,
              { width: contentWidth - 30 }
            );
        }

        // Divider
        doc
          .moveTo(margin + 15, actBoxY + 48)
          .lineTo(margin + contentWidth - 15, actBoxY + 48)
          .strokeColor(borderLight)
          .lineWidth(1)
          .stroke();

        // 3-Column Grid: Date/Time, Ticket Number, Confirmation
        const aGridY = actBoxY + 58;
        const aCol1 = margin + 15;
        const aCol2 = margin + 180;
        const aCol3 = margin + 350;

        // Col 1: Date & Time
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("ACTIVITY DATE & TIME", aCol1, aGridY);
        doc.fillColor(textDark).fontSize(10).font("Helvetica-Bold").text(
          this.formatDate(activityConf.tripActivity?.date || operation.trip.startDate),
          aCol1,
          aGridY + 12
        );
        doc.fillColor(textMuted).fontSize(7).font("Helvetica").text(
          activityConf.tripActivity?.time || "Standard Operating Hours",
          aCol1,
          aGridY + 26
        );

        // Col 2: Ticket Number
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("E-TICKET / PASS NUMBER", aCol2, aGridY);
        doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text(
          activityConf.ticketNumber || "TKT-CONFIRMED",
          aCol2,
          aGridY + 12
        );

        // Col 3: Provider Reference
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("CONFIRMATION NUMBER", aCol3, aGridY);
        doc.fillColor(darkColor).fontSize(10).font("Helvetica-Bold").text(
          activityConf.confirmationNumber || "CONFIRMED",
          aCol3,
          aGridY + 12
        );

        // Entry Pass Banner inside Box
        doc
          .rect(margin + 15, actBoxY + 105, contentWidth - 30, 42)
          .fillAndStroke(bgLight, "#CBD5E1");

        doc
          .fillColor(primaryColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("VERIFIED RESERVATION STATUS", margin + 25, actBoxY + 114);

        doc
          .fillColor(darkColor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("PRE-PAID & GUARANTEED ADMISSION", margin + 25, actBoxY + 126);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(`Status: ${activityConf.status}`, margin + contentWidth - 160, actBoxY + 126, {
            width: 130,
            align: "right",
          });

        doc.y = actBoxY + 175;

        // Section: Activity Guidelines
        doc.moveDown(0.8);
        doc
          .fillColor(darkColor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("EXPERIENCE GUIDELINES & INSTRUCTIONS");

        const actInstructions = [
          "• Please present this electronic or printed pass at the entry gate / tour guide meeting desk.",
          "• Dress code: Modest, comfortable clothing and walking shoes recommended.",
          "• Security check: Valid photo identification may be requested at entry.",
          "• Please arrive 15 minutes prior to your scheduled time slot for briefing and entry formalities.",
        ];

        doc.moveDown(0.4);
        doc.fillColor(textMuted).fontSize(8).font("Helvetica");
        for (const line of actInstructions) {
          doc.text(line, { lineGap: 3 });
        }

        // Support Footer
        doc.rect(margin, 740, contentWidth, 55).fillAndStroke(bgLight, borderLight);
        doc
          .fillColor(darkColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("24/7 GUEST SUPPORT & ASSISTANCE", margin + 15, 748);

        doc
          .fillColor(textMuted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            `For queries or immediate support during your excursion, call ${operation.agency.name} at ${operation.agency.phone || "+91 98800 11223"}.`,
            margin + 15,
            760,
            { width: contentWidth - 30 }
          );

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
          margin: 40,
          bufferPages: true,
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
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        const checkPageBreak = (neededHeight: number) => {
          if (doc.y + neededHeight > pageHeight - 65) {
            doc.addPage();
            return true;
          }
          return false;
        };

        // Theme colors
        const primaryColor = "#0369A1"; // Sky 700
        const darkColor = "#082F49"; // Sky 950
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const bgLight = "#F8FAFC";
        const borderLight = "#E2E8F0";

        // Header Banner
        doc.rect(margin, margin, contentWidth, 80).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(operation.agency.name, margin + 20, margin + 18, { width: 300 });

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#BAE6FD")
          .text("OFFICIAL TRAVEL BOOKING CONFIRMATION", margin + 20, margin + 40);

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(
            [operation.agency.phone, operation.agency.email].filter(Boolean).join(" | "),
            margin + 20,
            margin + 54
          );

        doc
          .fillColor("#FFFFFF")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(`CONFIRMATION #: ${documentNumber}`, margin + contentWidth - 220, margin + 20, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#E0F2FE")
          .text(`Date: ${this.formatDate(new Date())}`, margin + contentWidth - 220, margin + 38, {
            width: 200,
            align: "right",
          });

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(`Booking Ref: ${operation.booking?.bookingNumber || operation.trip.tripNumber || "N/A"}`, margin + contentWidth - 220, margin + 50, {
            width: 200,
            align: "right",
          });

        doc.y = margin + 95;

        // Trip Overview Card
        doc.rect(margin, doc.y, contentWidth, 75).fillAndStroke(bgLight, borderLight);
        const cardY = doc.y + 12;

        doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold").text("CONFIRMED TOUR ITINERARY", margin + 15, cardY);
        doc.fillColor(textDark).fontSize(12).font("Helvetica-Bold").text(operation.trip.title, margin + 15, cardY + 14);

        const tripDates = `${this.formatDate(operation.trip.startDate)} — ${this.formatDate(operation.trip.endDate)}`;
        const pax = `${operation.trip.travelers.length || 1} Traveler(s)`;
        doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(
          `Dates: ${tripDates} | Travelers: ${pax} (${operation.trip.customer.name})`,
          margin + 15,
          cardY + 32
        );

        doc.y = cardY + 70;

        // 1. Accommodations Section
        doc.moveDown(0.6);
        doc.fillColor(darkColor).fontSize(11).font("Helvetica-Bold").text("1. ACCOMMODATION SUMMARY");

        const hotels = operation.hotelConfirmations.length > 0
          ? operation.hotelConfirmations
          : operation.trip.tripHotels;

        doc.moveDown(0.4);
        if (hotels.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No accommodation entries recorded.");
        } else {
          for (const h of hotels) {
            checkPageBreak(50);
            const hotelName = (h as any).tripHotel?.hotel?.name || (h as any).hotel?.name || "Hotel Accommodation";
            const checkIn = this.formatDate((h as any).checkIn || (h as any).tripHotel?.checkIn);
            const checkOut = this.formatDate((h as any).checkOut || (h as any).tripHotel?.checkOut);
            const roomType = (h as any).roomDetails || (h as any).tripHotel?.roomType || (h as any).roomType || "Standard";
            const confNo = (h as any).confirmationNumber ? `Ref: ${(h as any).confirmationNumber}` : "Confirmed";

            doc
              .rect(margin, doc.y, contentWidth, 36)
              .fillAndStroke("#FFFFFF", borderLight);

            const rowY = doc.y + 8;
            doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(hotelName, margin + 10, rowY, { width: 220 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`${checkIn} → ${checkOut} | ${roomType}`, margin + 10, rowY + 12);

            doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text(confNo, margin + contentWidth - 140, rowY + 6, { width: 130, align: "right" });

            doc.y = rowY + 34;
          }
        }

        // 2. Transport Section
        checkPageBreak(70);
        doc.moveDown(0.6);
        doc.fillColor(darkColor).fontSize(11).font("Helvetica-Bold").text("2. TRANSPORTATION & TRANSFERS");

        const vehicles = operation.vehicleDispatches.length > 0
          ? operation.vehicleDispatches
          : operation.trip.tripVehicles;

        doc.moveDown(0.4);
        if (vehicles.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No transport services scheduled.");
        } else {
          for (const v of vehicles) {
            checkPageBreak(50);
            const vName = (v as any).vehicle?.name || (v as any).tripVehicle?.vehicle?.name || "Private Dedicated Vehicle";
            const vPlate = (v as any).vehicleNumber ? `Reg: ${(v as any).vehicleNumber}` : "Private Vehicle";
            const driver = (v as any).driverName ? `Driver: ${(v as any).driverName} (${(v as any).driverPhone || "Phone on file"})` : "Chauffeur allocated prior to pickup";
            const pickup = (v as any).pickupDate ? `Pickup: ${this.formatDate((v as any).pickupDate)} at ${this.formatTime((v as any).pickupTime)}` : "As per daily itinerary";

            doc
              .rect(margin, doc.y, contentWidth, 36)
              .fillAndStroke("#FFFFFF", borderLight);

            const rowY = doc.y + 8;
            doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(`${vName} (${vPlate})`, margin + 10, rowY, { width: 260 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`${pickup} | ${driver}`, margin + 10, rowY + 12);

            doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text("CONFIRMED", margin + contentWidth - 110, rowY + 6, { width: 100, align: "right" });

            doc.y = rowY + 34;
          }
        }

        // 3. Sightseeing & Activities
        checkPageBreak(70);
        doc.moveDown(0.6);
        doc.fillColor(darkColor).fontSize(11).font("Helvetica-Bold").text("3. ACTIVITIES & EXPERIENCES");

        const activities = operation.activityConfirmations.length > 0
          ? operation.activityConfirmations
          : operation.trip.tripActivities;

        doc.moveDown(0.4);
        if (activities.length === 0) {
          doc.fillColor(textMuted).fontSize(8).font("Helvetica").text("No excursion entries included.");
        } else {
          for (const a of activities) {
            checkPageBreak(50);
            const aName = (a as any).activity?.name || (a as any).tripActivity?.activity?.name || "Sightseeing Experience";
            const ticket = (a as any).ticketNumber ? `Pass: ${(a as any).ticketNumber}` : "Reserved";
            const dateStr = this.formatDate((a as any).tripActivity?.date || operation.trip.startDate);

            doc
              .rect(margin, doc.y, contentWidth, 36)
              .fillAndStroke("#FFFFFF", borderLight);

            const rowY = doc.y + 8;
            doc.fillColor(textDark).fontSize(9).font("Helvetica-Bold").text(aName, margin + 10, rowY, { width: 260 });
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(`Scheduled Date: ${dateStr}`, margin + 10, rowY + 12);

            doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text(ticket, margin + contentWidth - 140, rowY + 6, { width: 130, align: "right" });

            doc.y = rowY + 34;
          }
        }

        // Important Information & Terms Footer
        checkPageBreak(90);
        doc.moveDown(0.8);
        doc.rect(margin, doc.y, contentWidth, 65).fillAndStroke(bgLight, borderLight);
        const footerBoxY = doc.y + 10;

        doc.fillColor(darkColor).fontSize(8).font("Helvetica-Bold").text("GENERAL TRAVEL & EMERGENCY INFORMATION", margin + 15, footerBoxY);
        doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
          `• For 24/7 on-ground assistance during your trip, contact your dedicated travel coordinator at ${operation.agency.phone || "+91 98800 11223"} or email ${operation.agency.email || "support@tripdesk.com"}.\n• Please carry valid government-issued photo identification for all travelers throughout the journey.\n• Standard check-in time is 14:00 hrs and check-out time is 11:00 hrs unless specified otherwise.`,
          margin + 15,
          footerBoxY + 14,
          { width: contentWidth - 30, lineGap: 2 }
        );

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
          margin: 40,
          bufferPages: true,
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
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        const checkPageBreak = (neededHeight: number) => {
          if (doc.y + neededHeight > pageHeight - 65) {
            doc.addPage();
            return true;
          }
          return false;
        };

        // Theme colors
        const primaryColor = "#4F46E5"; // Indigo 600
        const darkColor = "#1E1B4B"; // Indigo 950
        const textDark = "#0F172A";
        const textMuted = "#475569";
        const bgLight = "#F8FAFC";
        const borderLight = "#E2E8F0";

        // ─────────────────────────────────────────────────────────────────────
        // PAGE 1: COVER & TRIP BRIEF
        // ─────────────────────────────────────────────────────────────────────
        doc.rect(margin, margin, contentWidth, 120).fill(darkColor);

        doc
          .fillColor("#FFFFFF")
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(operation.agency.name, margin + 25, margin + 25, { width: 350 });

        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor("#C7D2FE")
          .text("COMPREHENSIVE TRAVEL KIT & OFFICIAL ITINERARY", margin + 25, margin + 55);

        doc
          .fontSize(8.5)
          .font("Helvetica")
          .fillColor("#E0E7FF")
          .text(
            [operation.agency.phone, operation.agency.email, operation.agency.address].filter(Boolean).join(" | "),
            margin + 25,
            margin + 75,
            { width: 450 }
          );

        doc
          .fillColor("#FFFFFF")
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`KIT #: ${documentNumber}`, margin + contentWidth - 180, margin + 25, {
            width: 160,
            align: "right",
          });

        doc.y = margin + 140;

        // Trip Overview Card
        doc.rect(margin, doc.y, contentWidth, 90).fillAndStroke(bgLight, borderLight);
        const coverBoxY = doc.y + 12;

        doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("JOURNEY OVERVIEW", margin + 20, coverBoxY);
        doc.fillColor(textDark).fontSize(15).font("Helvetica-Bold").text(operation.trip.title, margin + 20, coverBoxY + 16, { width: contentWidth - 40 });

        const tripDates = `${this.formatDate(operation.trip.startDate)} — ${this.formatDate(operation.trip.endDate)}`;
        doc.fillColor(textMuted).fontSize(8.5).font("Helvetica").text(
          `Travel Dates: ${tripDates} | Booking Ref: ${operation.booking?.bookingNumber || operation.trip.tripNumber || "CONFIRMED"}`,
          margin + 20,
          coverBoxY + 40
        );

        const travelerNames = operation.trip.travelers.map((t) => t.name).join(", ");
        doc.fillColor(textMuted).fontSize(8.5).font("Helvetica").text(
          `Guests: ${travelerNames || operation.trip.customer.name} (Primary Contact: ${operation.trip.customer.name}, ${operation.trip.customer.phone || "On File"})`,
          margin + 20,
          coverBoxY + 56
        );

        doc.y = coverBoxY + 95;

        // Day-by-Day Itinerary Header
        doc.moveDown(0.8);
        doc.fillColor(darkColor).fontSize(13).font("Helvetica-Bold").text("DAY-BY-DAY JOURNEY ITINERARY");

        const days = operation.trip.itineraryItems;
        if (days.length === 0) {
          doc.moveDown(0.4);
          doc.fillColor(textMuted).fontSize(9).font("Helvetica").text("Itinerary schedule is prepared and coordinated on ground.");
        } else {
          for (const day of days) {
            checkPageBreak(80);
            doc.moveDown(0.6);

            doc.rect(margin, doc.y, contentWidth, 24).fill(primaryColor);
            const dayHeadY = doc.y + 6;

            doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text(
              `DAY ${day.dayNumber}: ${day.title}`,
              margin + 12,
              dayHeadY,
              { width: contentWidth - 24 }
            );

            const dayBoxY = doc.y + 24;
            const desc = day.description || "Sightseeing and leisure activities as planned.";
            doc.font("Helvetica").fontSize(8.5);
            const textHeight = doc.heightOfString(desc, { width: contentWidth - 24 });
            const boxHeight = Math.max(textHeight + 20, 36);

            doc.rect(margin, dayBoxY, contentWidth, boxHeight).fillAndStroke("#FFFFFF", borderLight);
            doc.fillColor(textDark).text(desc, margin + 12, dayBoxY + 10, {
              width: contentWidth - 24,
              lineGap: 3,
            });

            doc.y = dayBoxY + boxHeight + 4;
          }
        }

        // Accommodations & Stay Summary
        checkPageBreak(120);
        doc.moveDown(1.0);
        doc.fillColor(darkColor).fontSize(13).font("Helvetica-Bold").text("HOTEL ACCOMMODATION VOUCHERS");

        const hotels = operation.hotelConfirmations.length > 0
          ? operation.hotelConfirmations
          : operation.trip.tripHotels;

        for (const h of hotels) {
          checkPageBreak(60);
          const hotelName = (h as any).tripHotel?.hotel?.name || (h as any).hotel?.name || "Hotel Property";
          const checkIn = this.formatDate((h as any).checkIn || (h as any).tripHotel?.checkIn);
          const checkOut = this.formatDate((h as any).checkOut || (h as any).tripHotel?.checkOut);
          const roomType = (h as any).roomDetails || (h as any).tripHotel?.roomType || (h as any).roomType || "Standard Room";
          const mealPlan = (h as any).mealPlan || (h as any).tripHotel?.mealPlan || (h as any).mealPlan || "CP";
          const confNo = (h as any).confirmationNumber || "CONFIRMED";

          doc.moveDown(0.4);
          doc.rect(margin, doc.y, contentWidth, 42).fillAndStroke(bgLight, borderLight);
          const rowY = doc.y + 8;

          doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(hotelName, margin + 12, rowY, { width: 240 });
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
            `Stay: ${checkIn} → ${checkOut} | Room: ${roomType} | Plan: ${mealPlan}`,
            margin + 12,
            rowY + 14
          );

          doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text(`Conf #: ${confNo}`, margin + contentWidth - 150, rowY + 8, { width: 140, align: "right" });
          doc.y = rowY + 38;
        }

        // Transport & Driver Allocation
        checkPageBreak(120);
        doc.moveDown(1.0);
        doc.fillColor(darkColor).fontSize(13).font("Helvetica-Bold").text("TRANSPORT & CHAUFFEUR ALLOCATION");

        const vehicles = operation.vehicleDispatches.length > 0
          ? operation.vehicleDispatches
          : operation.trip.tripVehicles;

        for (const v of vehicles) {
          checkPageBreak(60);
          const vName = (v as any).vehicle?.name || (v as any).tripVehicle?.vehicle?.name || "Private Dedicated Fleet";
          const vPlate = (v as any).vehicleNumber || "Assigned On Dispatch";
          const driver = (v as any).driverName ? `${(v as any).driverName} (${(v as any).driverPhone || "Contact on file"})` : "Chauffeur details coordinated prior to arrival";
          const pickup = (v as any).pickupDate ? `Pickup: ${this.formatDate((v as any).pickupDate)} at ${this.formatTime((v as any).pickupTime)}` : "Pickup as per itinerary";

          doc.moveDown(0.4);
          doc.rect(margin, doc.y, contentWidth, 42).fillAndStroke(bgLight, borderLight);
          const rowY = doc.y + 8;

          doc.fillColor(textDark).fontSize(9.5).font("Helvetica-Bold").text(`${vName} (${vPlate})`, margin + 12, rowY, { width: 260 });
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
            `${pickup} | Chauffeur: ${driver}`,
            margin + 12,
            rowY + 14
          );

          doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("ALLOCATED", margin + contentWidth - 110, rowY + 8, { width: 100, align: "right" });
          doc.y = rowY + 38;
        }

        // Emergency Contacts & Policies
        checkPageBreak(100);
        doc.moveDown(1.0);
        doc.rect(margin, doc.y, contentWidth, 75).fillAndStroke("#F0FDF4", "#BBF7D0");
        const helpBoxY = doc.y + 10;

        doc.fillColor("#166534").fontSize(9).font("Helvetica-Bold").text("24/7 GUEST CONCIERGE & EMERGENCY ASSISTANCE", margin + 15, helpBoxY);
        doc.fillColor("#14532D").fontSize(8).font("Helvetica").text(
          `• Dedicated Operations Desk: ${operation.agency.phone || "+91 98800 11223"} | Email: ${operation.agency.email || "concierge@tripdesk.com"}\n• Please carry valid government IDs for all passengers throughout the journey.\n• For flight or train delays, notify your coordinator promptly for seamless pickup rescheduling.`,
          margin + 15,
          helpBoxY + 16,
          { width: contentWidth - 30, lineGap: 3 }
        );

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
