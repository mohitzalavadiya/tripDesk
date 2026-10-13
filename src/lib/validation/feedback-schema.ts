import { z } from "zod";

export const feedbackFilterSchema = z.object({
  search: z.string().optional(),
  tab: z.enum(["ALL", "ATTENTION", "POSITIVE"]).default("ALL"),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type FeedbackFilterInput = z.input<typeof feedbackFilterSchema>;

export const feedbackCreateSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  tripId: z.string().min(1, "Trip ID is required"),
  bookingId: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  serviceRating: z.number().int().min(1).max(5).optional(),
  hotelRating: z.number().int().min(1).max(5).optional(),
  driverRating: z.number().int().min(1).max(5).optional(),
  vehicleRating: z.number().int().min(1).max(5).optional(),
  activityRating: z.number().int().min(1).max(5).optional(),
  supportRating: z.number().int().min(1).max(5).optional(),
  positiveComment: z.string().max(2000).optional().nullable(),
  improvementComment: z.string().max(2000).optional().nullable(),
  travelAgain: z.enum(["Yes", "Maybe", "No"]).default("Yes"),
  comments: z.string().max(2000).optional().nullable(),
  source: z.string().default("MANUAL"),
});

export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;

export const feedbackUpdateRecoverySchema = z.object({
  serviceRecoveryStatus: z.enum(["Not Needed", "Follow-up Required", "Contacted", "Resolved"]),
  serviceRecoveryNotes: z.string().max(2000).optional().nullable(),
});

export type FeedbackUpdateRecoveryInput = z.infer<typeof feedbackUpdateRecoverySchema>;

export const customerPublicFeedbackSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  serviceRating: z.number().int().min(1).max(5).optional().nullable(),
  hotelRating: z.number().int().min(1).max(5).optional().nullable(),
  driverRating: z.number().int().min(1).max(5).optional().nullable(),
  vehicleRating: z.number().int().min(1).max(5).optional().nullable(),
  activityRating: z.number().int().min(1).max(5).optional().nullable(),
  supportRating: z.number().int().min(1).max(5).optional().nullable(),
  positiveComment: z.string().max(2000, "Maximum 2000 characters").optional().nullable(),
  improvementComment: z.string().max(2000, "Maximum 2000 characters").optional().nullable(),
  travelAgain: z.enum(["Yes", "Maybe", "No"]).default("Yes"),
  comments: z.string().max(2000, "Maximum 2000 characters").optional().nullable(),
});

export type CustomerPublicFeedbackInput = z.infer<typeof customerPublicFeedbackSchema>;

