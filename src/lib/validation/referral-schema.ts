import { z } from "zod";

export const referralFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "CONVERTED", "REWARDED", "EXPIRED", "CANCELLED"]).optional(),
  referrerCustomerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ReferralFilterInput = z.input<typeof referralFilterSchema>;

export const referralCreateSchema = z.object({
  referrerCustomerId: z.string().min(1, "Referrer customer is required"),
  referredName: z.string().min(2, "Referred friend name is required").max(100),
  referredEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  referredPhone: z.string().max(20).optional().nullable(),
  rewardAmount: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ReferralCreateInput = z.infer<typeof referralCreateSchema>;

export const referralStatusUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONVERTED", "REWARDED", "EXPIRED", "CANCELLED"]),
  rewardAmount: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  convertedBookingId: z.string().optional().nullable(),
});

export type ReferralStatusUpdateInput = z.infer<typeof referralStatusUpdateSchema>;
