import { z } from "zod";

export const createPackageOptionSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100, "Package name must not exceed 100 characters"),
  subtitle: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isRecommended: z.boolean().optional().default(false),
  subtotal: z.number().min(0, "Subtotal must be positive").optional().default(0),
  markupPercentage: z.number().min(0).max(500).optional().default(0),
  markupAmount: z.number().min(0).optional().default(0),
  discountPercentage: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  taxPercentage: z.number().min(0).max(100).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  finalAmount: z.number().min(0, "Final package amount must be positive").optional(),
  hotelNotes: z.string().max(1000).optional().nullable(),
  vehicleNotes: z.string().max(1000).optional().nullable(),
  activityNotes: z.string().max(1000).optional().nullable(),
  inclusions: z.array(z.string().min(1)).optional().default([]),
  exclusions: z.array(z.string().min(1)).optional().default([]),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updatePackageOptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subtitle: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isRecommended: z.boolean().optional(),
  subtotal: z.number().min(0).optional(),
  markupPercentage: z.number().min(0).max(500).optional(),
  markupAmount: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  taxAmount: z.number().min(0).optional(),
  finalAmount: z.number().min(0).optional(),
  hotelNotes: z.string().max(1000).optional().nullable(),
  vehicleNotes: z.string().max(1000).optional().nullable(),
  activityNotes: z.string().max(1000).optional().nullable(),
  inclusions: z.array(z.string().min(1)).optional(),
  exclusions: z.array(z.string().min(1)).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const reorderPackageOptionsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, "At least one package item is required for reordering"),
});

export const selectPackageOptionSchema = z.object({
  optionId: z.string().min(1, "Option ID is required"),
});

export type CreatePackageOptionInput = z.input<typeof createPackageOptionSchema>;
export type UpdatePackageOptionInput = z.input<typeof updatePackageOptionSchema>;
export type ReorderPackageOptionsInput = z.input<typeof reorderPackageOptionsSchema>;
export type SelectPackageOptionInput = z.input<typeof selectPackageOptionSchema>;
