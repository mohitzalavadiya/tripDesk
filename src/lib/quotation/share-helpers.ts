import {
openWhatsAppChat,
WhatsAppChatOpenResult,
} from "@/lib/communication/whatsapp/click-to-chat"
import { formatCurrency } from "@/lib/costing-engine"
import { PublicQuotation,Quotation } from "@/types"
import { toast } from "sonner"

export function getPublicQuotationUrl(shareToken: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/q/${shareToken}`
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourtraveldesk.in"
  return `${appUrl.replace(/\/$/, "")}/q/${shareToken}`
}

export function formatWhatsAppShareText(
  quotation: Quotation | PublicQuotation,
  customerName?: string
): string {
  const name =
    customerName ||
    ("customerSnapshot" in quotation
      ? quotation.customerSnapshot.name
      : quotation.customer.name)
  const title = quotation.title
  const subtitle = quotation.subtitle || ""
  const price = formatCurrency(quotation.sellingPrice, quotation.currency)
  const token = quotation.shareToken || quotation.quotationNumber
  const link = getPublicQuotationUrl(token)
  const agencyName =
    "agencySnapshot" in quotation
      ? quotation.agencySnapshot.name
      : quotation.agency.name

  return `Hello ${name}! ✨\n\nYour customized holiday quotation from *${agencyName}* is ready:\n\n🌴 *${title}*\n📅 ${subtitle}\n💰 *Package Price:* ${price} (All-Inclusive)\n\n👉 *View complete itinerary, hotels & details here:*\n${link}\n\nFeel free to reach out if you would like any modifications. Looking forward to hosting you!`
}

export function openWhatsAppShare(
  quotation: Quotation | PublicQuotation,
  phone?: string,
  customerName?: string
): WhatsAppChatOpenResult {
  const text = formatWhatsAppShareText(quotation, customerName)

  if (phone && phone.trim()) {
    return openWhatsAppChat(phone, text)
  }

  // If no specific phone is provided, open generic WhatsApp share
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
  if (typeof window !== "undefined") {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }
  return {
    success: true,
    url: whatsappUrl,
  }
}

export async function copyQuotationLink(shareToken: string) {
  const url = getPublicQuotationUrl(shareToken)
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Public quotation link copied to clipboard.")
      return true
    } catch (e) {
      console.error(e)
    }
  }
  toast.info(`Quotation link: ${url}`)
  return false
}

export async function shareQuotationNative(
  quotation: Quotation | PublicQuotation
): Promise<boolean> {
  const url = getPublicQuotationUrl(quotation.shareToken || "")
  const title = quotation.title

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `${title} | Quotation`,
        text: `Check out our customized travel quotation for ${title}:`,
        url,
      })
      toast.success("Shared successfully.")
      return true
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err)
      }
    }
  }

  // Fallback to clipboard
  return copyQuotationLink(quotation.shareToken || "")
}
