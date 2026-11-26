import { Button } from "@/components/ui/button";
import { formatItineraryDateDisplay } from "@/lib/utils/itinerary-dates";
import { ItineraryItem } from "@prisma/client";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Calendar,
  Copy,
  FileDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { ItineraryItemRow } from "./itinerary-item-row";

interface ItineraryDayCardProps {
  tripId: string;
  dayNumber: number;
  date: Date;
  items: ItineraryItem[];
  isFirstDay: boolean;
  isLastDay: boolean;
  isBeyondDuration: boolean;
  isReadOnly: boolean;
  onAddItemToDay: (dayNumber: number) => void;
  onDuplicateDay: (dayNumber: number) => void;
  onDeleteDay?: (dayNumber: number) => void;
  onMoveDay: (dayNumber: number, direction: "UP" | "DOWN") => void;
  onApplyDayTemplate: (dayNumber: number) => void;
  onSaveDayAsTemplate: (dayNumber: number) => void;
  onItemUpdated: (updatedItem: ItineraryItem) => void;
  onDeleteItem: (itemId: string, itemTitle: string) => void;
  onMoveItem: (itemId: string, direction: "UP" | "DOWN") => void;
}

export function ItineraryDayCard({
  tripId,
  dayNumber,
  date,
  items,
  isFirstDay,
  isLastDay,
  isBeyondDuration,
  isReadOnly,
  onAddItemToDay,
  onDuplicateDay,
  onDeleteDay,
  onMoveDay,
  onApplyDayTemplate,
  onSaveDayAsTemplate,
  onItemUpdated,
  onDeleteItem,
  onMoveItem,
}: ItineraryDayCardProps) {
  // Draggable configuration for the day card
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({
    id: `day-${dayNumber}`,
    data: {
      type: "DAY",
      dayNumber,
      itemCount: items.length,
      date,
    },
    disabled: isReadOnly,
    attributes: {
      role: "article",
      roleDescription: "itinerary day card",
    },
  });

  // Droppable configuration for day reordering (drop target for another day)
  const { setNodeRef: setDroppableDayRef, isOver: isOverDay } = useDroppable({
    id: `day-drop-${dayNumber}`,
    data: {
      type: "DAY_DROP",
      dayNumber,
    },
    disabled: isReadOnly,
  });

  // Droppable configuration for receiving activities dropped into this day
  const { setNodeRef: setDroppableItemsRef, isOver: isOverItemsArea } = useDroppable({
    id: `day-items-drop-${dayNumber}`,
    data: {
      type: "DAY_ITEMS_DROP",
      dayNumber,
    },
    disabled: isReadOnly,
  });

  const setCombinedDayRef = React.useCallback(
    (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      setDroppableDayRef(node);
    },
    [setDraggableNodeRef, setDroppableDayRef]
  );

  return (
    <div
      ref={setCombinedDayRef}
      data-dnd-card="true"
      {...(isReadOnly ? {} : attributes)}
      {...(isReadOnly ? {} : listeners)}
      style={{
        opacity: isDragging ? 0.35 : 1,
        touchAction: "pan-x pan-y",
      }}
      className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs space-y-4 transition-all ${
        isOverDay
          ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20"
          : isBeyondDuration
          ? "border-amber-300 bg-amber-50/20"
          : "border-slate-200 hover:border-slate-300"
      } ${isReadOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
      aria-label={`Day ${dayNumber} schedule`}
    >
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!isReadOnly && (
              <span
                className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0 select-none p-0.5"
                title={`Drag Day ${dayNumber}`}
              >
                <GripVertical className="h-4 w-4" aria-label={`Drag Day ${dayNumber}`} />
              </span>
            )}
            <span
              className={`text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${
                isBeyondDuration
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
              }`}
            >
              Day {dayNumber}
            </span>
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {formatItineraryDateDisplay(date)}
            </span>
            {isBeyondDuration && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                Beyond Scheduled Dates
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {items.length === 0
              ? "No schedule items added yet."
              : `${items.length} ${items.length === 1 ? "schedule item" : "schedule items"} planned.`}
          </p>
        </div>

        {/* Day Actions */}
        <div
          data-no-dnd="true"
          className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto shrink-0"
        >
          {/* Day Reorder Controls (Accessible fallback) */}
          <div
            data-no-dnd="true"
            className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50 shadow-2xs"
          >
            <button
              data-no-dnd="true"
              type="button"
              disabled={isReadOnly || isFirstDay}
              onClick={() => onMoveDay(dayNumber, "UP")}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label={`Move Day ${dayNumber} Up`}
              title="Move Day Up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              data-no-dnd="true"
              type="button"
              disabled={isReadOnly || isLastDay}
              onClick={() => onMoveDay(dayNumber, "DOWN")}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-l border-slate-200"
              aria-label={`Move Day ${dayNumber} Down`}
              title="Move Day Down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Duplicate Day */}
          <Button
            data-no-dnd="true"
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly || items.length === 0}
            onClick={() => onDuplicateDay(dayNumber)}
            className="h-8 text-xs px-2.5 border-slate-200 hover:bg-slate-50 font-medium cursor-pointer shadow-2xs"
            title="Duplicate itinerary items for this day"
          >
            <Copy className="h-3 w-3 mr-1" /> Duplicate
          </Button>

          {/* Template Actions */}
          <Button
            data-no-dnd="true"
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly}
            onClick={() => onApplyDayTemplate(dayNumber)}
            className="h-8 text-xs px-2.5 border-slate-200 hover:bg-slate-50 font-medium cursor-pointer shadow-2xs"
            title="Apply Day Template to this day"
          >
            <FileDown className="h-3 w-3 mr-1" /> Template
          </Button>

          {items.length > 0 && (
            <Button
              data-no-dnd="true"
              type="button"
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => onSaveDayAsTemplate(dayNumber)}
              className="h-8 text-xs px-2 text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer shadow-2xs"
              title="Save Day as reusable template"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Delete Day */}
          <Button
            data-no-dnd="true"
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly}
            onClick={() => onDeleteDay?.(dayNumber)}
            className="h-8 text-xs px-2 text-slate-400 hover:text-rose-600 border-slate-200 hover:bg-rose-50 cursor-pointer shadow-2xs"
            title={`Delete Day ${dayNumber} and resequence schedule`}
            aria-label={`Delete Day ${dayNumber}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          {/* Add Item to Day */}
          <Button
            data-no-dnd="true"
            type="button"
            size="sm"
            disabled={isReadOnly}
            onClick={() => onAddItemToDay(dayNumber)}
            className="h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="h-3 w-3 mr-1 shrink-0" /> Add Item
          </Button>
        </div>
      </div>

      {/* Items List or Empty Day Banner */}
      {items.length === 0 ? (
        <div
          ref={setDroppableItemsRef}
          className={`py-6 px-4 rounded-lg border border-dashed transition-colors text-center space-y-2 ${
            isOverItemsArea
              ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-400/30"
              : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <p className="text-xs text-slate-500 font-medium">
            {isOverItemsArea
              ? "Drop activity here to add to Day " + dayNumber
              : "No schedule or sightseeing planned for Day " + dayNumber + " yet."}
          </p>
          <div data-no-dnd="true" className="flex items-center justify-center gap-2 pt-1">
            <Button
              data-no-dnd="true"
              type="button"
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => onAddItemToDay(dayNumber)}
              className="h-7 text-xs px-3 bg-white border-slate-200"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Day Schedule
            </Button>
            <Button
              data-no-dnd="true"
              type="button"
              variant="outline"
              size="sm"
              disabled={isReadOnly}
              onClick={() => onApplyDayTemplate(dayNumber)}
              className="h-7 text-xs px-3 bg-white border-slate-200"
            >
              <FileDown className="h-3 w-3 mr-1" /> Pick Day Template
            </Button>
          </div>
        </div>
      ) : (
        <div ref={setDroppableItemsRef} className="space-y-2.5">
          {items.map((item, idx) => (
            <ItineraryItemRow
              key={item.id}
              tripId={tripId}
              item={item}
              itemIndex={idx}
              totalItemsInDay={items.length}
              isReadOnly={isReadOnly}
              onItemUpdated={onItemUpdated}
              onDeleteItem={onDeleteItem}
              onMoveItem={onMoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
