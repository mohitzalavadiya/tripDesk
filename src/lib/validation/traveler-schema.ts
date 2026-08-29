import { z } from "zod";
import { TravelerType } from "@prisma/client";

/**
 * Zod validation schema for creating a new Traveler under a Trip.
 */
export const createTravelerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Traveler name is required.")
    .max(120, "Traveler name must be at most 120 characters."),
  type: z
    .nativeEnum(TravelerType)
    .optional()
    .default(TravelerType.ADULT),
  isPrimary: z.boolean().default(false).optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z
    .string()
    .trim()
    .max(30, "Gender must be at most 30 characters.")
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
    .email("Please provide a valid email address.")
    .max(120, "Email must be at most 120 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  idPhotoUrl: z
    .string()
    .trim()
    .max(500, "ID photo URL must be at most 500 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  specialRequirements: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateTravelerInput = z.infer<typeof createTravelerSchema>;

/**
 * Zod validation schema for updating an existing Traveler (PATCH).
 */
export const updateTravelerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Traveler name cannot be empty.")
      .max(120, "Traveler name must be at most 120 characters.")
      .optional(),
    type: z
      .nativeEnum(TravelerType)
      .optional(),
    isPrimary: z.boolean().optional(),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z
      .string()
      .trim()
      .max(30, "Gender must be at most 30 characters.")
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
      .email("Please provide a valid email address.")
      .max(120, "Email must be at most 120 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    idPhotoUrl: z
      .string()
      .trim()
      .max(500, "ID photo URL must be at most 500 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    specialRequirements: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one editable traveler field must be provided.",
  });

export type UpdateTravelerInput = z.infer<typeof updateTravelerSchema>;

/**
 * Route parameter validation schema for a specific Traveler under a Trip.
 */
export const travelerRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  travelerId: z.string().trim().min(1, "Traveler ID is required."),
});

export type TravelerRouteParams = z.infer<typeof travelerRouteParamsSchema>;
