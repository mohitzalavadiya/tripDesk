import { z } from "zod";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SupplierPayableStatus,
  SupplierPaymentStatus,
  ExpenseCategory,
} from "@prisma/client";

export const FINANCE_PRESETS = [
  "TODAY",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "CURRENT_MONTH",
  "PREVIOUS_MONTH",
  "CURRENT_YEAR",
  "CUSTOM",
] as const;

export type FinancePreset = (typeof FINANCE_PRESETS)[number];

export const financeFilterSchema = z
  .object({
    preset: z.enum(FINANCE_PRESETS).default("LAST_30_DAYS"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    tripId: z.string().optional(),
    bookingId: z.string().optional(),
    supplierId: z.string().optional(),
    customerId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.preset === "CUSTOM") {
        if (!data.startDate || !data.endDate) return false;
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
      }
      return true;
    },
    {
      message: "Valid startDate and endDate (startDate <= endDate) are required when preset is CUSTOM.",
      path: ["startDate"],
    }
  );

export type FinanceFilterInput = z.infer<typeof financeFilterSchema>;

// ═════════════════════════════════════════════════════════════════════
// CUSTOMER PAYMENT SCHEMAS
// ═════════════════════════════════════════════════════════════════════

export const recordCustomerPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentType: z.nativeEnum(PaymentType).default(PaymentType.PARTIAL),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
  paymentDate: z.string().datetime().or(z.string().min(10)).optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  receiptNumber: z.string().max(100).optional().nullable(),
  receivedBy: z.string().max(150).optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  idempotencyKey: z.string().max(128).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type RecordCustomerPaymentInput = z.infer<typeof recordCustomerPaymentSchema>;

export const refundCustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive("Refund amount must be greater than 0"),
  reason: z.string().min(3, "Refund reason is required (min 3 characters)"),
  referenceNumber: z.string().max(100).optional().nullable(),
  refundDate: z.string().datetime().or(z.string().min(10)).optional(),
  idempotencyKey: z.string().max(128).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type RefundCustomerPaymentInput = z.infer<typeof refundCustomerPaymentSchema>;

// ═════════════════════════════════════════════════════════════════════
// SUPPLIER PAYABLE SCHEMAS
// ═════════════════════════════════════════════════════════════════════

export const createSupplierPayableSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  bookingId: z.string().optional().nullable(),
  tripOperationId: z.string().optional().nullable(),
  tripId: z.string().optional().nullable(),
  serviceType: z.string().default("HOTEL"),
  serviceReferenceId: z.string().optional().nullable(),
  description: z.string().min(2, "Description is required"),
  currency: z.string().default("INR"),
  plannedAmount: z.coerce.number().min(0, "Planned amount cannot be negative").default(0),
  actualAmount: z.coerce.number().min(0, "Actual amount cannot be negative").default(0),
  dueDate: z.string().datetime().or(z.string().min(10)).optional().nullable(),
  idempotencyKey: z.string().max(128).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateSupplierPayableInput = z.infer<typeof createSupplierPayableSchema>;

export const updateSupplierPayableSchema = z.object({
  description: z.string().min(2).optional(),
  plannedAmount: z.coerce.number().min(0).optional(),
  actualAmount: z.coerce.number().min(0).optional(),
  dueDate: z.string().datetime().or(z.string().min(10)).optional().nullable(),
  status: z.nativeEnum(SupplierPayableStatus).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateSupplierPayableInput = z.infer<typeof updateSupplierPayableSchema>;

// ═════════════════════════════════════════════════════════════════════
// SUPPLIER PAYMENT SCHEMAS (DISBURSEMENTS)
// ═════════════════════════════════════════════════════════════════════

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier ID is required"),
  payableId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Disbursement amount must be greater than 0"),
  currency: z.string().optional().default("INR"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  paymentDate: z.string().datetime().or(z.string().min(10)).optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  idempotencyKey: z.string().max(128).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  paidBy: z.string().max(150).optional().nullable(),
});

export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;

// ═════════════════════════════════════════════════════════════════════
// OPERATIONAL EXPENSE SCHEMAS
// ═════════════════════════════════════════════════════════════════════

export const createExpenseSchema = z.object({
  tripOperationId: z.string().optional().nullable(),
  tripId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.MISCELLANEOUS),
  amount: z.coerce.number().positive("Expense amount must be greater than 0"),
  currency: z.string().optional().default("INR"),
  expenseDate: z.string().datetime().or(z.string().min(10)).optional(),
  description: z.string().min(2, "Description is required"),
  receiptNumber: z.string().max(100).optional().nullable(),
  receiptUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  paidBy: z.string().max(150).optional().nullable(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// ═════════════════════════════════════════════════════════════════════
// TRANSACTIONS QUERY SCHEMA
// ═════════════════════════════════════════════════════════════════════

export const TRANSACTION_TYPES = [
  "ALL",
  "CUSTOMER_PAYMENT",
  "CUSTOMER_REFUND",
  "SUPPLIER_PAYMENT",
  "EXPENSE",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(TRANSACTION_TYPES).optional().default("ALL"),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  bookingId: z.string().optional(),
  supplierId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["date", "amount"]).optional().default("date"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export interface TransactionQueryInput {
  page?: number;
  limit?: number;
  type?: TransactionType;
  paymentMethod?: PaymentMethod;
  bookingId?: string;
  supplierId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "date" | "amount";
  sortOrder?: "asc" | "desc";
}
