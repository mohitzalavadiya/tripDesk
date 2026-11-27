import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItineraryItem } from "@prisma/client";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  GripVertical,
  Loader2,
  MapPin,
  RotateCcw,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useItineraryAutosave } from "./use-itinerary-autosave";

interface ItineraryItemRowProps {
  tripId: string;
  item: ItineraryItem;
  itemIndex: number;
  totalItemsInDay: number;
  isReadOnly: boolean;
  onItemUpdated: (updatedItem: ItineraryItem) => void;
  onDeleteItem: (itemId: string, itemTitle: string) => void;
  onMoveItem: (itemId: string, direction: "UP" | "DOWN") => void;
}

export function ItineraryItemRow({
  tripId,
  item,
  itemIndex,
  totalItemsInDay,
  isReadOnly,
  onItemUpdated,
  onDeleteItem,
  onMoveItem,
}: ItineraryItemRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    isDragging,
  } = useDraggable({
    id: `item-${item.id}`,
    data: {
      type: "ITEM",
      item,
      dayNumber: item.dayNumber,
      itemIndex,
    },
    disabled: isReadOnly,
    attributes: {
      role: "article",
      roleDescription: "itinerary activity",
    },
  });

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `item-drop-${item.id}`,
    data: {
      type: "ITEM_DROP",
      itemId: item.id,
      dayNumber: item.dayNumber,
      itemIndex,
    },
    disabled: isReadOnly,
  });

  const setCombinedRef = React.useCallback(
    (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef]
  );

  const {
    draft,
    status,
    errorMessage,
    updateField,
    flushSave,
    retrySave,
    overwriteSave,
    reloadFromServer,
  } = useItineraryAutosave({
    tripId,
    item,
    onSaved: onItemUpdated,
  });

  return (
    <div
      ref={setCombinedRef}
      data-dnd-card="true"
      {...(isReadOnly ? {} : attributes)}
      {...(isReadOnly ? {} : listeners)}
      style={{
        opacity: isDragging ? 0.35 : 1,
        touchAction: "pan-x pan-y",
      }}
      className={`bg-slate-50/70 hover:bg-slate-50 rounded-lg border p-3 sm:p-4 space-y-3 transition-all ${
        isOver
          ? "border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-50/40"
          : "border-slate-200/90"
      } ${isReadOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {/* Explicit Overwrite Confirmation Dialog (F-01) */}
      {showOverwriteConfirm && (
        <ConfirmDialog
          open={showOverwriteConfirm}
          onOpenChange={setShowOverwriteConfirm}
          title="Overwrite Conflicted Version?"
          description={
            <span>
              This item was updated in another session. Overwriting will replace the
              newer server version with your local edits for <strong>&ldquo;{draft.title}&rdquo;</strong>.
              Are you sure you want to proceed?
            </span>
          }
          variant="warning"
          confirmText="Confirm & Overwrite"
          cancelText="Cancel"
          onConfirm={async () => {
            setShowOverwriteConfirm(false);
            await overwriteSave();
          }}
        />
      )}

      {/* Conflict / Stale Write Recovery Alert */}
      {status === "conflict" && (
        <div
          data-no-dnd="true"
          className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="break-words">
              {errorMessage || "Edited in another session. Local edits preserved."}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reloadFromServer}
              className="h-7 text-xs px-2.5 bg-white border-amber-300 hover:bg-amber-100/50 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reload Server
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowOverwriteConfirm(true)}
              className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              Overwrite & Save
            </Button>
          </div>
        </div>
      )}

      {/* Main Header / Title Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {!isReadOnly && (
            <span
              className="text-slate-400 hover:text-slate-600 cursor-grab shrink-0 select-none p-0.5"
              title="Drag activity"
            >
              <GripVertical className="h-3.5 w-3.5" aria-label="Drag activity" />
            </span>
          )}
          <span className="text-[11px] font-bold text-slate-400 shrink-0 select-none">
            #{itemIndex + 1}
          </span>
          <Input
            data-no-dnd="true"
            value={draft.title}
            disabled={isReadOnly}
            onChange={(e) => updateField("title", e.target.value)}
            onBlur={flushSave}
            placeholder="Schedule item title..."
            className="h-8 min-w-0 flex-1 font-semibold text-xs sm:text-sm text-slate-800 bg-white border-slate-200 focus:bg-white rounded-lg px-2.5"
            aria-label={`Title for item ${itemIndex + 1}`}
          />
        </div>

        {/* Action Controls & Autosave Status */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 self-end sm:self-center shrink-0">
          {/* Status Badge */}
          {status === "saving" && (
            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </span>
          )}
          {status === "saved" && (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {status === "unsaved" && (
            <button
              data-no-dnd="true"
              type="button"
              onClick={flushSave}
              disabled={isReadOnly}
              className="text-[10px] text-slate-500 hover:text-slate-800 font-medium px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer"
              title="Click to save now"
            >
              Unsaved (Save)
            </button>
          )}
          {status === "error" && (
            <button
              data-no-dnd="true"
              type="button"
              onClick={retrySave}
              className="text-[10px] text-rose-600 font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 cursor-pointer"
              title={errorMessage || "Save failed, click to retry"}
            >
              <AlertCircle className="h-3 w-3" /> Retry
            </button>
          )}

          {/* Accessible Reorder Controls */}
          <div
            data-no-dnd="true"
            className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shadow-2xs"
          >
            <button
              data-no-dnd="true"
              type="button"
              disabled={isReadOnly || itemIndex === 0}
              onClick={() => onMoveItem(item.id, "UP")}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label={`Move item ${draft.title || `#${itemIndex + 1}`} Up`}
              title="Move Up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              data-no-dnd="true"
              type="button"
              disabled={isReadOnly || itemIndex === totalItemsInDay - 1}
              onClick={() => onMoveItem(item.id, "DOWN")}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-l border-slate-100"
              aria-label={`Move item ${draft.title || `#${itemIndex + 1}`} Down`}
              title="Move Down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          <button
            data-no-dnd="true"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 cursor-pointer"
          >
            {isExpanded ? "Collapse" : "Details"}
          </button>

          <button
            data-no-dnd="true"
            type="button"
            disabled={isReadOnly}
            onClick={() => onDeleteItem(item.id, draft.title)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
            aria-label={`Delete item ${draft.title || `#${itemIndex + 1}`}`}
            title="Delete item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Details: Description, Location, Times */}
      {isExpanded ? (
        <div
          data-no-dnd="true"
          className="space-y-2.5 pt-2 border-t border-slate-200/60 animate-in fade-in duration-100 text-xs"
        >
          <div>
            <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
              Description & Highlights
            </label>
            <Textarea
              data-no-dnd="true"
              value={draft.description}
              disabled={isReadOnly}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={flushSave}
              placeholder="Add sightseeing details, transfer instructions, or leisure notes..."
              rows={3}
              className="text-xs bg-white border-slate-200 resize-y"
              aria-label="Item description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" /> Location / Landmark
              </label>
              <Input
                data-no-dnd="true"
                value={draft.location}
                disabled={isReadOnly}
                onChange={(e) => updateField("location", e.target.value)}
                onBlur={flushSave}
                placeholder="e.g., Kuta Beach / Denpasar"
                className="h-8 text-xs bg-white border-slate-200"
                aria-label="Item location"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" /> Start Time
              </label>
              <Input
                data-no-dnd="true"
                value={draft.startTime}
                disabled={isReadOnly}
                onChange={(e) => updateField("startTime", e.target.value)}
                onBlur={flushSave}
                placeholder="e.g., 09:30 AM"
                className="h-8 text-xs bg-white border-slate-200"
                aria-label="Item start time"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" /> End Time
              </label>
              <Input
                data-no-dnd="true"
                value={draft.endTime}
                disabled={isReadOnly}
                onChange={(e) => updateField("endTime", e.target.value)}
                onBlur={flushSave}
                placeholder="e.g., 01:00 PM"
                className="h-8 text-xs bg-white border-slate-200"
                aria-label="Item end time"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Compact preview when collapsed */
        (draft.description || draft.location || draft.startTime || draft.endTime) && (
          <div className="text-xs text-slate-600 space-y-1">
            {draft.description && (
              <p className="line-clamp-2 text-slate-600 leading-relaxed break-words text-[11px]">
                {draft.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
              {draft.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{draft.location}</span>
                </span>
              )}
              {(draft.startTime || draft.endTime) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>
                    {draft.startTime || ""}
                    {draft.startTime && draft.endTime ? " – " : ""}
                    {draft.endTime || ""}
                  </span>
                </span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
