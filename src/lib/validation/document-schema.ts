import { z } from "zod";
import {
  TravelDocumentType,
  TravelDocumentStatus,
  NotificationChannel,
} from "@prisma/client";

export const listDocumentsSchema = z.object({
  type: z.nativeEnum(TravelDocumentType).optional(),
  status: z.nativeEnum(TravelDocumentStatus).optional(),
  bookingId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  paymentId: z.string().optional(),
  supplierId: z.string().optional(),
  isLatest: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;

export const generateBookingDocumentsSchema = z.object({
  documentTypes: z.array(z.nativeEnum(TravelDocumentType)).optional(),
  notes: z.string().max(1000).optional(),
});

export type GenerateBookingDocumentsInput = z.infer<typeof generateBookingDocumentsSchema>;

export const generateSingleDocumentSchema = z.object({
  documentType: z.nativeEnum(TravelDocumentType),
  bookingId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  paymentId: z.string().optional(),
  supplierId: z.string().optional(),
  hotelConfirmationId: z.string().optional(),
  vehicleDispatchId: z.string().optional(),
  activityConfirmationId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type GenerateSingleDocumentInput = z.infer<typeof generateSingleDocumentSchema>;

export const issueDocumentSchema = z.object({
  notes: z.string().max(1000).optional(),
  notifyCustomer: z.boolean().default(false),
  channel: z.nativeEnum(NotificationChannel).optional(),
});

export type IssueDocumentInput = z.infer<typeof issueDocumentSchema>;

export const revokeDocumentSchema = z.object({
  reason: z.string().min(3, "Revocation reason must be at least 3 characters").max(500),
});

export type RevokeDocumentInput = z.infer<typeof revokeDocumentSchema>;

export const resendDocumentSchema = z.object({
  channel: z.nativeEnum(NotificationChannel).optional(),
  customRecipient: z.string().optional(),
});

export type ResendDocumentInput = z.infer<typeof resendDocumentSchema>;
