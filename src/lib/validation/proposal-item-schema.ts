import { z } from "zod";
import { ProposalItemType } from "@prisma/client";

/**
 * Zod schema for creating a single Quotation Proposal Item (Inclusion / Exclusion / Note)
 */
export const createProposalItemSchema = z.object({
  type: z.nativeEnum(ProposalItemType, {
    message: "Invalid proposal item type. Must be INCLUSION, EXCLUSION, or IMPORTANT_NOTE.",
  }),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(500, "Title cannot exceed 500 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).default(0).optional(),
});

export type CreateProposalItemInput = z.infer<typeof createProposalItemSchema>;

/**
 * Zod schema for updating a Proposal Item (PATCH)
 */
export const updateProposalItemSchema = z
  .object({
    type: z.nativeEnum(ProposalItemType).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateProposalItemInput = z.infer<typeof updateProposalItemSchema>;

/**
 * Zod schema for batch reordering items
 */
export const reorderProposalItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "Item ID is required"),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, "At least one item required to reorder"),
});

export type ReorderProposalItemsInput = z.infer<typeof reorderProposalItemsSchema>;
