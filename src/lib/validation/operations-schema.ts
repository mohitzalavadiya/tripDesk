import { z } from "zod";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";

// ---------------------------------------------------------
// TRIP OPERATION
// ---------------------------------------------------------

export const createTripOperationSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  bookingId: z.string().trim().optional().nullable(),
  coordinatorId: z.string().trim().optional().nullable(),
  status: z.nativeEnum(OperationStatus).default(OperationStatus.PENDING).optional(),
  operationStartDate: z.coerce.date().optional().nullable(),
  operationEndDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export type CreateTripOperationInput = z.infer<typeof createTripOperationSchema>;

export const updateTripOperationSchema = z
  .object({
    bookingId: z.string().trim().optional().nullable(),
    coordinatorId: z.string().trim().optional().nullable(),
    status: z.nativeEnum(OperationStatus).optional(),
    operationStartDate: z.coerce.date().optional().nullable(),
    operationEndDate: z.coerce.date().optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateTripOperationInput = z.infer<typeof updateTripOperationSchema>;

export const tripOperationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  status: z.nativeEnum(OperationStatus).optional(),
  tripId: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type TripOperationQueryInput = z.infer<typeof tripOperationQuerySchema>;

// ---------------------------------------------------------
// HOTEL CONFIRMATION
// ---------------------------------------------------------

export const createHotelConfirmationSchema = z.object({
  tripHotelId: z.string().min(1, "TripHotel ID is required"),
  confirmationNumber: z.string().trim().max(200).optional().nullable(),
  status: z.nativeEnum(ConfirmationStatus).default(ConfirmationStatus.PENDING).optional(),
  confirmedAt: z.coerce.date().optional().nullable(),
  checkIn: z.coerce.date().optional().nullable(),
  checkOut: z.coerce.date().optional().nullable(),
  roomDetails: z.string().trim().max(1000).optional().nullable(),
  mealPlan: z.string().trim().max(200).optional().nullable(),
  supplierNotes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateHotelConfirmationInput = z.infer<typeof createHotelConfirmationSchema>;

export const updateHotelConfirmationSchema = z
  .object({
    supplierId: z.string().trim().optional().nullable(),
    confirmationNumber: z.string().trim().max(200).optional().nullable(),
    status: z.nativeEnum(ConfirmationStatus).optional(),
    confirmedAt: z.coerce.date().optional().nullable(),
    checkIn: z.coerce.date().optional().nullable(),
    checkOut: z.coerce.date().optional().nullable(),
    roomDetails: z.string().trim().max(1000).optional().nullable(),
    mealPlan: z.string().trim().max(200).optional().nullable(),
    supplierNotes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateHotelConfirmationInput = z.infer<typeof updateHotelConfirmationSchema>;

// ---------------------------------------------------------
// VEHICLE DISPATCH
// ---------------------------------------------------------

export const createVehicleDispatchSchema = z.object({
  tripVehicleId: z.string().min(1, "TripVehicle ID is required"),
  vehicleId: z.string().trim().optional().nullable(),
  driverName: z.string().trim().max(200).optional().nullable(),
  driverPhone: z.string().trim().max(20).optional().nullable(),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  pickupDate: z.coerce.date().optional().nullable(),
  pickupTime: z.string().trim().max(10).optional().nullable(),
  pickupLocation: z.string().trim().max(500).optional().nullable(),
  dropLocation: z.string().trim().max(500).optional().nullable(),
  status: z.nativeEnum(DispatchStatus).default(DispatchStatus.PENDING).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateVehicleDispatchInput = z.infer<typeof createVehicleDispatchSchema>;

export const updateVehicleDispatchSchema = z
  .object({
    vehicleId: z.string().trim().optional().nullable(),
    driverName: z.string().trim().max(200).optional().nullable(),
    driverPhone: z.string().trim().max(20).optional().nullable(),
    vehicleNumber: z.string().trim().max(50).optional().nullable(),
    pickupDate: z.coerce.date().optional().nullable(),
    pickupTime: z.string().trim().max(10).optional().nullable(),
    pickupLocation: z.string().trim().max(500).optional().nullable(),
    dropLocation: z.string().trim().max(500).optional().nullable(),
    status: z.nativeEnum(DispatchStatus).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateVehicleDispatchInput = z.infer<typeof updateVehicleDispatchSchema>;

// ---------------------------------------------------------
// ACTIVITY CONFIRMATION
// ---------------------------------------------------------

export const createActivityConfirmationSchema = z.object({
  tripActivityId: z.string().min(1, "TripActivity ID is required"),
  confirmationNumber: z.string().trim().max(200).optional().nullable(),
  ticketNumber: z.string().trim().max(200).optional().nullable(),
  status: z.nativeEnum(ConfirmationStatus).default(ConfirmationStatus.PENDING).optional(),
  confirmedAt: z.coerce.date().optional().nullable(),
  supplierNotes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateActivityConfirmationInput = z.infer<typeof createActivityConfirmationSchema>;

export const updateActivityConfirmationSchema = z
  .object({
    confirmationNumber: z.string().trim().max(200).optional().nullable(),
    ticketNumber: z.string().trim().max(200).optional().nullable(),
    status: z.nativeEnum(ConfirmationStatus).optional(),
    confirmedAt: z.coerce.date().optional().nullable(),
    supplierNotes: z.string().trim().max(2000).optional().nullable(),
    date: z.coerce.date().optional().nullable(),
    time: z.string().trim().max(100).optional().nullable(),
    location: z.string().trim().max(500).optional().nullable(),
    cancellationReason: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateActivityConfirmationInput = z.infer<typeof updateActivityConfirmationSchema>;

// ---------------------------------------------------------
// OPERATIONAL ISSUE
// ---------------------------------------------------------

export const createOperationalIssueSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().min(1, "Description is required").max(5000),
  priority: z.nativeEnum(IssuePriority).default(IssuePriority.MEDIUM).optional(),
  assignedTo: z.string().trim().max(200).optional().nullable(),
  reportedBy: z.string().trim().max(200).optional().nullable(),
});

export type CreateOperationalIssueInput = z.infer<typeof createOperationalIssueSchema>;

export const updateOperationalIssueSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.nativeEnum(IssuePriority).optional(),
    status: z.nativeEnum(IssueStatus).optional(),
    assignedTo: z.string().trim().max(200).optional().nullable(),
    reportedBy: z.string().trim().max(200).optional().nullable(),
    resolution: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateOperationalIssueInput = z.infer<typeof updateOperationalIssueSchema>;

// ---------------------------------------------------------
// OPERATION EVENT (TIMELINE & AUDIT LOG)
// ---------------------------------------------------------

export const OPERATION_EVENT_TYPES = [
  "NOTE_ADDED",
  "STATUS_CHANGED",
  "COORDINATOR_ASSIGNED",
  "HOTEL_REQUESTED",
  "HOTEL_CONFIRMED",
  "HOTEL_FAILED",
  "HOTEL_CANCELLED",
  "VEHICLE_ASSIGNED",
  "VEHICLE_CONFIRMED",
  "VEHICLE_DISPATCHED",
  "VEHICLE_COMPLETED",
  "VEHICLE_CANCELLED",
  "ACTIVITY_CONFIRMED",
  "ACTIVITY_CANCELLED",
  "ISSUE_REPORTED",
  "ISSUE_RESOLVED",
  "ISSUE_CLOSED",
  "OPERATION_CREATED",
  "OPERATION_COMPLETED",
  "OPERATION_CANCELLED",
] as const;

export type OperationEventType = (typeof OPERATION_EVENT_TYPES)[number];

export const createOperationEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required").max(100),
  description: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  createdBy: z.string().trim().max(200).optional().nullable(),
});

export type CreateOperationEventInput = z.infer<typeof createOperationEventSchema>;

// ---------------------------------------------------------
// OPERATIONAL COMMUNICATIONS DISPATCH
// ---------------------------------------------------------

export const logCommunicationSchema = z.object({
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL", "PHONE"]).default("WHATSAPP"),
  recipientName: z.string().trim().min(1, "Recipient name is required").max(200),
  recipientPhone: z.string().trim().max(50).optional().nullable(),
  templateType: z.string().trim().min(1, "Template type is required").max(100),
  messageBody: z.string().trim().min(1, "Message body cannot be empty").max(5000),
});

export type LogCommunicationInput = z.infer<typeof logCommunicationSchema>;

// ---------------------------------------------------------
// OPERATIONS CLOSURE & FINANCIAL RECONCILIATION
// ---------------------------------------------------------

export const postTourReviewSchema = z.object({
  guestRating: z.coerce.number().int().min(1).max(5),
  operatorRating: z.coerce.number().int().min(1).max(5),
  serviceQuality: z.enum(["EXCELLENT", "GOOD", "AVERAGE", "POOR"]).default("EXCELLENT"),
  internalRemarks: z.string().trim().min(1, "Internal remarks are required").max(3000),
  guestFeedback: z.string().trim().max(3000).optional().nullable(),
  hotelFeedback: z.string().trim().max(1500).optional().nullable(),
  fleetFeedback: z.string().trim().max(1500).optional().nullable(),
  activityFeedback: z.string().trim().max(1500).optional().nullable(),
});

export type PostTourReviewInput = z.infer<typeof postTourReviewSchema>;

export const costAdjustmentItemSchema = z.object({
  id: z.string().trim().optional(),
  supplier: z.string().trim().min(1, "Supplier name is required").max(200),
  category: z.enum([
    "HOTEL_AMENDMENT",
    "ROOM_UPGRADE",
    "EXTRA_VEHICLE_KM",
    "VEHICLE_UPGRADE",
    "ACTIVITY_ADDON",
    "CANCELLATION_FEE",
    "GUEST_REQUEST",
    "OPERATIONAL_ERROR",
    "OTHER",
  ]),
  amount: z.coerce.number(),
  reason: z.string().trim().min(1, "Adjustment reason is required").max(500),
  reference: z.string().trim().max(100).optional().nullable(),
});

export type CostAdjustmentItem = z.infer<typeof costAdjustmentItemSchema>;

export const financialReconciliationSchema = z
  .object({
    plannedCost: z.coerce.number().min(0, "Planned cost must be non-negative"),
    actualCost: z.coerce.number().min(0, "Actual cost must be non-negative"),
    varianceAmount: z.coerce.number(),
    varianceReason: z.string().trim().max(1000).optional().nullable(),
    adjustments: z.array(costAdjustmentItemSchema).default([]),
    remarks: z.string().trim().max(3000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (Math.abs(data.varianceAmount) > 0.01) {
        return !!data.varianceReason && data.varianceReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Variance reason is mandatory whenever planned and actual costs differ.",
      path: ["varianceReason"],
    }
  );

export type FinancialReconciliationInput = z.infer<typeof financialReconciliationSchema>;

export const finalizeOperationSchema = z.object({
  closureNotes: z.string().trim().max(3000).optional().nullable(),
  acknowledgedDiscrepancies: z.boolean().default(true),
});

export type FinalizeOperationInput = z.infer<typeof finalizeOperationSchema>;

export const reopenOperationSchema = z.object({
  reopenReason: z
    .string()
    .trim()
    .min(5, "Reopen reason must be at least 5 characters")
    .max(2000),
});

export type ReopenOperationInput = z.infer<typeof reopenOperationSchema>;

// ---------------------------------------------------------
// PHASE 10.13J: OPERATIONS ANALYTICS & MANAGEMENT INSIGHTS
// ---------------------------------------------------------

export const ANALYTICS_PRESETS = [
  "TODAY",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "CURRENT_MONTH",
  "PREVIOUS_MONTH",
  "CURRENT_YEAR",
  "CUSTOM",
] as const;

export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number];

export const analyticsFilterSchema = z
  .object({
    preset: z
      .enum([
        "TODAY",
        "LAST_7_DAYS",
        "LAST_30_DAYS",
        "LAST_90_DAYS",
        "CURRENT_MONTH",
        "PREVIOUS_MONTH",
        "CURRENT_YEAR",
        "CUSTOM",
      ])
      .default("LAST_30_DAYS"),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    status: z.nativeEnum(OperationStatus).optional(),
    serviceType: z.enum(["HOTEL", "VEHICLE", "ACTIVITY", "ALL"]).optional(),
    supplierId: z.string().trim().optional(),
    search: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.preset === "CUSTOM") {
        if (!data.startDate || !data.endDate) return false;
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        if (start > end) return false;
      }
      return true;
    },
    {
      message:
        "Valid startDate and endDate are required when preset is CUSTOM, and startDate cannot be after endDate.",
      path: ["startDate"],
    }
  );

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;
