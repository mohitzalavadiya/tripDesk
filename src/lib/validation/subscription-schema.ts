import { z } from "zod";

export const agencyPaymentRequestSchema = z.object({
  planId: z.string().min(1, "Plan selection is required"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("UPI"),
  utrNumber: z.string().min(4, "Please enter a valid transaction reference / UTR (min 4 characters)").max(100),
  paymentReference: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type AgencyPaymentRequestInput = z.infer<typeof agencyPaymentRequestSchema>;
