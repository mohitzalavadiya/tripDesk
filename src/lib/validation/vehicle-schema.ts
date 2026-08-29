import { z } from "zod";
import { VehiclePricingType } from "@prisma/client";

/**
 * Zod validation schema for creating a new Vehicle master record.
 */
export const createVehicleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vehicle name is required.")
    .max(200, "Vehicle name must be at most 200 characters."),
  type: z
    .string()
    .trim()
    .min(1, "Vehicle type is required.")
    .max(100, "Vehicle type must be at most 100 characters."),
  capacity: z.coerce
    .number()
    .int("Capacity must be an integer.")
    .min(1, "Capacity must be at least 1 seat.")
    .max(100, "Capacity cannot exceed 100.")
    .default(4),
  registrationNumber: z
    .string()
    .trim()
    .max(50, "Registration number must be at most 50 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  driverName: z
    .string()
    .trim()
    .max(100, "Driver name must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  driverPhone: z
    .string()
    .trim()
    .max(30, "Driver phone must be at most 30 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  pricingType: z
    .nativeEnum(VehiclePricingType)
    .optional()
    .default(VehiclePricingType.TOTAL),
  baseRate: z.coerce
    .number()
    .min(0, "Base rate cannot be negative.")
    .optional()
    .nullable(),
  ratePerKm: z.coerce
    .number()
    .min(0, "Rate per km cannot be negative.")
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

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * Zod validation schema for updating an existing Vehicle master record (PATCH).
 */
export const updateVehicleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Vehicle name cannot be empty.")
      .max(200, "Vehicle name must be at most 200 characters.")
      .optional(),
    type: z
      .string()
      .trim()
      .min(1, "Vehicle type cannot be empty.")
      .max(100, "Vehicle type must be at most 100 characters.")
      .optional(),
    capacity: z.coerce
      .number()
      .int("Capacity must be an integer.")
      .min(1, "Capacity must be at least 1 seat.")
      .max(100, "Capacity cannot exceed 100.")
      .optional(),
    registrationNumber: z
      .string()
      .trim()
      .max(50, "Registration number must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    driverName: z
      .string()
      .trim()
      .max(100, "Driver name must be at most 100 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    driverPhone: z
      .string()
      .trim()
      .max(30, "Driver phone must be at most 30 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    pricingType: z.nativeEnum(VehiclePricingType).optional(),
    baseRate: z.coerce
      .number()
      .min(0, "Base rate cannot be negative.")
      .optional()
      .nullable(),
    ratePerKm: z.coerce
      .number()
      .min(0, "Rate per km cannot be negative.")
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
    message: "At least one editable vehicle field must be provided.",
  });

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

/**
 * Query parameter validation schema for listing Vehicles.
 */
export const vehicleListQuerySchema = z.object({
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
  type: z.string().trim().optional(),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

export type VehicleListQueryInput = z.infer<typeof vehicleListQuerySchema>;

/**
 * Route parameter validation schema for Vehicle route handlers.
 */
export const vehicleRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Vehicle ID is required."),
});

export type VehicleRouteParams = z.infer<typeof vehicleRouteParamsSchema>;
