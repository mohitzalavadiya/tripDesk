import { z } from "zod";

/**
 * Zod validation schema for creating a new Itinerary Item under a Trip.
 */
export const createItineraryItemSchema = z.object({
  dayNumber: z.coerce
    .number()
    .int("Day number must be an integer.")
    .min(1, "Day number must be at least 1."),
  date: z.coerce.date().optional().nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be at most 200 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters.")
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
  startTime: z
    .string()
    .trim()
    .max(30, "Start time must be at most 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  endTime: z
    .string()
    .trim()
    .max(30, "End time must be at most 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  sortOrder: z.coerce
    .number()
    .int("Sort order must be an integer.")
    .min(0, "Sort order cannot be negative.")
    .optional()
    .default(0),
});

export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>;

/**
 * Zod validation schema for updating an existing Itinerary Item (PATCH).
 */
export const updateItineraryItemSchema = z
  .object({
    dayNumber: z.coerce
      .number()
      .int("Day number must be an integer.")
      .min(1, "Day number must be at least 1.")
      .optional(),
    date: z.coerce.date().optional().nullable(),
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty.")
      .max(200, "Title must be at most 200 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2000 characters.")
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
    startTime: z
      .string()
      .trim()
      .max(30, "Start time must be at most 30 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    endTime: z
      .string()
      .trim()
      .max(30, "End time must be at most 30 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    sortOrder: z.coerce
      .number()
      .int("Sort order must be an integer.")
      .min(0, "Sort order cannot be negative.")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable itinerary item field must be provided.",
  });

export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>;

/**
 * Route parameter validation schema for Itinerary Item route handlers.
 */
export const itineraryRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  itemId: z.string().trim().min(1, "Itinerary Item ID is required."),
});

export type ItineraryRouteParams = z.infer<typeof itineraryRouteParamsSchema>;
