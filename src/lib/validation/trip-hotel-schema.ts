import { z } from "zod";

/**
 * Zod validation schema for creating a Trip-Hotel assignment.
 */
export const createTripHotelSchema = z
  .object({
    hotelId: z.string().trim().min(1, "Hotel ID is required."),
    checkIn: z.coerce.date({ error: "Valid check-in date is required." }),
    checkOut: z.coerce.date({ error: "Valid check-out date is required." }),
    roomType: z
      .string()
      .trim()
      .min(1, "Room type is required.")
      .max(100, "Room type must be at most 100 characters."),
    rooms: z.coerce
      .number()
      .int("Rooms must be an integer.")
      .min(1, "Rooms must be at least 1.")
      .default(1),
    mealPlan: z
      .string()
      .trim()
      .max(50, "Meal plan must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    nightlyRate: z.coerce
      .number()
      .min(0, "Nightly rate cannot be negative.")
      .optional()
      .nullable(),
    totalAmount: z.coerce
      .number()
      .min(0, "Total amount cannot be negative.")
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
  .refine((data) => data.checkOut >= data.checkIn, {
    message: "Check-out date cannot be before check-in date.",
    path: ["checkOut"],
  });

export type CreateTripHotelInput = z.infer<typeof createTripHotelSchema>;

/**
 * Zod validation schema for updating an existing Trip-Hotel assignment (PATCH).
 */
export const updateTripHotelSchema = z
  .object({
    hotelId: z.string().trim().min(1, "Hotel ID cannot be empty.").optional(),
    checkIn: z.coerce.date().optional(),
    checkOut: z.coerce.date().optional(),
    roomType: z
      .string()
      .trim()
      .min(1, "Room type cannot be empty.")
      .max(100, "Room type must be at most 100 characters.")
      .optional(),
    rooms: z.coerce
      .number()
      .int("Rooms must be an integer.")
      .min(1, "Rooms must be at least 1.")
      .optional(),
    mealPlan: z
      .string()
      .trim()
      .max(50, "Meal plan must be at most 50 characters.")
      .optional()
      .nullable()
      .or(z.literal("")),
    nightlyRate: z.coerce
      .number()
      .min(0, "Nightly rate cannot be negative.")
      .optional()
      .nullable(),
    totalAmount: z.coerce
      .number()
      .min(0, "Total amount cannot be negative.")
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
      if (data.checkIn && data.checkOut) {
        return data.checkOut >= data.checkIn;
      }
      return true;
    },
    {
      message: "Check-out date cannot be before check-in date.",
      path: ["checkOut"],
    }
  );

export type UpdateTripHotelInput = z.infer<typeof updateTripHotelSchema>;

/**
 * Route parameter validation schema for Trip-Hotel route handlers.
 */
export const tripHotelRouteParamsSchema = z.object({
  id: z.string().trim().min(1, "Trip ID is required."),
  hotelId: z.string().trim().min(1, "Trip Hotel assignment ID is required."),
});

export type TripHotelRouteParams = z.infer<typeof tripHotelRouteParamsSchema>;
