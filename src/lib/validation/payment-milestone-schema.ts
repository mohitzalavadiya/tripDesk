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
