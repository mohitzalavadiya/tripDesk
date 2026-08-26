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
            Title: `${data.title} - ${data.quotationNumber}`,
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
        const accentColor = "#0D9488"; // Teal 600
        const textDark = "#0F172A"; // Slate 900
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgLight = "#F8FAFC"; // Slate 50
        const borderLight = "#E2E8F0"; // Slate 200
        const greenBg = "#ECFDF5"; // Emerald 50
        const greenText = "#065F46"; // Emerald 800
        const roseBg = "#FFF1F2"; // Rose 50
        const roseText = "#9F1239"; // Rose 800

        // Helpers
        const checkPageBreak = (neededHeight: number) => {
          if (doc.y + neededHeight > pageHeight - 60) {
            doc.addPage();
            return true;
          }
          return false;
        };

        const drawSectionHeader = (title: string, subtitle?: string) => {
          checkPageBreak(50);
          doc.moveDown(0.8);
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor(primaryDark)
            .text(title.toUpperCase());

          if (subtitle) {
            doc
              .fontSize(9)
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
        const headerHeight = 90;
        doc
          .rect(margin, margin, contentWidth, headerHeight)
          .fill(primaryDark);

        const agencyName = data.agency?.name || "TripDesk Travel Agency";
        const customerName = data.customer?.name || "Valued Traveler";

        // Agency Branding
        doc
          .fillColor("#FFFFFF")
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(agencyName, margin + 20, margin + 18, {
            width: contentWidth - 180,
            ellipsis: true,
          });

        doc
          .fillColor("#A5B4FC")
          .fontSize(9)
          .font("Helvetica")
          .text("Official Itinerary & Travel Proposal", margin + 20, margin + 42);

        // Quotation Badge (Top Right)
        const badgeWidth = 140;
        const badgeHeight = 50;
        const badgeX = margin + contentWidth - badgeWidth - 20;
        const badgeY = margin + 20;

        doc
          .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
          .fill("#312E81");

        doc
          .fillColor("#FFFFFF")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(data.quotationNumber, badgeX, badgeY + 10, {
            width: badgeWidth,
            align: "center",
          });

        doc
          .fillColor("#C7D2FE")
          .fontSize(8)
          .font("Helvetica")
          .text(`Version ${data.version}  •  ${data.currency}`, badgeX, badgeY + 28, {
            width: badgeWidth,
            align: "center",
          });

        doc.y = margin + headerHeight + 15;

        // ═════════════════════════════════════════════════════════════════════
        // 2. TRIP TITLE & OVERVIEW CARD
        // ═════════════════════════════════════════════════════════════════════
        const titleCardY = doc.y;
        doc
          .roundedRect(margin, titleCardY, contentWidth, 75, 8)
          .fillAndStroke(bgLight, borderLight);

        doc
          .fillColor(textDark)
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(data.title || "Travel Proposal", margin + 16, titleCardY + 12, {
            width: contentWidth - 32,
          });

        if (data.proposalSubtitle) {
          doc
            .fillColor(primaryColor)
            .fontSize(9)
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
          .fontSize(9)
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
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(`${travelerCount} Person(s)`, margin + 16 + colW * 2, metaY + 10);

        // Col 4: Valid Until
        doc
          .fillColor(textLight)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text("VALID UNTIL", margin + 16 + colW * 3, metaY);
        const validStr = data.validUntil ? new Date(data.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Upon confirmation";
        doc
          .fillColor(primaryColor)
          .fontSize(8.5)
          .font("Helvetica-Bold")
          .text(validStr, margin + 16 + colW * 3, metaY + 10);

        doc.y = titleCardY + 85;

        // ═════════════════════════════════════════════════════════════════════
        // 3. EXECUTIVE INTRODUCTION / GREETING
        // ═════════════════════════════════════════════════════════════════════
        if (data.customerMessage) {
          checkPageBreak(70);
          const msgY = doc.y;
          doc
            .roundedRect(margin, msgY, contentWidth, 50, 6)
            .fillAndStroke("#EEF2FF", "#C7D2FE");

          doc
            .fillColor(primaryDark)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("GREETING FROM YOUR TRAVEL CONSULTANT", margin + 12, msgY + 8);

          doc
            .fillColor(textDark)
            .fontSize(8.5)
            .font("Helvetica")
            .text(data.customerMessage, margin + 12, msgY + 20, {
              width: contentWidth - 24,
              lineGap: 2,
            });

          doc.y = msgY + 58;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 4. PACKAGE OPTIONS & TIERS COMPARISON (PHASE 10.11B)
        // ═════════════════════════════════════════════════════════════════════
        const activePackages = data.packageOptions && data.packageOptions.length > 0 ? data.packageOptions : [];

        if (activePackages.length > 0) {
          drawSectionHeader("Package Options & Tier Selection", "Compare hotel grades, vehicles and inclusions");

          const numPackages = activePackages.length;
          const pkgCardGap = 10;
          const pkgCardWidth = (contentWidth - pkgCardGap * (numPackages - 1)) / numPackages;

          // Determine selected option
          const selectedId = data.selectedPackageOptionId;
          const cardStartY = doc.y;
          let maxCardHeight = 150;

          // Check if we need page break
          checkPageBreak(maxCardHeight + 20);

          activePackages.forEach((pkg, index) => {
            const cardX = margin + index * (pkgCardWidth + pkgCardGap);
            const isSelected = pkg.id === selectedId;

            // Background Card
            doc
              .roundedRect(cardX, cardStartY, pkgCardWidth, maxCardHeight, 6)
              .fillAndStroke(isSelected ? "#F5F3FF" : bgLight, isSelected ? primaryColor : borderLight);

            // Recommended or Selected Badge
            if (isSelected) {
              doc
                .roundedRect(cardX + 8, cardStartY + 8, pkgCardWidth - 16, 16, 3)
                .fill(primaryColor);
              doc
                .fillColor("#FFFFFF")
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text("SELECTED PACKAGE", cardX + 8, cardStartY + 12, {
                  width: pkgCardWidth - 16,
                  align: "center",
                });
            } else if (pkg.isRecommended) {
              doc
                .roundedRect(cardX + 8, cardStartY + 8, pkgCardWidth - 16, 16, 3)
                .fill("#059669");
              doc
                .fillColor("#FFFFFF")
                .fontSize(7.5)
                .font("Helvetica-Bold")
                .text("★ RECOMMENDED", cardX + 8, cardStartY + 12, {
                  width: pkgCardWidth - 16,
                  align: "center",
                });
            }

            const contentTop = isSelected || pkg.isRecommended ? cardStartY + 30 : cardStartY + 12;

            // Package Title
            doc
              .fillColor(textDark)
              .fontSize(11)
              .font("Helvetica-Bold")
              .text(pkg.name, cardX + 8, contentTop, {
                width: pkgCardWidth - 16,
                align: "center",
              });

            if (pkg.subtitle) {
              doc
                .fillColor(textMuted)
                .fontSize(7.5)
                .font("Helvetica")
                .text(pkg.subtitle, cardX + 8, doc.y + 1, {
                  width: pkgCardWidth - 16,
                  align: "center",
                });
            }

            // Price Box inside Card
            const priceBoxY = cardStartY + 62;
            doc
              .roundedRect(cardX + 8, priceBoxY, pkgCardWidth - 16, 28, 4)
              .fill("#FFFFFF");

            doc
              .fillColor(primaryColor)
              .fontSize(12)
              .font("Helvetica-Bold")
              .text(formatCurrency(Number(pkg.finalAmount)), cardX + 8, priceBoxY + 5, {
                width: pkgCardWidth - 16,
                align: "center",
              });

            doc
              .fillColor(textLight)
              .fontSize(6.5)
              .font("Helvetica")
              .text("Taxes included", cardX + 8, priceBoxY + 18, {
                width: pkgCardWidth - 16,
                align: "center",
              });

            // Specs
            let specsY = priceBoxY + 34;
            if (pkg.hotelNotes) {
              doc
                .fillColor(textDark)
                .fontSize(7)
                .font("Helvetica")
                .text(`• Hotel: ${pkg.hotelNotes}`, cardX + 8, specsY, {
                  width: pkgCardWidth - 16,
                });
              specsY = doc.y + 2;
            }

            if (pkg.vehicleNotes) {
              doc
                .fillColor(textDark)
                .fontSize(7)
                .font("Helvetica")
                .text(`• Transport: ${pkg.vehicleNotes}`, cardX + 8, specsY, {
                  width: pkgCardWidth - 16,
                });
            }
          });

          doc.y = cardStartY + maxCardHeight + 15;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 5. DAY-BY-DAY ITINERARY SCHEDULE
        // ═════════════════════════════════════════════════════════════════════
        const itineraryItems = data.trip?.itineraryItems || [];
        if (itineraryItems.length > 0) {
          drawSectionHeader("Day-by-Day Itinerary Schedule", "Planned sightseeing, hotel stays and experiences");

          itineraryItems.forEach((item) => {
            doc.fontSize(8);
            const descHeight = item.description ? Math.min(doc.heightOfString(item.description, { width: contentWidth - 80 }), 100) : 0;
            const itemBoxHeight = Math.max(40, 26 + descHeight);

            checkPageBreak(itemBoxHeight + 10);

            const itemY = doc.y;

            // Day Badge
            doc
              .roundedRect(margin, itemY, 50, 22, 4)
              .fill(primaryDark);

            doc
              .fillColor("#FFFFFF")
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(`DAY ${item.dayNumber}`, margin, itemY + 6, {
                width: 50,
                align: "center",
              });

            if (item.date) {
              doc
                .fillColor(textLight)
                .fontSize(6.5)
                .font("Helvetica")
                .text(new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), margin, itemY + 24, {
                  width: 50,
                  align: "center",
                });
            }

            // Title & Location
            const contentX = margin + 62;
            doc
              .fillColor(textDark)
              .fontSize(9.5)
              .font("Helvetica-Bold")
              .text(item.title, contentX, itemY + 2, {
                width: contentWidth - 140,
              });

            if (item.location) {
              doc
                .fillColor(primaryColor)
                .fontSize(8)
                .font("Helvetica-Bold")
                .text(`📍 ${item.location}`, margin + contentWidth - 85, itemY + 2, {
                  width: 85,
                  align: "right",
                });
            }

            if (item.description) {
              doc
                .fillColor(textMuted)
                .fontSize(8)
                .font("Helvetica")
                .text(item.description, contentX, itemY + 16, {
                  width: contentWidth - 75,
                  lineGap: 1.5,
                });
            }

            // Divider Line
            doc
              .strokeColor(borderLight)
              .lineWidth(0.5)
              .moveTo(margin + 62, doc.y + 6)
              .lineTo(margin + contentWidth, doc.y + 6)
              .stroke();

            doc.y += 12;
          });
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. INCLUSIONS & EXCLUSIONS (PHASE 10.11A)
        // ═════════════════════════════════════════════════════════════════════
        const inclusions = data.proposalItems?.filter((p) => p.type === "INCLUSION") || [];
        const exclusions = data.proposalItems?.filter((p) => p.type === "EXCLUSION") || [];

        if (inclusions.length > 0 || exclusions.length > 0) {
          drawSectionHeader("Package Inclusions & Exclusions", "Clear transparent breakdown of coverage");

          const halfWidth = (contentWidth - 12) / 2;
          checkPageBreak(120);
          const boxY = doc.y;

          // Inclusions Box (Left)
          doc
            .roundedRect(margin, boxY, halfWidth, 110, 6)
            .fillAndStroke(greenBg, "#A7F3D0");

          doc
            .fillColor(greenText)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("✔ WHAT IS INCLUDED", margin + 10, boxY + 8);

          let incY = boxY + 24;
          inclusions.slice(0, 5).forEach((inc) => {
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`• ${inc.title}`, margin + 10, incY, { width: halfWidth - 20 });
            incY = doc.y + 2;
          });

          // Exclusions Box (Right)
          const rightX = margin + halfWidth + 12;
          doc
            .roundedRect(rightX, boxY, halfWidth, 110, 6)
            .fillAndStroke(roseBg, "#FECDD3");

          doc
            .fillColor(roseText)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("✖ WHAT IS EXCLUDED", rightX + 10, boxY + 8);

          let excY = boxY + 24;
          exclusions.slice(0, 5).forEach((exc) => {
            doc
              .fillColor(textDark)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(`• ${exc.title}`, rightX + 10, excY, { width: halfWidth - 20 });
            excY = doc.y + 2;
          });

          doc.y = boxY + 120;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 7. PAYMENT MILESTONE SCHEDULE
        // ═════════════════════════════════════════════════════════════════════
        const milestones = data.paymentMilestones || [];
        const effectiveFinalAmount = data.selectedPackageOption ? Number(data.selectedPackageOption.finalAmount) : data.finalAmount;

        if (milestones.length > 0) {
          drawSectionHeader("Payment Milestone Schedule", "Staged timeline and deposit structure");

          const mWidth = (contentWidth - (milestones.length - 1) * 8) / milestones.length;
          checkPageBreak(65);
          const mBoxY = doc.y;

          milestones.forEach((m, idx) => {
            const mX = margin + idx * (mWidth + 8);
            const amt = m.percentage ? Math.round((effectiveFinalAmount * Number(m.percentage)) / 100) : Number(m.amount || 0);

            doc
              .roundedRect(mX, mBoxY, mWidth, 54, 4)
              .fillAndStroke(bgLight, borderLight);

            doc
              .fillColor(primaryColor)
              .fontSize(7.5)
              .font("Helvetica-Bold")
              .text(m.percentage ? `STAGE ${idx + 1} (${Number(m.percentage)}%)` : `STAGE ${idx + 1}`, mX + 6, mBoxY + 6);

            doc
              .fillColor(textDark)
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(m.title, mX + 6, mBoxY + 18, { width: mWidth - 12, ellipsis: true });

            doc
              .fillColor(primaryDark)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(formatCurrency(amt), mX + 6, mBoxY + 34, { width: mWidth - 12, align: "right" });
          });

          doc.y = mBoxY + 64;
        }

        // ═════════════════════════════════════════════════════════════════════
        // 8. COMMERCIAL TOTAL INVESTMENT CARD
        // ═════════════════════════════════════════════════════════════════════
        checkPageBreak(70);
        const totalCardY = doc.y;
        doc
          .roundedRect(margin, totalCardY, contentWidth, 54, 6)
          .fill(primaryDark);

        const chosenPkg = data.selectedPackageOption || data.packageOptions?.find((p) => p.id === data.selectedPackageOptionId);

        doc
          .fillColor("#A5B4FC")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("TOTAL PROPOSAL INVESTMENT", margin + 16, totalCardY + 12);

        doc
          .fillColor("#FFFFFF")
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(chosenPkg ? `${chosenPkg.name} Package` : "Complete Tour Price", margin + 16, totalCardY + 26);

        doc
          .fillColor("#FFFFFF")
          .fontSize(20)
          .font("Helvetica-Bold")
          .text(formatCurrency(effectiveFinalAmount), margin + 200, totalCardY + 16, {
            width: contentWidth - 216,
            align: "right",
          });

        doc.y = totalCardY + 66;

        // ═════════════════════════════════════════════════════════════════════
        // 9. IMPORTANT POLICIES & ADVISORIES
        // ═════════════════════════════════════════════════════════════════════
        if (data.cancellationPolicy || data.terms || data.importantNotes) {
          drawSectionHeader("Important Policies & Terms", "Terms of service and cancellation schedule");

          if (data.cancellationPolicy) {
            checkPageBreak(40);
            doc
              .fillColor(textDark)
              .fontSize(8)
              .font("Helvetica-Bold")
              .text("Cancellation Policy:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(data.cancellationPolicy, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 1.5,
              });
            doc.y += 6;
          }

          if (data.terms) {
            checkPageBreak(40);
            doc
              .fillColor(textDark)
              .fontSize(8)
              .font("Helvetica-Bold")
              .text("Terms & Conditions:", margin, doc.y);

            doc
              .fillColor(textMuted)
              .fontSize(7.5)
              .font("Helvetica")
              .text(data.terms, margin, doc.y + 2, {
                width: contentWidth,
                lineGap: 1.5,
              });
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 10. PAGE NUMBERS & FOOTER STAMP ON ALL PAGES
        // ═════════════════════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          const footerY = pageHeight - 32;

          // Top line
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
            .fontSize(7)
            .font("Helvetica")
            .text(agencyContact, margin, footerY + 6, {
              width: contentWidth - 100,
              ellipsis: true,
            });

          // Right: Page number
          doc
            .fillColor(textLight)
            .fontSize(7)
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
