import { z } from "zod";
import { InvoiceStatus, DiscountType, PaymentMethod } from "@prisma/client";

export const invoiceItemInputSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  rate: z.number().min(0, "Rate cannot be negative"),
});

export const createInvoiceSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export const updateDraftInvoiceSchema = z.object({
  invoiceDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  items: z.array(invoiceItemInputSchema).min(1, "At least one line item is required").optional(),
  discountType: z.nativeEnum(DiscountType).nullable().optional(),
  discountValue: z.number().min(0, "Discount cannot be negative").nullable().optional(),
  notes: z.string().nullable().optional(),
  paymentInstructions: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
});

export const issueInvoiceSchema = z.object({
  dueDate: z.string().or(z.date()).optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is mandatory and must be at least 3 characters"),
});

export const recordInvoicePaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
  paymentDate: z.string().or(z.date()).optional(),
  referenceNumber: z.string().nullable().optional(),
  receiptNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().min(3, "Void reason is mandatory and must be at least 3 characters"),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  paymentState: z.enum(["ALL", "UNPAID", "PARTIALLY_PAID", "PAID"]).optional(),
  overdue: z.enum(["true", "false", "all"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["createdAt", "invoiceDate", "dueDate", "invoiceNumber", "totalAmount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateDraftInvoiceInput = z.infer<typeof updateDraftInvoiceSchema>;
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;
