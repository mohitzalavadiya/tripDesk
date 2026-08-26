import { z } from "zod";
import { ActivityType } from "@prisma/client";

/**
 * Zod validation schema for creating a Trip-Activity assignment.
 */
export const createTripActivitySchema = z.object({
  activityId: z.string().trim().optional().nullable(),
  name: z
    .string()
    .trim()
    .min(1, "Activity name is required.")
    .max(200, "Activity name must be at most 200 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  date: z.coerce.date().optional().nullable(),
  time: z
    .string()
    .trim()
    .max(50, "Time must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(200, "Location must be at most 200 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  numberOfParticipants: z.coerce
    .number()
    .int("Participants must be an integer.")
    .min(1, "Participants must be at least 1.")
    .optional()
    .default(1),
  type: z
    .nativeEnum(ActivityType)
    .optional()
    .default(ActivityType.INCLUDED),
  adultPrice: z.coerce
    .number()
    .min(0, "Adult price cannot be negative.")
    .optional()
    .nullable(),
  childPrice: z.coerce
    .number()
    .min(0, "Child price cannot be negative.")
    .optional()
    .nullable(),
  totalPrice: z.coerce
    .number()
    .min(0, "Total price cannot be negative.")
    .optional()
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be at most 2000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateTripActivityInput = z.infer<typeof createTripActivitySchema>;

/**
 * Zod validation schema for updating an existing Trip-Activity assignment (PATCH).
 */
export const updateTripActivitySchema = z
  .object({
    activityId: z.string().trim().optional().nullable(),
    name: z
      .string()
      .trim()
      .min(1, "Activity name cannot be empty.")
      .max(200, "Activity name must be at most 200 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    date: z.coerce.date().optional().nullable(),
    time: z
      .string()
      .trim()
      .max(50, "Time must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    location: z
      .string()
      .trim()
      .max(200, "Location must be at most 200 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    numberOfParticipants: z.coerce
      .number()
      .int("Participants must be an integer.")
      .min(1, "Participants must be at least 1.")
      .optional(),
    type: z.nativeEnum(ActivityType).optional(),
    adultPrice: z.coerce
      .number()
      .min(0, "Adult price cannot be negative.")
      .optional()
      .nullable(),
    childPrice: z.coerce
      .number()
      .min(0, "Child price cannot be negative.")
      .optional()
      .nullable(),
    totalPrice: z.coerce
      .number()
      .min(0, "Total price cannot be negative.")
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable field must be provided.",
  });

export type UpdateTripActivityInput = z.infer<typeof updateTripActivitySchema>;

/**
 * Route parameter validation schema for Trip-Activity route handlers.
 */
export const tripActivityRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  activityId: z.string().trim().min(1, "Trip Activity assignment ID is required."),
});

export type TripActivityRouteParams = z.infer<typeof tripActivityRouteParamsSchema>;
