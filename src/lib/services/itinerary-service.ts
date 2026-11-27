import { ConflictError,NotFoundError,ValidationError } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
calculateTripDurationDays,
formatItineraryDateDisplay,
getDerivedItineraryDate,
} from "@/lib/utils/itinerary-dates";
import {
CreateItineraryItemInput,
SaveAsTemplateInput,
UpdateItineraryItemInput,
} from "@/lib/validation/itinerary-schema";
import {
DayTemplateContent,
PackageTemplateContent,
} from "@/lib/validation/itinerary-template-schema";
import { ItineraryItem,ItineraryTemplateType } from "@prisma/client";
import "server-only";

export const itineraryService = {
  /**
   * Retrieves all itinerary items for a trip in chronological and sort order.
   */
  async listItineraryItems(agencyId: string, tripId: string): Promise<ItineraryItem[]> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  /**
   * Retrieves a single itinerary item by ID, verifying trip and agency ownership.
   */
  async getItineraryItemById(
    agencyId: string,
    tripId: string,
    itemId: string
  ): Promise<ItineraryItem | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });
  },

  /**
   * Adds a new itinerary item to a trip after verifying tenancy, active status,
   * and strict adherence to the trip's calendar date boundary.
   */
  async createItineraryItem(
    agencyId: string,
    tripId: string,
    data: CreateItineraryItemInput
  ): Promise<ItineraryItem> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    // Decision A: Enforce trip end-date boundary with hard rejection
    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);
    if (data.dayNumber > maxTripDays) {
      throw new ValidationError(
        `Day ${data.dayNumber} exceeds the permitted trip duration of ${maxTripDays} days (${formatItineraryDateDisplay(trip.startDate)} to ${formatItineraryDateDisplay(trip.endDate)}). Please update the trip travel dates in the Overview tab first.`
      );
    }

    const calculatedDate = data.date || getDerivedItineraryDate(trip.startDate, data.dayNumber);

    return prisma.itineraryItem.create({
      data: {
        tripId,
        dayNumber: data.dayNumber,
        date: calculatedDate,
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
      },
    });
  },

  /**
   * Updates an existing itinerary item under a trip.
   * Decision C: Uses expectedUpdatedAt for atomic conditional concurrency protection.
   */
  async updateItineraryItem(
    agencyId: string,
    tripId: string,
    itemId: string,
    data: UpdateItineraryItemInput
  ): Promise<ItineraryItem> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    // Boundary check if dayNumber is modified
    if (data.dayNumber !== undefined) {
      const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);
      if (data.dayNumber > maxTripDays) {
        throw new ValidationError(
          `Day ${data.dayNumber} exceeds the permitted trip duration of ${maxTripDays} days. Please update the trip travel dates in the Overview tab first.`
        );
      }
    }

    const updateFields: any = {
      ...(data.dayNumber !== undefined ? { dayNumber: data.dayNumber } : {}),
      ...(data.date !== undefined ? { date: data.date || null } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime || null } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime || null } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    };

    // If dayNumber changed and date was not explicitly set, synchronize derived date
    if (data.dayNumber !== undefined && data.date === undefined) {
      updateFields.date = getDerivedItineraryDate(trip.startDate, data.dayNumber);
    }

    // Decision C: Atomic conditional database update with expectedUpdatedAt
    if (data.expectedUpdatedAt) {
      const expectedDate = new Date(data.expectedUpdatedAt);
      const updateResult = await prisma.itineraryItem.updateMany({
        where: {
          id: itemId,
          tripId,
          updatedAt: expectedDate,
        },
        data: updateFields,
      });

      if (updateResult.count === 0) {
        const current = await prisma.itineraryItem.findFirst({
          where: { id: itemId, tripId },
        });

        if (current) {
          throw new ConflictError(
            `This itinerary item was updated in another session (last saved at ${current.updatedAt.toISOString()}). Your local edits have been preserved.`
          );
        }
        throw new NotFoundError("Itinerary item");
      }

      return prisma.itineraryItem.findUniqueOrThrow({
        where: { id: itemId },
      });
    }

    // Direct update fallback when concurrency check is not requested
    const existing = await prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary item");
    }

    return prisma.itineraryItem.update({
      where: { id: itemId },
      data: updateFields,
    });
  },

  /**
   * Deletes an itinerary item from a trip after verifying tenancy.
   */
  async deleteItineraryItem(
    agencyId: string,
    tripId: string,
    itemId: string
  ): Promise<ItineraryItem> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    const existing = await prisma.itineraryItem.findFirst({
      where: {
        id: itemId,
        tripId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary item");
    }

    return prisma.itineraryItem.delete({
      where: { id: itemId },
    });
  },

  /**
   * Duplicates an entire day schedule (ItineraryItems only).
   * Decision E: Strictly copies itinerary items; never touches hotels, vehicles,
   * activities, vouchers, bookings, or quotation snapshots.
   * Decision A: Hard rejects if the resulting day exceeds trip duration.
   */
  async duplicateDay(
    agencyId: string,
    tripId: string,
    sourceDayNumber: number
  ): Promise<ItineraryItem[]> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    // 1. Verify source items exist
    const sourceItems = await prisma.itineraryItem.findMany({
      where: { tripId, dayNumber: sourceDayNumber },
      orderBy: { sortOrder: "asc" },
    });

    if (sourceItems.length === 0) {
      throw new NotFoundError(`No itinerary items found for Day ${sourceDayNumber}.`);
    }

    // 2. Decision A: Check boundary against trip duration
    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);
    const maxExistingAgg = await prisma.itineraryItem.aggregate({
      where: { tripId },
      _max: { dayNumber: true },
    });
    const currentMaxDay = maxExistingAgg._max.dayNumber || 0;

    if (currentMaxDay + 1 > maxTripDays) {
      throw new ValidationError(
        `Cannot duplicate Day ${sourceDayNumber}. Adding Day ${currentMaxDay + 1} would exceed the trip duration of ${maxTripDays} days (${formatItineraryDateDisplay(trip.startDate)} to ${formatItineraryDateDisplay(trip.endDate)}). Please extend the trip travel dates in the Overview tab first.`
      );
    }

    const targetDayNumber = sourceDayNumber + 1;
    const targetDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);

    // 3. Transactionally shift subsequent days and duplicate items
    return prisma.$transaction(async (tx) => {
      // Shift all items with dayNumber > sourceDayNumber by +1
      const itemsToShift = await tx.itineraryItem.findMany({
        where: { tripId, dayNumber: { gt: sourceDayNumber } },
        orderBy: { dayNumber: "desc" },
      });

      for (const item of itemsToShift) {
        const newDay = item.dayNumber + 1;
        const newDate = getDerivedItineraryDate(trip.startDate, newDay);
        await tx.itineraryItem.update({
          where: { id: item.id },
          data: {
            dayNumber: newDay,
            date: newDate,
          },
        });
      }

      // Clone source items into targetDayNumber
      const createdItems: ItineraryItem[] = [];
      for (const src of sourceItems) {
        const cloned = await tx.itineraryItem.create({
          data: {
            tripId,
            dayNumber: targetDayNumber,
            date: targetDate,
            title: src.title,
            description: src.description,
            location: src.location,
            startTime: src.startTime,
            endTime: src.endTime,
            sortOrder: src.sortOrder,
          },
        });
        createdItems.push(cloned);
      }

      return createdItems;
    });
  },

  /**
   * Deletes all itinerary items on a specific day and shifts subsequent days down by 1
   * to preserve contiguous day numbering.
   */
  async deleteDay(
    agencyId: string,
    tripId: string,
    dayNumber: number
  ): Promise<{ deletedCount: number; shiftedCount: number }> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Delete all items on target day
      const deleteResult = await tx.itineraryItem.deleteMany({
        where: { tripId, dayNumber },
      });

      // 2. Find all items with dayNumber > dayNumber to shift down by 1
      const itemsToShift = await tx.itineraryItem.findMany({
        where: { tripId, dayNumber: { gt: dayNumber } },
        orderBy: { dayNumber: "asc" },
      });

      for (const item of itemsToShift) {
        const newDay = item.dayNumber - 1;
        const newDate = getDerivedItineraryDate(trip.startDate, newDay);
        await tx.itineraryItem.update({
          where: { id: item.id },
          data: {
            dayNumber: newDay,
            date: newDate,
          },
        });
      }

      return {
        deletedCount: deleteResult.count,
        shiftedCount: itemsToShift.length,
      };
    });
  },

  /**
   * Reorders an entire day group Up, Down, or to a specific target day.
   */
  async reorderDay(
    agencyId: string,
    tripId: string,
    sourceDayNumber: number,
    directionOrTarget: "UP" | "DOWN" | number
  ): Promise<void> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);
    const targetDayNumber =
      typeof directionOrTarget === "number"
        ? directionOrTarget
        : directionOrTarget === "UP"
        ? sourceDayNumber - 1
        : sourceDayNumber + 1;

    if (targetDayNumber < 1 || targetDayNumber > maxTripDays) {
      throw new ValidationError(
        `Cannot move Day ${sourceDayNumber}. Target Day ${targetDayNumber} is outside the trip range (1 to ${maxTripDays}).`
      );
    }

    if (sourceDayNumber === targetDayNumber) {
      return; // Safe no-op when dropped onto self
    }

    await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction advisory lock scoped to trip days
      const lockKey = `agency:${agencyId}:trip:${tripId}:days`;
      if (typeof tx.$executeRaw === "function") {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        } catch {
          // Graceful fallback for mock/non-PostgreSQL test environments
        }
      }

      // 2. Find source items
      const sourceItems = await tx.itineraryItem.findMany({
        where: { tripId, dayNumber: sourceDayNumber },
      });

      // 3. Temporarily shift source items to dayNumber = -999 to prevent collisions
      for (const item of sourceItems) {
        await tx.itineraryItem.update({
          where: { id: item.id },
          data: { dayNumber: -999 },
        });
      }

      // 4. Shift intervening days
      if (sourceDayNumber < targetDayNumber) {
        // Dragging down: days between sourceDayNumber + 1 and targetDayNumber shift UP by 1 (day - 1)
        const itemsToShift = await tx.itineraryItem.findMany({
          where: {
            tripId,
            dayNumber: {
              gt: sourceDayNumber,
              lte: targetDayNumber,
            },
          },
          orderBy: { dayNumber: "asc" },
        });

        for (const item of itemsToShift) {
          const newDay = item.dayNumber - 1;
          const newDate = getDerivedItineraryDate(trip.startDate, newDay);
          await tx.itineraryItem.update({
            where: { id: item.id },
            data: { dayNumber: newDay, date: newDate },
          });
        }
      } else {
        // Dragging up: days between targetDayNumber and sourceDayNumber - 1 shift DOWN by 1 (day + 1)
        const itemsToShift = await tx.itineraryItem.findMany({
          where: {
            tripId,
            dayNumber: {
              gte: targetDayNumber,
              lt: sourceDayNumber,
            },
          },
          orderBy: { dayNumber: "desc" },
        });

        for (const item of itemsToShift) {
          const newDay = item.dayNumber + 1;
          const newDate = getDerivedItineraryDate(trip.startDate, newDay);
          await tx.itineraryItem.update({
            where: { id: item.id },
            data: { dayNumber: newDay, date: newDate },
          });
        }
      }

      // 5. Place temporary source items into targetDayNumber with aligned date
      const targetDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);
      for (const item of sourceItems) {
        await tx.itineraryItem.update({
          where: { id: item.id },
          data: { dayNumber: targetDayNumber, date: targetDate },
        });
      }
    });
  },

  /**
   * Reorders an individual itinerary item:
   * - Up or Down within its day group
   * - To a specific target index within its day group
   * - To another day (cross-day movement) at a specified index
   */
  async reorderItem(
    agencyId: string,
    tripId: string,
    itemId: string,
    directionOrOptions:
      | "UP"
      | "DOWN"
      | {
          direction?: "UP" | "DOWN";
          targetIndex?: number;
          targetDayNumber?: number;
        }
  ): Promise<void> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        agencyId,
      },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    if (trip.archivedAt) {
      throw new NotFoundError("Active trip");
    }

    const options =
      typeof directionOrOptions === "string"
        ? { direction: directionOrOptions }
        : directionOrOptions;

    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);

    await prisma.$transaction(async (tx) => {
      // 1. Locate current item under transaction to determine authoritative dayNumber
      const currentItem = await tx.itineraryItem.findFirst({
        where: { id: itemId, tripId },
      });

      if (!currentItem) {
        throw new NotFoundError("Itinerary item");
      }

      const sourceDayNumber = currentItem.dayNumber;
      const targetDayNumber = options.targetDayNumber ?? sourceDayNumber;

      if (targetDayNumber < 1 || targetDayNumber > maxTripDays) {
        throw new ValidationError(
          `Target Day ${targetDayNumber} is outside the permitted trip duration (1 to ${maxTripDays}).`
        );
      }

      // 2. Lock affected days to serialize concurrent updates
      const daysToLock = Array.from(new Set([sourceDayNumber, targetDayNumber])).sort(
        (a, b) => a - b
      );
      for (const d of daysToLock) {
        const lockKey = `agency:${agencyId}:trip:${tripId}:day:${d}`;
        if (typeof tx.$executeRaw === "function") {
          try {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
          } catch {
            // Graceful fallback for mock/non-PostgreSQL test environments
          }
        }
      }

      // Case A: Cross-day movement (sourceDayNumber !== targetDayNumber)
      if (sourceDayNumber !== targetDayNumber) {
        const destItems = await tx.itineraryItem.findMany({
          where: { tripId, dayNumber: targetDayNumber },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

        const insertIndex =
          options.targetIndex !== undefined
            ? Math.max(0, Math.min(options.targetIndex, destItems.length))
            : destItems.length;

        destItems.splice(insertIndex, 0, currentItem);

        const newDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);
        for (let i = 0; i < destItems.length; i++) {
          const it = destItems[i];
          const assignedSort = i * 10;
          if (it.id === itemId) {
            await tx.itineraryItem.update({
              where: { id: it.id },
              data: {
                dayNumber: targetDayNumber,
                date: newDate,
                sortOrder: assignedSort,
              },
            });
          } else if (it.sortOrder !== assignedSort) {
            await tx.itineraryItem.update({
              where: { id: it.id },
              data: { sortOrder: assignedSort },
            });
          }
        }

        // Renormalize source day
        const sourceRemaining = await tx.itineraryItem.findMany({
          where: { tripId, dayNumber: sourceDayNumber, NOT: { id: itemId } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

        for (let i = 0; i < sourceRemaining.length; i++) {
          const it = sourceRemaining[i];
          const assignedSort = i * 10;
          if (it.sortOrder !== assignedSort) {
            await tx.itineraryItem.update({
              where: { id: it.id },
              data: { sortOrder: assignedSort },
            });
          }
        }

        return;
      }

      // Case B: Same-day reordering
      const dayItems = await tx.itineraryItem.findMany({
        where: { tripId, dayNumber: sourceDayNumber },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      const currentIndex = dayItems.findIndex((it) => it.id === itemId);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      if (options.direction) {
        targetIndex = options.direction === "UP" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= dayItems.length) {
          return; // Already at boundary, safe no-op
        }
      } else if (options.targetIndex !== undefined) {
        targetIndex = Math.max(0, Math.min(options.targetIndex, dayItems.length - 1));
        if (targetIndex === currentIndex) {
          return; // Same position, safe no-op
        }
      } else {
        return;
      }

      const reordered = [...dayItems];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      for (let i = 0; i < reordered.length; i++) {
        const it = reordered[i];
        const assignedSort = i * 10;
        if (it.sortOrder !== assignedSort || it.id === itemId) {
          await tx.itineraryItem.update({
            where: { id: it.id },
            data: { sortOrder: assignedSort },
          });
        }
      }
    });
  },

  /**
   * Applies a Day Template to a specified trip day.
   */
  async applyDayTemplate(
    agencyId: string,
    tripId: string,
    targetDayNumber: number,
    templateId: string
  ): Promise<ItineraryItem[]> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) throw new NotFoundError("Trip");
    if (trip.archivedAt) throw new NotFoundError("Active trip");

    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);
    if (targetDayNumber > maxTripDays) {
      throw new ValidationError(
        `Target Day ${targetDayNumber} exceeds trip duration of ${maxTripDays} days. Please extend trip dates in the Overview tab first.`
      );
    }

    const template = await prisma.itineraryTemplate.findFirst({
      where: { id: templateId, agencyId, isArchived: false },
    });

    if (!template || template.type !== ItineraryTemplateType.DAY) {
      throw new NotFoundError("Day template");
    }

    const content = template.content as unknown as DayTemplateContent;
    if (!content?.items || content.items.length === 0) {
      throw new ValidationError("Selected day template contains no schedule items.");
    }

    const targetDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);

    // Get current max sortOrder on target day
    const maxSortAgg = await prisma.itineraryItem.aggregate({
      where: { tripId, dayNumber: targetDayNumber },
      _max: { sortOrder: true },
    });
    const baseSort = (maxSortAgg._max.sortOrder ?? -1) + 1;

    const createdItems: ItineraryItem[] = [];
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < content.items.length; i++) {
        const item = content.items[i];
        const created = await tx.itineraryItem.create({
          data: {
            tripId,
            dayNumber: targetDayNumber,
            date: targetDate,
            title: item.title,
            description: item.description || null,
            location: item.location || null,
            startTime: item.startTime || null,
            endTime: item.endTime || null,
            sortOrder: baseSort + i,
          },
        });
        createdItems.push(created);
      }
    });

    return createdItems;
  },

  /**
   * Applies a Package Template using either APPEND or REPLACE mode.
   * Preserves hotels, vehicles, activities, vouchers, and quotations 100%.
   */
  async applyPackageTemplate(
    agencyId: string,
    tripId: string,
    templateId: string,
    mode: "APPEND" | "REPLACE"
  ): Promise<{ addedCount: number; mode: string }> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      select: { id: true, startDate: true, endDate: true, archivedAt: true },
    });

    if (!trip) throw new NotFoundError("Trip");
    if (trip.archivedAt) throw new NotFoundError("Active trip");

    const template = await prisma.itineraryTemplate.findFirst({
      where: { id: templateId, agencyId, isArchived: false },
    });

    if (!template || template.type !== ItineraryTemplateType.PACKAGE) {
      throw new NotFoundError("Package template");
    }

    const content = template.content as unknown as PackageTemplateContent;
    if (!content?.days || content.days.length === 0) {
      throw new ValidationError("Selected package template contains no itinerary days.");
    }

    const maxTripDays = calculateTripDurationDays(trip.startDate, trip.endDate);

    if (mode === "REPLACE") {
      if (content.totalDays > maxTripDays) {
        throw new ValidationError(
          `Cannot replace itinerary: package requires ${content.totalDays} days, which exceeds trip duration (${maxTripDays} days). Please extend trip dates in Overview tab first.`
        );
      }

      await prisma.$transaction(async (tx) => {
        // Delete only ItineraryItem rows for this trip
        await tx.itineraryItem.deleteMany({ where: { tripId } });

        // Insert new package items
        for (const item of content.days) {
          const itemDate = getDerivedItineraryDate(trip.startDate, item.dayOffset);
          await tx.itineraryItem.create({
            data: {
              tripId,
              dayNumber: item.dayOffset,
              date: itemDate,
              title: item.title,
              description: item.description || null,
              location: item.location || null,
              startTime: item.startTime || null,
              endTime: item.endTime || null,
              sortOrder: item.sortOrder || 0,
            },
          });
        }
      });

      return { addedCount: content.days.length, mode: "REPLACE" };
    } else {
      // APPEND MODE
      const maxExistingAgg = await prisma.itineraryItem.aggregate({
        where: { tripId },
        _max: { dayNumber: true },
      });
      const currentMaxDay = maxExistingAgg._max.dayNumber || 0;
      const startDay = currentMaxDay + 1;
      const requiredTotalDays = startDay + content.totalDays - 1;

      if (requiredTotalDays > maxTripDays) {
        throw new ValidationError(
          `Cannot append package: appending ${content.totalDays} days starting at Day ${startDay} would require ${requiredTotalDays} days, exceeding the trip duration (${maxTripDays} days). Please extend trip dates in Overview tab first.`
        );
      }

      await prisma.$transaction(async (tx) => {
        for (const item of content.days) {
          const targetDay = startDay + (item.dayOffset - 1);
          const itemDate = getDerivedItineraryDate(trip.startDate, targetDay);
          await tx.itineraryItem.create({
            data: {
              tripId,
              dayNumber: targetDay,
              date: itemDate,
              title: item.title,
              description: item.description || null,
              location: item.location || null,
              startTime: item.startTime || null,
              endTime: item.endTime || null,
              sortOrder: item.sortOrder || 0,
            },
          });
        }
      });

      return { addedCount: content.days.length, mode: "APPEND" };
    }
  },

  /**
   * Saves content from current trip as a reusable DAY or PACKAGE template.
   */
  async saveAsTemplate(
    agencyId: string,
    tripId: string,
    input: SaveAsTemplateInput
  ) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      include: {
        itineraryItems: {
          orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!trip) throw new NotFoundError("Trip");

    if (input.type === "DAY") {
      const sourceDay = input.sourceDayNumber || 1;
      const items = trip.itineraryItems.filter((it) => it.dayNumber === sourceDay);
      if (items.length === 0) {
        throw new ValidationError(`No itinerary items found on Day ${sourceDay} to save as a template.`);
      }

      const content: DayTemplateContent = {
        schemaVersion: 1,
        type: "DAY",
        items: items.map((it) => ({
          title: it.title,
          description: it.description,
          location: it.location,
          startTime: it.startTime,
          endTime: it.endTime,
          sortOrder: it.sortOrder,
        })),
      };

      return prisma.itineraryTemplate.create({
        data: {
          agencyId,
          destinationId: input.destinationId || null,
          type: ItineraryTemplateType.DAY,
          name: input.name,
          description: input.description || null,
          dayCount: 1,
          content: content as any,
          isArchived: false,
        },
      });
    } else {
      // PACKAGE TEMPLATE
      if (trip.itineraryItems.length === 0) {
        throw new ValidationError("Trip has no itinerary items to save as a package template.");
      }

      const uniqueDays = Array.from(new Set(trip.itineraryItems.map((it) => it.dayNumber))).sort(
        (a, b) => a - b
      );

      // Normalize day offsets 1..N
      const dayOffsetMap = new Map<number, number>();
      uniqueDays.forEach((d, idx) => dayOffsetMap.set(d, idx + 1));

      const content: PackageTemplateContent = {
        schemaVersion: 1,
        type: "PACKAGE",
        totalDays: uniqueDays.length,
        days: trip.itineraryItems.map((it) => ({
          dayOffset: dayOffsetMap.get(it.dayNumber) || 1,
          title: it.title,
          description: it.description,
          location: it.location,
          startTime: it.startTime,
          endTime: it.endTime,
          sortOrder: it.sortOrder,
        })),
      };

      return prisma.itineraryTemplate.create({
        data: {
          agencyId,
          destinationId: input.destinationId || null,
          type: ItineraryTemplateType.PACKAGE,
          name: input.name,
          description: input.description || null,
          dayCount: uniqueDays.length,
          content: content as any,
          isArchived: false,
        },
      });
    }
  },
};
