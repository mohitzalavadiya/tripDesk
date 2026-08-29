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
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateActivityConfirmationInput = z.infer<typeof updateActivityConfirmationSchema>;

// ---------------------------------------------------------
// OPERATIONAL ISSUE
// ---------------------------------------------------------

export const createOperationalIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().trim().max(5000).default("").optional(),
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
