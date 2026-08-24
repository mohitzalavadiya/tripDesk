import { Booking, PublicBookingView } from "@/types";
import { formatCurrency } from "@/lib/costing-engine";

/**
 * Triggers standard browser print dialog for vouchers and receipts
 */
export function triggerDocumentPrint() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

/**
 * Generates WhatsApp Payment Reminder Message
 */
export function generatePaymentReminderMessage(
  booking: Booking,
  agencyPhone?: string
): string {
  const customerName = booking.customerSnapshot.name;
  const destination = booking.destination;
  const bookingNumber = booking.bookingNumber;
  const pendingAmount = formatCurrency(booking.pendingAmount);

  return `Hi ${customerName},

This is a gentle payment reminder regarding your confirmed ${destination} holiday booking (*${bookingNumber}*).

*Remaining Payment:* ${pendingAmount}
*Travel Window:* ${booking.startDate} to ${booking.endDate}

Please feel free to reach out to us at ${agencyPhone || "+91 98470 12345"} or reply here to complete the transaction.

Thank you,
*${booking.agencySnapshot?.name || "TripDesk Holidays"}*`;
}

/**
 * Generates WhatsApp Booking Confirmation Share Message
 */
export function generateBookingShareMessage(
  booking: Booking | PublicBookingView,
  origin: string
): string {
  const portalUrl = `${origin}/trip/${booking.secureToken}`;
  const customerName =
    "customer" in booking
      ? booking.customer?.name
      : (booking as Booking).customerSnapshot?.name;
  const destination = booking.destination;
  const bookingNumber = booking.bookingNumber;
  const agencyName =
    "agency" in booking
      ? booking.agency?.name
      : (booking as Booking).agencySnapshot?.name || "TripDesk Holidays";

  return `🎉 *Your Trip Booking is Confirmed!*

Dear ${customerName},
Your booking for *${destination}* has been processed.

*Booking ID:* ${bookingNumber}
*Dates:* ${booking.startDate} to ${booking.endDate}
*Guests:* ${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ""}

📱 *View your live itinerary, hotel vouchers & confirmation here:*
${portalUrl}

Warm regards,
*${agencyName}*`;
}
