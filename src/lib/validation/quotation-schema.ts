import { z } from "zod";
import { QuotationStatus } from "@prisma/client";

/**
 * Zod schema for creating a new Quotation
 */
export const createQuotationSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  title: z.string().trim().max(200, "Title cannot exceed 200 characters").optional(),
  proposalSubtitle: z.string().trim().max(300).optional().nullable(),
  version: z.number().int().min(1).default(1).optional(),
  status: z.nativeEnum(QuotationStatus).default(QuotationStatus.DRAFT).optional(),
  validUntil: z.coerce.date().optional().nullable(),
  currency: z.string().trim().default("INR").optional(),
  subtotal: z.number().min(0, "Subtotal must be non-negative").default(0).optional(),
  markupPercentage: z.number().min(0, "Markup % must be non-negative").max(500, "Markup % cannot exceed 500").default(0).optional(),
  markupAmount: z.number().min(0).default(0).optional(),
  discountPercentage: z.number().min(0, "Discount % must be non-negative").max(100, "Discount % cannot exceed 100").default(0).optional(),
  discountAmount: z.number().min(0).default(0).optional(),
  taxPercentage: z.number().min(0, "Tax % must be non-negative").max(100, "Tax % cannot exceed 100").default(0).optional(),
  taxAmount: z.number().min(0).default(0).optional(),
  finalAmount: z.number().min(0, "Final amount must be non-negative").default(0).optional(),
  customerMessage: z.string().trim().max(5000).optional().nullable(),
  inclusionsIntro: z.string().trim().max(1000).optional().nullable(),
  exclusionsIntro: z.string().trim().max(1000).optional().nullable(),
  paymentTerms: z.string().trim().max(5000).optional().nullable(),
  cancellationPolicy: z.string().trim().max(5000).optional().nullable(),
  importantNotes: z.string().trim().max(5000).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
  terms: z.string().trim().max(5000).optional().nullable(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

/**
 * Zod schema for updating an existing Quotation (PATCH)
 */
export const updateQuotationSchema = z
  .object({
    title: z.string().trim().max(200).optional().nullable(),
    proposalSubtitle: z.string().trim().max(300).optional().nullable(),
    status: z.nativeEnum(QuotationStatus).optional(),
    validUntil: z.coerce.date().optional().nullable(),
    currency: z.string().trim().optional(),
    subtotal: z.number().min(0).optional(),
    markupPercentage: z.number().min(0).max(500).optional(),
    markupAmount: z.number().min(0).optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    discountAmount: z.number().min(0).optional(),
    taxPercentage: z.number().min(0).max(100).optional(),
    taxAmount: z.number().min(0).optional(),
    finalAmount: z.number().min(0).optional(),
    customerMessage: z.string().trim().max(5000).optional().nullable(),
    inclusionsIntro: z.string().trim().max(1000).optional().nullable(),
    exclusionsIntro: z.string().trim().max(1000).optional().nullable(),
    paymentTerms: z.string().trim().max(5000).optional().nullable(),
    cancellationPolicy: z.string().trim().max(5000).optional().nullable(),
    importantNotes: z.string().trim().max(5000).optional().nullable(),
    customerFeedback: z.string().trim().max(5000).optional().nullable(),
    internalNotes: z.string().trim().max(5000).optional().nullable(),
    terms: z.string().trim().max(5000).optional().nullable(),
    selectedPackageOptionId: z.string().trim().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;

/**
 * Query schema for list filtering
 */
export const quotationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(QuotationStatus).optional(),
  customerId: z.string().trim().optional(),
  tripId: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "finalAmount", "quotationNumber"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;

/**
 * Schema for generating a quotation snapshot from a trip
 */
export const generateTripQuotationSchema = z.object({
  markupPercentage: z.number().min(0).max(500).default(10).optional(),
  discountPercentage: z.number().min(0).max(100).default(0).optional(),
  taxPercentage: z.number().min(0).max(100).default(5).optional(),
  proposalSubtitle: z.string().trim().optional(),
  customerMessage: z.string().trim().optional(),
  inclusionsIntro: z.string().trim().optional(),
  exclusionsIntro: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  cancellationPolicy: z.string().trim().optional(),
  importantNotes: z.string().trim().optional(),
  terms: z.string().trim().optional(),
  validUntil: z.coerce.date().optional(),
  autoPopulateInclusions: z.boolean().default(true).optional(),
  generatePaymentSchedule: z.boolean().default(true).optional(),
  generateDefaultPackageOptions: z.boolean().default(false).optional(),
});

export type GenerateTripQuotationInput = z.infer<typeof generateTripQuotationSchema>;

/**
 * Schema for public customer actions
 */
export const acceptQuotationSchema = z.object({
  selectedOptionId: z.string().trim().optional().nullable(),
  customerName: z.string().trim().min(1).max(200).optional(),
  customerEmail: z.string().trim().email().optional().nullable(),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  comments: z.string().trim().max(2000).optional().nullable(),
});

export type AcceptQuotationInput = z.infer<typeof acceptQuotationSchema>;

export const requestChangesSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Please provide feedback or requested changes")
    .max(5000, "Message cannot exceed 5000 characters"),
  customerName: z.string().trim().max(200).optional().nullable(),
  customerPhone: z.string().trim().max(30).optional().nullable(),
});

export type RequestChangesInput = z.infer<typeof requestChangesSchema>;
