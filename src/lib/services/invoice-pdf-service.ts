import "server-only";
import PDFDocument from "pdfkit";
import { InvoiceWithDetails } from "./invoice-service";

export const invoicePdfService = {
  /**
   * Generates a high-quality PDF buffer for an Invoice
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
            Author: (invoice.agencySnapshot as any)?.name || invoice.agency?.name || "TripDesk",
            Subject: `Travel Invoice for Booking ${invoice.booking?.bookingNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err) => reject(err));

        const margin = 40;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const contentWidth = pageWidth - margin * 2;
        const brandPrimary = "#0F172A"; // Slate 900
        const brandAccent = "#2563EB"; // Blue 600

        // Background / Watermark check
        const isDraft = invoice.status === "DRAFT";
        const isCancelled = invoice.status === "CANCELLED";

        function drawWatermark() {
          if (isDraft || isCancelled) {
            doc.save();
            doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
            doc.fontSize(isDraft ? 36 : 48).font("Helvetica-Bold");
            doc.fillColor(isCancelled ? "#EF4444" : "#94A3B8", 0.12);
            doc.text(
              isDraft ? "DRAFT — NOT AN ISSUED INVOICE" : "CANCELLED",
              margin,
              pageHeight / 2 - 20,
              { align: "center", width: contentWidth }
            );
            doc.restore();
          }
        }

        drawWatermark();

        let y = margin;

        // ══════════════════════════════════════════════════
        // 1. HEADER & BRANDING
        // ══════════════════════════════════════════════════
        const agencySnap = (invoice.agencySnapshot as any) || invoice.agency || {};
        const agencyName = agencySnap.name || "Travel Agency";
        const agencyEmail = agencySnap.email || "";
        const agencyPhone = agencySnap.phone || "";
        const agencyAddress = agencySnap.address || "";

        doc.fillColor(brandPrimary).fontSize(20).font("Helvetica-Bold").text(agencyName, margin, y);
        y += 24;

        doc.fillColor("#64748B").fontSize(8.5).font("Helvetica");
        if (agencyAddress) {
          doc.text(agencyAddress, margin, y, { width: 280 });
          y += doc.heightOfString(agencyAddress, { width: 280 }) + 2;
        }
        const contactLine = [agencyPhone, agencyEmail].filter(Boolean).join(" • ");
        if (contactLine) {
          doc.text(contactLine, margin, y, { width: 280 });
          y += 12;
        }

        // Invoice Header Title (Right Aligned)
        const headerTitleY = margin;
        const headerTitle = isDraft ? "DRAFT INVOICE" : isCancelled ? "CANCELLED INVOICE" : "INVOICE";
        const titleColor = isCancelled ? "#DC2626" : isDraft ? "#64748B" : brandAccent;

        doc.fillColor(titleColor).fontSize(22).font("Helvetica-Bold").text(headerTitle, margin, headerTitleY, {
          align: "right",
          width: contentWidth,
        });

        // Invoice Number & Status
        const invNumberText = invoice.invoiceNumber ? invoice.invoiceNumber : "DRAFT (Unissued)";
        doc.fillColor(brandPrimary).fontSize(11).font("Helvetica-Bold").text(invNumberText, margin, headerTitleY + 26, {
          align: "right",
          width: contentWidth,
        });

        doc.fillColor("#64748B").fontSize(9).font("Helvetica").text(
          `Status: ${invoice.status.replace("_", " ")}`,
          margin,
          headerTitleY + 40,
          { align: "right", width: contentWidth }
        );

        y = Math.max(y, margin + 60) + 15;

        // Divider
        doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
        y += 15;

        // ══════════════════════════════════════════════════
        // 2. BILL TO & INVOICE / TRIP DETAILS
        // ══════════════════════════════════════════════════
        const cardHeight = 85;
        const colWidth = (contentWidth - 15) / 2;

        // Bill To Card
        doc.rect(margin, y, colWidth, cardHeight).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("BILLED TO", margin + 12, y + 10);

        const custSnap = (invoice.customerSnapshot as any) || {};
        const custName = custSnap.name || "Customer";
        const custPhone = custSnap.phone || "";
        const custEmail = custSnap.email || "";
        const custAddress = [custSnap.address, custSnap.city, custSnap.state, custSnap.postalCode]
          .filter(Boolean)
          .join(", ");

        doc.fillColor(brandPrimary).fontSize(10.5).font("Helvetica-Bold").text(custName, margin + 12, y + 23);
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica");
        let custY = y + 37;
        if (custPhone || custEmail) {
          doc.text([custPhone, custEmail].filter(Boolean).join(" • "), margin + 12, custY);
          custY += 12;
        }
        if (custAddress) {
          doc.text(custAddress, margin + 12, custY, { width: colWidth - 24, height: 26 });
        }

        // Invoice & Booking Details Card (Right Column)
        const rightColX = margin + colWidth + 15;
        doc.rect(rightColX, y, colWidth, cardHeight).fillAndStroke("#F8FAFC", "#E2E8F0");
        doc.fillColor("#64748B").fontSize(8).font("Helvetica-Bold").text("INVOICE & TRIP REFERENCE", rightColX + 12, y + 10);

        const formatDate = (d?: Date | string | null) => {
          if (!d) return "—";
          return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        };

        const bookingSnap = (invoice.bookingSnapshot as any) || {};
        const bookingNum = bookingSnap.bookingNumber || invoice.booking?.bookingNumber || "—";
        const tripTitle = bookingSnap.tripTitle || "Travel Package";

        let rightY = y + 23;
        doc.fillColor("#475569").fontSize(8.5).font("Helvetica");
        doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, rightColX + 12, rightY);
        rightY += 13;
        doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, rightColX + 12, rightY);
        rightY += 13;
        doc.text(`Booking Ref: ${bookingNum}`, rightColX + 12, rightY);
        rightY += 13;
        doc.text(`Trip: ${tripTitle}`, rightColX + 12, rightY, { width: colWidth - 24 });

        y += cardHeight + 20;

        // ══════════════════════════════════════════════════
        // 3. LINE ITEMS TABLE
        // ══════════════════════════════════════════════════
        const tableTop = y;
        const colNumW = 30;
        const colQtyW = 50;
        const colRateW = 90;
        const colAmtW = 95;
        const colDescW = contentWidth - (colNumW + colQtyW + colRateW + colAmtW);

        // Header
        doc.rect(margin, tableTop, contentWidth, 24).fill("#0F172A");
        doc.fillColor("#FFFFFF").fontSize(8.5).font("Helvetica-Bold");

        doc.text("#", margin + 8, tableTop + 7, { width: colNumW });
        doc.text("Description", margin + colNumW + 8, tableTop + 7, { width: colDescW });
        doc.text("Qty", margin + colNumW + colDescW, tableTop + 7, { width: colQtyW, align: "center" });
        doc.text("Rate (₹)", margin + colNumW + colDescW + colQtyW, tableTop + 7, { width: colRateW - 10, align: "right" });
        doc.text("Amount (₹)", margin + colNumW + colDescW + colQtyW + colRateW, tableTop + 7, { width: colAmtW - 10, align: "right" });

        y = tableTop + 24;

        const formatINR = (val: number | string | any) => {
          const num = Number(val) || 0;
          return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        let rowIndex = 0;
        for (const item of invoice.items) {
          const rowHeight = 22;
          const bg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

          doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke(bg, "#E2E8F0");
          doc.fillColor("#334155").fontSize(8.5).font("Helvetica");

          doc.text(String(rowIndex + 1), margin + 8, y + 6, { width: colNumW });
          doc.text(item.description, margin + colNumW + 8, y + 6, { width: colDescW - 12 });
          doc.text(String(item.quantity), margin + colNumW + colDescW, y + 6, { width: colQtyW, align: "center" });
          doc.text(formatINR(item.rate), margin + colNumW + colDescW + colQtyW, y + 6, { width: colRateW - 10, align: "right" });
          doc.text(formatINR(item.amount), margin + colNumW + colDescW + colQtyW + colRateW, y + 6, { width: colAmtW - 10, align: "right" });

          y += rowHeight;
          rowIndex++;
        }

        y += 10;

        // ══════════════════════════════════════════════════
        // 4. FINANCIAL SUMMARY (RIGHT ALIGNED CARD)
        // ══════════════════════════════════════════════════
        const summaryW = 230;
        const summaryX = margin + contentWidth - summaryW;
        const subtotal = Number(invoice.subtotal);
        const discountAmount = Number(invoice.discountAmount || 0);
        const totalAmount = Number(invoice.totalAmount);
        const paidAmount = Number(invoice.paidAmount || 0);
        const balanceAmount = Number(invoice.balanceAmount || 0);

        let summaryH = 100;
        if (discountAmount > 0) summaryH += 18;

        doc.rect(summaryX, y, summaryW, summaryH).fillAndStroke("#F8FAFC", "#E2E8F0");

        let sumY = y + 10;
        doc.fillColor("#475569").fontSize(9).font("Helvetica");

        // Subtotal
        doc.text("Subtotal:", summaryX + 12, sumY);
        doc.text(formatINR(subtotal), summaryX + 12, sumY, { width: summaryW - 24, align: "right" });
        sumY += 16;

        // Discount
        if (discountAmount > 0) {
          const discLabel =
            invoice.discountType === "PERCENTAGE"
              ? `Discount (${Number(invoice.discountValue)}%):`
              : "Discount:";
          doc.text(discLabel, summaryX + 12, sumY);
          doc.text(`- ${formatINR(discountAmount)}`, summaryX + 12, sumY, { width: summaryW - 24, align: "right" });
          sumY += 16;
        }

        // Total
        doc.fillColor(brandPrimary).font("Helvetica-Bold").text("Invoice Total:", summaryX + 12, sumY);
        doc.text(formatINR(totalAmount), summaryX + 12, sumY, { width: summaryW - 24, align: "right" });
        sumY += 18;

        // Total Paid
        doc.fillColor("#16A34A").font("Helvetica").text("Total Paid:", summaryX + 12, sumY);
        doc.text(formatINR(paidAmount), summaryX + 12, sumY, { width: summaryW - 24, align: "right" });
        sumY += 18;

        // Balance Due
        doc.rect(summaryX, sumY - 2, summaryW, 24).fill("#0F172A");
        doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold");
        doc.text("Balance Due:", summaryX + 12, sumY + 4);
        doc.text(formatINR(balanceAmount), summaryX + 12, sumY + 4, { width: summaryW - 24, align: "right" });

        // Left side: Payment Instructions & Notes
        const notesW = contentWidth - summaryW - 20;
        let noteY = y;

        if (invoice.notes) {
          doc.fillColor("#475569").fontSize(8.5).font("Helvetica-Bold").text("Invoice Notes:", margin, noteY);
          noteY += 12;
          doc.fillColor("#64748B").fontSize(8).font("Helvetica").text(invoice.notes, margin, noteY, { width: notesW });
          noteY += doc.heightOfString(invoice.notes, { width: notesW }) + 10;
        }

        if (invoice.paymentInstructions) {
          doc.fillColor("#475569").fontSize(8.5).font("Helvetica-Bold").text("Payment Instructions:", margin, noteY);
          noteY += 12;
          doc.fillColor("#64748B").fontSize(8).font("Helvetica").text(invoice.paymentInstructions, margin, noteY, { width: notesW });
          noteY += doc.heightOfString(invoice.paymentInstructions, { width: notesW }) + 10;
        }

        y += summaryH + 20;

        // ══════════════════════════════════════════════════
        // 5. ACTIVE PAYMENT HISTORY TABLE (Excludes VOIDED)
        // ══════════════════════════════════════════════════
        const activePayments = (invoice.payments || []).filter((p) => p.status !== "VOIDED" && !p.archivedAt);

        if (activePayments.length > 0) {
          doc.fillColor(brandPrimary).fontSize(10).font("Helvetica-Bold").text("Payment History", margin, y);
          y += 14;

          const pColDateW = 90;
          const pColNumW = 110;
          const pColMethodW = 90;
          const pColRefW = 120;
          const pColAmtW = contentWidth - (pColDateW + pColNumW + pColMethodW + pColRefW);

          doc.rect(margin, y, contentWidth, 20).fill("#F1F5F9");
          doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold");
          doc.text("Date", margin + 8, y + 6, { width: pColDateW });
          doc.text("Payment #", margin + pColDateW + 8, y + 6, { width: pColNumW });
          doc.text("Method", margin + pColDateW + pColNumW + 8, y + 6, { width: pColMethodW });
          doc.text("Reference", margin + pColDateW + pColNumW + pColMethodW + 8, y + 6, { width: pColRefW });
          doc.text("Amount (₹)", margin + pColDateW + pColNumW + pColMethodW + pColRefW, y + 6, { width: pColAmtW - 10, align: "right" });

          y += 20;

          for (const pay of activePayments) {
            doc.rect(margin, y, contentWidth, 18).fillAndStroke("#FFFFFF", "#E2E8F0");
            doc.fillColor("#334155").fontSize(8).font("Helvetica");

            doc.text(formatDate(pay.paymentDate), margin + 8, y + 5, { width: pColDateW });
            doc.text(pay.paymentNumber || "—", margin + pColDateW + 8, y + 5, { width: pColNumW });
            doc.text(pay.paymentMethod || "UPI", margin + pColDateW + pColNumW + 8, y + 5, { width: pColMethodW });
            doc.text(pay.referenceNumber || "—", margin + pColDateW + pColNumW + pColMethodW + 8, y + 5, { width: pColRefW });
            doc.text(formatINR(pay.amount), margin + pColDateW + pColNumW + pColMethodW + pColRefW, y + 5, { width: pColAmtW - 10, align: "right" });

            y += 18;
          }
        }

        // ══════════════════════════════════════════════════
        // 6. FOOTER
        // ══════════════════════════════════════════════════
        doc
          .fontSize(7.5)
          .font("Helvetica")
          .fillColor("#94A3B8")
          .text(
            `This is a computer-generated invoice from ${agencyName} • Powered by TripDesk`,
            margin,
            pageHeight - 35,
            { align: "center", width: contentWidth }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },
};
