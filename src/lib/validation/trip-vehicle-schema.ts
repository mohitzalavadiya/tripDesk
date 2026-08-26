import { z } from "zod";
import { VehiclePricingType } from "@prisma/client";

/**
 * Zod validation schema for creating a Trip-Vehicle assignment.
 */
export const createTripVehicleSchema = z
  .object({
    vehicleId: z.string().trim().optional().nullable(),
    vehicleName: z
      .string()
      .trim()
      .min(1, "Vehicle name is required.")
      .max(200, "Vehicle name must be at most 200 characters."),
    vehicleType: z
      .string()
      .trim()
      .min(1, "Vehicle type is required.")
      .max(100, "Vehicle type must be at most 100 characters."),
    capacity: z.coerce
      .number()
      .int("Capacity must be an integer.")
      .min(1, "Capacity must be at least 1.")
      .optional()
      .nullable(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    pickupLocation: z
      .string()
      .trim()
      .max(200, "Pickup location must be at most 200 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    dropLocation: z
      .string()
      .trim()
      .max(200, "Drop location must be at most 200 characters.")
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
    ratePerKm: z.coerce
      .number()
      .min(0, "Rate per km cannot be negative.")
      .optional()
      .nullable(),
    estimatedKm: z.coerce
      .number()
      .min(0, "Estimated km cannot be negative.")
      .optional()
      .nullable(),
    totalRate: z.coerce
      .number()
      .min(0, "Total rate cannot be negative.")
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
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date cannot be before start date.",
      path: ["endDate"],
    }
  );

export type CreateTripVehicleInput = z.infer<typeof createTripVehicleSchema>;

/**
 * Zod validation schema for updating an existing Trip-Vehicle assignment (PATCH).
 */
export const updateTripVehicleSchema = z
  .object({
    vehicleId: z.string().trim().optional().nullable(),
    vehicleName: z
      .string()
      .trim()
      .min(1, "Vehicle name cannot be empty.")
      .max(200, "Vehicle name must be at most 200 characters.")
      .optional(),
    vehicleType: z
      .string()
      .trim()
      .min(1, "Vehicle type cannot be empty.")
      .max(100, "Vehicle type must be at most 100 characters.")
      .optional(),
    capacity: z.coerce
      .number()
      .int("Capacity must be an integer.")
      .min(1, "Capacity must be at least 1.")
      .optional()
      .nullable(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    pickupLocation: z
      .string()
      .trim()
      .max(200, "Pickup location must be at most 200 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    dropLocation: z
      .string()
      .trim()
      .max(200, "Drop location must be at most 200 characters.")
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
    ratePerKm: z.coerce
      .number()
      .min(0, "Rate per km cannot be negative.")
      .optional()
      .nullable(),
    estimatedKm: z.coerce
      .number()
      .min(0, "Estimated km cannot be negative.")
      .optional()
      .nullable(),
    totalRate: z.coerce
      .number()
      .min(0, "Total rate cannot be negative.")
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
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date cannot be before start date.",
      path: ["endDate"],
    }
  );

export type UpdateTripVehicleInput = z.infer<typeof updateTripVehicleSchema>;

/**
 * Route parameter validation schema for Trip-Vehicle route handlers.
 */
export const tripVehicleRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  vehicleId: z.string().trim().min(1, "Trip Vehicle assignment ID is required."),
});

export type TripVehicleRouteParams = z.infer<typeof tripVehicleRouteParamsSchema>;
