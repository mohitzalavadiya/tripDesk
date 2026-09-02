import { z } from "zod";

export const adminAgencyFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  planId: z.string().optional(),
  trialState: z.enum(["ACTIVE", "EXPIRED", "NONE"]).optional(),
  sortBy: z.enum(["createdAt", "name", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminAgencyFilterInput = z.input<typeof adminAgencyFilterSchema>;

export const extendTrialSchema = z.object({
  daysToAdd: z.number().int().min(1, "Must add at least 1 day").max(365, "Cannot extend more than 365 days"),
  reason: z.string().min(3, "Please provide a reason for the trial extension (min 3 chars)").max(500),
});

export type ExtendTrialInput = z.infer<typeof extendTrialSchema>;

export const suspendAgencySchema = z.object({
  reason: z.string().min(3, "Please provide a reason for agency suspension (min 3 chars)").max(500),
});

export type SuspendAgencyInput = z.infer<typeof suspendAgencySchema>;

export const planCreateSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0, "Price must be non-negative"),
  durationDays: z.number().int().min(1, "Duration must be at least 1 day"),
  isActive: z.boolean().default(true),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;

export const planUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.number().min(0).optional(),
  durationDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

export const announcementCreateSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000),
  type: z.enum(["INFO", "WARNING", "MAINTENANCE", "FEATURE"]).default("INFO"),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).default("ACTIVE"),
  startAt: z.string().or(z.date()).optional().nullable(),
  endAt: z.string().or(z.date()).optional().nullable(),
});

export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>;

export const announcementUpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  message: z.string().min(5).max(2000).optional(),
  type: z.enum(["INFO", "WARNING", "MAINTENANCE", "FEATURE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
  startAt: z.string().or(z.date()).optional().nullable(),
  endAt: z.string().or(z.date()).optional().nullable(),
});

export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateSchema>;

export const platformSettingsUpdateSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export type PlatformSettingsUpdateInput = z.infer<typeof platformSettingsUpdateSchema>;

export const globalSearchSchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters").max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;

export const subscriptionPaymentFilterSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "REFUNDED"]).optional(),
  agencyId: z.string().optional(),
  subscriptionId: z.string().optional(),
  planId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SubscriptionPaymentFilterInput = z.input<typeof subscriptionPaymentFilterSchema>;

export const subscriptionPaymentCreateSchema = z.object({
  agencyId: z.string().min(1, "Agency ID is required"),
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("INR"),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CARD", "CHEQUE", "OTHER"]).default("UPI"),
  paymentReference: z.string().max(200).optional().nullable(),
  utrNumber: z.string().max(100).optional().nullable(),
  paymentDate: z.string().or(z.date()).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type SubscriptionPaymentCreateInput = z.infer<typeof subscriptionPaymentCreateSchema>;

export const subscriptionPaymentVerifySchema = z.object({
  notes: z.string().max(1000).optional(),
});

export type SubscriptionPaymentVerifyInput = z.infer<typeof subscriptionPaymentVerifySchema>;

export const subscriptionPaymentRejectSchema = z.object({
  reason: z.string().min(3, "Please provide a rejection reason (min 3 chars)").max(500),
});

export type SubscriptionPaymentRejectInput = z.infer<typeof subscriptionPaymentRejectSchema>;

