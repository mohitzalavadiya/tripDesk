import { z } from "zod";
import {
  EnquiryStatus,
  EnquiryPriority,
  EnquirySource,
  FollowUpType,
  FollowUpStatus,
} from "@prisma/client";

/**
 * Zod schema for creating a new Enquiry
 */
export const createEnquirySchema = z
  .object({
    customerId: z.string().min(1, "Customer ID is required"),
    title: z.string().trim().max(200).optional(),
    destination: z.string().trim().min(1, "Destination is required").max(200),
    origin: z.string().trim().max(200).optional().nullable(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    adults: z.coerce.number().int().min(1, "At least 1 adult is required").default(1),
    children: z.coerce.number().int().min(0).default(0),
    infants: z.coerce.number().int().min(0).default(0),
    budget: z.coerce.number().min(0).optional().nullable(),
    budgetType: z.enum(["total", "per_person"]).default("total").optional().nullable(),
    currency: z.string().trim().default("INR").optional(),
    hotelCategory: z.string().trim().max(100).optional().nullable(),
    mealPlan: z.string().trim().max(100).optional().nullable(),
    vehiclePreference: z.string().trim().max(100).optional().nullable(),
    transportRequired: z.boolean().default(false).optional(),
    source: z.nativeEnum(EnquirySource).default(EnquirySource.WHATSAPP).optional(),
    priority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
    status: z.nativeEnum(EnquiryStatus).default(EnquiryStatus.NEW).optional(),
    specialRequirements: z.string().trim().max(5000).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    internalNotes: z.string().trim().max(5000).optional().nullable(),
    assignedTo: z.string().trim().max(100).optional().nullable(),
    nextFollowUpAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

/**
 * Zod schema for updating an existing Enquiry (PATCH)
 */
export const updateEnquirySchema = z
  .object({
    customerId: z.string().min(1).optional(),
    title: z.string().trim().max(200).optional(),
    destination: z.string().trim().min(1).max(200).optional(),
    origin: z.string().trim().max(200).optional().nullable(),
    startDate: z.coerce.date().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    adults: z.coerce.number().int().min(1).optional(),
    children: z.coerce.number().int().min(0).optional(),
    infants: z.coerce.number().int().min(0).optional(),
    budget: z.coerce.number().min(0).optional().nullable(),
    budgetType: z.enum(["total", "per_person"]).optional().nullable(),
    currency: z.string().trim().optional(),
    hotelCategory: z.string().trim().max(100).optional().nullable(),
    mealPlan: z.string().trim().max(100).optional().nullable(),
    vehiclePreference: z.string().trim().max(100).optional().nullable(),
    transportRequired: z.boolean().optional(),
    source: z.nativeEnum(EnquirySource).optional(),
    priority: z.nativeEnum(EnquiryPriority).optional(),
    status: z.nativeEnum(EnquiryStatus).optional(),
    specialRequirements: z.string().trim().max(5000).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    internalNotes: z.string().trim().max(5000).optional().nullable(),
    assignedTo: z.string().trim().max(100).optional().nullable(),
    nextFollowUpAt: z.coerce.date().optional().nullable(),
    lostReason: z.string().trim().max(2000).optional().nullable(),
    lostExplanation: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;

/**
 * Standard structured reasons for marking a lead/enquiry LOST
 */
export const STANDARD_LOST_REASONS = [
  "PRICE_TOO_HIGH",
  "CUSTOMER_CHANGED_PLAN",
  "TRAVEL_CANCELLED",
  "CHOSE_COMPETITOR",
  "NO_RESPONSE",
  "DATES_UNAVAILABLE",
  "DESTINATION_CHANGED",
  "DUPLICATE_ENQUIRY",
  "OTHER",
] as const;

export type StandardLostReason = (typeof STANDARD_LOST_REASONS)[number];

/**
 * Zod schema for transitioning lead stage with mandatory guardrails
 */
export const transitionStageSchema = z.object({
  status: z.nativeEnum(EnquiryStatus),
  lostReason: z.string().trim().optional().nullable(),
  lostExplanation: z.string().trim().max(5000).optional().nullable(),
  convertedTripId: z.string().trim().optional().nullable(),
  convertedQuotationId: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
}).refine(
  (data) => {
    if (data.status === EnquiryStatus.LOST) {
      return Boolean(data.lostReason && data.lostReason.trim().length > 0);
    }
    return true;
  },
  {
    message: "A structured lost reason is required when marking an enquiry as LOST.",
    path: ["lostReason"],
  }
);

export type TransitionStageInput = z.infer<typeof transitionStageSchema>;

/**
 * Zod schema for explicitly marking an Enquiry as LOST
 */
export const markEnquiryLostSchema = z.object({
  lostReason: z.string().trim().min(1, "Lost reason is required"),
  lostExplanation: z.string().trim().max(5000).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export type MarkEnquiryLostInput = z.infer<typeof markEnquiryLostSchema>;

/**
 * Zod schema for marking an Enquiry as WON
 */
export const markEnquiryWonSchema = z.object({
  tripId: z.string().trim().optional().nullable(),
  quotationId: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export type MarkEnquiryWonInput = z.infer<typeof markEnquiryWonSchema>;

/**
 * Zod schema for checking duplicate active enquiries
 */
export const checkDuplicateEnquirySchema = z.object({
  customerId: z.string().trim().min(1, "Customer ID is required"),
  destination: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  excludeId: z.string().trim().optional(),
});

export type CheckDuplicateEnquiryQuery = z.infer<typeof checkDuplicateEnquirySchema>;

/**
 * Zod schema for querying enquiries with filters
 */
export const enquiryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(EnquiryStatus).optional(),
  priority: z.nativeEnum(EnquiryPriority).optional(),
  source: z.nativeEnum(EnquirySource).optional(),
  customerId: z.string().trim().optional(),
  sortBy: z
    .enum(["createdAt", "startDate", "enquiryNumber", "priority", "nextFollowUpAt", "budget"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type EnquiryQueryInput = z.infer<typeof enquiryQuerySchema>;

/**
 * Zod schema for converting Enquiry to a Trip
 */
export const convertEnquiryToTripSchema = z.object({
  title: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export type ConvertEnquiryToTripInput = z.infer<typeof convertEnquiryToTripSchema>;

/**
 * Zod schema for creating an Enquiry Follow-up
 */
export const createFollowUpSchema = z.object({
  type: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
  priority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
  status: z.nativeEnum(FollowUpStatus).default(FollowUpStatus.PENDING).optional(),
  scheduledAt: z.coerce.date(),
  outcome: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

/**
 * Zod schema for updating an Enquiry Follow-up
 */
export const updateFollowUpSchema = z
  .object({
    type: z.nativeEnum(FollowUpType).optional(),
    priority: z.nativeEnum(EnquiryPriority).optional(),
    status: z.nativeEnum(FollowUpStatus).optional(),
    scheduledAt: z.coerce.date().optional(),
    outcome: z.string().trim().max(2000).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    completedAt: z.coerce.date().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
