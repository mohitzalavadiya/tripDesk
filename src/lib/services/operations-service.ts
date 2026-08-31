import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
  TripStatus,
  BookingStatus,
  Prisma,
} from "@prisma/client";
import {
  CreateTripOperationInput,
  UpdateTripOperationInput,
  TripOperationQueryInput,
  CreateHotelConfirmationInput,
  UpdateHotelConfirmationInput,
  CreateVehicleDispatchInput,
  UpdateVehicleDispatchInput,
  CreateActivityConfirmationInput,
  UpdateActivityConfirmationInput,
  CreateOperationalIssueInput,
  UpdateOperationalIssueInput,
  CreateOperationEventInput,
  LogCommunicationInput,
  PostTourReviewInput,
  FinancialReconciliationInput,
  FinalizeOperationInput,
  ReopenOperationInput,
  CostAdjustmentItem,
} from "@/lib/validation/operations-schema";

export interface ReadinessSummary {
  score: number; // 0 to 100
  isReady: boolean;
  totalHotels: number;
  confirmedHotels: number;
  totalVehicles: number;
  confirmedVehicles: number;
  totalActivities: number;
  confirmedActivities: number;
  openIssuesCount: number;
  criticalIssuesCount: number;
  checks: {
    key: string;
    label: string;
    passed: boolean;
    details?: string;
  }[];
}

export interface HotelReconciliationItem {
  id: string;
  hotelName: string;
  city: string;
  plannedRoom: string;
  confirmedRoom: string;
  checkIn: string;
  checkOut: string;
  status: ConfirmationStatus;
  confirmationNumber: string | null;
  isDelivered: boolean;
  discrepancy: string | null;
}

export interface FleetReconciliationItem {
  id: string;
  vehicleName: string;
  vehicleType: string;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  pickupLocation: string | null;
  status: DispatchStatus;
  isDelivered: boolean;
  discrepancy: string | null;
}

export interface ActivityReconciliationItem {
  id: string;
  activityName: string;
  date: string;
  time: string;
  location: string;
  passNumber: string | null;
  status: ConfirmationStatus;
  isDelivered: boolean;
  discrepancy: string | null;
}

export interface OperationsClosureSummary {
  operationId: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  customerPhone: string | null;
  status: OperationStatus;
  closureStatus: "PENDING_REVIEW" | "UNDER_REVIEW" | "RECONCILED" | "FINALIZED" | "REOPENED";
  isFinalized: boolean;
  finalizedAt: string | null;
  finalizedBy: string | null;
  reopenedAt: string | null;
  reopenedBy: string | null;
  reopenReason: string | null;
  closureNotes: string | null;
  serviceReconciliation: {
    hotels: HotelReconciliationItem[];
    fleet: FleetReconciliationItem[];
    activities: ActivityReconciliationItem[];
  };
  issuesReconciliation: {
    totalIssues: number;
    openIssues: number;
    criticalIssues: number;
    highIssues: number;
    resolvedIssues: number;
    closedIssues: number;
    hasCriticalBlocker: boolean;
  };
  postTourReview: PostTourReviewInput | null;
  financialReconciliation: FinancialReconciliationInput | null;
  checklist: {
    isCompleted: boolean;
    criticalIssuesResolved: boolean;
    hotelsReviewed: boolean;
    fleetReviewed: boolean;
    activitiesReviewed: boolean;
    reviewCompleted: boolean;
    reconciliationReviewed: boolean;
    canFinalize: boolean;
  };
}

export const operationsService = {
  /**
   * Initializes or fetches a TripOperation for a trip.
   * Auto-populates hotel confirmations, vehicle dispatches, and activity confirmations
   * from the trip's existing itinerary components.
   */
  async initializeOperation(
    agencyId: string,
    input: CreateTripOperationInput,
    userId?: string
  ) {
    const { tripId, bookingId, coordinatorId, status, operationStartDate, operationEndDate, notes } = input;

    // Verify trip exists and belongs to agency
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      include: {
        tripHotels: {
          include: { hotel: true },
        },
        tripVehicles: {
          include: { vehicle: true },
        },
        tripActivities: {
          include: { activity: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    // Verify booking if provided
    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, agencyId },
      });
      if (!booking) {
        throw new NotFoundError("Booking");
      }
    }

    // Check if operation already exists
    const existingOp = await prisma.tripOperation.findFirst({
      where: { agencyId, tripId },
      include: {
        hotelConfirmations: true,
        vehicleDispatches: true,
        activityConfirmations: true,
        issues: true,
        events: { orderBy: { createdAt: "desc" } },
      },
    });

    if (existingOp) {
      return existingOp;
    }

    // Create operation and populate initial component state atomically
    return prisma.$transaction(async (tx) => {
      const operation = await tx.tripOperation.create({
        data: {
          agencyId,
          tripId,
          bookingId: bookingId || null,
          coordinatorId: coordinatorId || null,
          status: status || OperationStatus.PENDING,
          operationStartDate: operationStartDate || trip.startDate,
          operationEndDate: operationEndDate || trip.endDate,
          notes: notes || null,
        },
      });

      // Populate Hotel Confirmations from tripHotels
      if (trip.tripHotels.length > 0) {
        await tx.hotelConfirmation.createMany({
          data: trip.tripHotels.map((th) => ({
            agencyId,
            tripOperationId: operation.id,
            tripHotelId: th.id,
            supplierId: th.hotel?.supplierId || null,
            status: ConfirmationStatus.PENDING,
            checkIn: th.checkIn,
            checkOut: th.checkOut,
            roomDetails: th.roomType ? `${th.roomType} (${th.rooms} rooms)` : null,
            mealPlan: th.mealPlan || null,
          })),
        });
      }

      // Populate Vehicle Dispatches from tripVehicles
      if (trip.tripVehicles.length > 0) {
        await tx.vehicleDispatch.createMany({
          data: trip.tripVehicles.map((tv) => ({
            agencyId,
            tripOperationId: operation.id,
            tripVehicleId: tv.id,
            vehicleId: tv.vehicleId || null,
            driverName: tv.driverName || null,
            driverPhone: tv.driverPhone || null,
            pickupDate: tv.startDate || trip.startDate,
            pickupLocation: tv.pickupLocation || null,
            dropLocation: tv.dropLocation || null,
            status: tv.driverName ? DispatchStatus.ASSIGNED : DispatchStatus.PENDING,
          })),
        });
      }

      // Populate Activity Confirmations from tripActivities
      if (trip.tripActivities.length > 0) {
        await tx.activityConfirmation.createMany({
          data: trip.tripActivities.map((ta) => ({
            agencyId,
            tripOperationId: operation.id,
            tripActivityId: ta.id,
            activityId: ta.activityId || null,
            status: ConfirmationStatus.PENDING,
          })),
        });
      }

      // Emit initial timeline event
      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId: operation.id,
          eventType: "OPERATION_CREATED",
          description: `Trip operation initialized for trip ${trip.tripNumber}`,
          metadata: {
            tripId,
            bookingId: bookingId || null,
            hotelsCount: trip.tripHotels.length,
            vehiclesCount: trip.tripVehicles.length,
            activitiesCount: trip.tripActivities.length,
          },
          createdBy: userId || null,
        },
      });

      return tx.tripOperation.findUniqueOrThrow({
        where: { id: operation.id },
        include: {
          hotelConfirmations: { include: { tripHotel: { include: { hotel: true } } } },
          vehicleDispatches: { include: { tripVehicle: true } },
          activityConfirmations: { include: { tripActivity: { include: { activity: true } } } },
          issues: true,
          events: { orderBy: { createdAt: "desc" } },
        },
      });
    });
  },

  /**
   * Lists operations with pagination, filtering, and summary statistics.
   */
  async listOperations(agencyId: string, params: TripOperationQueryInput) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TripOperationWhereInput = {
      agencyId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
    };

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";

    const [total, items] = await Promise.all([
      prisma.tripOperation.count({ where }),
      prisma.tripOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          trip: {
            select: {
              id: true,
              tripNumber: true,
              title: true,
              startDate: true,
              endDate: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              totalAmount: true,
              status: true,
            },
          },
          hotelConfirmations: {
            select: { id: true, status: true },
          },
          vehicleDispatches: {
            select: { id: true, status: true },
          },
          activityConfirmations: {
            select: { id: true, status: true },
          },
          issues: {
            where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] } },
            select: { id: true, priority: true, status: true },
          },
          _count: {
            select: {
              hotelConfirmations: true,
              vehicleDispatches: true,
              activityConfirmations: true,
              issues: true,
              events: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Retrieves an operation by ID with full component relations.
   */
  async getOperationById(agencyId: string, id: string) {
    const operation = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
      include: {
        trip: {
          include: {
            customer: true,
            travelers: true,
            tripHotels: { include: { hotel: true } },
            tripVehicles: { include: { vehicle: true } },
            tripActivities: { include: { activity: true } },
          },
        },
        booking: {
          include: {
            payments: true,
          },
        },
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
            supplier: true,
          },
          orderBy: { createdAt: "asc" },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: true,
            vehicle: true,
          },
          orderBy: { createdAt: "asc" },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
          orderBy: { createdAt: "asc" },
        },
        issues: {
          orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!operation) {
      throw new NotFoundError("TripOperation");
    }

    return operation;
  },

  /**
   * Retrieves an operation by Trip ID.
   */
  async getOperationByTripId(agencyId: string, tripId: string) {
    const operation = await prisma.tripOperation.findFirst({
      where: { tripId, agencyId },
      include: {
        trip: {
          include: {
            customer: true,
            travelers: true,
          },
        },
        booking: true,
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
            supplier: true,
          },
          orderBy: { createdAt: "asc" },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: true,
            vehicle: true,
          },
          orderBy: { createdAt: "asc" },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
          orderBy: { createdAt: "asc" },
        },
        issues: {
          orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        },
        events: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    return operation;
  },

  /**
   * Updates an operation, validates lifecycle state transitions, cascades status to Trip & Booking, and logs audit events.
   */
  async updateOperation(
    agencyId: string,
    id: string,
    input: UpdateTripOperationInput,
    userId?: string
  ) {
    const existing = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
    });

    if (!existing) {
      throw new NotFoundError("TripOperation");
    }

    // 0. Finalization Immutability Lock: Prevent modifications to finalized operations
    await this.checkNotFinalized(agencyId, id);

    // 1. Transition Safety: Check terminal statuses
    if (
      existing.status === OperationStatus.COMPLETED &&
      input.status &&
      input.status !== OperationStatus.COMPLETED
    ) {
      throw new ValidationError("A completed tour operation cannot be modified.");
    }

    if (
      existing.status === OperationStatus.CANCELLED &&
      input.status &&
      input.status !== OperationStatus.CANCELLED
    ) {
      throw new ValidationError("A cancelled tour operation cannot be transitioned to active status.");
    }

    // 2. Blocker check: Cannot transition to READY or ONGOING with open CRITICAL issues
    if (
      input.status &&
      (input.status === OperationStatus.READY || input.status === OperationStatus.ONGOING) &&
      input.status !== existing.status
    ) {
      const openCriticalIssues = await prisma.operationalIssue.count({
        where: {
          agencyId,
          tripOperationId: id,
          priority: IssuePriority.CRITICAL,
          status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
        },
      });

      if (openCriticalIssues > 0) {
        throw new ValidationError(
          `Cannot mark operation as ${input.status} while ${openCriticalIssues} critical issue(s) remain unresolved.`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.tripOperation.update({
        where: { id },
        data: {
          ...(input.bookingId !== undefined ? { bookingId: input.bookingId } : {}),
          ...(input.coordinatorId !== undefined ? { coordinatorId: input.coordinatorId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.operationStartDate !== undefined ? { operationStartDate: input.operationStartDate } : {}),
          ...(input.operationEndDate !== undefined ? { operationEndDate: input.operationEndDate } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });

      if (input.status && input.status !== existing.status) {
        // Cascade synchronization to Trip and Booking
        if (input.status === OperationStatus.ONGOING) {
          await tx.trip.update({
            where: { id: existing.tripId },
            data: { status: TripStatus.ONGOING },
          });
          if (existing.bookingId) {
            await tx.booking.update({
              where: { id: existing.bookingId },
              data: { status: BookingStatus.ONGOING },
            });
          }
        } else if (input.status === OperationStatus.COMPLETED) {
          await tx.trip.update({
            where: { id: existing.tripId },
            data: { status: TripStatus.COMPLETED },
          });
          if (existing.bookingId) {
            await tx.booking.update({
              where: { id: existing.bookingId },
              data: { status: BookingStatus.COMPLETED },
            });
          }
        } else if (input.status === OperationStatus.CANCELLED) {
          await tx.trip.update({
            where: { id: existing.tripId },
            data: { status: TripStatus.CANCELLED },
          });
          if (existing.bookingId) {
            await tx.booking.update({
              where: { id: existing.bookingId },
              data: { status: BookingStatus.CANCELLED },
            });
          }
        }

        const eventType =
          input.status === OperationStatus.READY
            ? "OPERATION_READY"
            : input.status === OperationStatus.ONGOING
            ? "OPERATION_DEPARTED"
            : input.status === OperationStatus.COMPLETED
            ? "OPERATION_COMPLETED"
            : input.status === OperationStatus.CANCELLED
            ? "OPERATION_CANCELLED"
            : "STATUS_CHANGED";

        const description =
          input.status === OperationStatus.READY
            ? "Trip departure checklist cleared and ready for travel"
            : input.status === OperationStatus.ONGOING
            ? "Tour departed & operations actively ongoing"
            : input.status === OperationStatus.COMPLETED
            ? `Tour successfully completed: ${input.notes || "All services delivered and reconciled"}`
            : input.status === OperationStatus.CANCELLED
            ? `Tour operation cancelled: ${input.notes || "Operations cancelled"}`
            : `Operation status updated from ${existing.status} to ${input.status}`;

        await tx.operationEvent.create({
          data: {
            agencyId,
            tripOperationId: id,
            eventType,
            description,
            metadata: {
              previousStatus: existing.status,
              newStatus: input.status,
              notes: input.notes || null,
            },
            createdBy: userId || null,
          },
        });
      }

      return updated;
    });
  },

  /**
   * Logs an operational communication message dispatch (WhatsApp, SMS, Email).
   */
  async logCommunicationDispatch(
    agencyId: string,
    tripOperationId: string,
    input: LogCommunicationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId,
        eventType: "COMMUNICATION_DISPATCHED",
        description: `[${input.channel}] ${input.templateType} sent to ${input.recipientName}${
          input.recipientPhone ? ` (${input.recipientPhone})` : ""
        }`,
        metadata: {
          channel: input.channel,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone || null,
          templateType: input.templateType,
          messageBody: input.messageBody,
        },
        createdBy: userId || null,
      },
    });
  },

  /**
   * HOTEL CONFIRMATIONS
   */
  async createHotelConfirmation(
    agencyId: string,
    tripOperationId: string,
    input: CreateHotelConfirmationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    return prisma.$transaction(async (tx) => {
      const confirmation = await tx.hotelConfirmation.create({
        data: {
          agencyId,
          tripOperationId,
          tripHotelId: input.tripHotelId,
          confirmationNumber: input.confirmationNumber || null,
          status: input.status || ConfirmationStatus.PENDING,
          confirmedAt: input.confirmedAt || (input.status === ConfirmationStatus.CONFIRMED ? new Date() : null),
          checkIn: input.checkIn || null,
          checkOut: input.checkOut || null,
          roomDetails: input.roomDetails || null,
          mealPlan: input.mealPlan || null,
          supplierNotes: input.supplierNotes || null,
        },
      });

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType: "HOTEL_CONFIRMATION_CREATED",
          description: `Hotel confirmation created with status ${confirmation.status}`,
          metadata: { confirmationId: confirmation.id, confirmationNumber: confirmation.confirmationNumber },
          createdBy: userId || null,
        },
      });

      return confirmation;
    });
  },

  async updateHotelConfirmation(
    agencyId: string,
    tripOperationId: string,
    confirmationId: string,
    input: UpdateHotelConfirmationInput,
    userId?: string
  ) {
    const existing = await prisma.hotelConfirmation.findFirst({
      where: { id: confirmationId, tripOperationId, agencyId },
    });
    if (!existing) throw new NotFoundError("HotelConfirmation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    return prisma.$transaction(async (tx) => {
      const isConfirmed = input.status === ConfirmationStatus.CONFIRMED;
      const updated = await tx.hotelConfirmation.update({
        where: { id: confirmationId },
        data: {
          ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
          ...(input.confirmationNumber !== undefined ? { confirmationNumber: input.confirmationNumber } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.confirmedAt !== undefined
            ? { confirmedAt: input.confirmedAt }
            : isConfirmed && !existing.confirmedAt
            ? { confirmedAt: new Date() }
            : {}),
          ...(input.checkIn !== undefined ? { checkIn: input.checkIn } : {}),
          ...(input.checkOut !== undefined ? { checkOut: input.checkOut } : {}),
          ...(input.roomDetails !== undefined ? { roomDetails: input.roomDetails } : {}),
          ...(input.mealPlan !== undefined ? { mealPlan: input.mealPlan } : {}),
          ...(input.supplierNotes !== undefined ? { supplierNotes: input.supplierNotes } : {}),
        },
      });

      const eventType = isConfirmed
        ? "HOTEL_CONFIRMED"
        : input.status === ConfirmationStatus.CANCELLED
        ? "HOTEL_CANCELLED"
        : input.status === ConfirmationStatus.AMENDED
        ? "HOTEL_AMENDED"
        : input.status === ConfirmationStatus.REQUESTED
        ? "HOTEL_REQUESTED"
        : "HOTEL_CONFIRMATION_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: `Hotel confirmation updated: ${updated.status} (${updated.confirmationNumber || "No Voucher/Conf#"})`,
          metadata: { confirmationId, oldStatus: existing.status, newStatus: updated.status },
          createdBy: userId || null,
        },
      });

      return updated;
    });
  },

  /**
   * VEHICLE DISPATCHES
   */
  async createVehicleDispatch(
    agencyId: string,
    tripOperationId: string,
    input: CreateVehicleDispatchInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, agencyId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found or does not belong to agency");
    }

    return prisma.$transaction(async (tx) => {
      const dispatch = await tx.vehicleDispatch.create({
        data: {
          agencyId,
          tripOperationId,
          tripVehicleId: input.tripVehicleId,
          vehicleId: input.vehicleId || null,
          driverName: input.driverName || null,
          driverPhone: input.driverPhone || null,
          vehicleNumber: input.vehicleNumber || null,
          pickupDate: input.pickupDate || null,
          pickupTime: input.pickupTime || null,
          pickupLocation: input.pickupLocation || null,
          dropLocation: input.dropLocation || null,
          status: input.status || DispatchStatus.PENDING,
          notes: input.notes || null,
        },
      });

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType: "VEHICLE_ASSIGNED",
          description: `Vehicle dispatch created with status ${dispatch.status}`,
          metadata: { dispatchId: dispatch.id, driverName: dispatch.driverName, vehicleNumber: dispatch.vehicleNumber },
          createdBy: userId || null,
        },
      });

      return dispatch;
    });
  },

  async updateVehicleDispatch(
    agencyId: string,
    tripOperationId: string,
    dispatchId: string,
    input: UpdateVehicleDispatchInput,
    userId?: string
  ) {
    const existing = await prisma.vehicleDispatch.findFirst({
      where: { id: dispatchId, tripOperationId, agencyId },
    });
    if (!existing) throw new NotFoundError("VehicleDispatch");

    await this.checkNotFinalized(agencyId, tripOperationId);

    // 1. Status Transition Safety
    if (input.status && input.status !== existing.status) {
      const allowedTransitions: Record<DispatchStatus, DispatchStatus[]> = {
        [DispatchStatus.PENDING]: [DispatchStatus.ASSIGNED, DispatchStatus.CONFIRMED, DispatchStatus.CANCELLED],
        [DispatchStatus.ASSIGNED]: [DispatchStatus.CONFIRMED, DispatchStatus.ASSIGNED, DispatchStatus.ON_DUTY, DispatchStatus.CANCELLED],
        [DispatchStatus.CONFIRMED]: [DispatchStatus.ON_DUTY, DispatchStatus.CONFIRMED, DispatchStatus.ASSIGNED, DispatchStatus.CANCELLED],
        [DispatchStatus.ON_DUTY]: [DispatchStatus.COMPLETED, DispatchStatus.ON_DUTY, DispatchStatus.CANCELLED],
        [DispatchStatus.COMPLETED]: [], // terminal
        [DispatchStatus.CANCELLED]: [DispatchStatus.PENDING, DispatchStatus.ASSIGNED, DispatchStatus.CONFIRMED],
      };

      const allowed = allowedTransitions[existing.status] || [];
      if (!allowed.includes(input.status)) {
        throw new ValidationError(
          `Invalid dispatch status transition from ${existing.status} to ${input.status}`
        );
      }
    }

    // 2. Driver validation on assignment/confirmation
    if (
      (input.status === DispatchStatus.ASSIGNED || input.status === DispatchStatus.CONFIRMED) &&
      input.driverName !== undefined &&
      input.driverName !== null &&
      !input.driverName.trim()
    ) {
      throw new ValidationError("Driver name cannot be empty when assigning or confirming dispatch.");
    }

    // 3. Multi-tenant vehicle validation
    if (input.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, agencyId },
      });
      if (!vehicle) {
        throw new NotFoundError("Vehicle not found or does not belong to your agency");
      }
    }

    // 4. Vehicle schedule conflict protection
    const targetVehicleId = input.vehicleId !== undefined ? input.vehicleId : existing.vehicleId;
    const targetPickupDate = input.pickupDate !== undefined ? input.pickupDate : existing.pickupDate;
    const targetStatus = input.status !== undefined ? input.status : existing.status;

    if (
      targetVehicleId &&
      targetPickupDate &&
      (targetStatus === DispatchStatus.ASSIGNED ||
        targetStatus === DispatchStatus.CONFIRMED ||
        targetStatus === DispatchStatus.ON_DUTY)
    ) {
      const startOfDay = new Date(targetPickupDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetPickupDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const conflictingDispatch = await prisma.vehicleDispatch.findFirst({
        where: {
          agencyId,
          vehicleId: targetVehicleId,
          id: { not: dispatchId },
          status: { in: [DispatchStatus.ASSIGNED, DispatchStatus.CONFIRMED, DispatchStatus.ON_DUTY] },
          pickupDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (conflictingDispatch) {
        throw new ValidationError("Vehicle is already assigned to another active trip during this period.");
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleDispatch.update({
        where: { id: dispatchId },
        data: {
          ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId } : {}),
          ...(input.driverName !== undefined ? { driverName: input.driverName } : {}),
          ...(input.driverPhone !== undefined ? { driverPhone: input.driverPhone } : {}),
          ...(input.vehicleNumber !== undefined ? { vehicleNumber: input.vehicleNumber } : {}),
          ...(input.pickupDate !== undefined ? { pickupDate: input.pickupDate } : {}),
          ...(input.pickupTime !== undefined ? { pickupTime: input.pickupTime } : {}),
          ...(input.pickupLocation !== undefined ? { pickupLocation: input.pickupLocation } : {}),
          ...(input.dropLocation !== undefined ? { dropLocation: input.dropLocation } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });

      const eventType =
        input.status === DispatchStatus.COMPLETED
          ? "VEHICLE_COMPLETED"
          : input.status === DispatchStatus.CANCELLED
          ? "VEHICLE_CANCELLED"
          : input.status === DispatchStatus.ON_DUTY
          ? "VEHICLE_DISPATCHED"
          : input.status === DispatchStatus.CONFIRMED
          ? "VEHICLE_CONFIRMED"
          : input.status === DispatchStatus.ASSIGNED
          ? "VEHICLE_ASSIGNED"
          : "VEHICLE_DISPATCH_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: `Vehicle dispatch updated: ${updated.status} (Driver: ${updated.driverName || "TBD"}, Plate: ${updated.vehicleNumber || "TBD"})`,
          metadata: {
            dispatchId,
            oldStatus: existing.status,
            newStatus: updated.status,
            driverName: updated.driverName,
            vehicleNumber: updated.vehicleNumber,
          },
          createdBy: userId || null,
        },
      });

      return updated;
    });
  },

  /**
   * ACTIVITY CONFIRMATIONS
   */
  async listActivityConfirmations(agencyId: string, tripOperationId: string) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    return prisma.activityConfirmation.findMany({
      where: { tripOperationId, agencyId },
      include: {
        tripActivity: {
          include: {
            activity: {
              include: { supplier: true },
            },
          },
        },
        activity: {
          include: { supplier: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async getActivityConfirmation(
    agencyId: string,
    tripOperationId: string,
    confirmationId: string
  ) {
    const confirmation = await prisma.activityConfirmation.findFirst({
      where: { id: confirmationId, tripOperationId, agencyId },
      include: {
        tripActivity: {
          include: {
            activity: {
              include: { supplier: true },
            },
          },
        },
        activity: {
          include: { supplier: true },
        },
      },
    });
    if (!confirmation) throw new NotFoundError("ActivityConfirmation");
    return confirmation;
  },

  async createActivityConfirmation(
    agencyId: string,
    tripOperationId: string,
    input: CreateActivityConfirmationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    return prisma.$transaction(async (tx) => {
      const confirmation = await tx.activityConfirmation.create({
        data: {
          agencyId,
          tripOperationId,
          tripActivityId: input.tripActivityId,
          confirmationNumber: input.confirmationNumber || null,
          ticketNumber: input.ticketNumber || null,
          status: input.status || ConfirmationStatus.PENDING,
          confirmedAt: input.confirmedAt || (input.status === ConfirmationStatus.CONFIRMED ? new Date() : null),
          supplierNotes: input.supplierNotes || null,
        },
      });

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType: "ACTIVITY_CONFIRMATION_CREATED",
          description: `Activity confirmation created with status ${confirmation.status}`,
          metadata: { confirmationId: confirmation.id },
          createdBy: userId || null,
        },
      });

      return confirmation;
    });
  },

  async upsertActivityConfirmation(
    agencyId: string,
    tripOperationId: string,
    input: CreateActivityConfirmationInput,
    userId?: string
  ) {
    const existing = await prisma.activityConfirmation.findFirst({
      where: {
        agencyId,
        tripOperationId,
        tripActivityId: input.tripActivityId,
      },
    });

    if (existing) {
      return this.updateActivityConfirmation(
        agencyId,
        tripOperationId,
        existing.id,
        input,
        userId
      );
    }

    return this.createActivityConfirmation(
      agencyId,
      tripOperationId,
      input,
      userId
    );
  },

  async updateActivityConfirmation(
    agencyId: string,
    tripOperationId: string,
    confirmationId: string,
    input: UpdateActivityConfirmationInput,
    userId?: string
  ) {
    const existing = await prisma.activityConfirmation.findFirst({
      where: { id: confirmationId, tripOperationId, agencyId },
      include: {
        tripActivity: true,
      },
    });
    if (!existing) throw new NotFoundError("ActivityConfirmation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    // Transition safety rules:
    // 1. Cannot transition from CANCELLED to any active status
    if (
      existing.status === ConfirmationStatus.CANCELLED &&
      input.status &&
      input.status !== ConfirmationStatus.CANCELLED
    ) {
      throw new ValidationError(
        "A cancelled activity cannot be transitioned to another status."
      );
    }

    // 2. Transitioning to CONFIRMED requires confirmation number or ticket/pass number
    if (input.status === ConfirmationStatus.CONFIRMED) {
      const hasConfNumber =
        (input.confirmationNumber && input.confirmationNumber.trim().length > 0) ||
        (existing.confirmationNumber && existing.confirmationNumber.trim().length > 0);
      const hasTicketNumber =
        (input.ticketNumber && input.ticketNumber.trim().length > 0) ||
        (existing.ticketNumber && existing.ticketNumber.trim().length > 0);

      if (!hasConfNumber && !hasTicketNumber) {
        throw new ValidationError(
          "Confirmation number or ticket/pass number is required to confirm an activity."
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const isConfirmed = input.status === ConfirmationStatus.CONFIRMED;

      // Update underlying tripActivity schedule if provided
      if (
        existing.tripActivityId &&
        (input.date !== undefined || input.time !== undefined || input.location !== undefined)
      ) {
        await tx.tripActivity.update({
          where: { id: existing.tripActivityId },
          data: {
            ...(input.date !== undefined ? { date: input.date } : {}),
            ...(input.time !== undefined ? { time: input.time } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
          },
        });
      }

      const updated = await tx.activityConfirmation.update({
        where: { id: confirmationId },
        data: {
          ...(input.confirmationNumber !== undefined ? { confirmationNumber: input.confirmationNumber } : {}),
          ...(input.ticketNumber !== undefined ? { ticketNumber: input.ticketNumber } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.confirmedAt !== undefined
            ? { confirmedAt: input.confirmedAt }
            : isConfirmed && !existing.confirmedAt
            ? { confirmedAt: new Date() }
            : {}),
          ...(input.supplierNotes !== undefined ? { supplierNotes: input.supplierNotes } : {}),
        },
      });

      const eventType = isConfirmed
        ? "ACTIVITY_CONFIRMED"
        : input.status === ConfirmationStatus.REQUESTED
        ? "ACTIVITY_REQUESTED"
        : input.status === ConfirmationStatus.AMENDED
        ? "ACTIVITY_AMENDED"
        : input.status === ConfirmationStatus.CANCELLED
        ? "ACTIVITY_CANCELLED"
        : "ACTIVITY_CONFIRMATION_UPDATED";

      const eventDescription = isConfirmed
        ? `Activity confirmed: Pass/Voucher #${updated.ticketNumber || updated.confirmationNumber || "CONFIRMED"}`
        : input.status === ConfirmationStatus.REQUESTED
        ? `Activity confirmation requested from supplier`
        : input.status === ConfirmationStatus.AMENDED
        ? `Activity schedule amended / updated`
        : input.status === ConfirmationStatus.CANCELLED
        ? `Activity cancelled: ${input.cancellationReason || input.supplierNotes || "Operations cancellation"}`
        : `Activity confirmation updated: ${updated.status}`;

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: eventDescription,
          metadata: {
            confirmationId,
            oldStatus: existing.status,
            newStatus: updated.status,
            confirmationNumber: updated.confirmationNumber,
            ticketNumber: updated.ticketNumber,
          },
          createdBy: userId || null,
        },
      });

      return updated;
    });
  },

  /**
   * OPERATIONAL ISSUES
   */
  async createIssue(
    agencyId: string,
    tripOperationId: string,
    input: CreateOperationalIssueInput,
    userId?: string
  ) {
    if (!input.title || !input.title.trim()) {
      throw new ValidationError("Issue title is required and cannot be empty.");
    }
    if (!input.description || !input.description.trim()) {
      throw new ValidationError("Issue description is required and cannot be empty.");
    }

    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    await this.checkNotFinalized(agencyId, tripOperationId);

    return prisma.$transaction(async (tx) => {
      const issue = await tx.operationalIssue.create({
        data: {
          agencyId,
          tripOperationId,
          title: input.title.trim(),
          description: input.description.trim(),
          priority: input.priority || IssuePriority.MEDIUM,
          status: IssueStatus.OPEN,
          assignedTo: input.assignedTo?.trim() || null,
          reportedBy: input.reportedBy?.trim() || "Operations Desk",
        },
      });

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType: "ISSUE_CREATED",
          description: `Operational issue opened: [${issue.priority}] ${issue.title}`,
          metadata: { issueId: issue.id, priority: issue.priority, title: issue.title },
          createdBy: userId || null,
        },
      });

      return issue;
    });
  },

  async updateIssue(
    agencyId: string,
    tripOperationId: string,
    issueId: string,
    input: UpdateOperationalIssueInput,
    userId?: string
  ) {
    const existing = await prisma.operationalIssue.findFirst({
      where: { id: issueId, tripOperationId, agencyId },
    });
    if (!existing) throw new NotFoundError("OperationalIssue");

    await this.checkNotFinalized(agencyId, tripOperationId);

    // 1. Status transition safety
    if (input.status && input.status !== existing.status) {
      const allowedTransitions: Record<IssueStatus, IssueStatus[]> = {
        [IssueStatus.OPEN]: [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED, IssueStatus.CLOSED],
        [IssueStatus.IN_PROGRESS]: [IssueStatus.OPEN, IssueStatus.RESOLVED, IssueStatus.CLOSED],
        [IssueStatus.RESOLVED]: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS, IssueStatus.CLOSED],
        [IssueStatus.CLOSED]: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS],
      };

      const allowed = allowedTransitions[existing.status] || [];
      if (!allowed.includes(input.status)) {
        throw new ValidationError(
          `Invalid issue status transition from ${existing.status} to ${input.status}`
        );
      }
    }

    // 2. Resolution note requirement
    if (
      (input.status === IssueStatus.RESOLVED || input.status === IssueStatus.CLOSED) &&
      !input.resolution?.trim() &&
      !existing.resolution?.trim()
    ) {
      throw new ValidationError("A resolution note is required when resolving or closing an issue.");
    }

    // 3. Reopening check
    const isReopening =
      (existing.status === IssueStatus.RESOLVED || existing.status === IssueStatus.CLOSED) &&
      (input.status === IssueStatus.OPEN || input.status === IssueStatus.IN_PROGRESS);

    const isResolving =
      (input.status === IssueStatus.RESOLVED || input.status === IssueStatus.CLOSED) &&
      existing.status !== IssueStatus.RESOLVED &&
      existing.status !== IssueStatus.CLOSED;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.operationalIssue.update({
        where: { id: issueId },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo?.trim() || null } : {}),
          ...(input.reportedBy !== undefined ? { reportedBy: input.reportedBy?.trim() || null } : {}),
          ...(input.resolution !== undefined ? { resolution: input.resolution?.trim() || null } : {}),
          ...(isReopening
            ? { resolvedAt: null }
            : isResolving
            ? { resolvedAt: new Date() }
            : {}),
        },
      });

      const eventType = isReopening
        ? "ISSUE_REOPENED"
        : input.status === IssueStatus.CLOSED
        ? "ISSUE_CLOSED"
        : isResolving
        ? "ISSUE_RESOLVED"
        : input.priority && input.priority !== existing.priority
        ? "ISSUE_PRIORITY_CHANGED"
        : input.assignedTo && input.assignedTo !== existing.assignedTo
        ? "ISSUE_ASSIGNED"
        : input.status && input.status !== existing.status
        ? "ISSUE_STATUS_CHANGED"
        : "ISSUE_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: isReopening
            ? `Operational issue reopened: ${updated.title} -> ${updated.status}`
            : isResolving
            ? `Operational issue resolved: ${updated.title} (${updated.resolution || "Resolved"})`
            : `Issue updated: ${updated.title} -> ${updated.status}`,
          metadata: {
            issueId,
            oldStatus: existing.status,
            newStatus: updated.status,
            resolution: updated.resolution,
            priority: updated.priority,
          },
          createdBy: userId || null,
        },
      });

      return updated;
    });
  },

  async listAgencyIssues(
    agencyId: string,
    query?: {
      status?: string;
      priority?: string;
      search?: string;
      tripId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: Prisma.OperationalIssueWhereInput = {
      agencyId,
      ...(query?.status && query.status !== "ALL"
        ? { status: query.status as IssueStatus }
        : {}),
      ...(query?.priority && query.priority !== "ALL"
        ? { priority: query.priority as IssuePriority }
        : {}),
      ...(query?.tripId
        ? { tripOperation: { tripId: query.tripId } }
        : {}),
      ...(query?.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: "insensitive" } },
              { description: { contains: query.search.trim(), mode: "insensitive" } },
              { assignedTo: { contains: query.search.trim(), mode: "insensitive" } },
              { reportedBy: { contains: query.search.trim(), mode: "insensitive" } },
              { resolution: { contains: query.search.trim(), mode: "insensitive" } },
              {
                tripOperation: {
                  trip: {
                    OR: [
                      { title: { contains: query.search.trim(), mode: "insensitive" } },
                      { tripNumber: { contains: query.search.trim(), mode: "insensitive" } },
                      { customer: { name: { contains: query.search.trim(), mode: "insensitive" } } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [issues, total, kpiOpen, kpiInProgress, kpiCritical, kpiHigh, kpiResolved] =
      await Promise.all([
        prisma.operationalIssue.findMany({
          where,
          include: {
            tripOperation: {
              include: {
                trip: {
                  include: { customer: true },
                },
                booking: true,
              },
            },
          },
          orderBy: [
            { status: "asc" },
            { priority: "desc" },
            { createdAt: "desc" },
          ],
          skip,
          take: limit,
        }),
        prisma.operationalIssue.count({ where }),
        prisma.operationalIssue.count({
          where: { agencyId, status: IssueStatus.OPEN },
        }),
        prisma.operationalIssue.count({
          where: { agencyId, status: IssueStatus.IN_PROGRESS },
        }),
        prisma.operationalIssue.count({
          where: {
            agencyId,
            priority: IssuePriority.CRITICAL,
            status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
          },
        }),
        prisma.operationalIssue.count({
          where: {
            agencyId,
            priority: IssuePriority.HIGH,
            status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
          },
        }),
        prisma.operationalIssue.count({
          where: {
            agencyId,
            status: { in: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
          },
        }),
      ]);

    return {
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total,
        open: kpiOpen,
        inProgress: kpiInProgress,
        critical: kpiCritical,
        highPriority: kpiHigh,
        resolved: kpiResolved,
      },
    };
  },

  async listIssuesByOperation(agencyId: string, tripOperationId: string) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    return prisma.operationalIssue.findMany({
      where: { tripOperationId, agencyId },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });
  },

  async getIssue(agencyId: string, tripOperationId: string, issueId: string) {
    const issue = await prisma.operationalIssue.findFirst({
      where: { id: issueId, tripOperationId, agencyId },
      include: {
        tripOperation: {
          include: {
            trip: { include: { customer: true } },
            booking: true,
          },
        },
      },
    });
    if (!issue) throw new NotFoundError("OperationalIssue");
    return issue;
  },

  /**
   * TIMELINE & EVENTS
   */
  async logEvent(
    agencyId: string,
    tripOperationId: string,
    input: CreateOperationEventInput
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId,
        eventType: input.eventType,
        description: input.description || input.eventType,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        createdBy: input.createdBy || null,
      },
    });
  },

  async getTimeline(agencyId: string, tripOperationId: string) {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    return prisma.operationEvent.findMany({
      where: { tripOperationId, agencyId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Calculates comprehensive readiness score and checklist for an operation.
   */
  async calculateReadiness(agencyId: string, tripOperationId: string): Promise<ReadinessSummary> {
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
      include: {
        hotelConfirmations: true,
        vehicleDispatches: true,
        activityConfirmations: true,
        issues: {
          where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] } },
        },
      },
    });

    if (!op) throw new NotFoundError("TripOperation");

    const activeHotels = op.hotelConfirmations.filter(
      (h) => h.status !== ConfirmationStatus.CANCELLED
    );
    const totalHotels = activeHotels.length;
    const confirmedHotels = activeHotels.filter(
      (h) =>
        h.status === ConfirmationStatus.CONFIRMED ||
        h.status === ConfirmationStatus.AMENDED
    ).length;

    const activeVehicles = op.vehicleDispatches.filter(
      (v) => v.status !== DispatchStatus.CANCELLED
    );
    const totalVehicles = activeVehicles.length;
    const confirmedVehicles = activeVehicles.filter(
      (v) =>
        v.status === DispatchStatus.CONFIRMED ||
        v.status === DispatchStatus.ASSIGNED ||
        v.status === DispatchStatus.ON_DUTY ||
        v.status === DispatchStatus.COMPLETED
    ).length;

    const activeActivities = op.activityConfirmations.filter(
      (a) => a.status !== ConfirmationStatus.CANCELLED
    );
    const totalActivities = activeActivities.length;
    const confirmedActivities = activeActivities.filter(
      (a) =>
        a.status === ConfirmationStatus.CONFIRMED ||
        a.status === ConfirmationStatus.AMENDED
    ).length;

    const openIssuesCount = op.issues.length;
    const criticalIssuesCount = op.issues.filter(
      (i) => i.priority === IssuePriority.CRITICAL || i.priority === IssuePriority.HIGH
    ).length;

    const checks = [
      {
        key: "hotels",
        label: "Hotel Accommodations",
        passed: totalHotels === 0 || confirmedHotels === totalHotels,
        details: `${confirmedHotels}/${totalHotels} confirmed`,
      },
      {
        key: "vehicles",
        label: "Vehicle & Fleet Allocation",
        passed: totalVehicles === 0 || confirmedVehicles === totalVehicles,
        details: `${confirmedVehicles}/${totalVehicles} assigned/confirmed`,
      },
      {
        key: "activities",
        label: "Activity & Excursion Bookings",
        passed: totalActivities === 0 || confirmedActivities === totalActivities,
        details: `${confirmedActivities}/${totalActivities} confirmed`,
      },
      {
        key: "issues",
        label: "Operational Blockers & Issues",
        passed: criticalIssuesCount === 0,
        details: `${openIssuesCount} open issues (${criticalIssuesCount} critical/high)`,
      },
    ];

    const passedChecks = checks.filter((c) => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);
    const isReady = score === 100 && criticalIssuesCount === 0;

    return {
      score,
      isReady,
      totalHotels,
      confirmedHotels,
      totalVehicles,
      confirmedVehicles,
      totalActivities,
      confirmedActivities,
      openIssuesCount,
      criticalIssuesCount,
      checks,
    };
  },

  /**
   * Helper to ensure an operation is not in a FINALIZED state before mutation.
   */
  async checkNotFinalized(agencyId: string, tripOperationId: string) {
    const latestClosureEvent = await prisma.operationEvent.findFirst({
      where: {
        agencyId,
        tripOperationId,
        eventType: { in: ["OPERATION_FINALIZED", "OPERATION_REOPENED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestClosureEvent && latestClosureEvent.eventType === "OPERATION_FINALIZED") {
      throw new ValidationError(
        "This tour operation is FINALIZED and cannot be modified. Reopen operation first to make corrections."
      );
    }
  },

  /**
   * Returns a comprehensive Operations Closure & Reconciliation summary.
   */
  async getClosureSummary(
    agencyId: string,
    id: string
  ): Promise<OperationsClosureSummary> {
    const op = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
      include: {
        trip: {
          include: {
            customer: true,
            tripHotels: { include: { hotel: true } },
            tripVehicles: { include: { vehicle: true } },
            tripActivities: { include: { activity: true } },
          },
        },
        booking: true,
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
            supplier: true,
          },
        },
        vehicleDispatches: {
          include: {
            tripVehicle: { include: { vehicle: true } },
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            tripActivity: { include: { activity: true } },
            activity: true,
          },
        },
        issues: {
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!op) throw new NotFoundError("TripOperation");

    // 1. Determine Finalization & Reopen Status from Timeline
    const latestClosureEvent = op.events.find((e) =>
      ["OPERATION_FINALIZED", "OPERATION_REOPENED"].includes(e.eventType)
    );
    const isFinalized = latestClosureEvent?.eventType === "OPERATION_FINALIZED";
    const finalizedAt =
      latestClosureEvent?.eventType === "OPERATION_FINALIZED"
        ? latestClosureEvent.createdAt.toISOString()
        : null;
    const finalizedBy =
      latestClosureEvent?.eventType === "OPERATION_FINALIZED"
        ? latestClosureEvent.createdBy
        : null;
    const closureNotes =
      latestClosureEvent?.eventType === "OPERATION_FINALIZED"
        ? (latestClosureEvent.metadata as any)?.closureNotes || null
        : null;

    const latestReopenEvent = op.events.find((e) => e.eventType === "OPERATION_REOPENED");
    const reopenedAt = latestReopenEvent ? latestReopenEvent.createdAt.toISOString() : null;
    const reopenedBy = latestReopenEvent ? latestReopenEvent.createdBy : null;
    const reopenReason = latestReopenEvent
      ? (latestReopenEvent.metadata as any)?.reopenReason || null
      : null;

    // 2. Post-Tour Review Data from Timeline
    const latestReviewEvent = op.events.find((e) =>
      ["POST_TOUR_REVIEW_SAVED", "POST_TOUR_REVIEW_UPDATED"].includes(e.eventType)
    );
    const postTourReview: PostTourReviewInput | null = latestReviewEvent?.metadata
      ? (latestReviewEvent.metadata as any)
      : null;

    // 3. Financial Reconciliation Data from Timeline
    const latestFinancialEvent = op.events.find(
      (e) => e.eventType === "FINANCIAL_RECONCILIATION_SAVED"
    );
    const financialReconciliation: FinancialReconciliationInput | null = latestFinancialEvent?.metadata
      ? (latestFinancialEvent.metadata as any)
      : op.booking
      ? {
          plannedCost: Number(op.booking.totalAmount) || 0,
          actualCost: Number(op.booking.totalAmount) || 0,
          varianceAmount: 0,
          varianceReason: null,
          adjustments: [],
          remarks: "Baseline initialized from booking total.",
        }
      : null;

    // 4. Closure Status Lifecycle String
    const hasSavedReview = postTourReview !== null;
    const hasSavedFinancial = latestFinancialEvent !== undefined;

    let closureStatus: OperationsClosureSummary["closureStatus"] = "PENDING_REVIEW";
    if (isFinalized) {
      closureStatus = "FINALIZED";
    } else if (latestClosureEvent?.eventType === "OPERATION_REOPENED") {
      closureStatus = "REOPENED";
    } else if (hasSavedReview && hasSavedFinancial) {
      closureStatus = "RECONCILED";
    } else if (hasSavedReview || hasSavedFinancial) {
      closureStatus = "UNDER_REVIEW";
    }

    // 5. Service Delivery Reconciliation
    const hotels: HotelReconciliationItem[] = op.hotelConfirmations.map((h) => {
      const hotelName = h.tripHotel?.hotel?.name || "Hotel Component";
      const city = h.tripHotel?.hotel?.city || "Destination";
      const plannedRoom = h.tripHotel?.roomType || "Standard";
      const confirmedRoom = h.roomDetails || plannedRoom;
      const checkIn = h.checkIn
        ? h.checkIn.toISOString()
        : h.tripHotel?.checkIn
        ? h.tripHotel.checkIn.toISOString()
        : "";
      const checkOut = h.checkOut
        ? h.checkOut.toISOString()
        : h.tripHotel?.checkOut
        ? h.tripHotel.checkOut.toISOString()
        : "";
      const isDelivered = h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED;
      let discrepancy: string | null = null;
      if (h.status === ConfirmationStatus.CANCELLED) {
        discrepancy = "Booking Cancelled with supplier";
      } else if (h.status === ConfirmationStatus.AMENDED) {
        discrepancy = `Amended from planned ${plannedRoom}`;
      } else if (h.status === ConfirmationStatus.PENDING) {
        discrepancy = "Unconfirmed reservation";
      }

      return {
        id: h.id,
        hotelName,
        city,
        plannedRoom,
        confirmedRoom,
        checkIn,
        checkOut,
        status: h.status,
        confirmationNumber: h.confirmationNumber,
        isDelivered,
        discrepancy,
      };
    });

    const fleet: FleetReconciliationItem[] = op.vehicleDispatches.map((v) => {
      const vehicleName = v.tripVehicle?.vehicleName || v.vehicle?.name || "Private Transport";
      const vehicleType = v.tripVehicle?.vehicleType || v.vehicle?.type || "Standard";
      const isDelivered =
        v.status === DispatchStatus.COMPLETED ||
        v.status === DispatchStatus.CONFIRMED ||
        v.status === DispatchStatus.ON_DUTY;
      let discrepancy: string | null = null;
      if (v.status === DispatchStatus.CANCELLED) {
        discrepancy = "Dispatch Cancelled";
      } else if (!v.driverName) {
        discrepancy = "No driver assigned";
      }

      return {
        id: v.id,
        vehicleName,
        vehicleType,
        driverName: v.driverName,
        driverPhone: v.driverPhone,
        vehiclePlate: v.vehicle?.registrationNumber || v.vehicleNumber,
        pickupLocation: v.pickupLocation || v.tripVehicle?.pickupLocation || null,
        status: v.status,
        isDelivered,
        discrepancy,
      };
    });

    const activities: ActivityReconciliationItem[] = op.activityConfirmations.map((a) => {
      const activityName = a.tripActivity?.name || a.activity?.name || "Sightseeing Excursion";
      const date = a.tripActivity?.date ? a.tripActivity.date.toISOString() : "";
      const time = a.tripActivity?.time || "Scheduled Slot";
      const location = a.tripActivity?.location || a.activity?.location || "Destination";
      const isDelivered = a.status === ConfirmationStatus.CONFIRMED || a.status === ConfirmationStatus.AMENDED;
      let discrepancy: string | null = null;
      if (a.status === ConfirmationStatus.CANCELLED) {
        discrepancy = "Activity Cancelled";
      } else if (a.status === ConfirmationStatus.PENDING) {
        discrepancy = "Pass / Ticket not confirmed";
      }

      return {
        id: a.id,
        activityName,
        date,
        time,
        location,
        passNumber: a.ticketNumber || a.confirmationNumber,
        status: a.status,
        isDelivered,
        discrepancy,
      };
    });

    // 6. Issues Reconciliation
    const totalIssues = op.issues.length;
    const openIssues = op.issues.filter(
      (i) => i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS
    ).length;
    const criticalIssues = op.issues.filter((i) => i.priority === IssuePriority.CRITICAL).length;
    const highIssues = op.issues.filter((i) => i.priority === IssuePriority.HIGH).length;
    const resolvedIssues = op.issues.filter((i) => i.status === IssueStatus.RESOLVED).length;
    const closedIssues = op.issues.filter((i) => i.status === IssueStatus.CLOSED).length;
    const openCriticalCount = op.issues.filter(
      (i) =>
        i.priority === IssuePriority.CRITICAL &&
        (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS)
    ).length;
    const hasCriticalBlocker = openCriticalCount > 0;

    // 7. Checklist
    const isCompleted = op.status === OperationStatus.COMPLETED;
    const criticalIssuesResolved = !hasCriticalBlocker;
    const hotelsReviewed = true;
    const fleetReviewed = true;
    const activitiesReviewed = true;
    const reviewCompleted = hasSavedReview;
    const reconciliationReviewed = hasSavedFinancial;
    const canFinalize =
      isCompleted &&
      criticalIssuesResolved &&
      reviewCompleted &&
      !isFinalized;

    return {
      operationId: op.id,
      tripId: op.tripId,
      tripNumber: op.trip.tripNumber || "N/A",
      tripTitle: op.trip.title,
      customerName: op.trip.customer.name,
      customerPhone: op.trip.customer.phone,
      status: op.status,
      closureStatus,
      isFinalized,
      finalizedAt,
      finalizedBy,
      reopenedAt,
      reopenedBy,
      reopenReason,
      closureNotes,
      serviceReconciliation: {
        hotels,
        fleet,
        activities,
      },
      issuesReconciliation: {
        totalIssues,
        openIssues,
        criticalIssues,
        highIssues,
        resolvedIssues,
        closedIssues,
        hasCriticalBlocker,
      },
      postTourReview,
      financialReconciliation,
      checklist: {
        isCompleted,
        criticalIssuesResolved,
        hotelsReviewed,
        fleetReviewed,
        activitiesReviewed,
        reviewCompleted,
        reconciliationReviewed,
        canFinalize,
      },
    };
  },

  /**
   * Saves post-tour service quality review.
   */
  async savePostTourReview(
    agencyId: string,
    id: string,
    input: PostTourReviewInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    if (op.status !== OperationStatus.COMPLETED) {
      throw new ValidationError("Post-tour review can only be submitted for completed operations.");
    }

    await this.checkNotFinalized(agencyId, id);

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: id,
        eventType: "POST_TOUR_REVIEW_SAVED",
        description: `Post-tour review recorded: Guest Rating ${input.guestRating}/5, Operator Rating ${input.operatorRating}/5 (${input.serviceQuality})`,
        metadata: input as any,
        createdBy: userId || null,
      },
    });
  },

  /**
   * Saves financial & cost reconciliation.
   */
  async saveFinancialReconciliation(
    agencyId: string,
    id: string,
    input: FinancialReconciliationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    if (op.status !== OperationStatus.COMPLETED) {
      throw new ValidationError("Financial reconciliation can only be submitted for completed operations.");
    }

    await this.checkNotFinalized(agencyId, id);

    if (Math.abs(input.varianceAmount) > 0.01 && (!input.varianceReason || !input.varianceReason.trim())) {
      throw new ValidationError("Variance reason is mandatory whenever planned and actual costs differ.");
    }

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: id,
        eventType: "FINANCIAL_RECONCILIATION_SAVED",
        description: `Financial reconciliation recorded: Planned ₹${input.plannedCost.toLocaleString("en-IN")}, Actual ₹${input.actualCost.toLocaleString("en-IN")}, Variance ₹${input.varianceAmount.toLocaleString("en-IN")}`,
        metadata: input as any,
        createdBy: userId || null,
      },
    });
  },

  /**
   * Finalizes an operation, locking it from further mutations.
   */
  async finalizeOperation(
    agencyId: string,
    id: string,
    input: FinalizeOperationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
      include: {
        events: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!op) throw new NotFoundError("TripOperation");

    if (op.status !== OperationStatus.COMPLETED) {
      throw new ValidationError("Only completed operations can be finalized for operational closure.");
    }

    // Check if already finalized
    const latestClosureEvent = op.events.find((e) =>
      ["OPERATION_FINALIZED", "OPERATION_REOPENED"].includes(e.eventType)
    );
    if (latestClosureEvent?.eventType === "OPERATION_FINALIZED") {
      throw new ValidationError("This tour operation is already finalized.");
    }

    // Check for open critical issues blocker
    const openCriticalCount = await prisma.operationalIssue.count({
      where: {
        agencyId,
        tripOperationId: id,
        priority: IssuePriority.CRITICAL,
        status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
      },
    });
    if (openCriticalCount > 0) {
      throw new ValidationError(
        `Cannot finalize operation while ${openCriticalCount} critical issue(s) remain unresolved.`
      );
    }

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: id,
        eventType: "OPERATION_FINALIZED",
        description: `Tour operation permanently finalized: ${input.closureNotes || "All services reconciled and signed off"}`,
        metadata: {
          finalizedAt: new Date().toISOString(),
          finalizedBy: userId || null,
          closureNotes: input.closureNotes || null,
          acknowledgedDiscrepancies: input.acknowledgedDiscrepancies,
        },
        createdBy: userId || null,
      },
    });
  },

  /**
   * Reopens a finalized operation with a mandatory reason.
   */
  async reopenOperation(
    agencyId: string,
    id: string,
    input: ReopenOperationInput,
    userId?: string
  ) {
    const op = await prisma.tripOperation.findFirst({
      where: { id, agencyId },
      include: {
        events: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!op) throw new NotFoundError("TripOperation");

    const latestClosureEvent = op.events.find((e) =>
      ["OPERATION_FINALIZED", "OPERATION_REOPENED"].includes(e.eventType)
    );
    if (!latestClosureEvent || latestClosureEvent.eventType !== "OPERATION_FINALIZED") {
      throw new ValidationError("Only finalized operations can be reopened.");
    }

    if (!input.reopenReason || input.reopenReason.trim().length < 5) {
      throw new ValidationError("A detailed reason (min 5 characters) is required to reopen a finalized operation.");
    }

    return prisma.operationEvent.create({
      data: {
        agencyId,
        tripOperationId: id,
        eventType: "OPERATION_REOPENED",
        description: `Finalized operation reopened: ${input.reopenReason.trim()}`,
        metadata: {
          reopenedAt: new Date().toISOString(),
          reopenedBy: userId || null,
          reopenReason: input.reopenReason.trim(),
          previousFinalizedAt: latestClosureEvent.createdAt.toISOString(),
        },
        createdBy: userId || null,
      },
    });
  },

  createOperation(
    agencyId: string,
    input: CreateTripOperationInput,
    userId?: string
  ) {
    return this.initializeOperation(agencyId, input, userId);
  },

  upsertHotelConfirmation(
    agencyId: string,
    tripOperationId: string,
    input: CreateHotelConfirmationInput,
    userId?: string
  ) {
    return this.createHotelConfirmation(agencyId, tripOperationId, input, userId);
  },

  upsertVehicleDispatch(
    agencyId: string,
    tripOperationId: string,
    input: CreateVehicleDispatchInput,
    userId?: string
  ) {
    return this.createVehicleDispatch(agencyId, tripOperationId, input, userId);
  },
};
