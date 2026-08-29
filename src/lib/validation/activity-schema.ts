import { z } from "zod";
import { ActivityType } from "@prisma/client";

/**
 * Zod validation schema for creating a new Activity master record.
 */
export const createActivitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Activity name is required.")
    .max(200, "Activity name must be at most 200 characters."),
  location: z
    .string()
    .trim()
    .max(200, "Location must be at most 200 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  duration: z
    .string()
    .trim()
    .max(100, "Duration must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
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
  price: z.coerce
    .number()
    .min(0, "Price cannot be negative.")
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

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/**
 * Zod validation schema for updating an existing Activity master record (PATCH).
 */
export const updateActivitySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Activity name cannot be empty.")
      .max(200, "Activity name must be at most 200 characters.")
      .optional(),
    location: z
      .string()
      .trim()
      .max(200, "Location must be at most 200 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    duration: z
      .string()
      .trim()
      .max(100, "Duration must be at most 100 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
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
    price: z.coerce
      .number()
      .min(0, "Price cannot be negative.")
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
    message: "At least one editable activity field must be provided.",
  });

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

/**
 * Query parameter validation schema for listing Activities.
 */
export const activityListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer.")
    .min(1, "Page must be at least 1.")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer.")
    .min(1, "Limit must be at least 1.")
    .max(100, "Limit cannot exceed 100.")
    .default(20),
  search: z.string().trim().optional(),
  location: z.string().trim().optional(),
  type: z.nativeEnum(ActivityType).optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

export type ActivityListQueryInput = z.infer<typeof activityListQuerySchema>;

/**
 * Route parameter validation schema for Activity route handlers.
 */
export const activityRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Activity ID is required."),
});

export type ActivityRouteParams = z.infer<typeof activityRouteParamsSchema>;
