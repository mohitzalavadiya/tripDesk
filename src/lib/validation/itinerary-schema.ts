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
 * Supports optimistic concurrency control via expectedUpdatedAt.
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
    expectedUpdatedAt: z.coerce.date().optional().nullable(),
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

/**
 * Zod schema for duplicating a complete day schedule.
 */
export const duplicateDaySchema = z.object({
  sourceDayNumber: z.coerce
    .number()
    .int("Source day number must be an integer.")
    .min(1, "Source day number must be at least 1."),
});

export type DuplicateDayInput = z.infer<typeof duplicateDaySchema>;

/**
 * Zod schema for deleting a complete itinerary day and resequencing subsequent days.
 */
export const deleteDaySchema = z.object({
  dayNumber: z.coerce
    .number()
    .int("Day number must be an integer.")
    .min(1, "Day number must be at least 1."),
});

export type DeleteDayInput = z.infer<typeof deleteDaySchema>;

/**
 * Zod schema for moving an entire day group Up or Down, or to a specific target day.
 */
export const reorderDaySchema = z
  .object({
    sourceDayNumber: z.coerce
      .number()
      .int("Source day number must be an integer.")
      .min(1, "Source day number must be at least 1."),
    direction: z
      .enum(["UP", "DOWN"], {
        error: "Direction must be UP or DOWN.",
      })
      .optional(),
    targetDayNumber: z.coerce
      .number()
      .int("Target day number must be an integer.")
      .min(1, "Target day number must be at least 1.")
      .optional(),
  })
  .refine(
    (data) => data.direction !== undefined || data.targetDayNumber !== undefined,
    {
      message: "Either direction (UP/DOWN) or targetDayNumber must be provided.",
    }
  );

export type ReorderDayInput = z.infer<typeof reorderDaySchema>;

/**
 * Zod schema for moving an individual itinerary item Up or Down, to a target index, or to another day.
 */
export const reorderItemSchema = z
  .object({
    itemId: z.string().trim().min(1, "Item ID is required."),
    direction: z
      .enum(["UP", "DOWN"], {
        error: "Direction must be UP or DOWN.",
      })
      .optional(),
    targetIndex: z.coerce
      .number()
      .int("Target index must be an integer.")
      .min(0, "Target index cannot be negative.")
      .optional(),
    targetDayNumber: z.coerce
      .number()
      .int("Target day number must be an integer.")
      .min(1, "Target day number must be at least 1.")
      .optional(),
  })
  .refine(
    (data) =>
      data.direction !== undefined ||
      data.targetIndex !== undefined ||
      data.targetDayNumber !== undefined,
    {
      message:
        "Either direction (UP/DOWN), targetIndex, or targetDayNumber must be provided.",
    }
  );

export type ReorderItemInput = z.infer<typeof reorderItemSchema>;

/**
 * Zod schema for applying a Day Template to a specific trip day.
 */
export const applyDayTemplateInputSchema = z.object({
  templateId: z.string().trim().min(1, "Template ID is required."),
  targetDayNumber: z.coerce
    .number()
    .int("Target day number must be an integer.")
    .min(1, "Target day number must be at least 1."),
});

export type ApplyDayTemplateInput = z.infer<typeof applyDayTemplateInputSchema>;

/**
 * Zod schema for applying a Package Template (Append or Replace).
 */
export const applyPackageTemplateInputSchema = z.object({
  templateId: z.string().trim().min(1, "Template ID is required."),
  mode: z.enum(["APPEND", "REPLACE"], {
    error: "Mode must be either APPEND or REPLACE.",
  }),
});

export type ApplyPackageTemplateInput = z.infer<typeof applyPackageTemplateInputSchema>;

/**
 * Zod schema for saving a day or package from the current trip as a reusable template.
 */
export const saveAsTemplateInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required.")
    .max(200, "Template name cannot exceed 200 characters."),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  destinationId: z.string().trim().optional().nullable().or(z.literal("")),
  type: z.enum(["DAY", "PACKAGE"], {
    error: "Type must be DAY or PACKAGE.",
  }),
  sourceDayNumber: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .nullable(),
});

export type SaveAsTemplateInput = z.infer<typeof saveAsTemplateInputSchema>;
