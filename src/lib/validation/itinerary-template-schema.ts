import { ItineraryTemplateType } from "@prisma/client";
import { z } from "zod";

/**
 * Zod schema for an individual schedule item within a Day Template.
 * Strictly limited to traveler-facing descriptive fields.
 */
export const dayTemplateItemSchema = z
  .object({
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
      .default(0),
  })
  .strict(); // Explicitly disallows supplier costs, markups, credentials, or internal notes

export type DayTemplateItem = z.infer<typeof dayTemplateItemSchema>;

/**
 * Zod schema for validated Day Template JSON content payload.
 */
export const dayTemplateContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    type: z.literal("DAY"),
    items: z
      .array(dayTemplateItemSchema)
      .min(1, "A day template must have at least 1 schedule item.")
      .max(20, "A day template cannot exceed 20 schedule items."),
  })
  .strict();

export type DayTemplateContent = z.infer<typeof dayTemplateContentSchema>;

/**
 * Zod schema for an item within a multi-day Package Template.
 */
export const packageTemplateDayItemSchema = z
  .object({
    dayOffset: z.coerce
      .number()
      .int("Day offset must be an integer.")
      .min(1, "Day offset must be at least 1.")
      .max(60, "Day offset cannot exceed 60."),
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
      .default(0),
  })
  .strict();

export type PackageTemplateDayItem = z.infer<typeof packageTemplateDayItemSchema>;

/**
 * Zod schema for validated Package Template JSON content payload.
 */
export const packageTemplateContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    type: z.literal("PACKAGE"),
    totalDays: z.coerce
      .number()
      .int("Total days must be an integer.")
      .min(1, "Total days must be at least 1.")
      .max(60, "Package template cannot exceed 60 days."),
    days: z
      .array(packageTemplateDayItemSchema)
      .min(1, "A package template must contain at least 1 schedule item.")
      .max(200, "A package template cannot exceed 200 schedule items."),
  })
  .strict();

export type PackageTemplateContent = z.infer<typeof packageTemplateContentSchema>;

/**
 * Polymorphic content validator for Itinerary Templates.
 */
export const templateContentSchema = z.union([
  dayTemplateContentSchema,
  packageTemplateContentSchema,
]);

/**
 * Strictly parses template content according to the authoritative template type (DAY or PACKAGE).
 * Enforces schemaVersion: 1, bounds on items and days, and strict rejection of commercial/unknown fields.
 */
export function parseTemplateContent(
  type: ItineraryTemplateType,
  content: unknown
) {
  if (type === ItineraryTemplateType.DAY) {
    return dayTemplateContentSchema.safeParse(content);
  } else if (type === ItineraryTemplateType.PACKAGE) {
    return packageTemplateContentSchema.safeParse(content);
  }
  return {
    success: false as const,
    error: new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Unsupported template type.",
      },
    ]),
  };
}

/**
 * Schema for creating a new ItineraryTemplate.
 */
export const createItineraryTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Template name is required.")
      .max(200, "Template name must be at most 200 characters."),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    destinationId: z.string().trim().optional().nullable().or(z.literal("")),
    type: z.nativeEnum(ItineraryTemplateType),
    dayCount: z.coerce.number().int().min(1).max(60).optional(),
    content: z.unknown(),
  })
  .superRefine((data, ctx) => {
    if (data.type === ItineraryTemplateType.DAY) {
      const res = dayTemplateContentSchema.safeParse(data.content);
      if (!res.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: `Invalid Day Template content: ${res.error.issues.map((i) => i.message).join(", ")}`,
        });
      }
    } else if (data.type === ItineraryTemplateType.PACKAGE) {
      const res = packageTemplateContentSchema.safeParse(data.content);
      if (!res.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: `Invalid Package Template content: ${res.error.issues.map((i) => i.message).join(", ")}`,
        });
      }
    }
  });

export type CreateItineraryTemplateInput = z.infer<typeof createItineraryTemplateSchema>;

/**
 * Schema for updating an existing ItineraryTemplate (PATCH).
 */
export const updateItineraryTemplateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Template name cannot be empty.")
      .max(200, "Template name must be at most 200 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    destinationId: z.string().trim().optional().nullable().or(z.literal("")),
    dayCount: z.coerce.number().int().min(1).max(60).optional(),
    content: z.unknown().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable template field must be provided.",
  });

export type UpdateItineraryTemplateInput = z.infer<typeof updateItineraryTemplateSchema>;

/**
 * Schema for listing / filtering Itinerary Templates.
 */
export const templateListQuerySchema = z.object({
  type: z.nativeEnum(ItineraryTemplateType).optional(),
  destinationId: z.string().trim().optional(),
  includeArchived: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
});

export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
