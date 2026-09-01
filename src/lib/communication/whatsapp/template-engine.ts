import { CustomerNotificationType } from "@prisma/client";
import { WhatsAppRenderOutput } from "../types";

export interface WhatsAppTemplateVariables {
  customerName: string;
  agencyName: string;
  agencyPhone?: string | null;
  destination?: string | null;
  quotationNumber?: string | null;
  quotationUrl?: string | null;
  bookingNumber?: string | null;
  travelDates?: string | null;
  amountDue?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  receiptRef?: string | null;
  departureDate?: string | null;
  feedbackUrl?: string | null;
  customMessage?: string | null;
}

export class WhatsAppTemplateEngine {
  /**
   * Renders compliant WhatsApp template payload and text representation
   */
  static render(
    type: CustomerNotificationType,
    vars: WhatsAppTemplateVariables
  ): WhatsAppRenderOutput {
    const customer = vars.customerName || "Traveler";
    const agency = vars.agencyName || "TripDesk";
    const currency = vars.currency || "₹";

    switch (type) {
      case CustomerNotificationType.ENQUIRY_CREATED:
        return {
          templateName: "tripdesk_enquiry_received",
          text: `Namaste ${customer}! 👋\n\nThank you for reaching out to *${agency}*${vars.destination ? ` for your trip to *${vars.destination}*` : ""}.\n\nOur travel designer is curating a personalized proposal for you. We will share your custom itinerary shortly.`,
          parameters: {
            customerName: customer,
            destination: vars.destination || "your destination",
            agencyName: agency,
          },
        };

      case CustomerNotificationType.QUOTATION_SENT:
        return {
          templateName: "tripdesk_quotation_proposal",
          text: `Hello ${customer}! 🌴\n\nYour custom travel proposal *${vars.quotationNumber || ""}* from *${agency}* is ready!\n\n${vars.quotationUrl ? `👉 View Proposal & Options: ${vars.quotationUrl}\n\n` : ""}Let us know your thoughts or if you would like any customizations.`,
          parameters: {
            customerName: customer,
            quotationNumber: vars.quotationNumber || "Proposal",
            quotationUrl: vars.quotationUrl || "",
            agencyName: agency,
          },
        };

      case CustomerNotificationType.BOOKING_CONFIRMED:
      case CustomerNotificationType.TRIP_CONFIRMED:
        return {
          templateName: "tripdesk_booking_confirmed",
          text: `🎉 Congratulations ${customer}!\n\nYour travel booking *#${vars.bookingNumber || ""}* with *${agency}* is CONFIRMED.\n\n📅 Travel Dates: ${vars.travelDates || "Upcoming"}\n📍 Destination: ${vars.destination || "As selected"}\n\nOur team is preparing your complete travel kit and vouchers.`,
          parameters: {
            customerName: customer,
            bookingNumber: vars.bookingNumber || "N/A",
            travelDates: vars.travelDates || "Upcoming",
            agencyName: agency,
          },
        };

      case CustomerNotificationType.PAYMENT_DUE:
        return {
          templateName: "tripdesk_payment_reminder",
          text: `Dear ${customer}, ⏳\n\nThis is a friendly reminder for your upcoming payment milestone on booking *#${vars.bookingNumber || ""}*.\n\n💰 *Amount Due:* ${currency}${vars.amountDue || "0"}\n🗓 *Due Date:* ${vars.dueDate || "Upcoming"}\n\nPlease reach out to *${agency}* to complete your payment.`,
          parameters: {
            customerName: customer,
            bookingNumber: vars.bookingNumber || "",
            amountDue: `${currency}${vars.amountDue || "0"}`,
            dueDate: vars.dueDate || "Immediate",
            agencyName: agency,
          },
        };

      case CustomerNotificationType.PAYMENT_RECEIVED:
        return {
          templateName: "tripdesk_payment_receipt",
          text: `Dear ${customer}, ✅\n\nWe have received your payment of *${currency}${vars.amountDue || ""}* for booking *#${vars.bookingNumber || ""}*.\n\nReceipt Reference: ${vars.receiptRef || "Confirmed"}.\nThank you for choosing *${agency}*!`,
          parameters: {
            customerName: customer,
            amount: `${currency}${vars.amountDue || ""}`,
            bookingNumber: vars.bookingNumber || "",
            receiptRef: vars.receiptRef || "Confirmed",
            agencyName: agency,
          },
        };

      case CustomerNotificationType.TRIP_UPCOMING:
      case CustomerNotificationType.TRIP_DEPARTING:
        return {
          templateName: "tripdesk_trip_reminder",
          text: `Dear ${customer}, ✈️\n\nGet ready! Your journey${vars.destination ? ` to *${vars.destination}*` : ""} commences on *${vars.departureDate || "soon"}*.\n\nFor 24x7 travel assistance, reach us at ${vars.agencyPhone || agency}.\n\nWishing you a wonderful vacation! 🌟`,
          parameters: {
            customerName: customer,
            destination: vars.destination || "your destination",
            departureDate: vars.departureDate || "soon",
            agencyPhone: vars.agencyPhone || agency,
          },
        };

      case CustomerNotificationType.TRIP_COMPLETED:
      case CustomerNotificationType.FEEDBACK_REQUEST:
      case CustomerNotificationType.REVIEW_REQUEST:
        return {
          templateName: "tripdesk_feedback_request",
          text: `Welcome Home ${customer}! 🏡\n\nWe hope you had an extraordinary vacation with *${agency}*.\n\n${vars.feedbackUrl ? `⭐ Please take a moment to rate your experience: ${vars.feedbackUrl}\n\n` : ""}Thank you for trusting us with your travel plans!`,
          parameters: {
            customerName: customer,
            agencyName: agency,
            feedbackUrl: vars.feedbackUrl || "",
          },
        };

      default:
        return {
          text: `Hello ${customer},\n\n${vars.customMessage || "You have an update regarding your travel booking from " + agency + "."}`,
          parameters: {
            customerName: customer,
            message: vars.customMessage || "",
          },
        };
    }
  }
}
