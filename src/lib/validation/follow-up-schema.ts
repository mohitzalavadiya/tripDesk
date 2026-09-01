import { z } from "zod";
import { FollowUpType, FollowUpStatus, EnquiryPriority } from "@prisma/client";

/**
 * Zod schema for global follow-up listing and filtering
 */
export const globalFollowUpQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  scope: z.enum(["overdue", "today", "upcoming", "completed", "all"]).default("all").optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  type: z.nativeEnum(FollowUpType).optional(),
  priority: z.nativeEnum(EnquiryPriority).optional(),
  search: z.string().trim().optional(),
  enquiryId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(["scheduledAt", "createdAt", "priority", "status"]).default("scheduledAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
});

export type GlobalFollowUpQueryInput = z.infer<typeof globalFollowUpQuerySchema>;

/**
 * Zod schema for creating a new follow-up globally
 */
export const createGlobalFollowUpSchema = z.object({
  enquiryId: z.string().trim().min(1, "Enquiry ID is required"),
  type: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
  priority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
  status: z.nativeEnum(FollowUpStatus).default(FollowUpStatus.PENDING).optional(),
  scheduledAt: z.coerce.date(),
  outcome: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateGlobalFollowUpInput = z.infer<typeof createGlobalFollowUpSchema>;

/**
 * Zod schema for completing a follow-up with outcome and optional next follow-up scheduling
 */
export const completeFollowUpSchema = z.object({
  outcome: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  scheduleNext: z.boolean().default(false).optional(),
  nextFollowUp: z
    .object({
      type: z.nativeEnum(FollowUpType).default(FollowUpType.CALL).optional(),
      priority: z.nativeEnum(EnquiryPriority).default(EnquiryPriority.MEDIUM).optional(),
      scheduledAt: z.coerce.date(),
      notes: z.string().trim().max(2000).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;

/**
 * Zod schema for rescheduling a follow-up
 */
export const rescheduleFollowUpSchema = z.object({
  scheduledAt: z.coerce.date(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>;

/**
 * Zod schema for cancelling a follow-up
 */
export const cancelFollowUpSchema = z.object({
  reason: z.string().trim().max(2000).optional().nullable(),
});

export type CancelFollowUpInput = z.infer<typeof cancelFollowUpSchema>;
