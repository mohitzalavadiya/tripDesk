import { z } from "zod";
import { NotificationChannel, CustomerNotificationType, NotificationDeliveryStatus } from "@prisma/client";

export const listCommunicationLogsSchema = z.object({
  channel: z.nativeEnum(NotificationChannel).optional(),
  status: z.nativeEnum(NotificationDeliveryStatus).optional(),
  type: z.nativeEnum(CustomerNotificationType).optional(),
  customerId: z.string().optional(),
  bookingId: z.string().optional(),
  quotationId: z.string().optional(),
  tripId: z.string().optional(),
  enquiryId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListCommunicationLogsInput = z.infer<typeof listCommunicationLogsSchema>;

export const sendManualMessageSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  channel: z.nativeEnum(NotificationChannel),
  type: z.nativeEnum(CustomerNotificationType).default(CustomerNotificationType.OPERATIONS_ALERT),
  title: z.string().min(1, "Title/Subject is required").max(200),
  message: z.string().min(1, "Message content is required").max(5000),
  recipient: z.string().optional(),
  subject: z.string().optional(),
  tripId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  quotationId: z.string().optional().nullable(),
  enquiryId: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
});

export type SendManualMessageInput = z.infer<typeof sendManualMessageSchema>;

export const updateCommunicationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  defaultSenderName: z.string().max(100).optional().nullable(),
  defaultSenderEmail: z.string().email().optional().nullable(),
  autoQuotationSent: z.boolean().optional(),
  autoBookingConfirmed: z.boolean().optional(),
  autoPaymentReminders: z.boolean().optional(),
  autoTravelReminders: z.boolean().optional(),
  autoFeedbackRequests: z.boolean().optional(),
  paymentReminderDays: z.number().int().min(1).max(30).optional(),
  travelReminderDays: z.number().int().min(1).max(30).optional(),
  whatsappProvider: z.string().optional(),
  emailProvider: z.string().optional(),
});

export type UpdateCommunicationSettingsInput = z.infer<typeof updateCommunicationSettingsSchema>;

export const resendCommunicationSchema = z.object({
  customRecipient: z.string().optional(),
});

export type ResendCommunicationInput = z.infer<typeof resendCommunicationSchema>;

export const runAutomationSchema = z.object({
  scope: z.enum(["all", "payment_reminders", "travel_reminders", "feedback_requests"]).default("all"),
});

export type RunAutomationInput = z.infer<typeof runAutomationSchema>;
