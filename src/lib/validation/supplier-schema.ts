import { z } from "zod";

/**
 * Zod validation schema for creating a new Supplier.
 */
export const createSupplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Supplier name is required.")
    .max(255, "Supplier name must be at most 255 characters."),
  type: z
    .string()
    .trim()
    .max(100, "Type must be at most 100 characters.")
    .optional()
    .default("Hotel Supplier"),
  contactPerson: z
    .string()
    .trim()
    .max(255, "Contact person must be at most 255 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "Phone number must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  alternatePhone: z
    .string()
    .trim()
    .max(50, "Alternate phone must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(255, "Email must be at most 255 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(1000, "Address must be at most 1000 characters.")
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
    .default("India"),
  postalCode: z
    .string()
    .trim()
    .max(20, "Postal code must be at most 20 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  gstNumber: z
    .string()
    .trim()
    .max(50, "GST number must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  panNumber: z
    .string()
    .trim()
    .max(50, "PAN number must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  paymentTerms: z
    .string()
    .trim()
    .max(500, "Payment terms must be at most 500 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  bankDetails: z
    .string()
    .trim()
    .max(1000, "Bank details must be at most 1000 characters.")
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
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreateSupplierPayload = z.input<typeof createSupplierSchema>;

/**
 * Zod validation schema for updating an existing Supplier.
 */
export const updateSupplierSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Supplier name is required.")
      .max(255, "Supplier name must be at most 255 characters.")
      .optional(),
    type: z
      .string()
      .trim()
      .max(100, "Type must be at most 100 characters.")
      .optional(),
    contactPerson: z
      .string()
      .trim()
      .max(255, "Contact person must be at most 255 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .max(50, "Phone number must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    alternatePhone: z
      .string()
      .trim()
      .max(50, "Alternate phone must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address.")
      .max(255, "Email must be at most 255 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    address: z
      .string()
      .trim()
      .max(1000, "Address must be at most 1000 characters.")
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
      .optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, "Postal code must be at most 20 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    gstNumber: z
      .string()
      .trim()
      .max(50, "GST number must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    panNumber: z
      .string()
      .trim()
      .max(50, "PAN number must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    paymentTerms: z
      .string()
      .trim()
      .max(500, "Payment terms must be at most 500 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    bankDetails: z
      .string()
      .trim()
      .max(1000, "Bank details must be at most 1000 characters.")
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
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpdateSupplierPayload = z.input<typeof updateSupplierSchema>;

/**
 * Zod validation schema for listing suppliers with search and pagination.
 */
export const supplierQuerySchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  type: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z
    .enum(["createdAt", "name", "city", "status", "supplierCode"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === "string") return val.toLowerCase() === "true";
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type SupplierQueryParams = z.infer<typeof supplierQuerySchema>;

/**
 * Route parameter validation schema for Supplier ID.
 */
export const supplierIdParamSchema = z.object({
  id: z.string().trim().min(1, "Supplier ID is required."),
});

/**
 * Query schema for duplicate supplier checking.
 */
export const checkDuplicateSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required."),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  excludeId: z.string().trim().optional(),
});

export type CheckDuplicateSupplierQuery = z.infer<typeof checkDuplicateSupplierSchema>;
