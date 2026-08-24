import { Quotation, PublicQuotation } from "@/types"
import { toast } from "sonner"

export function exportQuotationPDF(quotation: Quotation | PublicQuotation) {
  if (typeof window === "undefined") return

  try {
    toast.info("Preparing quotation PDF preview for export...")
    // Trigger native high-quality PDF print dialog
    setTimeout(() => {
      window.print()
    }, 250)
  } catch (error) {
    console.error("PDF generation failed", error)
    toast.error("Unable to generate quotation PDF. Please try again.")
  }
}

export function sanitizeFileName(title: string, quotationNumber: string): string {
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  const cleanNum = quotationNumber.replace(/[^a-zA-Z0-9-_]/g, "")
  return `Quotation-${cleanTitle}-${cleanNum}.pdf`
}
