import { z } from "zod";

/**
 * Zod validation schema for creating a Rate Sheet (Hotel only).
 */
export const createRateSheetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Rate sheet name is required.")
      .max(255, "Name must be at most 255 characters."),
    inventoryType: z.enum(["HOTEL"]).default("HOTEL").optional(),
    supplierId: z.string().trim().optional().nullable().or(z.literal("")),
    
    // Inventory reference (Hotel only)
    hotelId: z.string().trim().optional().nullable().or(z.literal("")),

    // Hotel specifics
    roomType: z.string().trim().max(100).optional().nullable().or(z.literal("")),
    mealPlan: z.string().trim().max(50).optional().nullable().or(z.literal("")),

    // Season & Validity
    seasonName: z.string().trim().max(100).optional().nullable().or(z.literal("")),
    validFrom: z.coerce.date({ error: "Valid 'validFrom' date is required." }),
    validTo: z.coerce.date({ error: "Valid 'validTo' date is required." }),

    // Pricing
    currency: z.string().trim().max(10).default("INR"),
    costPrice: z.coerce
      .number()
      .min(0, "Cost price must be non-negative.")
      .default(0),
    extraAdultRate: z.coerce
      .number()
      .min(0, "Extra adult rate must be non-negative.")
      .optional()
      .nullable(),
    extraChildRate: z.coerce
      .number()
      .min(0, "Extra child rate must be non-negative.")
      .optional()
      .nullable(),

    // General metadata
    taxPercentage: z.coerce
      .number()
      .min(0, "Tax percentage must be non-negative.")
      .max(100, "Tax percentage cannot exceed 100%.")
      .optional()
      .default(0),
    priority: z.coerce.number().int().default(0),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"]).optional().default("ACTIVE"),
    sourceType: z.string().trim().max(50).optional().default("MANUAL"),
    notes: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
    internalNotes: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) => new Date(data.validFrom).getTime() <= new Date(data.validTo).getTime(),
    {
      message: "Validity start date (validFrom) cannot be after validity end date (validTo).",
      path: ["validTo"],
    }
  );

export type CreateRateSheetInput = z.infer<typeof createRateSheetSchema>;
export type CreateRateSheetPayload = z.input<typeof createRateSheetSchema>;

/**
 * Zod validation schema for updating an existing Rate Sheet.
 */
export const updateRateSheetSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    inventoryType: z.enum(["HOTEL"]).optional(),
    supplierId: z.string().trim().optional().nullable().or(z.literal("")),
    hotelId: z.string().trim().optional().nullable().or(z.literal("")),

    roomType: z.string().trim().max(100).optional().nullable().or(z.literal("")),
    mealPlan: z.string().trim().max(50).optional().nullable().or(z.literal("")),
    seasonName: z.string().trim().max(100).optional().nullable().or(z.literal("")),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),

    currency: z.string().trim().max(10).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    extraAdultRate: z.coerce.number().min(0).optional().nullable(),
    extraChildRate: z.coerce.number().min(0).optional().nullable(),

    taxPercentage: z.coerce.number().min(0).max(100).optional(),
    priority: z.coerce.number().int().optional(),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
    sourceType: z.string().trim().max(50).optional(),
    notes: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
    internalNotes: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validFrom).getTime() <= new Date(data.validTo).getTime();
      }
      return true;
    },
    {
      message: "Validity start date cannot be after validity end date.",
      path: ["validTo"],
    }
  );

export type UpdateRateSheetInput = z.infer<typeof updateRateSheetSchema>;
export type UpdateRateSheetPayload = z.input<typeof updateRateSheetSchema>;

/**
 * Query schema for listing Rate Sheets.
 */
export const rateSheetQuerySchema = z.object({
  search: z.string().trim().optional(),
  inventoryType: z.enum(["HOTEL"]).optional(),
  supplierId: z.string().trim().optional(),
  hotelId: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
  validDate: z.coerce.date().optional(),
  seasonName: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(["createdAt", "validFrom", "validTo", "priority", "name", "costPrice"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === "string") return val.toLowerCase() === "true";
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type RateSheetQueryParams = z.infer<typeof rateSheetQuerySchema>;

/**
 * Route parameter validation schema for RateSheet ID.
 */
export const rateSheetIdParamSchema = z.object({
  id: z.string().trim().min(1, "Rate Sheet ID is required."),
});

/**
 * Query schema for Rate Lookup / Preview Engine (Hotel only).
 */
export const rateLookupQuerySchema = z.object({
  inventoryType: z.enum(["HOTEL"]).default("HOTEL").optional(),
  inventoryId: z.string().trim().min(1, "Inventory ID is required."),
  date: z.coerce.date({ error: "Date is required." }),
  roomType: z.string().trim().optional(),
  mealPlan: z.string().trim().optional(),
});

export type RateLookupQueryParams = z.infer<typeof rateLookupQuerySchema>;
