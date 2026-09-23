import "server-only";

import PDFDocument from "pdfkit";

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
    destinations?: Array<{
      id: string;
      sequence: number;
      name: string;
    }>;
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

  tier?: string | null;

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

/**
 * Formats a numeric currency amount using Indian numbering system cleanly for PDF output.
 * Avoids raw Unicode symbol encoding mismatches in standard PDF fonts.
 */
function formatPdfCurrency(amount: number, currency: string = "INR"): string {
  const formattedNumber = Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formattedNumber}`;
}

export class QuotationPdfService {
  /**
   * Generates a professional customer-facing travel proposal PDF matching the Preview UI.
   * STRICT SINGLE MONETARY VALUE RULE:
   * The PDF renders exactly ONE monetary value: Final Quotation Amount.
   * All line item rates, subtotals, markups, discounts, taxes, and milestone amounts are redacted.
   */
  async generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 32,
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
        const margin = 32;
        const contentWidth = pageWidth - margin * 2; // 531.28 pt
        const bottomSafeLimit = pageHeight - 42;

        // Elegant Modern Travel Color Palette matching Preview UI
        const brandDark = "#0F172A"; // Slate 900
        const brandNavy = "#1E1B4B"; // Indigo 950
        const brandIndigo = "#4338CA"; // Indigo 700
        const brandAccent = "#6366F1"; // Indigo 500
        const brandLight = "#EEF2FF"; // Indigo 50
        const textDark = "#0F172A"; // Slate 900
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgCard = "#F8FAFC"; // Slate 50
        const bgWhite = "#FFFFFF"; // Pure White
        const borderLight = "#E2E8F0"; // Slate 200
        const borderCard = "#E2E8F0"; // Slate 200
        const greenBg = "#ECFDF5"; // Emerald 50
        const greenBorder = "#A7F3D0"; // Emerald 200
        const greenText = "#065F46"; // Emerald 800
        const roseBg = "#FFF1F2"; // Rose 50
        const roseBorder = "#FECDD3"; // Rose 200
        const roseText = "#9F1239"; // Rose 800

        // Helper: Page Break Check (prevents premature splits and orphaned content)
        const ensureSpace = (neededHeight: number) => {
          if (doc.y + neededHeight > bottomSafeLimit) {
            doc.addPage();
            doc.x = margin;
            doc.y = margin + 8;
            return true;
          }
          return false;
        };

        // Helper: Section Headers with comfortable top spacing and clear visual hierarchy
        const drawSectionHeader = (title: string, subtitle?: string, minContentHeight: number = 44) => {
          // Check if space exists for top spacing + header + at least part of first card
          ensureSpace(36 + minContentHeight);

          // Generous, professional top whitespace separating previous section
          doc.y += 18;
          doc.x = margin;

          doc
            .fontSize(10.5)
            .font("Helvetica-Bold")
            .fillColor(brandDark)
            .text(title.toUpperCase(), margin, doc.y, { width: contentWidth });

          if (subtitle) {
            doc
              .fontSize(7.5)
              .font("Helvetica")
              .fillColor(textMuted)
              .text(subtitle, margin, doc.y + 2, { width: contentWidth });
          }

          const lineY = doc.y + 4;
          doc
            .strokeColor(brandAccent)
            .lineWidth(2)
            .moveTo(margin, lineY)
            .lineTo(margin + 36, lineY)
            .stroke();

          doc
            .strokeColor(borderLight)
            .lineWidth(0.75)
            .moveTo(margin + 36, lineY)
            .lineTo(margin + contentWidth, lineY)
            .stroke();

          doc.y = lineY + 9;
          doc.x = margin;
        };

        // Determine effective final quotation amount (solitary customer monetary value)
        const effectiveFinalAmount = Number(data.finalAmount);

        // Derive Duration
        let durationText = "";
        if (data.trip?.startDate && data.trip?.endDate) {
          const start = new Date(data.trip.startDate);
          const end = new Date(data.trip.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          durationText = `${nights} Nights / ${nights + 1} Days`;
        }

        const agencyName = data.agency?.name || "TRIPDESK TRAVEL AGENCY";
        const customerName = data.customer?.name || "Valued Traveler";

        // ═════════════════════════════════════════════════════════════════════
        // 1. UNIFIED BRAND HEADER & HERO BANNER (DYNAMIC HEIGHT)
        // ═════════════════════════════════════════════════════════════════════
        const tripTitle = data.title || "Customized Holiday Itinerary";
        
        doc.fontSize(14).font("Helvetica-Bold");
        const titleHeight = doc.heightOfString(tripTitle, { width: contentWidth - 28 });
        
        let subtitleHeight = 0;
        if (data.proposalSubtitle) {
          doc.fontSize(8).font("Helvetica");
          subtitleHeight = doc.heightOfString(data.proposalSubtitle, { width: contentWidth - 28 }) + 3;
        }

        const heroHeaderTopY = margin;
        const heroTopSectionH = 48 + titleHeight + subtitleHeight;
        const heroMetaSectionH = 40;
        const totalHeroH = heroTopSectionH + heroMetaSectionH + 16;

        doc
          .roundedRect(margin, heroHeaderTopY, contentWidth, totalHeroH, 8)
          .fill(brandDark);

        // Top Brand Row
        doc
          .fillColor("#A5B4FC")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(agencyName.toUpperCase(), margin + 14, heroHeaderTopY + 12, {
            width: contentWidth - 170,
            ellipsis: true,
          });

        // Dynamic Agency Subtitle / Tagline / Contact
        const agencyContactParts = [data.agency?.phone, data.agency?.email].filter(Boolean);
        const dynamicAgencySubtext = agencyContactParts.length > 0
          ? agencyContactParts.join("   |   ")
          : "TRIP PROPOSAL";

        doc
          .fillColor("#CBD5E1")
          .fontSize(7.5)
          .font("Helvetica")
          .text(dynamicAgencySubtext, margin + 14, heroHeaderTopY + 26, {
            width: contentWidth - 170,
            ellipsis: true,
          });

        // Top-Right Reference Pill
        const pillW = 125;
        const pillH = 20;
        const pillX = margin + contentWidth - pillW - 14;
        const pillY = heroHeaderTopY + 12;

        doc
          .roundedRect(pillX, pillY, pillW, pillH, 10)
          .fillAndStroke(brandNavy, "#312E81");

        doc
          .fillColor("#FFFFFF")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(`${data.quotationNumber}  •  v${data.version}`, pillX, pillY + 5.5, {
            width: pillW,
            align: "center",
          });

        // Proposal Tier Badge Pill
        const catPillY = heroHeaderTopY + 40;
        const tierName = data.tier || "Deluxe";
        const proposalBadgeText = `TIER: ${tierName.toUpperCase()}`;
        const badgeW = Math.min(200, Math.max(90, proposalBadgeText.length * 6.5 + 18));

        doc
          .roundedRect(margin + 14, catPillY, badgeW, 14, 4)
          .fill("#1E1B4B");

        doc
          .fillColor("#818CF8")
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(proposalBadgeText, margin + 14, catPillY + 3.5, {
            width: badgeW,
            align: "center",
          });

        // Main Trip Title
        const titleY = catPillY + 18;
        doc
          .fillColor("#FFFFFF")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(tripTitle, margin + 14, titleY, {
            width: contentWidth - 28,
          });

        let nextHeroY = titleY + titleHeight + 3;
        if (data.proposalSubtitle) {
          doc
            .fillColor("#E2E8F0")
            .fontSize(8)
            .font("Helvetica")
            .text(data.proposalSubtitle, margin + 14, nextHeroY, {
              width: contentWidth - 28,
            });
          nextHeroY += subtitleHeight;
        }

        // Horizontal Divider in Hero
        doc
          .strokeColor("#334155")
          .lineWidth(0.75)
          .moveTo(margin + 14, nextHeroY + 4)
          .lineTo(margin + contentWidth - 14, nextHeroY + 4)
          .stroke();

        // 4-Column Structured Metadata Bar (Inside Hero)
        const metaY = nextHeroY + 9;
        const colW = (contentWidth - 28) / 4;

        // Col 1: Prepared For
        doc
          .fillColor("#94A3B8")
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("PREPARED FOR", margin + 14, metaY);
        doc
          .fillColor("#FFFFFF")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(customerName, margin + 14, metaY + 9, { width: colW - 8, ellipsis: true });

        // Col 2: Travel Dates & Duration
        doc
          .fillColor("#94A3B8")
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("TRAVEL DATES", margin + 14 + colW, metaY);
        let dateRangeStr = "Custom / Flexible";
        if (data.trip?.startDate && data.trip?.endDate) {
          const startDateStr = new Date(data.trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const endDateStr = new Date(data.trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          dateRangeStr = `${startDateStr} – ${endDateStr}`;
        }
        doc
          .fillColor("#FFFFFF")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(dateRangeStr, margin + 14 + colW, metaY + 9, { width: colW - 8, ellipsis: true });
        if (durationText) {
          doc
            .fillColor("#A5B4FC")
            .fontSize(7)
            .font("Helvetica-Bold")
            .text(durationText, margin + 14 + colW, metaY + 20, { width: colW - 8 });
        }

        // Col 3: Group Size
        doc
          .fillColor("#94A3B8")
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("GROUP SIZE", margin + 14 + colW * 2, metaY);
        const travelerCount = data.trip?.travelers?.length || 1;
        doc
          .fillColor("#FFFFFF")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(`${travelerCount} Traveler(s)`, margin + 14 + colW * 2, metaY + 9);

        // Col 4: Validity
        doc
          .fillColor("#94A3B8")
          .fontSize(6.5)
          .font("Helvetica-Bold")
          .text("VALIDITY", margin + 14 + colW * 3, metaY);
        const validStr = data.validUntil
          ? new Date(data.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Upon Confirmation";
        doc
          .fillColor("#A5B4FC")
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(validStr, margin + 14 + colW * 3, metaY + 9, { width: colW - 8 });

        doc.y = heroHeaderTopY + totalHeroH + 12;
        doc.x = margin;

        // ═════════════════════════════════════════════════════════════════════
        // 2. ADVISOR GREETING (IF PRESENT)
        // ═════════════════════════════════════════════
        if (data.customerMessage) {
          doc.fontSize(8).font("Helvetica");
          const msgTextHeight = doc.heightOfString(data.customerMessage, { width: contentWidth - 24, lineGap: 2 });
          const msgCardHeight = Math.max(38, 20 + msgTextHeight);
          ensureSpace(msgCardHeight + 8);

          const msgY = doc.y;
          doc
            .roundedRect(margin, msgY, contentWidth, msgCardHeight, 6)
            .fillAndStroke(brandLight, "#C7D2FE");

          doc
            .fillColor(brandIndigo)
            .fontSize(7.5)
            .font("Helvetica-Bold")
            .text("GREETING FROM YOUR TRAVEL CONSULTANT", margin + 12, msgY + 8);

          doc
            .fillColor(textDark)
            .fontSize(8)
            .font("Helvetica")
            .text(data.customerMessage, margin + 12, msgY + 20, {
              width: contentWidth - 24,
              lineGap: 2,
            });

          doc.y = msgY + msgCardHeight + 10;
          doc.x = margin;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 3. TOUR HIGHLIGHTS BAR
        // ═════════════════════════════════════════════
        const hotelsList = data.trip?.hotels || [];
        const vehiclesList = data.trip?.vehicles || [];
        const activitiesList = data.trip?.activities || [];
        const daysCount = data.trip?.itineraryItems?.length || 0;

        const highlightParts: string[] = [];
        if (hotelsList.length > 0) {
          highlightParts.push(`${hotelsList.length} Premium Stay${hotelsList.length > 1 ? "s" : ""}`);
        }
        highlightParts.push(vehiclesList.length > 0 ? "Private Vehicle & Chauffeur" : "Transfers Included");
        if (activitiesList.length > 0) {
          highlightParts.push(`${activitiesList.length} Curated Experience${activitiesList.length > 1 ? "s" : ""}`);
        }
        if (daysCount > 0) {
          highlightParts.push(`${daysCount} Days Tour Schedule`);
        }

        if (highlightParts.length > 0) {
          ensureSpace(28);
          const hlY = doc.y;
          doc
            .roundedRect(margin, hlY, contentWidth, 24, 6)
            .fillAndStroke(bgCard, borderLight);

          doc
            .fillColor(textDark)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(highlightParts.join("     |     "), margin + 10, hlY + 8, {
              width: contentWidth - 20,
              align: "center",
              ellipsis: true,
            });

          doc.y = hlY + 28;
          doc.x = margin;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. DAY-WISE TOUR ITINERARY (DYNAMIC HEIGHT & COMFORTABLE SPACING)
        // ═════════════════════════════════════════════════════════════════════
        const itineraryItems = data.trip?.itineraryItems || [];
        if (itineraryItems.length > 0) {
          drawSectionHeader("Day-Wise Tour Itinerary", "Planned daily sightseeing, routes and experiences");

          itineraryItems.forEach((item) => {
            doc.fontSize(8).font("Helvetica");
            const descHeight = item.description
              ? doc.heightOfString(item.description, { width: contentWidth - 24, lineGap: 2 })
              : 0;
            const itemBoxHeight = Math.max(38, 28 + descHeight);

            ensureSpace(itemBoxHeight + 8);
            const itemY = doc.y;

            // Day Container Card
            doc
              .roundedRect(margin, itemY, contentWidth, itemBoxHeight, 6)
              .fillAndStroke(bgCard, borderLight);

            // Day Pill Badge
            const dayPillW = 44;
            doc
              .roundedRect(margin + 10, itemY + 7, dayPillW, 16, 4)
              .fill(brandDark);

            doc
              .fillColor("#FFFFFF")
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`DAY ${item.dayNumber}`, margin + 10, itemY + 11, {
                width: dayPillW,
                align: "center",
              });

            // Date under Day pill if present
            if (item.date) {
              const dateText = new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              doc
                .fillColor(textLight)
                .fontSize(6)
                .font("Helvetica")
                .text(dateText, margin + 10, itemY + 25, { width: dayPillW, align: "center" });
            }

            // Title
            doc
              .fillColor(textDark)
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(item.title, margin + 62, itemY + 9, {
                width: contentWidth - 190,
                ellipsis: true,
              });

            // Location Badge (Right side)
            if (item.location) {
              const locPillW = 110;
              const locPillX = margin + contentWidth - locPillW - 10;
              doc
                .roundedRect(locPillX, itemY + 7, locPillW, 16, 4)
                .fillAndStroke(brandLight, "#C7D2FE");

              doc
                .fillColor(brandIndigo)
                .fontSize(7)
                .font("Helvetica-Bold")
                .text(`Location: ${item.location}`, locPillX + 4, itemY + 11, {
                  width: locPillW - 8,
                  align: "center",
                  ellipsis: true,
                });
            }

            // Description
            if (item.description) {
              doc
                .fillColor(textMuted)
                .fontSize(8)
                .font("Helvetica")
                .text(item.description, margin + 12, itemY + 27, {
                  width: contentWidth - 24,
                  lineGap: 2,
                });
            }

            doc.y = itemY + itemBoxHeight + 8;
            doc.x = margin;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. HOTEL ACCOMMODATIONS (DYNAMIC HEIGHT & NO PRICING)
        // ═════════════════════════════════════════════════════════════════════
        const hotels = data.trip?.hotels || [];
        if (hotels.length > 0) {
          drawSectionHeader("Hotel Accommodations", "Selected comfortable accommodations for your stay");

          hotels.forEach((h) => {
            const notesHeight = h.notes
              ? doc.fontSize(7.5).font("Helvetica").heightOfString(h.notes, { width: contentWidth - 24, lineGap: 1.5 }) + 4
              : 0;
            const boxH = Math.max(52, 44 + notesHeight);

            ensureSpace(boxH + 8);
            const boxY = doc.y;

            doc
              .roundedRect(margin, boxY, contentWidth, boxH, 6)
              .fillAndStroke(bgCard, borderLight);

            // Hotel Badge
            const tagW = 46;
            doc
              .roundedRect(margin + 12, boxY + 8, tagW, 15, 3)
              .fillAndStroke(brandLight, "#C7D2FE");

            doc
              .fillColor(brandIndigo)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text("HOTEL", margin + 12, boxY + 12, { width: tagW, align: "center" });

            // Hotel Name
            doc
              .fillColor(textDark)
              .fontSize(9.5)
              .font("Helvetica-Bold")
              .text(h.name, margin + 64, boxY + 9, { width: contentWidth - 210, ellipsis: true });

            // City Tag
            if (h.city) {
              doc
                .fillColor(brandIndigo)
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text(`City: ${h.city}`, margin + 12, boxY + 26, { width: contentWidth - 180, ellipsis: true });
            }

            // Key-values: Room Type, Meal Plan
            const detailsLine = [
              h.roomType ? `Room: ${h.roomType}` : "",
              h.mealPlan ? `Meal Plan: ${h.mealPlan}` : "",
            ]
              .filter(Boolean)
              .join("   |   ");

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(detailsLine, margin + 12, boxY + (h.city ? 37 : 27), { width: contentWidth - 180, ellipsis: true });

            // Nights Badge & Dates (Right Side)
            let dateStr = "";
            if (h.checkIn && h.checkOut) {
              const inStr = new Date(h.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const outStr = new Date(h.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              dateStr = `${inStr} – ${outStr}`;
            }

            if (h.nights) {
              const nPillW = 100;
              const nPillX = margin + contentWidth - nPillW - 12;
              doc
                .roundedRect(nPillX, boxY + 8, nPillW, 16, 4)
                .fillAndStroke("#F1F5F9", "#CBD5E1");

              doc
                .fillColor("#334155")
                .fontSize(7)
                .font("Helvetica-Bold")
                .text(`${h.nights} Night(s)  •  ${h.rooms || 1} Room(s)`, nPillX + 2, boxY + 12, {
                  width: nPillW - 4,
                  align: "center",
                });
            }

            if (dateStr) {
              doc
                .fillColor(brandIndigo)
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text(dateStr, margin + contentWidth - 160, boxY + 28, { width: 148, align: "right" });
            }

            if (h.notes) {
              doc
                .fillColor(textMuted)
                .fontSize(7.5)
                .font("Helvetica-Oblique")
                .text(`Note: ${h.notes}`, margin + 12, boxY + 46, { width: contentWidth - 24, lineGap: 1.5 });
            }

            doc.y = boxY + boxH + 8;
            doc.x = margin;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. TRANSPORTATION & LOGISTICS (DYNAMIC HEIGHT & NO PRICING)
        // ═════════════════════════════════════════════
        const vehicles = data.trip?.vehicles || [];
        if (vehicles.length > 0) {
          drawSectionHeader("Transportation & Logistics", "Dedicated private transport arrangements");

          vehicles.forEach((v) => {
            const vH = 42;
            ensureSpace(vH + 8);
            const vY = doc.y;

            doc
              .roundedRect(margin, vY, contentWidth, vH, 6)
              .fillAndStroke(bgCard, borderLight);

            // Transport Badge
            const tagW = 54;
            doc
              .roundedRect(margin + 12, vY + 8, tagW, 15, 3)
              .fillAndStroke(brandLight, "#C7D2FE");

            doc
              .fillColor(brandIndigo)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text("VEHICLE", margin + 12, vY + 12, { width: tagW, align: "center" });

            doc
              .fillColor(textDark)
              .fontSize(9.5)
              .font("Helvetica-Bold")
              .text(v.name, margin + 72, vY + 9, { width: contentWidth - 170, ellipsis: true });

            if (v.capacity) {
              const capW = 75;
              const capX = margin + contentWidth - capW - 12;
              doc
                .roundedRect(capX, vY + 8, capW, 16, 4)
                .fillAndStroke(brandLight, "#C7D2FE");

              doc
                .fillColor(brandIndigo)
                .fontSize(7)
                .font("Helvetica-Bold")
                .text(`${v.capacity} Seater`, capX + 2, vY + 12, { width: capW - 4, align: "center" });
            }

            const typeDetails = [
              v.type ? `Category: ${v.type}` : "Dedicated Private Transport",
              v.notes || "Airport transfers, sightseeing, and intercity transit as per itinerary",
            ]
              .filter(Boolean)
              .join("   |   ");

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(typeDetails, margin + 12, vY + 26, { width: contentWidth - 24, ellipsis: true });

            doc.y = vY + vH + 8;
            doc.x = margin;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. SIGHTSEEING & EXPERIENCES (DYNAMIC HEIGHT & NO PRICING)
        // ═════════════════════════════════════════════
        const activities = data.trip?.activities || [];
        if (activities.length > 0) {
          drawSectionHeader("Sightseeing & Experiences", "Planned excursions and curated activities");

          activities.forEach((act) => {
            const descH = act.description
              ? doc.fontSize(7.5).font("Helvetica").heightOfString(act.description, { width: contentWidth - 24, lineGap: 1.5 })
              : 0;
            const actH = Math.max(40, 26 + descH);

            ensureSpace(actH + 8);
            const actY = doc.y;

            doc
              .roundedRect(margin, actY, contentWidth, actH, 6)
              .fillAndStroke(bgCard, borderLight);

            // Activity Badge
            const tagW = 54;
            doc
              .roundedRect(margin + 12, actY + 8, tagW, 15, 3)
              .fillAndStroke(brandLight, "#C7D2FE");

            doc
              .fillColor(brandIndigo)
              .fontSize(7)
              .font("Helvetica-Bold")
              .text("ACTIVITY", margin + 12, actY + 12, { width: tagW, align: "center" });

            doc
              .fillColor(textDark)
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(act.name, margin + 72, actY + 9, { width: contentWidth - 170, ellipsis: true });

            if (act.date) {
              doc
                .fillColor(brandIndigo)
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text(
                  new Date(act.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  margin + contentWidth - 130,
                  actY + 9,
                  { width: 118, align: "right" }
                );
            }

            const sub = [act.city ? `Location: ${act.city}` : "", act.description].filter(Boolean).join("   |   ");
            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(sub || "Curated sightseeing experience", margin + 12, actY + 25, {
                width: contentWidth - 24,
                lineGap: 1.5,
              });

            doc.y = actY + actH + 8;
            doc.x = margin;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. PACKAGE INCLUSIONS & EXCLUSIONS (2-COLUMN CARDS)
        // ═════════════════════════════════════════════
        const inclusions = data.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
        const exclusions = data.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];

        if (inclusions.length > 0 || exclusions.length > 0) {
          drawSectionHeader("Package Inclusions & Exclusions", "Clear coverage details for your holiday package");

          const halfWidth = (contentWidth - 12) / 2;
          const maxItemCount = Math.max(inclusions.length, exclusions.length, 1);
          const boxHeight = Math.max(56, 26 + maxItemCount * 15);

          ensureSpace(boxHeight + 10);
          const boxY = doc.y;

          // Inclusions Box (Left)
          doc
            .roundedRect(margin, boxY, halfWidth, boxHeight, 6)
            .fillAndStroke(greenBg, greenBorder);

          doc
            .fillColor(greenText)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("INCLUDED SERVICES", margin + 12, boxY + 9);

          let incY = boxY + 24;
          inclusions.forEach((inc) => {
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`✓  ${inc.title}`, margin + 12, incY, { width: halfWidth - 24, ellipsis: true });
            incY += 14;
          });

          // Exclusions Box (Right)
          const rightX = margin + halfWidth + 12;
          doc
            .roundedRect(rightX, boxY, halfWidth, boxHeight, 6)
            .fillAndStroke(roseBg, roseBorder);

          doc
            .fillColor(roseText)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("EXCLUDED SERVICES", rightX + 12, boxY + 9);

          let excY = boxY + 24;
          exclusions.forEach((exc) => {
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`✗  ${exc.title}`, rightX + 12, excY, { width: halfWidth - 24, ellipsis: true });
            excY += 14;
          });

          doc.y = boxY + boxHeight + 10;
          doc.x = margin;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 9. IMPORTANT NOTES, POLICIES & TERMS
        // ═════════════════════════════════════════════
        const importantNotesList = data.proposalItems?.filter((p) => p.type === "IMPORTANT_NOTE") || [];
        if (data.cancellationPolicy || data.terms || data.importantNotes || importantNotesList.length > 0) {
          drawSectionHeader("Important Notes & Booking Policies", "Key guidelines, advisory notes and terms");

          if (data.importantNotes || importantNotesList.length > 0) {
            ensureSpace(28);
            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text("Important Travel Advisories:", margin, doc.y, { width: contentWidth });

            if (data.importantNotes) {
              doc
                .fillColor(textMuted)
                .fontSize(7.5)
                .font("Helvetica")
                .text(data.importantNotes, margin, doc.y + 2, {
                  width: contentWidth,
                  lineGap: 2,
                });
              doc.y += 4;
            }

            importantNotesList.forEach((n) => {
              doc
                .fillColor(textMuted)
                .fontSize(7.5)
                .font("Helvetica")
                .text(`•  ${n.title}${n.description ? `: ${n.description}` : ""}`, margin + 6, doc.y + 2, {
                  width: contentWidth - 12,
                  lineGap: 1.8,
                });
              doc.y += 2;
            });
            doc.y += 6;
            doc.x = margin;
          }

          if (data.cancellationPolicy) {
            ensureSpace(28);
            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text("Cancellation Policy:", margin, doc.y, { width: contentWidth });

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(data.cancellationPolicy, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 2,
              });
            doc.y += 6;
            doc.x = margin;
          }

          if (data.terms) {
            ensureSpace(28);
            doc
              .fillColor(textDark)
              .fontSize(8.5)
              .font("Helvetica-Bold")
              .text("Terms & Conditions:", margin, doc.y, { width: contentWidth });

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(data.terms, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 2,
              });
            doc.y += 8;
            doc.x = margin;
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 10. FINAL QUOTATION AMOUNT (THE ONLY MONETARY SECTION IN PDF)
        // ═════════════════════════════════════════════
        ensureSpace(64);
        doc.y += 14;
        const totalCardY = doc.y;
        const totalCardH = 54;
        doc
          .roundedRect(margin, totalCardY, contentWidth, totalCardH, 8)
          .fill(brandDark);

        doc
          .fillColor("#A5B4FC")
          .fontSize(7.5)
          .font("Helvetica-Bold")
          .text("FINAL PROPOSAL PRICE", margin + 16, totalCardY + 12);

        doc
          .fillColor("#FFFFFF")
          .fontSize(10.5)
          .font("Helvetica-Bold")
          .text("Total Final Quotation Amount", margin + 16, totalCardY + 26);

        // Format single monetary value cleanly (e.g. INR 1,05,052.50) without Unicode corruption
        const formattedFinalAmount = formatPdfCurrency(effectiveFinalAmount, data.currency || "INR");

        doc
          .fillColor("#34D399") // Emerald 400
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(formattedFinalAmount, margin + 160, totalCardY + 14, {
            width: contentWidth - 176,
            align: "right",
          });

        doc
          .fillColor("#C7D2FE")
          .fontSize(7.5)
          .font("Helvetica")
          .text(`All-inclusive holiday package price (${data.currency || "INR"})`, margin + 160, totalCardY + 36, {
            width: contentWidth - 176,
            align: "right",
          });

        doc.y = totalCardY + totalCardH + 12;
        doc.x = margin;

        // ═════════════════════════════════════════════════════════════════════
        // 11. GLOBAL FOOTER ON ALL PAGES
        // ═════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - 26;

          // Top footer border
          doc
            .strokeColor(borderLight)
            .lineWidth(0.75)
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
            .join("   |   ");

          doc
            .fillColor(textLight)
            .fontSize(7)
            .font("Helvetica")
            .text(agencyContact, margin, footerY + 5, {
              width: contentWidth - 90,
              ellipsis: true,
            });

          // Right: Page number
          doc
            .fillColor(textLight)
            .fontSize(7)
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
