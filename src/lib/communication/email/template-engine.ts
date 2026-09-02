import { CustomerNotificationType } from "@prisma/client";
import { EmailRenderOutput } from "../types";

export interface EmailTemplateVariables {
  customerName: string;
  agencyName: string;
  agencyEmail?: string | null;
  agencyPhone?: string | null;
  destination?: string | null;
  tripName?: string | null;
  quotationNumber?: string | null;
  quotationUrl?: string | null;
  quotationValidity?: string | null;
  quotationTotal?: string | null;
  bookingNumber?: string | null;
  bookingStatus?: string | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  amountDue?: string | null;
  dueDate?: string | null;
  currency?: string | null;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  feedbackUrl?: string | null;
  customMessage?: string | null;
}

export class EmailTemplateEngine {
  /**
   * Renders subject, HTML, and text versions of email templates based on notification event type
   */
  static render(
    type: CustomerNotificationType,
    vars: EmailTemplateVariables
  ): EmailRenderOutput {
    const agencyName = vars.agencyName || "TripDesk Travel Specialist";
    const customerName = vars.customerName || "Valued Traveler";
    const brandColor = "#4f46e5"; // Indigo 600

    let subject = "";
    let bodyContentHtml = "";
    let bodyContentText = "";

    switch (type) {
      case CustomerNotificationType.ENQUIRY_CREATED:
        subject = `Thank you for your travel inquiry with ${agencyName}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">We have received your trip inquiry!</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            Thank you for reaching out to <strong>${agencyName}</strong>${vars.destination ? ` regarding your upcoming journey to <strong>${vars.destination}</strong>` : ""}.
          </p>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 20px 0;">
            Our dedicated travel designer is currently reviewing your preferences and crafting a tailored itinerary. We will be in touch shortly with custom proposals and recommendations.
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\nThank you for reaching out to ${agencyName}${vars.destination ? ` regarding your trip to ${vars.destination}` : ""}. Our travel designer is crafting your custom proposal and will contact you shortly.`;
        break;

      case CustomerNotificationType.QUOTATION_SENT:
        subject = `Your Custom Travel Proposal: ${vars.quotationNumber || "Trip Proposal"} from ${agencyName}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Your tailored travel proposal is ready!</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            We are delighted to share your personalized itinerary proposal <strong>${vars.quotationNumber || ""}</strong>${vars.destination ? ` for <strong>${vars.destination}</strong>` : ""}.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            ${vars.quotationTotal ? `<p style="font-size: 16px; margin: 0 0 8px 0; color: #1e293b;"><strong>Total Package Investment:</strong> ${vars.currency || "₹"}${vars.quotationTotal}</p>` : ""}
            ${vars.quotationValidity ? `<p style="font-size: 14px; margin: 0; color: #64748b;"><strong>Valid Until:</strong> ${vars.quotationValidity}</p>` : ""}
          </div>
          ${vars.quotationUrl ? `
            <div style="text-align: center; margin: 28px 0;">
              <a href="${vars.quotationUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                View Interactive Proposal & Select Options
              </a>
            </div>
          ` : ""}
        `;
        bodyContentText = `Dear ${customerName},\n\nYour travel proposal ${vars.quotationNumber || ""} is ready.${vars.quotationTotal ? ` Total Investment: ${vars.currency || "₹"}${vars.quotationTotal}.` : ""}\nView your proposal online: ${vars.quotationUrl || "Contact your advisor"}`;
        break;

      case CustomerNotificationType.BOOKING_CONFIRMED:
      case CustomerNotificationType.TRIP_CONFIRMED:
        subject = `Booking Confirmed: ${vars.bookingNumber || "Your Travel Reservation"} — ${agencyName}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Your travel reservation is confirmed!</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            Pack your bags! Your booking <strong>#${vars.bookingNumber || ""}</strong>${vars.destination ? ` to <strong>${vars.destination}</strong>` : ""} is officially confirmed.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 15px; margin: 0 0 8px 0; color: #166534;"><strong>Booking Status:</strong> CONFIRMED</p>
            ${vars.travelStartDate ? `<p style="font-size: 14px; margin: 0 0 4px 0; color: #15803d;"><strong>Travel Start Date:</strong> ${vars.travelStartDate}</p>` : ""}
            ${vars.travelEndDate ? `<p style="font-size: 14px; margin: 0; color: #15803d;"><strong>Travel End Date:</strong> ${vars.travelEndDate}</p>` : ""}
          </div>
          <p style="font-size: 14px; line-height: 22px; color: #64748b; margin: 16px 0 0 0;">
            Our operations team is finalizing all hotel vouchers, private transfers, and excursions.
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\nYour travel booking #${vars.bookingNumber || ""} is confirmed!\nDates: ${vars.travelStartDate || "Upcoming"} to ${vars.travelEndDate || ""}.\nThank you for traveling with ${agencyName}.`;
        break;

      case CustomerNotificationType.PAYMENT_DUE:
        subject = `Payment Reminder: Upcoming Milestone for Booking ${vars.bookingNumber || ""}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Payment Milestone Notice</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            This is a friendly reminder regarding the upcoming payment milestone for booking <strong>#${vars.bookingNumber || ""}</strong>.
          </p>
          <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 16px; margin: 0 0 8px 0; color: #854d0e;"><strong>Amount Due:</strong> ${vars.currency || "₹"}${vars.amountDue || "0"}</p>
            ${vars.dueDate ? `<p style="font-size: 14px; margin: 0; color: #a16207;"><strong>Due Date:</strong> ${vars.dueDate}</p>` : ""}
          </div>
          <p style="font-size: 14px; line-height: 22px; color: #64748b;">
            Please coordinate with your travel advisor at <strong>${vars.agencyEmail || agencyName}</strong> to complete this payment.
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\nPayment reminder for booking #${vars.bookingNumber || ""}.\nAmount Due: ${vars.currency || "₹"}${vars.amountDue || "0"}\nDue Date: ${vars.dueDate || "Immediate"}\nContact: ${vars.agencyEmail || agencyName}`;
        break;

      case CustomerNotificationType.PAYMENT_RECEIVED:
        subject = `Payment Confirmation: ${vars.currency || "₹"}${vars.amountDue || ""} Received — ${agencyName}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Payment Receipt Acknowledged</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            We have successfully received your payment of <strong>${vars.currency || "₹"}${vars.amountDue || ""}</strong> for booking <strong>#${vars.bookingNumber || ""}</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            ${vars.receiptNumber ? `<p style="font-size: 14px; margin: 0 0 6px 0; color: #475569;"><strong>Receipt / Transaction Ref:</strong> ${vars.receiptNumber}</p>` : ""}
            ${vars.paymentMethod ? `<p style="font-size: 14px; margin: 0; color: #475569;"><strong>Payment Mode:</strong> ${vars.paymentMethod}</p>` : ""}
          </div>
          <p style="font-size: 14px; line-height: 22px; color: #64748b;">
            Thank you for keeping your account up to date.
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\nWe have received your payment of ${vars.currency || "₹"}${vars.amountDue || ""} for booking #${vars.bookingNumber || ""}.\nReceipt Ref: ${vars.receiptNumber || "Confirmed"}.\nThank you!`;
        break;

      case CustomerNotificationType.TRIP_UPCOMING:
      case CustomerNotificationType.TRIP_DEPARTING:
        subject = `Get Ready! Your Trip to ${vars.destination || "Your Destination"} Departs Soon`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Your upcoming adventure awaits!</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            Your trip${vars.destination ? ` to <strong>${vars.destination}</strong>` : ""} commences on <strong>${vars.travelStartDate || "soon"}</strong>.
          </p>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 14px; margin: 0 0 6px 0; color: #1e40af;"><strong>Emergency & On-Tour Support:</strong> ${vars.agencyPhone || vars.agencyEmail || agencyName}</p>
            <p style="font-size: 14px; margin: 0; color: #1e40af;"><strong>Booking Reference:</strong> #${vars.bookingNumber || "N/A"}</p>
          </div>
          <p style="font-size: 14px; line-height: 22px; color: #64748b;">
            Please ensure you have all valid identification documents and travel vouchers ready. Have a memorable journey!
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\nYour trip to ${vars.destination || "your destination"} begins on ${vars.travelStartDate || "soon"}!\nSupport: ${vars.agencyPhone || vars.agencyEmail || agencyName}.\nWishing you a safe and memorable journey!`;
        break;

      case CustomerNotificationType.TRIP_COMPLETED:
      case CustomerNotificationType.FEEDBACK_REQUEST:
      case CustomerNotificationType.REVIEW_REQUEST:
        subject = `Welcome Home! How was your trip with ${agencyName}?`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Welcome home! We would love your feedback.</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            We hope you had an unforgettable experience${vars.destination ? ` visiting <strong>${vars.destination}</strong>` : ""}.
          </p>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 20px 0;">
            Your feedback helps us continually elevate our services and create even better journeys. Please take 2 minutes to share your experience with us.
          </p>
          ${vars.feedbackUrl ? `
            <div style="text-align: center; margin: 28px 0;">
              <a href="${vars.feedbackUrl}" style="background-color: ${brandColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
                Share Trip Feedback
              </a>
            </div>
          ` : ""}
        `;
        bodyContentText = `Dear ${customerName},\n\nWelcome home! We hope you had a wonderful journey${vars.destination ? ` to ${vars.destination}` : ""}.\nPlease take a moment to share your feedback with ${agencyName}.${vars.feedbackUrl ? `\nReview Link: ${vars.feedbackUrl}` : ""}`;
        break;

      default:
        subject = vars.customMessage ? vars.customMessage.substring(0, 50) : `Notification from ${agencyName}`;
        bodyContentHtml = `
          <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;">Message from ${agencyName}</h2>
          <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 16px 0;">
            Dear <strong>${customerName}</strong>,<br/>
            ${vars.customMessage || "You have an update regarding your travel reservation."}
          </p>
        `;
        bodyContentText = `Dear ${customerName},\n\n${vars.customMessage || `You have an update from ${agencyName}.`}`;
        break;
    }

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${agencyName}</h1>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${bodyContentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0 0 6px 0;">
                ${agencyName} ${vars.agencyPhone ? `• ${vars.agencyPhone}` : ""} ${vars.agencyEmail ? `• ${vars.agencyEmail}` : ""}
              </p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                Delivered via TripDesk Travel Agency Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return {
      subject,
      html: fullHtml,
      text: bodyContentText,
    };
  }
}
