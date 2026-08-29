import { z } from "zod";
import { BookingStatus, BookingPaymentStatus } from "@prisma/client";

/**
 * Zod schema for creating a new Booking
 */
export const createBookingSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  quotationId: z.string().trim().optional().nullable(),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.CONFIRMED).optional(),
  bookingDate: z.coerce.date().default(() => new Date()).optional(),
  travelStartDate: z.coerce.date().optional().nullable(),
  travelEndDate: z.coerce.date().optional().nullable(),
  currency: z.string().trim().default("INR").optional(),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  paidAmount: z.number().min(0, "Paid amount must be non-negative").default(0).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Zod schema for updating an existing Booking (PATCH)
 */
export const updateBookingSchema = z
  .object({
    status: z.nativeEnum(BookingStatus).optional(),
    paymentStatus: z.nativeEnum(BookingPaymentStatus).optional(),
    travelStartDate: z.coerce.date().optional().nullable(),
    travelEndDate: z.coerce.date().optional().nullable(),
    currency: z.string().trim().optional(),
    totalAmount: z.number().min(0).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
    internalNotes: z.string().trim().max(5000).optional().nullable(),
    cancellationReason: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

/**
 * Query schema for listing bookings with filters
 */
export const bookingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  paymentStatus: z.nativeEnum(BookingPaymentStatus).optional(),
  customerId: z.string().trim().optional(),
  tripId: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "bookingDate", "totalAmount", "bookingNumber"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

/**
 * Schema for converting an accepted Quotation into a Booking
 */
export const convertQuotationToBookingSchema = z.object({
  notes: z.string().trim().max(5000).optional().nullable(),
  internalNotes: z.string().trim().max(5000).optional().nullable(),
});

export type ConvertQuotationToBookingInput = z.infer<typeof convertQuotationToBookingSchema>;
