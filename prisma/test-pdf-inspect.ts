import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { formatCurrency } from "../src/lib/costing-engine";

async function testPdf() {
  const buf = await quotationPdfService.generateQuotationPdf({
    quotationNumber: "QT-TEST-001",
    version: 1,
    title: "Test Proposal",
    currency: "INR",
    finalAmount: 75000,
    customer: { name: "Test Traveler" },
  });
  console.log("PDF buffer size:", buf.length);
  const text = buf.toString("latin1");
  console.log("Includes 75,000:", text.includes("75,000"));
  
  // Search for stream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let streamCount = 0;
  while ((match = streamRegex.exec(text)) !== null) {
    streamCount++;
    console.log(`Stream ${streamCount}:`, match[1]);
  }
}

testPdf();
