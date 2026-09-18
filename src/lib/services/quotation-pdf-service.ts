import "server-only";

import PDFDocument from "pdfkit";
import { formatCurrency } from "../costing-engine";

export interface QuotationPdfData {
  quotationNumber: string;
  version: number;
  title?: string | null;
  proposalSubtitle?: string | null;
  currency: string;
  discountAmount?: number;
  taxableAmount?: number;
  taxRate?: number;
  taxMode?: string;
  gstTreatment?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxAmount?: number;
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
   * Generates a professional customer-facing travel itinerary PDF.
   * STRICT SINGLE MONETARY VALUE RULE:
   * The PDF renders exactly ONE monetary value: Final Quotation Amount.
   * All line item rates, subtotals, markups, discounts, taxes, and milestone amounts are redacted.
   */
  async generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 36,
          bufferPages: true,
          compress: false,
          info: {
            Title: `${data.title || "Travel Itinerary Proposal"} - ${data.quotationNumber}`,
            Author: data.agency?.name || "TripDesk Travel Agency",
            Subject: `Holiday Itinerary Proposal ${data.quotationNumber} v${data.version}`,
            Keywords: `Proposal: ${data.quotationNumber}, Traveler: ${data.customer?.name || "Valued Customer"}`,
            Creator: "TripDesk Travel Platform",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 36;
        const contentWidth = pageWidth - margin * 2;

        // Elegant Travel Color Palette (Deep Sapphire, Slate & Emerald)
        const primaryColor = "#1E293B"; // Slate 800
        const brandColor = "#4338CA"; // Indigo 700
        const brandDark = "#0F172A"; // Slate 900
        const brandAccent = "#6366F1"; // Indigo 500
        const textDark = "#0F172A"; // Slate 900
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgLight = "#F8FAFC"; // Slate 50
        const bgCard = "#FFFFFF"; // Pure White
        const borderLight = "#E2E8F0"; // Slate 200
        const greenBg = "#ECFDF5"; // Emerald 50
        const greenBorder = "#A7F3D0"; // Emerald 200
        const greenText = "#065F46"; // Emerald 800
        const roseBg = "#FFF1F2"; // Rose 50
        const roseBorder = "#FECDD3"; // Rose 200
        const roseText = "#9F1239"; // Rose 800

        // Helper: Page Break Check
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
          doc.moveDown(0.7);

          doc
            .fontSize(11.5)
            .font("Helvetica-Bold")
            .fillColor(brandDark)
            .text(title.toUpperCase());

          if (subtitle) {
            doc
              .fontSize(7.5)
              .font("Helvetica")
              .fillColor(textMuted)
              .text(subtitle);
          }

          const currentY = doc.y + 3;
          doc
            .strokeColor(brandAccent)
            .lineWidth(2)
            .moveTo(margin, currentY)
            .lineTo(margin + 36, currentY)
            .stroke();

          doc
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .moveTo(margin + 36, currentY)
            .lineTo(margin + contentWidth, currentY)
            .stroke();

          doc.moveDown(0.5);
        };

        // Determine effective final quotation amount
        const effectiveFinalAmount = data.selectedPackageOption
          ? Number(data.selectedPackageOption.finalAmount)
          : Number(data.finalAmount);

        // ═════════════════════════════════════════════════════════════════════
        // 1. COVER / HERO BANNER
        // ═════════════════════════════════════════════════════════════════════
        const headerHeight = 88;
        doc
          .rect(margin, margin, contentWidth, headerHeight)
          .fill(brandDark);

        const agencyName = data.agency?.name || "TripDesk Travel Agency";
        const customerName = data.customer?.name || "Valued Traveler";

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 18, margin + 16, {
            width: contentWidth - 170,
            ellipsis: true,
          });

        doc
          .fillColor("#A5B4FC")
          .fontSize(8.5)
          .font("Helvetica")
          .text("Bespoke Holiday & Travel Itinerary Proposal", margin + 18, margin + 38);

        // Reference Badge (Top Right)
        const badgeWidth = 135;
        const badgeHeight = 44;
        const badgeX = margin + contentWidth - badgeWidth - 18;
        const badgeY = margin + 16;

        doc
          .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
          .fill("#1E1B4B");

        doc
          .fillColor("#FFFFFF")
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(data.quotationNumber, badgeX, badgeY + 8, {
            width: badgeWidth,
            align: "center",
          });

        doc
          .fillColor("#C7D2FE")
          .fontSize(7.5)
          .font("Helvetica")
          .text(`Version ${data.version}  •  ${data.currency}`, badgeX, badgeY + 23, {
            width: badgeWidth,
            align: "center",
          });

        doc.y = margin + headerHeight + 12;

        // ═════════════════════════════════════════════════════════════════════
        // 2. TRIP TITLE & OVERVIEW CARD
        // ═════════════════════════════════════════════════════════════════════
        const titleCardY = doc.y;
        doc
          .roundedRect(margin, titleCardY, contentWidth, 72, 8)
          .fillAndStroke(bgLight, borderLight);

        doc
          .fillColor(textDark)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(data.title || "Customized Holiday Itinerary", margin + 16, titleCardY + 10, {
            width: contentWidth - 32,
          });

        if (data.proposalSubtitle) {
          doc
            .fillColor(brandColor)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(data.proposalSubtitle, margin + 16, doc.y + 1, {
              width: contentWidth - 32,
            });
        }

        // 4-Column Quick Metadata Bar
        const metaY = titleCardY + 42;
        const colW = (contentWidth - 32) / 4;

        // Col 1: Customer
        doc
          .fillColor(textLight)
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("PREPARED FOR", margin + 16, metaY);
        doc
          .fillColor(textDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(customerName, margin + 16, metaY + 9, { width: colW - 5, ellipsis: true });

        // Col 2: Travel Dates
        doc
          .fillColor(textLight)
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("TRAVEL DATES", margin + 16 + colW, metaY);
        let dateRangeStr = "Custom / Flexible Dates";
        if (data.trip?.startDate && data.trip?.endDate) {
          const startDateStr = new Date(data.trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const endDateStr = new Date(data.trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          dateRangeStr = `${startDateStr} – ${endDateStr}`;
        }
        doc
          .fillColor(textDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(dateRangeStr, margin + 16 + colW, metaY + 9, { width: colW - 5 });

        // Col 3: Travelers
        doc
          .fillColor(textLight)
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("GROUP SIZE", margin + 16 + colW * 2, metaY);
        const travelerCount = data.trip?.travelers?.length || 1;
        doc
          .fillColor(textDark)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(`${travelerCount} Traveler(s)`, margin + 16 + colW * 2, metaY + 9);

        // Col 4: Valid Until
        doc
          .fillColor(textLight)
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("VALIDITY", margin + 16 + colW * 3, metaY);
        const validStr = data.validUntil
          ? new Date(data.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Upon Confirmation";
        doc
          .fillColor(brandColor)
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(validStr, margin + 16 + colW * 3, metaY + 9);

        doc.y = titleCardY + 80;

        // ═════════════════════════════════════════════════════════════════════
        // 3. CONSULTANT MESSAGE (IF PRESENT)
        // ═════════════════════════════════════════════════════════════════════
        if (data.customerMessage) {
          checkPageBreak(50);
          const msgY = doc.y;
          doc
            .roundedRect(margin, msgY, contentWidth, 42, 6)
            .fillAndStroke("#EEF2FF", "#C7D2FE");

          doc
            .fillColor(brandDark)
            .fontSize(7)
            .font("Helvetica-Bold")
            .text("GREETING FROM YOUR TRAVEL CONSULTANT", margin + 12, msgY + 7);

          doc
            .fillColor(textDark)
            .fontSize(7.5)
            .font("Helvetica")
            .text(data.customerMessage, margin + 12, msgY + 17, {
              width: contentWidth - 24,
              lineGap: 1.5,
              ellipsis: true,
            });

          doc.y = msgY + 48;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. DAY-WISE ITINERARY SCHEDULE
        // ═════════════════════════════════════════════════════════════════════
        const itineraryItems = data.trip?.itineraryItems || [];
        if (itineraryItems.length > 0) {
          drawSectionHeader("Day-Wise Tour Itinerary", "Planned daily sightseeing, routes and experiences");

          itineraryItems.forEach((item) => {
            doc.fontSize(7.5);
            const descHeight = item.description
              ? Math.min(doc.heightOfString(item.description, { width: contentWidth - 75 }), 85)
              : 0;
            const itemBoxHeight = Math.max(34, 20 + descHeight);

            checkPageBreak(itemBoxHeight + 6);

            const itemY = doc.y;

            // Day Pill
            doc
              .roundedRect(margin, itemY, 44, 18, 4)
              .fill(brandDark);

            doc
              .fillColor("#FFFFFF")
              .fontSize(7)
              .font("Helvetica-Bold")
              .text(`DAY ${item.dayNumber}`, margin, itemY + 5, {
                width: 44,
                align: "center",
              });

            if (item.date) {
              doc
                .fillColor(textLight)
                .fontSize(6)
                .font("Helvetica")
                .text(
                  new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  margin,
                  itemY + 20,
                  { width: 44, align: "center" }
                );
            }

            // Title & Location
            const contentX = margin + 52;
            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text(item.title, contentX, itemY + 1, {
                width: contentWidth - 120,
              });

            if (item.location) {
              doc
                .fillColor(brandColor)
                .fontSize(7)
                .font("Helvetica-Bold")
                .text(`📍 ${item.location}`, margin + contentWidth - 75, itemY + 1, {
                  width: 75,
                  align: "right",
                });
            }

            if (item.description) {
              doc
                .fillColor(textMuted)
                .fontSize(7)
                .font("Helvetica")
                .text(item.description, contentX, itemY + 13, {
                  width: contentWidth - 65,
                  lineGap: 1.5,
                });
            }

            // Divider Line
            doc
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .moveTo(contentX, doc.y + 4)
              .lineTo(margin + contentWidth, doc.y + 4)
              .stroke();

            doc.y += 8;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. HOTEL ACCOMMODATION DETAILS (NON-PRICE)
        // ═════════════════════════════════════════════════════════════════════
        const hotels = data.trip?.hotels || [];
        if (hotels.length > 0) {
          drawSectionHeader("Hotel Accommodations", "Selected comfortable accommodations");

          hotels.forEach((h) => {
            checkPageBreak(40);
            const boxY = doc.y;

            doc
              .roundedRect(margin, boxY, contentWidth, 34, 4)
              .fillAndStroke(bgLight, borderLight);

            // Hotel Icon & Name
            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text(`🏨  ${h.name}`, margin + 10, boxY + 6, { width: contentWidth - 140, ellipsis: true });

            const cityStr = h.city ? `Destination: ${h.city}` : "";
            const roomStr = [h.roomType, h.mealPlan].filter(Boolean).join("  •  ");

            doc
              .fillColor(textMuted)
              .fontSize(7)
              .font("Helvetica")
              .text([cityStr, roomStr].filter(Boolean).join("  |  "), margin + 10, boxY + 19, {
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
              .fillColor(brandColor)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(dateStr, margin + contentWidth - 130, boxY + 6, { width: 120, align: "right" });

            if (h.nights) {
              doc
                .fillColor(textLight)
                .fontSize(6.5)
                .font("Helvetica")
                .text(`${h.nights} Night(s)  •  ${h.rooms || 1} Room(s)`, margin + contentWidth - 130, boxY + 19, {
                  width: 120,
                  align: "right",
                });
            }

            doc.y = boxY + 39;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. TRANSPORTATION & TRANSFERS (NON-PRICE)
        // ═════════════════════════════════════════════════════════════════════
        const vehicles = data.trip?.vehicles || [];
        if (vehicles.length > 0) {
          drawSectionHeader("Transportation & Transfers", "Private transport arrangements");

          vehicles.forEach((v) => {
            checkPageBreak(36);
            const vY = doc.y;

            doc
              .roundedRect(margin, vY, contentWidth, 30, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text(`🚗  ${v.name}`, margin + 10, vY + 6, { width: contentWidth - 140, ellipsis: true });

            const typeDetails = [
              v.type ? `Type: ${v.type}` : "",
              v.capacity ? `Capacity: ${v.capacity} Travelers` : "",
              v.notes || "Dedicated private chauffeur service",
            ]
              .filter(Boolean)
              .join("  •  ");

            doc
              .fillColor(textMuted)
              .fontSize(7)
              .font("Helvetica")
              .text(typeDetails, margin + 10, vY + 17, { width: contentWidth - 20, ellipsis: true });

            doc.y = vY + 35;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. ACTIVITIES & EXPERIENCES (NON-PRICE)
        // ═════════════════════════════════════════════════════════════════════
        const activities = data.trip?.activities || [];
        if (activities.length > 0) {
          drawSectionHeader("Sightseeing & Activities", "Planned excursions and experiences");

          activities.forEach((act) => {
            checkPageBreak(34);
            const actY = doc.y;

            doc
              .roundedRect(margin, actY, contentWidth, 28, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(textDark)
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(`🎟  ${act.name}`, margin + 10, actY + 6, { width: contentWidth - 140, ellipsis: true });

            if (act.date) {
              doc
                .fillColor(brandColor)
                .fontSize(7)
                .font("Helvetica-Bold")
                .text(
                  new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  margin + contentWidth - 130,
                  actY + 6,
                  { width: 120, align: "right" }
                );
            }

            if (act.description || act.city) {
              const sub = [act.city, act.description].filter(Boolean).join("  •  ");
              doc
                .fillColor(textMuted)
                .fontSize(6.5)
                .font("Helvetica")
                .text(sub, margin + 10, actY + 16, { width: contentWidth - 20, ellipsis: true });
            }

            doc.y = actY + 33;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. INCLUSIONS & EXCLUSIONS
        // ═════════════════════════════════════════════════════════════════════
        const inclusions = data.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
        const exclusions = data.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];

        if (inclusions.length > 0 || exclusions.length > 0) {
          drawSectionHeader("Package Inclusions & Exclusions", "Clear coverage details for your holiday");

          const halfWidth = (contentWidth - 10) / 2;
          checkPageBreak(105);
          const boxY = doc.y;

          // Inclusions Box (Left)
          doc
            .roundedRect(margin, boxY, halfWidth, 100, 6)
            .fillAndStroke(greenBg, greenBorder);

          doc
            .fillColor(greenText)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("✔ WHAT IS INCLUDED", margin + 10, boxY + 7);

          let incY = boxY + 20;
          inclusions.slice(0, 6).forEach((inc) => {
            doc
              .fillColor(textDark)
              .fontSize(6.5)
              .font("Helvetica-Bold")
              .text(`• ${inc.title}`, margin + 10, incY, { width: halfWidth - 20 });
            incY = doc.y + 1.5;
          });

          // Exclusions Box (Right)
          const rightX = margin + halfWidth + 10;
          doc
            .roundedRect(rightX, boxY, halfWidth, 100, 6)
            .fillAndStroke(roseBg, roseBorder);

          doc
            .fillColor(roseText)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("✖ WHAT IS EXCLUDED", rightX + 10, boxY + 7);

          let excY = boxY + 20;
          exclusions.slice(0, 6).forEach((exc) => {
            doc
              .fillColor(textDark)
              .fontSize(6.5)
              .font("Helvetica-Bold")
              .text(`• ${exc.title}`, rightX + 10, excY, { width: halfWidth - 20 });
            excY = doc.y + 1.5;
          });

          doc.y = boxY + 108;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 9. PAYMENT MILESTONE SCHEDULE (PERCENTAGES ONLY — NO CURRENCY AMOUNTS)
        // ═════════════════════════════════════════════════════════════════════
        const milestones = data.paymentMilestones || [];
        if (milestones.length > 0) {
          drawSectionHeader("Payment Schedule", "Staged timeline of holiday investment");

          const mWidth = (contentWidth - (milestones.length - 1) * 8) / milestones.length;
          checkPageBreak(50);
          const mBoxY = doc.y;

          milestones.forEach((m, idx) => {
            const mX = margin + idx * (mWidth + 8);

            doc
              .roundedRect(mX, mBoxY, mWidth, 42, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(brandColor)
              .fontSize(6.5)
              .font("Helvetica-Bold")
              .text(m.percentage ? `STAGE ${idx + 1} (${Number(m.percentage)}%)` : `STAGE ${idx + 1}`, mX + 6, mBoxY + 5);

            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(m.title, mX + 6, mBoxY + 15, { width: mWidth - 12, ellipsis: true });

            if (m.dueDate) {
              doc
                .fillColor(textLight)
                .fontSize(6)
                .font("Helvetica")
                .text(`Due: ${new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, mX + 6, mBoxY + 28, {
                  width: mWidth - 12,
                });
            }
          });

          doc.y = mBoxY + 48;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 10. TERMS & CONDITIONS / POLICIES
        // ═════════════════════════════════════════════════════════════════════
        if (data.cancellationPolicy || data.terms || data.importantNotes) {
          drawSectionHeader("Booking Policies & Terms", "Important guidelines and cancellation terms");

          if (data.cancellationPolicy) {
            checkPageBreak(30);
            doc
              .fillColor(textDark)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text("Cancellation Policy:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(6.5)
              .font("Helvetica")
              .text(data.cancellationPolicy, margin, doc.y + 1, {
                width: contentWidth,
                lineGap: 1.5,
              });
            doc.y += 4;
          }

          if (data.terms) {
            checkPageBreak(30);
            doc
              .fillColor(textDark)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text("Terms & Conditions:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(6.5)
              .font("Helvetica")
              .text(data.terms, margin, doc.y + 1, {
                width: contentWidth,
                lineGap: 1.5,
              });
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 11. FINAL QUOTATION AMOUNT (THE ONLY MONETARY SECTION IN PDF)
        // ═════════════════════════════════════════════════════════════════════
        checkPageBreak(65);
        doc.moveDown(0.8);

        const totalCardY = doc.y;
        doc
          .roundedRect(margin, totalCardY, contentWidth, 54, 8)
          .fill(brandDark);

        doc
          .fillColor("#A5B4FC")
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text("FINAL QUOTATION AMOUNT", margin + 16, totalCardY + 11);

        doc
          .fillColor("#FFFFFF")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("Complete Holiday Package Investment", margin + 16, totalCardY + 25);

        doc
          .fillColor("#34D399") // Emerald 400
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(formatCurrency(effectiveFinalAmount), margin + 180, totalCardY + 12, {
            width: contentWidth - 196,
            align: "right",
          });

        doc
          .fillColor("#C7D2FE")
          .fontSize(6.5)
          .font("Helvetica")
          .text(`All-inclusive tour price (${data.currency})`, margin + 180, totalCardY + 36, {
            width: contentWidth - 196,
            align: "right",
          });

        doc.y = totalCardY + 62;

        // ═════════════════════════════════════════════════════════════════════
        // 12. GLOBAL FOOTER ON ALL PAGES
        // ═════════════════════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - 28;

          // Top footer border
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
            .text(agencyContact, margin, footerY + 5, {
              width: contentWidth - 90,
              ellipsis: true,
            });

          // Right: Page number
          doc
            .fillColor(textLight)
            .fontSize(6.5)
            .font("Helvetica")
            .text(`Page ${i + 1} of ${range.count}`, margin + contentWidth - 80, footerY + 5, {
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
