import { z } from "zod";

/**
 * Zod validation schema for creating a new Hotel master record.
 */
export const createHotelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Hotel name is required.")
    .max(200, "Hotel name must be at most 200 characters."),
  category: z
    .string()
    .trim()
    .max(100, "Category must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(500, "Address must be at most 500 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100, "City must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(100, "State must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .max(100, "Country must be at most 100 characters.")
    .optional()
    .nullable()
    .default("India"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be at most 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email address format.")
    .max(150, "Email must be at most 150 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(250, "Website URL must be at most 250 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be at most 2000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateHotelInput = z.infer<typeof createHotelSchema>;

/**
 * Zod validation schema for updating an existing Hotel master record (PATCH).
 */
export const updateHotelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Hotel name cannot be empty.")
      .max(200, "Hotel name must be at most 200 characters.")
      .optional(),
    category: z
      .string()
      .trim()
      .max(100, "Category must be at most 100 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .max(500, "Address must be at most 500 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    city: z
      .string()
      .trim()
      .max(100, "City must be at most 100 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    state: z
      .string()
      .trim()
      .max(100, "State must be at most 100 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    country: z
      .string()
      .trim()
      .max(100, "Country must be at most 100 characters.")
      .optional()
      .nullable(),
    phone: z
      .string()
      .trim()
      .max(30, "Phone number must be at most 30 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Invalid email address format.")
      .max(150, "Email must be at most 150 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    website: z
      .string()
      .trim()
      .max(250, "Website URL must be at most 250 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be at most 2000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable hotel field must be provided.",
  });

export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;

/**
 * Query parameter validation schema for listing Hotels.
 */
export const hotelListQuerySchema = z.object({
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
  city: z.string().trim().optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

export type HotelListQueryInput = z.infer<typeof hotelListQuerySchema>;

/**
 * Route parameter validation schema for Hotel route handlers.
 */
export const hotelRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Hotel ID is required."),
});

export type HotelRouteParams = z.infer<typeof hotelRouteParamsSchema>;
