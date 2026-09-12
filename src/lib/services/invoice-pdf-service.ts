import "server-only";
import PDFDocument from "pdfkit";
import { InvoiceWithDetails } from "./invoice-service";

/**
 * Helper to format currency in Indian numbering format (INR ₹)
 */
function formatINR(val: number | string | any): string {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Helper to format dates consistently (DD MMM YYYY)
 */
function formatDate(d?: Date | string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export const invoicePdfService = {
  /**
   * Generates a commercial-grade, high-resolution PDF buffer for an Invoice
   * adhering strictly to Decision #18 (Booking as financial source of truth).
   */
  async generateInvoicePdf(invoice: InvoiceWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          bufferPages: true,
          info: {
            Title: `Invoice ${invoice.invoiceNumber || "Draft"}`,
            Author: (invoice.agencySnapshot as any)?.name || invoice.agency?.name || "TripDesk Travel Agency",
            Subject: `Official Travel Invoice for Booking ${invoice.booking?.bookingNumber || "—"}`,
            Keywords: `Invoice: ${invoice.invoiceNumber || "DRAFT"}, Booking: ${invoice.booking?.bookingNumber || "—"}`,
            Creator: "TripDesk Travel Operating System",
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        // ═════════════════════════════════════════════════════════════════════
        // PAGE LAYOUT & COLOR PALETTE
        // ═════════════════════════════════════════════════════════════════════
        const margin = 40;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const contentWidth = pageWidth - margin * 2; // 515.28 pt

        const brandPrimary = "#0F172A"; // Slate 900
        const brandAccent = "#4338CA"; // Indigo 700
        const textDark = "#1E293B"; // Slate 800
        const textMuted = "#475569"; // Slate 600
        const textLight = "#94A3B8"; // Slate 400
        const bgLight = "#F8FAFC"; // Slate 50
        const borderLight = "#E2E8F0"; // Slate 200
        const greenText = "#16A34A"; // Emerald 600
        const redText = "#DC2626"; // Rose 600

        const isDraft = invoice.status === "DRAFT";
        const isCancelled = invoice.status === "CANCELLED";

        // Multi-page helper: adds page with margin protection
        const checkPageBreak = (neededHeight: number, onPageAdded?: () => void) => {
          if (doc.y + neededHeight > pageHeight - 50) {
            doc.addPage();
            if (onPageAdded) onPageAdded();
            return true;
          }
          return false;
        };

        // ═════════════════════════════════════════════════════════════════════
        // 1. HEADER & AGENCY BRANDING
        // ═════════════════════════════════════════════════════════════════════
        let currentY = margin;

        const agencySnap = (invoice.agencySnapshot as any) || invoice.agency || {};
        const agencyName = agencySnap.name || "TripDesk Partner Agency";
        const agencyEmail = agencySnap.email || "";
        const agencyPhone = agencySnap.phone || "";
        const agencyAddress = agencySnap.address || "";
        const agencyLogo = agencySnap.logo || invoice.agency?.logo || null;

        // Header Left: Logo or Agency Name
        let logoDrawn = false;
        if (agencyLogo && typeof agencyLogo === "string") {
          try {
            if (agencyLogo.startsWith("data:image/") || agencyLogo.startsWith("/")) {
              doc.image(agencyLogo, margin, currentY, { fit: [140, 45] });
              logoDrawn = true;
              currentY += 50;
            }
          } catch {
            logoDrawn = false;
          }
        }

        if (!logoDrawn) {
          doc.fillColor(brandPrimary).fontSize(17).font("Helvetica-Bold").text(agencyName, margin, currentY, {
            width: 280,
            ellipsis: true,
          });
          currentY += 22;
        }

        doc.fillColor(textMuted).fontSize(8.5).font("Helvetica");
        if (agencyAddress) {
          doc.text(agencyAddress, margin, currentY, { width: 280 });
          currentY += doc.heightOfString(agencyAddress, { width: 280 }) + 2;
        }

        const agencyContactLine = [agencyPhone, agencyEmail].filter(Boolean).join("  •  ");
        if (agencyContactLine) {
          doc.text(agencyContactLine, margin, currentY, { width: 280 });
          currentY += 12;
        }

        // Agency GST Identity (if present in snapshot)
        const agencyGstin = agencySnap.gstin || null;
        const agencyStateCode = agencySnap.stateCode || null;
        const agencyLegalName = agencySnap.legalName || null;
        if (agencyGstin) {
          doc.fillColor(brandAccent).fontSize(8).font("Helvetica-Bold");
          const gstLine = [
            `GSTIN: ${agencyGstin}`,
            agencyStateCode ? `State Code: ${agencyStateCode}` : null,
          ].filter(Boolean).join("  •  ");
          doc.text(gstLine, margin, currentY, { width: 280 });
          currentY += 12;
        } else if (agencyLegalName && agencyLegalName !== agencyName) {
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica");
          doc.text(`Legal Name: ${agencyLegalName}`, margin, currentY, { width: 280 });
          currentY += 11;
        }

        // Header Right: Title, Number, Status, Dates
        const rightColW = 200;
        const rightColX = margin + contentWidth - rightColW;
        let rightY = margin;

        const headerTitle = isDraft ? "DRAFT INVOICE" : isCancelled ? "CANCELLED INVOICE" : "TAX INVOICE";
        const titleColor = isCancelled ? redText : isDraft ? textMuted : brandPrimary;

        doc.fillColor(titleColor).fontSize(20).font("Helvetica-Bold").text(headerTitle, rightColX, rightY, {
          align: "right",
          width: rightColW,
        });
        rightY += 24;

        const invNumberText = invoice.invoiceNumber ? invoice.invoiceNumber : "DRAFT (Unissued)";
        doc.fillColor(brandAccent).fontSize(11).font("Helvetica-Bold").text(invNumberText, rightColX, rightY, {
          align: "right",
          width: rightColW,
        });
        rightY += 15;

        doc.fillColor(textMuted).fontSize(8.5).font("Helvetica");
        doc.text(`Status: ${invoice.status.replace("_", " ")}`, rightColX, rightY, {
          align: "right",
          width: rightColW,
        });
        rightY += 13;

        doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, rightColX, rightY, {
          align: "right",
          width: rightColW,
        });
        rightY += 13;

        doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightColX, rightY, {
          align: "right",
          width: rightColW,
        });
        rightY += 15;

        // Position after header
        currentY = Math.max(currentY, rightY) + 12;

        // Elegant Divider
        doc.strokeColor(borderLight).lineWidth(1).moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).stroke();
        currentY += 14;

        // ═════════════════════════════════════════════════════════════════════
        // 2. BILLED TO & TRIP / BOOKING REFERENCE CARDS
        // ═════════════════════════════════════════════════════════════════════
        const cardH = 82;
        const cardW = (contentWidth - 14) / 2;

        // Left Card: Customer Details
        const custSnap: any = (invoice.customerSnapshot as any) || {};
        const liveCust: any = (invoice.booking?.customer as any) || {};
        const customerName = liveCust.name || custSnap.name || "Valued Customer";
        const customerPhone = liveCust.phone || custSnap.phone || "";
        const customerEmail = liveCust.email || custSnap.email || "";
        const customerAddress = [
          liveCust.address || custSnap.address,
          liveCust.city || custSnap.city,
          liveCust.state || custSnap.state,
          liveCust.country || custSnap.country,
          liveCust.postalCode || custSnap.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        doc.roundedRect(margin, currentY, cardW, cardH, 4).fillAndStroke(bgLight, borderLight);

        doc.fillColor(brandAccent).fontSize(7.5).font("Helvetica-Bold").text("BILLED TO", margin + 12, currentY + 10);
        doc.fillColor(brandPrimary).fontSize(10.5).font("Helvetica-Bold").text(customerName, margin + 12, currentY + 22, {
          width: cardW - 24,
          ellipsis: true,
        });

        let custTextY = currentY + 37;
        doc.fillColor(textMuted).fontSize(8).font("Helvetica");
        const custContact = [customerPhone, customerEmail].filter(Boolean).join("  •  ");
        if (custContact) {
          doc.text(custContact, margin + 12, custTextY, { width: cardW - 24, ellipsis: true });
          custTextY += 12;
        }
        if (customerAddress) {
          doc.text(customerAddress, margin + 12, custTextY, { width: cardW - 24, height: 24, ellipsis: true });
        }

        // Right Card: Booking / Trip Reference
        const rightCardX = margin + cardW + 14;
        const bookingSnap = (invoice.bookingSnapshot as any) || {};
        const bookingNumber = invoice.booking?.bookingNumber || bookingSnap.bookingNumber || "—";
        const tripTitle = invoice.booking?.trip?.title || bookingSnap.tripTitle || "Travel Package";
        
        const travelStart = invoice.booking?.travelStartDate || bookingSnap.travelStartDate;
        const travelEnd = invoice.booking?.travelEndDate || bookingSnap.travelEndDate;
        const travelPeriodText =
          travelStart && travelEnd
            ? `${formatDate(travelStart)} – ${formatDate(travelEnd)}`
            : travelStart
            ? `From ${formatDate(travelStart)}`
            : "Dates confirmed upon booking";

        doc.roundedRect(rightCardX, currentY, cardW, cardH, 4).fillAndStroke(bgLight, borderLight);

        doc.fillColor(brandAccent).fontSize(7.5).font("Helvetica-Bold").text("BOOKING & TRIP REFERENCE", rightCardX + 12, currentY + 10);
        
        let refY = currentY + 22;
        doc.fillColor(textDark).fontSize(8.5).font("Helvetica");
        
        doc.text("Booking Ref:", rightCardX + 12, refY);
        doc.fillColor(brandPrimary).font("Helvetica-Bold").text(bookingNumber, rightCardX + 80, refY);
        refY += 13;

        doc.fillColor(textDark).font("Helvetica").text("Trip / Tour:", rightCardX + 12, refY);
        doc.fillColor(brandPrimary).font("Helvetica-Bold").text(tripTitle, rightCardX + 80, refY, {
          width: cardW - 92,
          ellipsis: true,
        });
        refY += 13;

        doc.fillColor(textDark).font("Helvetica").text("Travel Period:", rightCardX + 12, refY);
        doc.fillColor(textMuted).font("Helvetica").text(travelPeriodText, rightCardX + 80, refY, {
          width: cardW - 92,
          ellipsis: true,
        });
        refY += 13;

        doc.fillColor(textDark).font("Helvetica").text("Currency:", rightCardX + 12, refY);
        doc.fillColor(textMuted).font("Helvetica").text(invoice.currency || "INR", rightCardX + 80, refY);

        currentY += cardH + 18;

        // ═════════════════════════════════════════════════════════════════════
        // 3. SERVICE ITEMIZATION TABLE
        // ═════════════════════════════════════════════════════════════════════
        const quotationItems = invoice.booking?.quotation?.items || [];
        const invoiceItems = invoice.items || [];

        interface TableLineItem {
          index: number;
          name: string;
          description?: string | null;
          quantity: number;
          rate: number;
          amount: number;
        }

        const itemsToRender: TableLineItem[] = [];

        if (quotationItems.length > 0) {
          quotationItems.forEach((item, idx) => {
            const rate = Number(item.sellingPrice ?? item.unitPrice ?? 0);
            const amount = Number(item.totalPrice ?? (item.quantity * rate));
            itemsToRender.push({
              index: idx + 1,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              rate,
              amount,
            });
          });
        } else if (invoiceItems.length > 0) {
          invoiceItems.forEach((item, idx) => {
            itemsToRender.push({
              index: idx + 1,
              name: item.description,
              quantity: item.quantity,
              rate: Number(item.rate),
              amount: Number(item.amount),
            });
          });
        } else {
          // Authoritative Booking total as single package line item
          const authoritativeTotal = Number(invoice.booking?.totalAmount ?? invoice.totalAmount ?? 0);
          itemsToRender.push({
            index: 1,
            name: tripTitle,
            description: "Complete Travel Package & Services",
            quantity: 1,
            rate: authoritativeTotal,
            amount: authoritativeTotal,
          });
        }

        const colNumW = 28;
        const colQtyW = 45;
        const colRateW = 95;
        const colAmtW = 100;
        const colDescW = contentWidth - (colNumW + colQtyW + colRateW + colAmtW);

        const drawTableHeader = (yPos: number) => {
          doc.rect(margin, yPos, contentWidth, 22).fill(brandPrimary);
          doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");

          doc.text("#", margin + 6, yPos + 6, { width: colNumW });
          doc.text("Description & Services", margin + colNumW + 6, yPos + 6, { width: colDescW });
          doc.text("Qty", margin + colNumW + colDescW, yPos + 6, { width: colQtyW, align: "center" });
          doc.text("Rate (₹)", margin + colNumW + colDescW + colQtyW, yPos + 6, { width: colRateW - 8, align: "right" });
          doc.text("Amount (₹)", margin + colNumW + colDescW + colQtyW + colRateW, yPos + 6, { width: colAmtW - 8, align: "right" });
        };

        checkPageBreak(50);
        drawTableHeader(currentY);
        currentY += 22;

        for (let i = 0; i < itemsToRender.length; i++) {
          const item = itemsToRender[i];
          const hasDesc = Boolean(item.description);

          // Calculate dynamic row height
          let rowHeight = 22;
          if (hasDesc) {
            doc.fontSize(7.5).font("Helvetica");
            const descHeight = doc.heightOfString(item.description!, { width: colDescW - 12 });
            rowHeight = Math.max(26, 16 + descHeight + 6);
          }

          if (checkPageBreak(rowHeight)) {
            currentY = margin;
            drawTableHeader(currentY);
            currentY += 22;
          }

          const bg = i % 2 === 0 ? "#FFFFFF" : bgLight;
          doc.rect(margin, currentY, contentWidth, rowHeight).fillAndStroke(bg, borderLight);

          doc.fillColor(textDark).fontSize(8.5).font("Helvetica");

          // Index
          doc.fillColor(textLight).fontSize(8).text(String(item.index), margin + 6, currentY + 6, { width: colNumW });

          // Item Name & Description
          doc.fillColor(brandPrimary).font("Helvetica-Bold").text(item.name, margin + colNumW + 6, currentY + 6, {
            width: colDescW - 12,
          });

          if (hasDesc) {
            doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(item.description!, margin + colNumW + 6, currentY + 18, {
              width: colDescW - 12,
              lineGap: 1,
            });
          }

          // Qty, Rate, Amount
          doc.fillColor(textDark).fontSize(8.5).font("Helvetica");
          doc.text(String(item.quantity), margin + colNumW + colDescW, currentY + 6, { width: colQtyW, align: "center" });
          doc.text(formatINR(item.rate), margin + colNumW + colDescW + colQtyW, currentY + 6, {
            width: colRateW - 8,
            align: "right",
          });
          doc.fillColor(brandPrimary).font("Helvetica-Bold").text(formatINR(item.amount), margin + colNumW + colDescW + colQtyW + colRateW, currentY + 6, {
            width: colAmtW - 8,
            align: "right",
          });

          currentY += rowHeight;
        }

        currentY += 12;

        // ═════════════════════════════════════════════════════════════════════
        // 4. FINANCIAL SUMMARY & TAX BREAKDOWN (DECISION #18 AUTHORITATIVE)
        // ═════════════════════════════════════════════════════════════════════
        const discountAmount = Number(invoice.discountAmount || 0);
        const totalAmount = Number(invoice.booking?.totalAmount ?? invoice.totalAmount ?? 0);
        const paidAmount = Number(invoice.booking?.paidAmount ?? invoice.paidAmount ?? 0);
        const balanceAmount = Number(invoice.booking?.balanceAmount ?? invoice.balanceAmount ?? 0);

        // Tax Snapshot Fields from Invoice (with fallback to booking)
        const rawTaxRate = invoice.taxRate ?? (invoice.booking as any)?.taxRate ?? null;
        const taxRate = rawTaxRate !== null ? Number(rawTaxRate) : 0;
        const taxMode = invoice.taxMode || (invoice.booking as any)?.taxMode || "EXCLUSIVE";
        const gstTreatment = invoice.gstTreatment || (invoice.booking as any)?.gstTreatment || "INTRA_STATE";
        
        const rawTaxable = invoice.taxableAmount ?? (invoice.booking as any)?.taxableAmount ?? null;
        const taxableAmount = rawTaxable !== null ? Number(rawTaxable) : Number(invoice.subtotal);
        
        const rawTaxAmt = invoice.taxAmount ?? (invoice.booking as any)?.taxAmount ?? null;
        const taxAmount = rawTaxAmt !== null ? Number(rawTaxAmt) : 0;
        
        const rawCgst = invoice.cgstAmount ?? (invoice.booking as any)?.cgstAmount ?? null;
        const cgstAmount = rawCgst !== null ? Number(rawCgst) : 0;
        
        const rawSgst = invoice.sgstAmount ?? (invoice.booking as any)?.sgstAmount ?? null;
        const sgstAmount = rawSgst !== null ? Number(rawSgst) : 0;
        
        const rawIgst = invoice.igstAmount ?? (invoice.booking as any)?.igstAmount ?? null;
        const igstAmount = rawIgst !== null ? Number(rawIgst) : 0;

        const summaryW = 240;
        const summaryX = margin + contentWidth - summaryW;
        
        let summaryH = 110;
        if (discountAmount > 0) summaryH += 15;
        if (gstTreatment === "INTRA_STATE" && taxAmount > 0) {
          summaryH += 30; // 2 lines: CGST and SGST
        } else if (gstTreatment === "INTER_STATE" && taxAmount > 0) {
          summaryH += 16; // 1 line: IGST
        } else if (gstTreatment === "NON_GST_EXEMPT" || taxRate === 0) {
          summaryH += 16; // 1 line: Exempt notice
        }
        if (taxMode === "INCLUSIVE") {
          summaryH += 14;
        }

        checkPageBreak(summaryH + 15);

        // Notes and Payment Instructions on the left
        const notesW = contentWidth - summaryW - 20;
        let leftNotesY = currentY;

        if (invoice.notes) {
          doc.fillColor(brandPrimary).fontSize(8).font("Helvetica-Bold").text("Invoice Notes:", margin, leftNotesY);
          leftNotesY += 11;
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(invoice.notes, margin, leftNotesY, {
            width: notesW,
            lineGap: 1.5,
          });
          leftNotesY += doc.heightOfString(invoice.notes, { width: notesW }) + 8;
        }

        if (invoice.paymentInstructions) {
          doc.fillColor(brandPrimary).fontSize(8).font("Helvetica-Bold").text("Payment Instructions:", margin, leftNotesY);
          leftNotesY += 11;
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(invoice.paymentInstructions, margin, leftNotesY, {
            width: notesW,
            lineGap: 1.5,
          });
          leftNotesY += doc.heightOfString(invoice.paymentInstructions, { width: notesW }) + 8;
        }

        // Summary Card Box on the Right
        doc.roundedRect(summaryX, currentY, summaryW, summaryH, 4).fillAndStroke(bgLight, borderLight);

        let sumLineY = currentY + 10;
        doc.fillColor(textMuted).fontSize(8.5).font("Helvetica");

        // Taxable Base / Base Amount
        doc.text("Taxable Base Amount:", summaryX + 12, sumLineY);
        doc.text(formatINR(taxableAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
        sumLineY += 15;

        // Discount
        if (discountAmount > 0) {
          const discLabel =
            invoice.discountType === "PERCENTAGE"
              ? `Discount (${Number(invoice.discountValue)}%):`
              : "Special Discount:";
          doc.text(discLabel, summaryX + 12, sumLineY);
          doc.text(`- ${formatINR(discountAmount)}`, summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 15;
        }

        // Itemized GST Breakdown
        if (gstTreatment === "NON_GST_EXEMPT" || taxRate === 0) {
          doc.text("GST (0% Exempt):", summaryX + 12, sumLineY);
          doc.text("₹0.00", summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 15;
        } else if (gstTreatment === "INTRA_STATE") {
          const halfRate = taxRate / 2;
          const modeTag = taxMode === "INCLUSIVE" ? " (Incl.)" : "";
          doc.text(`CGST (${halfRate}%)${modeTag}:`, summaryX + 12, sumLineY);
          doc.text(formatINR(cgstAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 15;

          doc.text(`SGST (${halfRate}%)${modeTag}:`, summaryX + 12, sumLineY);
          doc.text(formatINR(sgstAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 15;
        } else if (gstTreatment === "INTER_STATE") {
          const modeTag = taxMode === "INCLUSIVE" ? " (Incl.)" : "";
          doc.text(`IGST (${taxRate}%)${modeTag}:`, summaryX + 12, sumLineY);
          doc.text(formatINR(igstAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 15;
        }

        // Inclusive Note
        if (taxMode === "INCLUSIVE" && taxRate > 0) {
          doc.fillColor(brandAccent).fontSize(7.5).font("Helvetica-Oblique");
          doc.text(`* Total includes ${taxRate}% GST`, summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
          sumLineY += 13;
        }

        // Invoice Total
        doc.fillColor(brandPrimary).fontSize(9).font("Helvetica-Bold").text("Invoice Total:", summaryX + 12, sumLineY);
        doc.text(formatINR(totalAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
        sumLineY += 16;

        // Total Paid
        doc.fillColor(greenText).fontSize(8.5).font("Helvetica").text("Total Paid:", summaryX + 12, sumLineY);
        doc.text(formatINR(paidAmount), summaryX + 12, sumLineY, { width: summaryW - 24, align: "right" });
        sumLineY += 16;

        // Balance Due (Dark Highlighted Bar)
        doc.rect(summaryX, sumLineY - 2, summaryW, 24).fill(brandPrimary);
        doc.fillColor("#FFFFFF").fontSize(9.5).font("Helvetica-Bold");
        doc.text("Balance Due:", summaryX + 12, sumLineY + 4);
        doc.text(formatINR(balanceAmount), summaryX + 12, sumLineY + 4, { width: summaryW - 24, align: "right" });

        currentY = Math.max(leftNotesY, currentY + summaryH) + 16;

        // ═════════════════════════════════════════════════════════════════════
        // 5. PAYMENT HISTORY LEDGER (EXCLUDES VOIDED / ARCHIVED)
        // ═════════════════════════════════════════════════════════════════════
        const activePayments = (invoice.payments || []).filter(
          (p) => p.status !== "VOIDED" && !p.archivedAt
        );

        if (activePayments.length > 0) {
          checkPageBreak(50 + activePayments.length * 18);

          doc.fillColor(brandPrimary).fontSize(9.5).font("Helvetica-Bold").text("Payment History & Receipts", margin, currentY);
          currentY += 14;

          const pColDateW = 80;
          const pColNumW = 100;
          const pColMethodW = 85;
          const pColRefW = 120;
          const pColAmtW = contentWidth - (pColDateW + pColNumW + pColMethodW + pColRefW);

          doc.rect(margin, currentY, contentWidth, 20).fill("#F1F5F9");
          doc.fillColor(textMuted).fontSize(7.5).font("Helvetica-Bold");
          doc.text("Date", margin + 8, currentY + 6, { width: pColDateW });
          doc.text("Receipt / Payment #", margin + pColDateW + 8, currentY + 6, { width: pColNumW });
          doc.text("Method", margin + pColDateW + pColNumW + 8, currentY + 6, { width: pColMethodW });
          doc.text("Reference (Txn ID)", margin + pColDateW + pColNumW + pColMethodW + 8, currentY + 6, { width: pColRefW });
          doc.text("Amount (₹)", margin + pColDateW + pColNumW + pColMethodW + pColRefW, currentY + 6, { width: pColAmtW - 8, align: "right" });

          currentY += 20;

          for (let pi = 0; pi < activePayments.length; pi++) {
            const pay = activePayments[pi];
            if (checkPageBreak(20)) {
              currentY = margin;
            }

            const pBg = pi % 2 === 0 ? "#FFFFFF" : bgLight;
            doc.rect(margin, currentY, contentWidth, 18).fillAndStroke(pBg, borderLight);
            doc.fillColor(textDark).fontSize(8).font("Helvetica");

            const payNum = pay.receiptNumber || pay.paymentNumber || "—";
            doc.text(formatDate(pay.paymentDate), margin + 8, currentY + 5, { width: pColDateW });
            doc.text(payNum, margin + pColDateW + 8, currentY + 5, { width: pColNumW });
            doc.text(pay.paymentMethod || "UPI", margin + pColDateW + pColNumW + 8, currentY + 5, { width: pColMethodW });
            doc.text(pay.referenceNumber || "—", margin + pColDateW + pColNumW + 8, currentY + 5, { width: pColRefW });
            doc.fillColor(brandPrimary).font("Helvetica-Bold").text(formatINR(pay.amount), margin + pColDateW + pColNumW + pColMethodW + pColRefW, currentY + 5, {
              width: pColAmtW - 8,
              align: "right",
            });

            currentY += 18;
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // 6. GLOBAL WATERMARK & PAGE NUMBERING ON ALL PAGES
        // ═════════════════════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);

          // Watermark for Cancelled / Draft
          if (isDraft || isCancelled) {
            doc.save();
            doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
            doc.fontSize(isDraft ? 36 : 46).font("Helvetica-Bold");
            doc.fillColor(isCancelled ? "#EF4444" : "#94A3B8", 0.08);
            doc.text(
              isDraft ? "DRAFT — NOT AN ISSUED INVOICE" : "CANCELLED",
              margin,
              pageHeight / 2 - 20,
              { align: "center", width: contentWidth }
            );
            doc.restore();
          }

          // Global Footer
          const footerY = pageHeight - 32;

          doc.strokeColor(borderLight).lineWidth(0.5).moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke();

          // Left: Computer-generated notice
          doc
            .fillColor(textLight)
            .fontSize(7)
            .font("Helvetica")
            .text(
              `This is a computer-generated invoice from ${agencyName} • Powered by TripDesk`,
              margin,
              footerY + 6,
              { width: contentWidth - 85, ellipsis: true }
            );

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
      } catch (err) {
        reject(err);
      }
    });
  },
};
