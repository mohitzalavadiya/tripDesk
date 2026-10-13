import { z } from "zod";

export const createDestinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Destination name is required.")
    .max(100, "Destination name must be at most 100 characters."),
  country: z
    .string()
    .trim()
    .max(100, "Country must be at most 100 characters.")
    .optional()
    .default("India"),
  state: z
    .string()
    .trim()
    .max(100, "State/Province must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  cityArea: z
    .string()
    .trim()
    .max(100, "City/Area must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
});

export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;

export const updateDestinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Destination name cannot be empty.")
    .max(100, "Destination name must be at most 100 characters.")
    .optional(),
  country: z
    .string()
    .trim()
    .max(100, "Country must be at most 100 characters.")
    .optional(),
  state: z
    .string()
    .trim()
    .max(100, "State/Province must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  cityArea: z
    .string()
    .trim()
    .max(100, "City/Area must be at most 100 characters.")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;

export const destinationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).optional().default("ACTIVE"),
  state: z.string().trim().optional(),
});

export type DestinationListQueryInput = z.infer<typeof destinationListQuerySchema>;
