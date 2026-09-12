import { z } from "zod";
import { TaxMode, GstTreatment } from "@prisma/client";

export const updateAgencyTaxProfileSchema = z.object({
  isGstRegistered: z.boolean().default(false),
  gstin: z
    .string()
    .trim()
    .max(20, "GSTIN must not exceed 20 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  legalBusinessName: z
    .string()
    .trim()
    .max(200, "Legal business name must not exceed 200 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  registeredAddress: z
    .string()
    .trim()
    .max(500, "Registered address must not exceed 500 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  state: z
    .string()
    .trim()
    .max(100, "State must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  stateCode: z
    .string()
    .trim()
    .max(10, "State code must not exceed 10 characters")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  defaultTaxMode: z.nativeEnum(TaxMode).default(TaxMode.EXCLUSIVE),
  defaultGstRate: z.coerce.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%").default(0),
  defaultGstTreatment: z.nativeEnum(GstTreatment).default(GstTreatment.INTRA_STATE),
});

export type UpdateAgencyTaxProfileInput = z.infer<typeof updateAgencyTaxProfileSchema>;
