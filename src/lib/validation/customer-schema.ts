import { z } from "zod";

/**
 * Zod validation schema for creating a new Customer.
 * Strictly ignores/strips client-supplied agencyId to prevent cross-tenant assignment.
 */
export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(120, "Customer name must be at most 120 characters."),
  phone: z
    .string()
    .trim()
    .min(3, "Phone number is required (minimum 3 characters).")
    .max(30, "Phone number must be at most 30 characters."),
  alternatePhone: z
    .string()
    .trim()
    .max(30, "Alternate phone must be at most 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(120, "Email must be at most 120 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .or(z.literal("")),
  nationality: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(255, "Address must be at most 255 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .max(100)
    .default("India")
    .optional()
    .nullable(),
  postalCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .or(z.literal("")),
  source: z
    .string()
    .trim()
    .max(60)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(5000, "Notes must be at most 5000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  internalNotes: z
    .string()
    .trim()
    .max(5000, "Internal notes must be at most 5000 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Zod validation schema for updating an existing Customer (PATCH).
 * All fields are optional, but at least one valid field must be present.
 */
export const updateCustomerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Customer name cannot be empty.")
      .max(120, "Customer name must be at most 120 characters.")
      .optional(),
    phone: z
      .string()
      .trim()
      .min(3, "Phone number must have at least 3 characters.")
      .max(30, "Phone number must be at most 30 characters.")
      .optional(),
    alternatePhone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .nullable()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .max(120, "Email must be at most 120 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z
      .string()
      .trim()
      .max(30)
      .optional()
      .nullable()
      .or(z.literal("")),
    nationality: z
      .string()
      .trim()
      .max(60)
      .optional()
      .nullable()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .max(255, "Address must be at most 255 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    city: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .or(z.literal("")),
    state: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable()
      .or(z.literal("")),
    country: z
      .string()
      .trim()
      .max(100)
      .optional()
      .nullable(),
    postalCode: z
      .string()
      .trim()
      .max(20)
      .optional()
      .nullable()
      .or(z.literal("")),
    source: z
      .string()
      .trim()
      .max(60)
      .optional()
      .nullable()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(5000, "Notes must be at most 5000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    internalNotes: z
      .string()
      .trim()
      .max(5000, "Internal notes must be at most 5000 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one editable customer field must be provided." }
  );

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/**
 * Zod validation schema for Customer list query parameters.
 */
export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  source: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(["createdAt", "name", "customerNumber", "city"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === "string") return val.toLowerCase() === "true";
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type CustomerQueryParams = z.infer<typeof customerQuerySchema>;

/**
 * Parameter validation schema for Customer ID route parameter.
 */
export const customerIdParamSchema = z.object({
  id: z.string().trim().min(1, "Customer ID is required."),
});

/**
 * Duplicate check schema
 */
export const checkDuplicateCustomerSchema = z.object({
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  name: z.string().trim().optional(),
});

export type CheckDuplicateCustomerInput = z.infer<typeof checkDuplicateCustomerSchema>;
