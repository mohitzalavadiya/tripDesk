import { z } from "zod";

/**
 * Zod schema for creating a payment milestone on a quotation
 */
export const createPaymentMilestoneSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Milestone title is required")
      .max(200, "Title cannot exceed 200 characters"),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    percentage: z
      .number()
      .min(0, "Percentage must be non-negative")
      .max(100, "Percentage cannot exceed 100")
      .optional()
      .nullable(),
    amount: z
      .number()
      .min(0, "Amount must be non-negative")
      .optional()
      .nullable(),
    dueDate: z.coerce.date().optional().nullable(),
    sortOrder: z.number().int().min(0).default(0).optional(),
  })
  .refine(
    (data) =>
      (data.percentage !== undefined && data.percentage !== null) ||
      (data.amount !== undefined && data.amount !== null),
    {
      message: "Either percentage or amount must be specified for a payment milestone.",
    }
  );

export type CreatePaymentMilestoneInput = z.infer<typeof createPaymentMilestoneSchema>;

/**
 * Zod schema for updating a payment milestone (PATCH)
 */
export const updatePaymentMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    percentage: z.number().min(0).max(100).optional().nullable(),
    amount: z.number().min(0).optional().nullable(),
    dueDate: z.coerce.date().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdatePaymentMilestoneInput = z.infer<typeof updatePaymentMilestoneSchema>;

/**
 * Zod schema for auto-generating a default payment schedule
 */
export const generatePaymentScheduleSchema = z.object({
  template: z
    .enum(["STANDARD_3_TIER", "ADVANCE_AND_BALANCE", "FULL_ADVANCE"])
    .default("STANDARD_3_TIER")
    .optional(),
});

export type GeneratePaymentScheduleInput = z.infer<typeof generatePaymentScheduleSchema>;

/**
 * Zod schema for individual milestone item in atomic sync
 */
export const syncPaymentMilestoneItemSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Milestone title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),
  percentage: z
    .number()
    .gt(0, "Percentage must be greater than 0")
    .max(100, "Percentage cannot exceed 100"),
  amount: z.number().min(0, "Amount must be non-negative").optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export type SyncPaymentMilestoneItemInput = z.infer<typeof syncPaymentMilestoneItemSchema>;

/**
 * Zod schema for synchronizing full payment schedule (terms + milestones) atomically
 */
export const syncPaymentScheduleSchema = z
  .object({
    paymentTerms: z.string().trim().max(3000, "Payment terms cannot exceed 3000 characters").optional().nullable(),
    milestones: z.array(syncPaymentMilestoneItemSchema).default([]),
  })
  .refine(
    (data) => {
      if (!data.milestones || data.milestones.length === 0) return true;
      const totalPct = data.milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
      return Math.abs(totalPct - 100) < 0.01;
    },
    {
      message: "Total milestone percentage must equal exactly 100% when milestones are configured",
      path: ["milestones"],
    }
  );

export type SyncPaymentScheduleInput = z.infer<typeof syncPaymentScheduleSchema>;

/**
 * Zod schema for batch reordering payment milestones
 */
export const reorderPaymentMilestonesSchema = z
  .object({
    milestoneIds: z
      .array(z.string().min(1, "Milestone ID cannot be empty"))
      .min(1, "At least one milestone ID is required"),
  })
  .refine(
    (data) => new Set(data.milestoneIds).size === data.milestoneIds.length,
    {
      message: "Duplicate milestone IDs are not allowed in reorder list",
      path: ["milestoneIds"],
    }
  );

export type ReorderPaymentMilestonesInput = z.infer<typeof reorderPaymentMilestonesSchema>;
