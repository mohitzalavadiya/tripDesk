import { z } from "zod";
import { TripStatus } from "@prisma/client";

/**
 * Zod validation schema for creating a new Trip.
 * Strictly ignores/strips client-supplied agencyId to prevent cross-tenant assignment.
 */
export const createTripSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .min(1, "Customer ID is required."),
    title: z
      .string()
      .trim()
      .min(1, "Trip title is required.")
      .max(150, "Trip title must be at most 150 characters."),
    tripNumber: z
      .string()
      .trim()
      .min(1, "Trip number cannot be empty.")
      .max(50, "Trip number must be at most 50 characters.")
      .optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z
      .nativeEnum(TripStatus)
      .optional()
      .default(TripStatus.DRAFT),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Trip end date cannot be earlier than start date.",
    path: ["endDate"],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;

/**
 * Zod validation schema for updating an existing Trip (PATCH).
 * All fields are optional, but at least one valid field must be present.
 */
export const updateTripSchema = z
  .object({
    customerId: z
      .string()
      .trim()
      .min(1, "Customer ID cannot be empty.")
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, "Trip title cannot be empty.")
      .max(150, "Trip title must be at most 150 characters.")
      .optional(),
    tripNumber: z
      .string()
      .trim()
      .min(1, "Trip number cannot be empty.")
      .max(50, "Trip number must be at most 50 characters.")
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z
      .nativeEnum(TripStatus)
      .optional(),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable trip field must be provided.",
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "Trip end date cannot be earlier than start date.",
      path: ["endDate"],
    }
  );

export type UpdateTripInput = z.infer<typeof updateTripSchema>;

/**
 * Zod validation schema for Trip list query parameters.
 */
export const tripQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(TripStatus).optional(),
  customerId: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

export type TripQueryParams = z.infer<typeof tripQuerySchema>;

/**
 * Route parameter validation schema for Trip ID.
 */
export const tripIdParamSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
});

export type TripIdParam = z.infer<typeof tripIdParamSchema>;
