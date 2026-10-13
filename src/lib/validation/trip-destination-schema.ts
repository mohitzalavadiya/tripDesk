import { z } from "zod";

export const tripDestinationRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  destinationId: z.string().trim().min(1, "Trip Destination ID is required."),
});

export const addTripDestinationSchema = z.object({
  destinationId: z.string().trim().min(1, "Destination ID is required."),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be at most 500 characters.")
    .optional()
    .nullable(),
});

export type AddTripDestinationInput = z.infer<typeof addTripDestinationSchema>;

export const reorderTripDestinationsSchema = z.object({
  tripDestinationIds: z
    .array(z.string().trim().min(1, "Trip destination ID cannot be empty."))
    .min(1, "At least one trip destination ID is required.")
    .refine((items) => new Set(items).size === items.length, {
      message: "Duplicate TripDestination IDs are not allowed.",
    }),
});

export type ReorderTripDestinationsInput = z.infer<typeof reorderTripDestinationsSchema>;
