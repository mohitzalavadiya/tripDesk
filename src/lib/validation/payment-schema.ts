import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

/**
 * Zod schema for logging a new Payment
 */
export const createPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.number().min(0.01, "Payment amount must be greater than zero"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI).optional(),
  paymentDate: z.coerce.date().default(() => new Date()).optional(),
  status: z.nativeEnum(PaymentStatus).default(PaymentStatus.COMPLETED).optional(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  receiptNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * Zod schema for updating a Payment (PATCH)
 */
export const updatePaymentSchema = z
  .object({
    amount: z.number().min(0.01).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    paymentDate: z.coerce.date().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    referenceNumber: z.string().trim().max(100).optional().nullable(),
    receiptNumber: z.string().trim().max(100).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    refundedAmount: z.number().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

/**
 * Query schema for listing payments with filters
 */
export const paymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().trim().optional(),
  bookingId: z.string().trim().optional(),
  tripId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  sortBy: z.enum(["createdAt", "paymentDate", "amount", "paymentNumber"]).default("paymentDate").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
