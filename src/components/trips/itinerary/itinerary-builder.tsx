import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { itineraryClient } from "@/lib/api-client";
import { TripWithRelations } from "@/lib/services/trip-service";
import {
  calculateTripDurationDays,
  formatItineraryDateDisplay,
  getDerivedItineraryDate,
} from "@/lib/utils/itinerary-dates";
import { ItineraryItem, ItineraryTemplateType } from "@prisma/client";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  defaultKeyboardCoordinateGetter,
  rectIntersection,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
  type PointerSensorOptions,
  type MouseSensorOptions,
  type TouchSensorOptions,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  AlertCircle,
  AlertTriangle,
  BookmarkPlus,
  Calendar,
  Check,
  Clock,
  FileDown,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ItineraryDayCard } from "./itinerary-day-card";
import { SaveTemplateModal } from "./save-template-modal";
import { TemplatePickerModal } from "./template-picker-modal";
import { VirtualDayGroup } from "./types";

/**
 * Filter DOM events on interactive controls so that clicking buttons, inputs, links,
 * or dropdowns never initiates a drag-and-drop gesture.
 */
function shouldHandleDndEvent(element: HTMLElement | null): boolean {
  let cur = element;
  while (cur && cur !== document.body) {
    if (cur.dataset && cur.dataset.dndCard === "true") {
      return true;
    }
    if (cur.dataset && (cur.dataset.noDnd === "true" || cur.dataset.noDnd === "")) {
      return false;
    }
    const tagName = cur.tagName?.toLowerCase();
    if (
      tagName === "button" ||
      tagName === "a" ||
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      cur.getAttribute("role") === "menuitem" ||
      cur.getAttribute("role") === "combobox" ||
      cur.getAttribute("role") === "dialog" ||
      (cur.getAttribute("role") === "button" && cur.dataset.dndCard !== "true")
    ) {
      return false;
    }
    cur = cur.parentElement;
  }
  return true;
}

export class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (
        { nativeEvent: event }: React.PointerEvent,
        { onActivation }: PointerSensorOptions
      ) => {
        if (!event.isPrimary || event.button !== 0) {
          return false;
        }
        if (!shouldHandleDndEvent(event.target as HTMLElement)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

export class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: (
        { nativeEvent: event }: React.MouseEvent,
        { onActivation }: MouseSensorOptions
      ) => {
        if (event.button !== 0) {
          return false;
        }
        if (!shouldHandleDndEvent(event.target as HTMLElement)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

export class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (
        { nativeEvent: event }: React.TouchEvent,
        { onActivation }: TouchSensorOptions
      ) => {
        const touch = event.touches[0];
        if (!touch) return false;
        const target = document.elementFromPoint(
          touch.clientX,
          touch.clientY
        ) as HTMLElement | null;
        if (!shouldHandleDndEvent(target)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

interface ItineraryBuilderProps {
  trip: TripWithRelations;
  itineraryItems: ItineraryItem[];
  destinations: Array<{ id: string; name: string }>;
  isReadOnly: boolean;
  onItemsUpdated: () => Promise<void>;
}

export function ItineraryBuilder({
  trip,
  itineraryItems,
  destinations,
  isReadOnly,
  onItemsUpdated,
}: ItineraryBuilderProps) {
  // Local items state for immediate optimistic updates
  const [localItems, setLocalItems] = React.useState<ItineraryItem[]>(itineraryItems);
  const previousItemsRef = React.useRef<ItineraryItem[]>(itineraryItems);

  // Sync upstream items when props change
  React.useEffect(() => {
    setLocalItems(itineraryItems);
    previousItemsRef.current = itineraryItems;
  }, [itineraryItems]);

  // Autosave and reordering state
  const [reorderStatus, setReorderStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [reorderError, setReorderError] = React.useState<string | null>(null);
  const reorderSeqRef = React.useRef(0);
  const lastFailedActionRef = React.useRef<(() => Promise<void>) | null>(null);

  // Active drag item state for DragOverlay
  const [activeDragItem, setActiveDragItem] = React.useState<
    | { type: "DAY"; dayNumber: number; itemCount: number; date: Date }
    | { type: "ITEM"; item: ItineraryItem; dayNumber: number }
    | null
  >(null);

  // Sensor configuration
  const sensors = useSensors(
    useSensor(SmartPointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartMouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: defaultKeyboardCoordinateGetter,
    })
  );

  // Compute trip calendar duration
  const duration = React.useMemo(
    () => calculateTripDurationDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  // Group items by virtual day
  const { virtualDays, overflowDays } = React.useMemo(() => {
    const itemsByDay = new Map<number, ItineraryItem[]>();
    for (const item of localItems) {
      const list = itemsByDay.get(item.dayNumber) || [];
      list.push(item);
      itemsByDay.set(item.dayNumber, list);
    }

    // Sort items within each day
    for (const [dayNum, list] of itemsByDay.entries()) {
      list.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    const vDays: VirtualDayGroup[] = [];
    for (let day = 1; day <= duration; day++) {
      vDays.push({
        dayNumber: day,
        date: getDerivedItineraryDate(trip.startDate, day),
        items: itemsByDay.get(day) || [],
        isBeyondDuration: false,
      });
    }

    const oDays: VirtualDayGroup[] = [];
    for (const [dayNum, list] of itemsByDay.entries()) {
      if (dayNum > duration) {
        oDays.push({
          dayNumber: dayNum,
          date: getDerivedItineraryDate(trip.startDate, dayNum),
          items: list,
          isBeyondDuration: true,
        });
      }
    }
    oDays.sort((a, b) => a.dayNumber - b.dayNumber);

    return { virtualDays: vDays, overflowDays: oDays };
  }, [trip.startDate, duration, localItems]);

  // Modal States
  const [isAddItemOpen, setIsAddItemOpen] = React.useState(false);
  const [targetDayForAdd, setTargetDayForAdd] = React.useState<number>(1);
  const [itemTitle, setItemTitle] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemLocation, setItemLocation] = React.useState("");
  const [itemStartTime, setItemStartTime] = React.useState("09:00 AM");
  const [itemEndTime, setItemEndTime] = React.useState("05:00 PM");
  const [itemSaving, setItemSaving] = React.useState(false);

  // Template Modal States
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);
  const [templatePickerDay, setTemplatePickerDay] = React.useState<number | null>(null);
  const [templatePickerType, setTemplatePickerType] = React.useState<ItineraryTemplateType | undefined>();

  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = React.useState(false);
  const [saveTemplateType, setSaveTemplateType] = React.useState<"DAY" | "PACKAGE">("DAY");
  const [saveTemplateSourceDay, setSaveTemplateSourceDay] = React.useState<number>(1);

  // Delete Confirm Dialog state
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    itemId: string;
    itemTitle: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteDayConfirm, setDeleteDayConfirm] = React.useState<{
    dayNumber: number;
    itemCount: number;
  } | null>(null);
  const [deleteDayLoading, setDeleteDayLoading] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // REORDERING PERSISTENCE WITH AUTOSAVE STATUS & RECOVERY
  // ─────────────────────────────────────────────────────────────────────────────
  const executeReorderDay = React.useCallback(
    async (sourceDayNumber: number, targetDayNumber: number) => {
      if (sourceDayNumber === targetDayNumber) return;

      const seq = ++reorderSeqRef.current;
      const snapshot = [...localItems];
      previousItemsRef.current = snapshot;

      // 1. Optimistic Update: shift days between source and target
      const updated = snapshot.map((item) => {
        if (item.dayNumber === sourceDayNumber) {
          const newDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);
          return { ...item, dayNumber: targetDayNumber, date: newDate };
        }
        if (sourceDayNumber < targetDayNumber) {
          if (item.dayNumber > sourceDayNumber && item.dayNumber <= targetDayNumber) {
            const newDay = item.dayNumber - 1;
            const newDate = getDerivedItineraryDate(trip.startDate, newDay);
            return { ...item, dayNumber: newDay, date: newDate };
          }
        } else {
          if (item.dayNumber >= targetDayNumber && item.dayNumber < sourceDayNumber) {
            const newDay = item.dayNumber + 1;
            const newDate = getDerivedItineraryDate(trip.startDate, newDay);
            return { ...item, dayNumber: newDay, date: newDate };
          }
        }
        return item;
      });

      setLocalItems(updated);
      setReorderStatus("saving");
      setReorderError(null);

      const performSave = async () => {
        try {
          await itineraryClient.reorderDay(trip.id, {
            sourceDayNumber,
            targetDayNumber,
          });

          if (seq === reorderSeqRef.current) {
            setReorderStatus("saved");
            lastFailedActionRef.current = null;
            setTimeout(() => {
              setReorderStatus((curr) => (curr === "saved" ? "idle" : curr));
            }, 2500);
            await onItemsUpdated();
          }
        } catch (err: any) {
          if (seq === reorderSeqRef.current) {
            setLocalItems(snapshot); // Rollback to previous state
            setReorderStatus("error");
            const msg = err?.message || "Failed to save day order.";
            setReorderError(msg);
            lastFailedActionRef.current = performSave;
            toast.error(msg);
          }
        }
      };

      await performSave();
    },
    [localItems, trip.id, trip.startDate, onItemsUpdated]
  );

  const executeReorderItem = React.useCallback(
    async (
      itemId: string,
      sourceDayNumber: number,
      targetDayNumber: number,
      targetIndex: number
    ) => {
      const seq = ++reorderSeqRef.current;
      const snapshot = [...localItems];
      previousItemsRef.current = snapshot;

      // 1. Optimistic Update
      const itemToMove = snapshot.find((it) => it.id === itemId);
      if (!itemToMove) return;

      const remaining = snapshot.filter((it) => it.id !== itemId);
      const targetDayItems = remaining.filter((it) => it.dayNumber === targetDayNumber);
      targetDayItems.sort((a, b) => a.sortOrder - b.sortOrder);

      const safeInsertIndex = Math.max(0, Math.min(targetIndex, targetDayItems.length));
      const targetDate = getDerivedItineraryDate(trip.startDate, targetDayNumber);

      const movedItem: ItineraryItem = {
        ...itemToMove,
        dayNumber: targetDayNumber,
        date: targetDate,
        sortOrder: safeInsertIndex * 10,
      };

      targetDayItems.splice(safeInsertIndex, 0, movedItem);

      // Re-index target day items
      const updatedTargetDay = targetDayItems.map((it, idx) => ({
        ...it,
        sortOrder: idx * 10,
      }));

      // Re-index source day items if cross-day
      let updatedSourceDay: ItineraryItem[] = [];
      if (sourceDayNumber !== targetDayNumber) {
        const sourceDayItems = remaining.filter((it) => it.dayNumber === sourceDayNumber);
        sourceDayItems.sort((a, b) => a.sortOrder - b.sortOrder);
        updatedSourceDay = sourceDayItems.map((it, idx) => ({
          ...it,
          sortOrder: idx * 10,
        }));
      }

      // Combine into new local items array
      const otherItems = remaining.filter(
        (it) => it.dayNumber !== targetDayNumber && it.dayNumber !== sourceDayNumber
      );

      const finalOptimistic = [
        ...otherItems,
        ...updatedTargetDay,
        ...(sourceDayNumber !== targetDayNumber ? updatedSourceDay : []),
      ];

      setLocalItems(finalOptimistic);
      setReorderStatus("saving");
      setReorderError(null);

      const performSave = async () => {
        try {
          await itineraryClient.reorderItem(trip.id, {
            itemId,
            targetIndex: safeInsertIndex,
            targetDayNumber: sourceDayNumber !== targetDayNumber ? targetDayNumber : undefined,
          });

          if (seq === reorderSeqRef.current) {
            setReorderStatus("saved");
            lastFailedActionRef.current = null;
            setTimeout(() => {
              setReorderStatus((curr) => (curr === "saved" ? "idle" : curr));
            }, 2500);
            await onItemsUpdated();
          }
        } catch (err: any) {
          if (seq === reorderSeqRef.current) {
            setLocalItems(snapshot); // Rollback
            setReorderStatus("error");
            const msg = err?.message || "Failed to save activity order.";
            setReorderError(msg);
            lastFailedActionRef.current = performSave;
            toast.error(msg);
          }
        }
      };

      await performSave();
    },
    [localItems, trip.id, trip.startDate, onItemsUpdated]
  );

  // Drag Event Handlers
  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    const data = event.active.data.current;
    if (data?.type === "DAY") {
      setActiveDragItem({
        type: "DAY",
        dayNumber: data.dayNumber,
        itemCount: data.itemCount,
        date: data.date,
      });
    } else if (data?.type === "ITEM") {
      setActiveDragItem({
        type: "ITEM",
        item: data.item,
        dayNumber: data.dayNumber,
      });
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over || isReadOnly) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;

    // DAY REORDERING
    if (activeData.type === "DAY") {
      const sourceDay = activeData.dayNumber;
      let targetDay = sourceDay;

      if (overData.type === "DAY_DROP") {
        targetDay = overData.dayNumber;
      } else if (overData.type === "DAY_ITEMS_DROP") {
        targetDay = overData.dayNumber;
      }

      if (sourceDay !== targetDay) {
        await executeReorderDay(sourceDay, targetDay);
      }
      return;
    }

    // ACTIVITY REORDERING (Intra-day and Cross-day)
    if (activeData.type === "ITEM") {
      const sourceItem = activeData.item as ItineraryItem;
      const sourceDay = activeData.dayNumber;

      if (overData.type === "ITEM_DROP") {
        const targetDay = overData.dayNumber;
        const targetIndex = overData.itemIndex;
        await executeReorderItem(sourceItem.id, sourceDay, targetDay, targetIndex);
      } else if (overData.type === "DAY_ITEMS_DROP") {
        const targetDay = overData.dayNumber;
        const targetDayItems = localItems.filter((it) => it.dayNumber === targetDay);
        const targetIndex = targetDayItems.length;
        await executeReorderItem(sourceItem.id, sourceDay, targetDay, targetIndex);
      }
    }
  };

  // Button Reorder Fallback Handlers (Move Up / Down)
  const handleMoveDay = async (dayNumber: number, direction: "UP" | "DOWN") => {
    const targetDay = direction === "UP" ? dayNumber - 1 : dayNumber + 1;
    await executeReorderDay(dayNumber, targetDay);
  };

  const handleMoveItem = async (itemId: string, direction: "UP" | "DOWN") => {
    try {
      setReorderStatus("saving");
      await itineraryClient.reorderItem(trip.id, { itemId, direction });
      setReorderStatus("saved");
      setTimeout(() => {
        setReorderStatus((curr) => (curr === "saved" ? "idle" : curr));
      }, 2500);
      await onItemsUpdated();
    } catch (err: any) {
      setReorderStatus("error");
      setReorderError(err?.message || "Failed to move item.");
      toast.error(err?.message || "Failed to move item.");
    }
  };

  const handleRetryLastReorder = async () => {
    if (lastFailedActionRef.current) {
      await lastFailedActionRef.current();
    }
  };

  // Add Item Handlers
  const handleOpenAddDay = () => {
    const nextDay = Math.min(
      duration,
      (Math.max(0, ...localItems.map((i) => i.dayNumber)) || 0) + 1
    );

    if (localItems.length > 0 && Math.max(...localItems.map((i) => i.dayNumber)) >= duration) {
      toast.error(
        `All ${duration} days in this trip schedule already have items. To add more days, please extend the trip travel dates in the Overview tab first.`
      );
      return;
    }

    setTargetDayForAdd(nextDay);
    setItemTitle(`Day ${nextDay}: Sightseeing & Transfers`);
    setItemDescription("");
    setItemLocation("");
    setItemStartTime("09:00 AM");
    setItemEndTime("05:00 PM");
    setIsAddItemOpen(true);
  };

  const handleOpenAddItemToDay = (dayNumber: number) => {
    setTargetDayForAdd(dayNumber);
    setItemTitle(`Day ${dayNumber}: Activity & Leisure`);
    setItemDescription("");
    setItemLocation("");
    setItemStartTime("10:00 AM");
    setItemEndTime("02:00 PM");
    setIsAddItemOpen(true);
  };

  const handleSaveAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    try {
      setItemSaving(true);
      await itineraryClient.createItineraryItem(trip.id, {
        dayNumber: targetDayForAdd,
        title: itemTitle.trim(),
        description: itemDescription.trim() || undefined,
        location: itemLocation.trim() || undefined,
        startTime: itemStartTime.trim() || undefined,
        endTime: itemEndTime.trim() || undefined,
        sortOrder: 0,
      });

      toast.success(`Itinerary item added to Day ${targetDayForAdd}.`);
      setIsAddItemOpen(false);
      await onItemsUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add itinerary item.");
    } finally {
      setItemSaving(false);
    }
  };

  // Day Deletion and Duplication
  const handleDeleteDayPrompt = (dayNumber: number) => {
    const count = localItems.filter((i) => i.dayNumber === dayNumber).length;
    setDeleteDayConfirm({ dayNumber, itemCount: count });
  };

  const handleConfirmDeleteDay = async () => {
    if (!deleteDayConfirm) return;
    try {
      setDeleteDayLoading(true);
      await itineraryClient.deleteDay(trip.id, { dayNumber: deleteDayConfirm.dayNumber });
      toast.success(`Day ${deleteDayConfirm.dayNumber} deleted and schedule resequenced.`);
      setDeleteDayConfirm(null);
      await onItemsUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete day.");
    } finally {
      setDeleteDayLoading(false);
    }
  };

  const handleDuplicateDay = async (sourceDayNumber: number) => {
    const currentMaxDay = Math.max(0, ...localItems.map((i) => i.dayNumber));
    if (currentMaxDay + 1 > duration) {
      toast.error(
        `Cannot duplicate Day ${sourceDayNumber}. Adding an additional day would exceed the trip duration of ${duration} days (${formatItineraryDateDisplay(trip.startDate)} to ${formatItineraryDateDisplay(trip.endDate)}). Please extend the trip dates in the Overview tab first.`
      );
      return;
    }

    try {
      await itineraryClient.duplicateDay(trip.id, { sourceDayNumber });
      toast.success(`Day ${sourceDayNumber} duplicated as Day ${sourceDayNumber + 1}.`);
      await onItemsUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate day.");
    }
  };

  // Delete Item
  const handleDeleteItemPrompt = (itemId: string, itemTitle: string) => {
    setDeleteConfirm({ itemId, itemTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleteLoading(true);
      await itineraryClient.deleteItineraryItem(trip.id, deleteConfirm.itemId);
      toast.success("Itinerary item deleted.");
      setDeleteConfirm(null);
      await onItemsUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Template Triggers
  const handleOpenDayTemplatePicker = (dayNumber: number) => {
    setTemplatePickerDay(dayNumber);
    setTemplatePickerType(ItineraryTemplateType.DAY);
    setIsTemplatePickerOpen(true);
  };

  const handleOpenPackageTemplatePicker = () => {
    setTemplatePickerDay(null);
    setTemplatePickerType(ItineraryTemplateType.PACKAGE);
    setIsTemplatePickerOpen(true);
  };

  const handleOpenSaveDayTemplate = (dayNumber: number) => {
    setSaveTemplateType("DAY");
    setSaveTemplateSourceDay(dayNumber);
    setIsSaveTemplateOpen(true);
  };

  const handleOpenSavePackageTemplate = () => {
    setSaveTemplateType("PACKAGE");
    setIsSaveTemplateOpen(true);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 max-w-4xl mx-auto w-full select-none">
        {/* Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Day-by-Day Itinerary Builder
              </h3>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                {duration} Days Total
              </span>

              {/* Autosave Status Indicator */}
              {reorderStatus === "saving" && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving order...
                </span>
              )}
              {reorderStatus === "saved" && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-in fade-in duration-200">
                  <Check className="h-3.5 w-3.5" /> Order saved
                </span>
              )}
              {reorderStatus === "error" && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Reorder failed
                  <button
                    data-no-dnd="true"
                    type="button"
                    onClick={handleRetryLastReorder}
                    className="ml-1 underline font-bold hover:text-rose-900 cursor-pointer"
                  >
                    Retry
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
              {formatItineraryDateDisplay(trip.startDate)} to{" "}
              {formatItineraryDateDisplay(trip.endDate)}
            </p>
          </div>

          {/* Global Toolbar Actions */}
          <div data-no-dnd="true" className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              data-no-dnd="true"
              type="button"
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={handleOpenPackageTemplatePicker}
              className="h-9 text-xs px-3 border-slate-200 hover:bg-slate-50 font-medium cursor-pointer shadow-2xs"
            >
              <FileDown className="h-3.5 w-3.5 mr-1 text-indigo-600 shrink-0" /> Apply Package
            </Button>

            {localItems.length > 0 && (
              <Button
                data-no-dnd="true"
                type="button"
                variant="outline"
                size="sm"
                disabled={isReadOnly}
                onClick={handleOpenSavePackageTemplate}
                className="h-9 text-xs px-3 border-slate-200 hover:bg-slate-50 font-medium cursor-pointer shadow-2xs"
              >
                <BookmarkPlus className="h-3.5 w-3.5 mr-1 text-slate-600 shrink-0" /> Save Package
              </Button>
            )}

            <Button
              data-no-dnd="true"
              type="button"
              size="sm"
              disabled={isReadOnly}
              onClick={handleOpenAddDay}
              className="h-9 text-xs px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1 shrink-0" /> Add Day
            </Button>
          </div>
        </div>

        {/* Overflow Warning if any items exist beyond trip duration */}
        {overflowDays.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Itinerary Items Beyond Trip Dates</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              There are {overflowDays.reduce((acc, d) => acc + d.items.length, 0)} items scheduled on
              Days {overflowDays.map((d) => d.dayNumber).join(", ")}, which exceed the current trip
              schedule of {duration} days. To include them in official travel documents, extend the
              trip end date in the Overview tab.
            </p>
          </div>
        )}

        {/* Virtual Days Stack */}
        <div className="space-y-4">
          {virtualDays.map((vDay, idx) => (
            <ItineraryDayCard
              key={vDay.dayNumber}
              tripId={trip.id}
              dayNumber={vDay.dayNumber}
              date={vDay.date}
              items={vDay.items}
              isFirstDay={idx === 0}
              isLastDay={idx === virtualDays.length - 1}
              isBeyondDuration={false}
              isReadOnly={isReadOnly}
              onAddItemToDay={handleOpenAddItemToDay}
              onDuplicateDay={handleDuplicateDay}
              onDeleteDay={handleDeleteDayPrompt}
              onMoveDay={handleMoveDay}
              onApplyDayTemplate={handleOpenDayTemplatePicker}
              onSaveDayAsTemplate={handleOpenSaveDayTemplate}
              onItemUpdated={onItemsUpdated}
              onDeleteItem={handleDeleteItemPrompt}
              onMoveItem={handleMoveItem}
            />
          ))}

          {/* Render Overflow Days if any */}
          {overflowDays.map((oDay) => (
            <ItineraryDayCard
              key={oDay.dayNumber}
              tripId={trip.id}
              dayNumber={oDay.dayNumber}
              date={oDay.date}
              items={oDay.items}
              isFirstDay={false}
              isLastDay={false}
              isBeyondDuration={true}
              isReadOnly={isReadOnly}
              onAddItemToDay={handleOpenAddItemToDay}
              onDuplicateDay={handleDuplicateDay}
              onDeleteDay={handleDeleteDayPrompt}
              onMoveDay={handleMoveDay}
              onApplyDayTemplate={handleOpenDayTemplatePicker}
              onSaveDayAsTemplate={handleOpenSaveDayTemplate}
              onItemUpdated={onItemsUpdated}
              onDeleteItem={handleDeleteItemPrompt}
              onMoveItem={handleMoveItem}
            />
          ))}
        </div>

        {/* Drag Overlay for Floating Drag Preview */}
        <DragOverlay dropAnimation={null}>
          {activeDragItem?.type === "DAY" && (
            <div className="bg-white rounded-xl border-2 border-indigo-500 shadow-2xl p-4 sm:p-5 max-w-3xl w-full opacity-95 pointer-events-none ring-4 ring-indigo-500/20">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded uppercase">
                  Day {activeDragItem.dayNumber}
                </span>
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatItineraryDateDisplay(activeDragItem.date)}
                </span>
                <span className="text-xs text-slate-500 ml-auto font-medium">
                  {activeDragItem.itemCount} {activeDragItem.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          )}
          {activeDragItem?.type === "ITEM" && (
            <div className="bg-white rounded-lg border-2 border-indigo-500 shadow-2xl p-3 sm:p-4 max-w-xl w-full opacity-95 pointer-events-none ring-4 ring-indigo-500/20 space-y-1">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900">
                  {activeDragItem.item.title}
                </span>
              </div>
              {(activeDragItem.item.location || activeDragItem.item.startTime) && (
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-5">
                  {activeDragItem.item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {activeDragItem.item.location}
                    </span>
                  )}
                  {activeDragItem.item.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {activeDragItem.item.startTime}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </DragOverlay>

        {/* Add Item Modal Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Add Schedule Item — Day {targetDayForAdd}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Add a daily schedule item, transfer, or sightseeing block to Day {targetDayForAdd}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveAddItem} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g., Uluwatu Temple & Sunset Kecak Dance"
                  className="h-9 text-xs bg-white border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <Textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Schedule details, highlights, or inclusions..."
                  className="text-xs bg-white border-slate-200 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Location</label>
                <Input
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  placeholder="e.g., Uluwatu, South Bali"
                  className="h-9 text-xs bg-white border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Time</label>
                  <Input
                    value={itemStartTime}
                    onChange={(e) => setItemStartTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Time</label>
                  <Input
                    value={itemEndTime}
                    onChange={(e) => setItemEndTime(e.target.value)}
                    placeholder="05:00 PM"
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs cursor-pointer"
                  onClick={() => setIsAddItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={itemSaving || !itemTitle.trim()}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  {itemSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Item Dialog */}
        <ConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Delete Itinerary Item?"
          description={`Are you sure you want to remove "${deleteConfirm?.itemTitle}" from this day's schedule?`}
          variant="destructive"
          confirmText={deleteLoading ? "Deleting..." : "Delete Item"}
          onConfirm={handleConfirmDelete}
        />

        {/* Confirm Delete Day Dialog */}
        <ConfirmDialog
          open={!!deleteDayConfirm}
          onOpenChange={(open) => !open && setDeleteDayConfirm(null)}
          title={`Delete Day ${deleteDayConfirm?.dayNumber}?`}
          description={
            deleteDayConfirm?.itemCount && deleteDayConfirm.itemCount > 0
              ? `Day ${deleteDayConfirm?.dayNumber} currently contains ${deleteDayConfirm?.itemCount} schedule items. Deleting it will permanently remove all items on this day and shift all subsequent days down by 1 to maintain contiguous numbering.`
              : `Are you sure you want to delete Day ${deleteDayConfirm?.dayNumber}? Subsequent days will be shifted down by 1.`
          }
          variant="destructive"
          confirmText={deleteDayLoading ? "Deleting Day..." : "Delete Day"}
          onConfirm={handleConfirmDeleteDay}
        />

        {/* Reusable Template Modals */}
        <TemplatePickerModal
          open={isTemplatePickerOpen}
          onOpenChange={setIsTemplatePickerOpen}
          tripId={trip.id}
          targetDayNumber={templatePickerDay}
          modeFilter={templatePickerType}
          onApplied={async () => {
            setIsTemplatePickerOpen(false);
            await onItemsUpdated();
          }}
          itineraryClient={itineraryClient}
        />

        <SaveTemplateModal
          open={isSaveTemplateOpen}
          onOpenChange={setIsSaveTemplateOpen}
          tripId={trip.id}
          defaultType={saveTemplateType}
          defaultSourceDay={saveTemplateSourceDay}
          destinations={destinations}
          totalDays={duration}
          itineraryClient={itineraryClient}
        />
      </div>
    </DndContext>
  );
}
