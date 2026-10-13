import { z } from "zod";

/**
 * Zod schema for creating a Quotation Item
 */
export const createQuotationItemSchema = z.object({
  type: z.string().trim().min(1, "Item type is required"),
  category: z.string().trim().optional().nullable(),
  sourceType: z.string().trim().optional().nullable(),
  sourceId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Item name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").default(1).optional(),
  unit: z.string().trim().max(50).optional().nullable(),
  unitPrice: z.number().min(0, "Unit price must be non-negative").default(0).optional(),
  costPrice: z.number().min(0, "Cost price must be non-negative").default(0).optional(),
  markupPercentage: z.number().min(0).max(500).default(0).optional(),
  sellingPrice: z.number().min(0).default(0).optional(),
  totalPrice: z.number().min(0).default(0).optional(),
  discount: z.number().min(0).default(0).optional(),
  tax: z.number().min(0).default(0).optional(),
  isOptional: z.boolean().default(false).optional(),
  sortOrder: z.number().int().min(0).default(0).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateQuotationItemInput = z.infer<typeof createQuotationItemSchema>;


/**
 * Zod schema for updating a Quotation Item (PATCH)
 */
export const updateQuotationItemSchema = z
  .object({
    type: z.string().trim().min(1).optional(),
    category: z.string().trim().optional().nullable(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    quantity: z.number().int().min(1).optional(),
    unit: z.string().trim().max(50).optional().nullable(),
    unitPrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    markupPercentage: z.number().min(0).max(500).optional(),
    sellingPrice: z.number().min(0).optional(),
    totalPrice: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    isOptional: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateQuotationItemInput = z.input<typeof updateQuotationItemSchema>;

