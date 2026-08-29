import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
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
        hotelConfirmations: true,
        vehicleDispatches: true,
        activityConfirmations: true,
        issues: true,
        events: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    return operation;
  },

  /**
   * Updates an operation and logs status changes.
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
        await tx.operationEvent.create({
          data: {
            agencyId,
            tripOperationId: id,
            eventType: "STATUS_CHANGED",
            description: `Operation status updated from ${existing.status} to ${input.status}`,
            metadata: {
              previousStatus: existing.status,
              newStatus: input.status,
            },
            createdBy: userId || null,
          },
        });
      }

      return updated;
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

    return prisma.$transaction(async (tx) => {
      const isConfirmed = input.status === ConfirmationStatus.CONFIRMED;
      const updated = await tx.hotelConfirmation.update({
        where: { id: confirmationId },
        data: {
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

    return prisma.$transaction(async (tx) => {
      const dispatch = await tx.vehicleDispatch.create({
        data: {
          agencyId,
          tripOperationId,
          tripVehicleId: input.tripVehicleId,
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

    return prisma.$transaction(async (tx) => {
      const updated = await tx.vehicleDispatch.update({
        where: { id: dispatchId },
        data: {
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
        input.status === DispatchStatus.ON_DUTY
          ? "VEHICLE_DISPATCHED"
          : input.status === DispatchStatus.CONFIRMED
          ? "VEHICLE_CONFIRMED"
          : "VEHICLE_DISPATCH_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: `Vehicle dispatch updated: ${updated.status} (Driver: ${updated.driverName || "TBD"})`,
          metadata: { dispatchId, oldStatus: existing.status, newStatus: updated.status },
          createdBy: userId || null,
        },
      });

      return updated;
    });
  },

  /**
   * ACTIVITY CONFIRMATIONS
   */
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

  async updateActivityConfirmation(
    agencyId: string,
    tripOperationId: string,
    confirmationId: string,
    input: UpdateActivityConfirmationInput,
    userId?: string
  ) {
    const existing = await prisma.activityConfirmation.findFirst({
      where: { id: confirmationId, tripOperationId, agencyId },
    });
    if (!existing) throw new NotFoundError("ActivityConfirmation");

    return prisma.$transaction(async (tx) => {
      const isConfirmed = input.status === ConfirmationStatus.CONFIRMED;
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
        : input.status === ConfirmationStatus.CANCELLED
        ? "ACTIVITY_CANCELLED"
        : "ACTIVITY_CONFIRMATION_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: `Activity confirmation updated: ${updated.status}`,
          metadata: { confirmationId, oldStatus: existing.status, newStatus: updated.status },
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
    const op = await prisma.tripOperation.findFirst({
      where: { id: tripOperationId, agencyId },
    });
    if (!op) throw new NotFoundError("TripOperation");

    return prisma.$transaction(async (tx) => {
      const issue = await tx.operationalIssue.create({
        data: {
          agencyId,
          tripOperationId,
          title: input.title,
          description: input.description || "",
          priority: input.priority || IssuePriority.MEDIUM,
          status: IssueStatus.OPEN,
          assignedTo: input.assignedTo || null,
          reportedBy: input.reportedBy || null,
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

    return prisma.$transaction(async (tx) => {
      const isResolving =
        (input.status === IssueStatus.RESOLVED || input.status === IssueStatus.CLOSED) &&
        existing.status !== IssueStatus.RESOLVED &&
        existing.status !== IssueStatus.CLOSED;

      const updated = await tx.operationalIssue.update({
        where: { id: issueId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
          ...(input.reportedBy !== undefined ? { reportedBy: input.reportedBy } : {}),
          ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
          ...(isResolving ? { resolvedAt: new Date() } : {}),
        },
      });

      const eventType = isResolving ? "ISSUE_RESOLVED" : "ISSUE_UPDATED";

      await tx.operationEvent.create({
        data: {
          agencyId,
          tripOperationId,
          eventType,
          description: `Issue updated: ${updated.title} -> ${updated.status}`,
          metadata: {
            issueId,
            oldStatus: existing.status,
            newStatus: updated.status,
            resolution: updated.resolution,
          },
          createdBy: userId || null,
        },
      });

      return updated;
    });
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

    const totalHotels = op.hotelConfirmations.length;
    const confirmedHotels = op.hotelConfirmations.filter(
      (h) => h.status === ConfirmationStatus.CONFIRMED
    ).length;

    const totalVehicles = op.vehicleDispatches.length;
    const confirmedVehicles = op.vehicleDispatches.filter(
      (v) => v.status === DispatchStatus.CONFIRMED || v.status === DispatchStatus.ASSIGNED || v.status === DispatchStatus.ON_DUTY
    ).length;

    const totalActivities = op.activityConfirmations.length;
    const confirmedActivities = op.activityConfirmations.filter(
      (a) => a.status === ConfirmationStatus.CONFIRMED
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
};
