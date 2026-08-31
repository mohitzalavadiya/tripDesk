import "server-only";

import PDFDocument from "pdfkit";
import { formatCurrency } from "../costing-engine";

export interface QuotationPdfData {
  quotationNumber: string;
  version: number;
  title?: string | null;
  proposalSubtitle?: string | null;
  currency: string;
  finalAmount: number;
  validUntil?: Date | string | null;
  customerMessage?: string | null;
  inclusionsIntro?: string | null;
  exclusionsIntro?: string | null;
  paymentTerms?: string | null;
  cancellationPolicy?: string | null;
  importantNotes?: string | null;
  terms?: string | null;
  createdAt?: Date | string;

  agency?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    logo?: string | null;
    address?: string | null;
  } | null;

  customer?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;

  trip?: {
    title: string;
    tripNumber?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    travelers?: Array<{ id: string; name: string; type?: string | null }>;
    itineraryItems?: Array<{
      dayNumber: number;
      date?: Date | string | null;
      title: string;
      description?: string | null;
      location?: string | null;
    }>;
    hotels?: Array<{
      id: string;
      name: string;
      city?: string | null;
      roomType: string;
      mealPlan?: string | null;
      checkIn: Date | string;
      checkOut: Date | string;
      nights?: number;
      rooms?: number;
      notes?: string | null;
    }>;
    vehicles?: Array<{
      id: string;
      name: string;
      type?: string | null;
      capacity?: number | null;
      startDate?: Date | string | null;
      endDate?: Date | string | null;
      notes?: string | null;
    }>;
    activities?: Array<{
      id: string;
      name: string;
      city?: string | null;
      date?: Date | string | null;
      description?: string | null;
      notes?: string | null;
    }>;
  } | null;

  packageOptions?: Array<{
    id: string;
    name: string;
    subtitle?: string | null;
    description?: string | null;
    isRecommended?: boolean;
    finalAmount: number;
    hotelNotes?: string | null;
    vehicleNotes?: string | null;
    activityNotes?: string | null;
    inclusions?: string[];
    exclusions?: string[];
  }>;

  selectedPackageOptionId?: string | null;
  selectedPackageOption?: {
    id: string;
    name: string;
    subtitle?: string | null;
    description?: string | null;
    isRecommended?: boolean;
    finalAmount: number;
    hotelNotes?: string | null;
    vehicleNotes?: string | null;
    activityNotes?: string | null;
    inclusions?: string[];
    exclusions?: string[];
  } | null;

  proposalItems?: Array<{
    id: string;
    type: "INCLUSION" | "EXCLUSION" | "IMPORTANT_NOTE";
    title: string;
    description?: string | null;
  }>;

  paymentMilestones?: Array<{
    id: string;
    title: string;
    description?: string | null;
    percentage?: number | null;
    amount?: number | null;
    dueDate?: Date | string | null;
  }>;
}

export class QuotationPdfService {
  /**
   * Generates a professional customer-facing PDF document buffer.
   */
  async generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          compress: false,
          info: {
            Title: `${data.title || "Travel Proposal"} - ${data.quotationNumber}`,
            Author: data.agency?.name || "TripDesk Travel Agency",
            Subject: `Official Travel Proposal ${data.quotationNumber} v${data.version}`,
            Keywords: `Proposal: ${data.quotationNumber}, Customer: ${data.customer?.name || "Valued Traveler"}`,
            Creator: "TripDesk Travel Platform",
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

        // Color Palette
        const primaryColor = "#4338CA"; // Indigo 700
        const primaryDark = "#1E1B4B"; // Indigo 950
        const textDark = "#0F172A"; // Slate 900
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgLight = "#F8FAFC"; // Slate 50
        const borderLight = "#E2E8F0"; // Slate 200
        const greenBg = "#ECFDF5"; // Emerald 50
        const greenText = "#065F46"; // Emerald 800
        const roseBg = "#FFF1F2"; // Rose 50
        const roseText = "#9F1239"; // Rose 800

        // Helper: Check Page Break with margin bottom
        const checkPageBreak = (neededHeight: number) => {
          if (doc.y + neededHeight > pageHeight - 55) {
            doc.addPage();
            return true;
          }
          return false;
        };

        // Helper: Section Headers
        const drawSectionHeader = (title: string, subtitle?: string) => {
          checkPageBreak(50);
          doc.moveDown(0.8);
          doc
            .fontSize(13)
            .font("Helvetica-Bold")
            .fillColor(primaryDark)
            .text(title.toUpperCase());

          if (subtitle) {
            doc
              .fontSize(8.5)
              .font("Helvetica")
              .fillColor(textMuted)
              .text(subtitle);
          }

          const currentY = doc.y + 4;
          doc
            .strokeColor(primaryColor)
            .lineWidth(2)
            .moveTo(margin, currentY)
            .lineTo(margin + 40, currentY)
            .stroke();

          doc
            .strokeColor(borderLight)
            .lineWidth(1)
            .moveTo(margin + 40, currentY)
            .lineTo(margin + contentWidth, currentY)
            .stroke();

          doc.moveDown(0.6);
        };

        // ═════════════════════════════════════════════════════════════════════
        // 1. COVER / HEADER BANNER
        // ═════════════════════════════════════════════════════════════════════
        const headerHeight = 85;
        doc
          .rect(margin, margin, contentWidth, headerHeight)
          .fill(primaryDark);

        const agencyName = data.agency?.name || "TripDesk Travel Agency";
        const customerName = data.customer?.name || "Valued Traveler";

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(17)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 20, margin + 18, {
            width: contentWidth - 180,
            ellipsis: true,
          });

        doc
          .fillColor("#A5B4FC")
          .fontSize(8.5)
          .font("Helvetica")
          .text("Official Travel Itinerary & Proposal", margin + 20, margin + 40);

        // Quotation Badge (Top Right)
        const badgeWidth = 140;
        const badgeHeight = 48;
        const badgeX = margin + contentWidth - badgeWidth - 20;
        const badgeY = margin + 18;

        doc
          .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
          .fill("#312E81");

        doc
          .fillColor("#FFFFFF")
          .fontSize(10.5)
          .font("Helvetica-Bold")
          .text(data.quotationNumber, badgeX, badgeY + 10, {
            width: badgeWidth,
            align: "center",
          });

        doc
          .fillColor("#C7D2FE")
          .fontSize(8)
          .font("Helvetica")
          .text(`Version ${data.version}  •  ${data.currency}`, badgeX, badgeY + 26, {
            width: badgeWidth,
            align: "center",
          });

        doc.y = margin + headerHeight + 14;

        // ═════════════════════════════════════════════════════════════════════
        // 2. TRIP TITLE & OVERVIEW CARD
        // ═════════════════════════════════════════════════════════════════════
        const titleCardY = doc.y;
        doc
          .roundedRect(margin, titleCardY, contentWidth, 75, 8)
          .fillAndStroke(bgLight, borderLight);

        doc
          .fillColor(textDark)
          .fontSize(15)
          .font("Helvetica-Bold")
          .text(data.title || "Travel Proposal", margin + 16, titleCardY + 12, {
            width: contentWidth - 32,
          });

        if (data.proposalSubtitle) {
          doc
            .fillColor(primaryColor)
            .fontSize(8.5)
            .font("Helvetica-Bold")
            .text(data.proposalSubtitle, margin + 16, doc.y + 2, {
              width: contentWidth - 32,
            });
        }

        // 4-Column Quick Metadata Bar
        const metaY = titleCardY + 44;
        const colW = (contentWidth - 32) / 4;

        // Col 1: Customer
        doc
          .fillColor(textLight)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text("PREPARED FOR", margin + 16, metaY);
        doc
          .fillColor(textDark)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(customerName, margin + 16, metaY + 10, { width: colW - 5, ellipsis: true });

        // Col 2: Dates
        doc
          .fillColor(textLight)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text("TRAVEL DATES", margin + 16 + colW, metaY);
        let dateRangeStr = "Flexible / Custom Dates";
        if (data.trip?.startDate && data.trip?.endDate) {
          const startDateStr = new Date(data.trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const endDateStr = new Date(data.trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          dateRangeStr = `${startDateStr} – ${endDateStr}`;
        }
        doc
          .fillColor(textDark)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(dateRangeStr, margin + 16 + colW, metaY + 10, { width: colW - 5 });

        // Col 3: Travelers
        doc
          .fillColor(textLight)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text("TRAVELERS", margin + 16 + colW * 2, metaY);
        const travelerCount = data.trip?.travelers?.length || 1;
        doc
          .fillColor(textDark)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(`${travelerCount} Person(s)`, margin + 16 + colW * 2, metaY + 10);

        // Col 4: Valid Until
        doc
          .fillColor(textLight)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text("VALID UNTIL", margin + 16 + colW * 3, metaY);
        const validStr = data.validUntil
          ? new Date(data.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Upon confirmation";
        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(validStr, margin + 16 + colW * 3, metaY + 10);

        doc.y = titleCardY + 85;

        // ═════════════════════════════════════════════════════════════════════
        // 3. EXECUTIVE GREETING / CONSULTANT MESSAGE
        // ═════════════════════════════════════════════════════════════════════
        if (data.customerMessage) {
          checkPageBreak(65);
          const msgY = doc.y;
          doc
            .roundedRect(margin, msgY, contentWidth, 48, 6)
            .fillAndStroke("#EEF2FF", "#C7D2FE");

          doc
            .fillColor(primaryDark)
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .text("GREETING FROM YOUR TRAVEL CONSULTANT", margin + 12, msgY + 8);

          doc
            .fillColor(textDark)
            .fontSize(8)
            .font("Helvetica")
            .text(data.customerMessage, margin + 12, msgY + 19, {
              width: contentWidth - 24,
              lineGap: 1.5,
            });

          doc.y = msgY + 56;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. PACKAGE OPTIONS & TIERS COMPARISON (PHASE 10.11B)
        // ═════════════════════════════════════════════════════════════════════
        const activePackages = data.packageOptions && data.packageOptions.length > 0 ? data.packageOptions : [];

        if (activePackages.length > 0) {
          drawSectionHeader("Package Options & Tier Selection", "Compare hotel grades, vehicles and inclusions");

          const numPackages = activePackages.length;
          const pkgCardGap = 8;
          const pkgCardWidth = (contentWidth - pkgCardGap * (numPackages - 1)) / numPackages;

          const selectedId = data.selectedPackageOptionId;
          const cardStartY = doc.y;
          const maxCardHeight = 145;

          checkPageBreak(maxCardHeight + 20);

          activePackages.forEach((pkg, index) => {
            const cardX = margin + index * (pkgCardWidth + pkgCardGap);
            const isSelected = pkg.id === selectedId;

            // Background Card
            doc
              .roundedRect(cardX, cardStartY, pkgCardWidth, maxCardHeight, 6)
              .fillAndStroke(isSelected ? "#F5F3FF" : bgLight, isSelected ? primaryColor : borderLight);

            // Recommended / Selected Badge
            if (isSelected) {
              doc
                .roundedRect(cardX + 6, cardStartY + 6, pkgCardWidth - 12, 14, 3)
                .fill(primaryColor);
              doc
                .fillColor("#FFFFFF")
                .fontSize(7)
                .font("Helvetica-Bold")
                .text("SELECTED PACKAGE", cardX + 6, cardStartY + 9, {
                  width: pkgCardWidth - 12,
                  align: "center",
                });
            } else if (pkg.isRecommended) {
              doc
                .roundedRect(cardX + 6, cardStartY + 6, pkgCardWidth - 12, 14, 3)
                .fill("#059669");
              doc
                .fillColor("#FFFFFF")
                .fontSize(7)
                .font("Helvetica-Bold")
                .text("★ RECOMMENDED", cardX + 6, cardStartY + 9, {
                  width: pkgCardWidth - 12,
                  align: "center",
                });
            }

            const contentTop = isSelected || pkg.isRecommended ? cardStartY + 25 : cardStartY + 10;

            // Package Title
            doc
              .fillColor(textDark)
              .fontSize(10.5)
              .font("Helvetica-Bold")
              .text(pkg.name, cardX + 6, contentTop, {
                width: pkgCardWidth - 12,
                align: "center",
              });

            if (pkg.subtitle) {
              doc
                .fillColor(textMuted)
                .fontSize(7)
                .font("Helvetica")
                .text(pkg.subtitle, cardX + 6, doc.y + 1, {
                  width: pkgCardWidth - 12,
                  align: "center",
                });
            }

            // Price Box inside Card
            const priceBoxY = cardStartY + 56;
            doc
              .roundedRect(cardX + 6, priceBoxY, pkgCardWidth - 12, 26, 4)
              .fill("#FFFFFF");

            doc
              .fillColor(primaryColor)
              .fontSize(11.5)
              .font("Helvetica-Bold")
              .text(formatCurrency(Number(pkg.finalAmount)), cardX + 6, priceBoxY + 4, {
                width: pkgCardWidth - 12,
                align: "center",
              });

            doc
              .fillColor(textLight)
              .fontSize(6)
              .font("Helvetica")
              .text("Taxes included", cardX + 6, priceBoxY + 16, {
                width: pkgCardWidth - 12,
                align: "center",
              });

            // Specs Notes
            let specsY = priceBoxY + 32;
            if (pkg.hotelNotes) {
              doc
                .fillColor(textDark)
                .fontSize(6.5)
                .font("Helvetica")
                .text(`• Hotel: ${pkg.hotelNotes}`, cardX + 6, specsY, {
                  width: pkgCardWidth - 12,
                });
              specsY = doc.y + 2;
            }

            if (pkg.vehicleNotes) {
              doc
                .fillColor(textDark)
                .fontSize(6.5)
                .font("Helvetica")
                .text(`• Transport: ${pkg.vehicleNotes}`, cardX + 6, specsY, {
                  width: pkgCardWidth - 12,
                });
            }
          });

          doc.y = cardStartY + maxCardHeight + 14;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. DAY-BY-DAY ITINERARY SCHEDULE
        // ═════════════════════════════════════════════════════════════════════
        const itineraryItems = data.trip?.itineraryItems || [];
        if (itineraryItems.length > 0) {
          drawSectionHeader("Day-by-Day Itinerary Schedule", "Planned sightseeing, route and experiences");

          itineraryItems.forEach((item) => {
            doc.fontSize(8);
            const descHeight = item.description
              ? Math.min(doc.heightOfString(item.description, { width: contentWidth - 80 }), 90)
              : 0;
            const itemBoxHeight = Math.max(38, 24 + descHeight);

            checkPageBreak(itemBoxHeight + 8);

            const itemY = doc.y;

            // Day Badge
            doc
              .roundedRect(margin, itemY, 48, 20, 4)
              .fill(primaryDark);

            doc
              .fillColor("#FFFFFF")
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`DAY ${item.dayNumber}`, margin, itemY + 6, {
                width: 48,
                align: "center",
              });

            if (item.date) {
              doc
                .fillColor(textLight)
                .fontSize(6.5)
                .font("Helvetica")
                .text(
                  new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  margin,
                  itemY + 22,
                  { width: 48, align: "center" }
                );
            }

            // Title & Location
            const contentX = margin + 58;
            doc
              .fillColor(textDark)
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(item.title, contentX, itemY + 2, {
                width: contentWidth - 130,
              });

            if (item.location) {
              doc
                .fillColor(primaryColor)
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text(`📍 ${item.location}`, margin + contentWidth - 80, itemY + 2, {
                  width: 80,
                  align: "right",
                });
            }

            if (item.description) {
              doc
                .fillColor(textMuted)
                .fontSize(7.5)
                .font("Helvetica")
                .text(item.description, contentX, itemY + 15, {
                  width: contentWidth - 70,
                  lineGap: 1.5,
                });
            }

            // Divider Line
            doc
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .moveTo(margin + 58, doc.y + 5)
              .lineTo(margin + contentWidth, doc.y + 5)
              .stroke();

            doc.y += 10;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. HOTEL ACCOMMODATIONS (IF PRESENT)
        // ═════════════════════════════════════════════════════════════════════
        const hotels = data.trip?.hotels || [];
        if (hotels.length > 0) {
          drawSectionHeader("Hotel Accommodations", "Confirmed and recommended hotel stays");

          hotels.forEach((h) => {
            checkPageBreak(45);
            const boxY = doc.y;

            doc
              .roundedRect(margin, boxY, contentWidth, 38, 4)
              .fillAndStroke(bgLight, borderLight);

            // Hotel Icon & Name
            doc
              .fillColor(textDark)
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(`🏨  ${h.name}`, margin + 10, boxY + 8, { width: contentWidth - 140, ellipsis: true });

            const cityStr = h.city ? `Destination: ${h.city}` : "";
            const roomStr = [h.roomType, h.mealPlan].filter(Boolean).join("  •  ");

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text([cityStr, roomStr].filter(Boolean).join("  |  "), margin + 10, boxY + 22, {
                width: contentWidth - 140,
                ellipsis: true,
              });

            // Dates & Nights (Right Side)
            let dateStr = "";
            if (h.checkIn && h.checkOut) {
              const inStr = new Date(h.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const outStr = new Date(h.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              dateStr = `${inStr} – ${outStr}`;
            }

            doc
              .fillColor(primaryColor)
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(dateStr, margin + contentWidth - 130, boxY + 8, { width: 120, align: "right" });

            if (h.nights) {
              doc
                .fillColor(textLight)
                .fontSize(7)
                .font("Helvetica")
                .text(`${h.nights} Night(s)  •  ${h.rooms || 1} Room(s)`, margin + contentWidth - 130, boxY + 22, {
                  width: 120,
                  align: "right",
                });
            }

            doc.y = boxY + 44;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. VEHICLE & TRANSPORTATION DETAILS (IF PRESENT)
        // ═════════════════════════════════════════════════════════════════════
        const vehicles = data.trip?.vehicles || [];
        if (vehicles.length > 0) {
          drawSectionHeader("Transportation & Transfers", "Private transfers and dedicated chauffeur service");

          vehicles.forEach((v) => {
            checkPageBreak(40);
            const vY = doc.y;

            doc
              .roundedRect(margin, vY, contentWidth, 34, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(textDark)
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(`🚗  ${v.name}`, margin + 10, vY + 8, { width: contentWidth - 150, ellipsis: true });

            const typeDetails = [
              v.type ? `Type: ${v.type}` : "",
              v.capacity ? `Capacity: ${v.capacity} Passengers` : "",
              v.notes || "Dedicated private transport",
            ]
              .filter(Boolean)
              .join("  •  ");

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(typeDetails, margin + 10, vY + 20, { width: contentWidth - 20, ellipsis: true });

            doc.y = vY + 40;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. ACTIVITIES & EXPERIENCES (IF PRESENT)
        // ═════════════════════════════════════════════════════════════════════
        const activities = data.trip?.activities || [];
        if (activities.length > 0) {
          drawSectionHeader("Activities & Sightseeing", "Included passes, excursions and tour experiences");

          activities.forEach((act) => {
            checkPageBreak(38);
            const actY = doc.y;

            doc
              .roundedRect(margin, actY, contentWidth, 32, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text(`🎟  ${act.name}`, margin + 10, actY + 7, { width: contentWidth - 140, ellipsis: true });

            if (act.date) {
              doc
                .fillColor(primaryColor)
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text(
                  new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  margin + contentWidth - 130,
                  actY + 7,
                  { width: 120, align: "right" }
                );
            }

            if (act.description || act.city) {
              const sub = [act.city, act.description].filter(Boolean).join("  •  ");
              doc
                .fillColor(textMuted)
                .fontSize(7)
                .font("Helvetica")
                .text(sub, margin + 10, actY + 19, { width: contentWidth - 20, ellipsis: true });
            }

            doc.y = actY + 38;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 9. INCLUSIONS & EXCLUSIONS (PHASE 10.11A)
        // ═════════════════════════════════════════════════════════════════════
        const inclusions = data.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
        const exclusions = data.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];

        if (inclusions.length > 0 || exclusions.length > 0) {
          drawSectionHeader("Package Inclusions & Exclusions", "Transparent breakdown of tour coverage");

          const halfWidth = (contentWidth - 10) / 2;
          checkPageBreak(110);
          const boxY = doc.y;

          // Inclusions Box (Left)
          doc
            .roundedRect(margin, boxY, halfWidth, 105, 6)
            .fillAndStroke(greenBg, "#A7F3D0");

          doc
            .fillColor(greenText)
            .fontSize(8.5)
            .font("Helvetica-Bold")
            .text("✔ WHAT IS INCLUDED", margin + 10, boxY + 8);

          let incY = boxY + 22;
          inclusions.slice(0, 5).forEach((inc) => {
            doc
              .fillColor(textDark)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text(`• ${inc.title}`, margin + 10, incY, { width: halfWidth - 20 });
            incY = doc.y + 2;
          });

          // Exclusions Box (Right)
          const rightX = margin + halfWidth + 10;
          doc
            .roundedRect(rightX, boxY, halfWidth, 105, 6)
            .fillAndStroke(roseBg, "#FECDD3");

          doc
            .fillColor(roseText)
            .fontSize(8.5)
            .font("Helvetica-Bold")
            .text("✖ WHAT IS EXCLUDED", rightX + 10, boxY + 8);

          let excY = boxY + 22;
          exclusions.slice(0, 5).forEach((exc) => {
            doc
              .fillColor(textDark)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text(`• ${exc.title}`, rightX + 10, excY, { width: halfWidth - 20 });
            excY = doc.y + 2;
          });

          doc.y = boxY + 115;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 10. PAYMENT MILESTONE SCHEDULE
        // ═════════════════════════════════════════════════════════════════════
        const milestones = data.paymentMilestones || [];
        const effectiveFinalAmount = data.selectedPackageOption
          ? Number(data.selectedPackageOption.finalAmount)
          : data.finalAmount;

        if (milestones.length > 0) {
          drawSectionHeader("Payment Milestone Schedule", "Staged timeline and deposit structure");

          const mWidth = (contentWidth - (milestones.length - 1) * 8) / milestones.length;
          checkPageBreak(60);
          const mBoxY = doc.y;

          milestones.forEach((m, idx) => {
            const mX = margin + idx * (mWidth + 8);
            const amt = m.percentage
              ? Math.round((effectiveFinalAmount * Number(m.percentage)) / 100)
              : Number(m.amount || 0);

            doc
              .roundedRect(mX, mBoxY, mWidth, 50, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(primaryColor)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text(m.percentage ? `STAGE ${idx + 1} (${Number(m.percentage)}%)` : `STAGE ${idx + 1}`, mX + 6, mBoxY + 6);

            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(m.title, mX + 6, mBoxY + 17, { width: mWidth - 12, ellipsis: true });

            doc
              .fillColor(primaryDark)
              .fontSize(9.5)
              .font("Helvetica-Bold")
              .text(formatCurrency(amt), mX + 6, mBoxY + 32, { width: mWidth - 12, align: "right" });
          });

          doc.y = mBoxY + 58;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 11. COMMERCIAL TOTAL INVESTMENT CARD
        // ═════════════════════════════════════════════════════════════════════
        checkPageBreak(65);
        const totalCardY = doc.y;
        doc
          .roundedRect(margin, totalCardY, contentWidth, 50, 6)
          .fill(primaryDark);

        const chosenPkg =
          data.selectedPackageOption ||
          data.packageOptions?.find((p) => p.id === data.selectedPackageOptionId);

        doc
          .fillColor("#A5B4FC")
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text("TOTAL PROPOSAL INVESTMENT", margin + 16, totalCardY + 10);

        doc
          .fillColor("#FFFFFF")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(chosenPkg ? `${chosenPkg.name} Package` : "Complete Tour Price", margin + 16, totalCardY + 24);

        doc
          .fillColor("#FFFFFF")
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(formatCurrency(effectiveFinalAmount), margin + 200, totalCardY + 14, {
            width: contentWidth - 216,
            align: "right",
          });

        doc.y = totalCardY + 60;

        // ═════════════════════════════════════════════════════════════════════
        // 12. IMPORTANT POLICIES & ADVISORIES
        // ═════════════════════════════════════════════════════════════════════
        if (data.cancellationPolicy || data.terms || data.importantNotes) {
          drawSectionHeader("Important Policies & Terms", "Terms of service and cancellation schedule");

          if (data.cancellationPolicy) {
            checkPageBreak(35);
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text("Cancellation Policy:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(7)
              .font("Helvetica")
              .text(data.cancellationPolicy, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 1.5,
              });
            doc.y += 6;
          }

          if (data.terms) {
            checkPageBreak(35);
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text("Terms & Conditions:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(7)
              .font("Helvetica")
              .text(data.terms, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 1.5,
              });
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 13. GLOBAL HEADER / FOOTER & PAGE NUMBERING ON ALL PAGES
        // ═════════════════════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - 30;

          // Top footer line
          doc
            .strokeColor(borderLight)
            .lineWidth(0.5)
            .moveTo(margin, footerY)
            .lineTo(margin + contentWidth, footerY)
            .stroke();

          // Left: Agency details
          const agencyContact = [
            agencyName,
            data.agency?.phone,
            data.agency?.email,
          ]
            .filter(Boolean)
            .join("  •  ");

          doc
            .fillColor(textLight)
            .fontSize(6.5)
            .font("Helvetica")
            .text(agencyContact, margin, footerY + 6, {
              width: contentWidth - 90,
              ellipsis: true,
            });

          // Right: Page number
          doc
            .fillColor(textLight)
            .fontSize(6.5)
            .font("Helvetica")
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 80, footerY + 6, {
              width: 80,
              align: "right",
            });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const quotationPdfService = new QuotationPdfService();
