"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { enquiryClient, EnquiryWithRelations } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { classifyEnquiryUrgency } from "@/lib/utils/crm-urgency";
import { formatEnumLabel } from "@/lib/utils/enum-formatters";
import { STANDARD_LOST_REASONS } from "@/lib/validation/enquiry-schema";
import type { EnquiryStatus } from "@prisma/client";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
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
} from "@dnd-kit/core";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Compass,
  Eye,
  FileText,
  GripVertical,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { QuickLogModal } from "./quick-log-modal";
import { PriorityBadge } from "./status-badge";

/**
 * Determines whether a DOM event originated from an interactive element
 * that should process its own click/change events without activating drag-and-drop.
 */
function shouldHandleDndEvent(element: HTMLElement | null): boolean {
  let cur = element;
  while (cur && cur !== document.body) {
    // If we reached the card root container, this pointer event is on the card's general drag surface
    if (cur.dataset && cur.dataset.dndCard === "true") {
      return true;
    }
    // Explicit opt-out attribute on any interactive control
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
        const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
        if (!shouldHandleDndEvent(target)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

interface EnquiryPipelineProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  updatingIds?: Record<string, boolean>;
  onStatusChange?: (id: string, status: EnquiryStatus) => void | Promise<void>;
  onArchive?: (id: string, enquiryNumber: string) => void;
  onConvertTrip?: (id: string) => void;
  onRefresh?: () => void;
  onAssign?: (enquiry: EnquiryWithRelations) => void;
}

interface PipelineStageConfig {
  label: string;
  status: EnquiryStatus;
  accentBg: string;
  badgeBg: string;
  badgeText: string;
  columnBg: string;
  borderClass: string;
  headerAccent: string;
}

const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    label: "New",
    status: "NEW",
    accentBg: "bg-sky-500",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-sky-500",
  },
  {
    label: "Contacted",
    status: "CONTACTED",
    accentBg: "bg-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-blue-600",
  },
  {
    label: "Qualified",
    status: "QUALIFIED",
    accentBg: "bg-teal-600",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-800",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-teal-600",
  },
  {
    label: "Quoted",
    status: "QUOTATION_SENT",
    accentBg: "bg-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-indigo-600",
  },
  {
    label: "Follow-up",
    status: "FOLLOW_UP",
    accentBg: "bg-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-amber-500",
  },
  {
    label: "Negotiation",
    status: "NEGOTIATION",
    accentBg: "bg-orange-500",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-800",
    columnBg: "bg-slate-50/80",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-orange-500",
  },
  {
    label: "Converted",
    status: "CONVERTED",
    accentBg: "bg-emerald-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    columnBg: "bg-emerald-50/30",
    borderClass: "border-emerald-200/80",
    headerAccent: "bg-emerald-600",
  },
  {
    label: "Lost",
    status: "LOST",
    accentBg: "bg-rose-500",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    columnBg: "bg-rose-50/20",
    borderClass: "border-rose-200/70",
    headerAccent: "bg-rose-500",
  },
  {
    label: "Cancelled",
    status: "CANCELLED",
    accentBg: "bg-slate-400",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    columnBg: "bg-slate-100/50",
    borderClass: "border-slate-200/80",
    headerAccent: "bg-slate-400",
  },
];

function getCustomerInitials(name?: string | null): string {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name?: string | null): { bg: string; text: string; ring: string } {
  const palette = [
    { bg: "bg-teal-100", text: "text-teal-800", ring: "ring-teal-200" },
    { bg: "bg-indigo-100", text: "text-indigo-800", ring: "ring-indigo-200" },
    { bg: "bg-sky-100", text: "text-sky-800", ring: "ring-sky-200" },
    { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-200" },
    { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-200" },
    { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-200" },
    { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-200" },
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

interface KanbanDroppableColumnProps {
  stage: PipelineStageConfig;
  enquiriesCount: number;
  stageTotal: number;
  isReadOnly?: boolean;
  activeEnquiry: EnquiryWithRelations | null;
  children: React.ReactNode;
}

function KanbanDroppableColumn({
  stage,
  enquiriesCount,
  stageTotal,
  isReadOnly,
  activeEnquiry,
  children,
}: KanbanDroppableColumnProps) {
  const isDroppable = !isReadOnly && stage.status !== "CONVERTED";
  const { setNodeRef, isOver } = useDroppable({
    id: stage.status,
    disabled: !isDroppable,
  });

  const isCurrentColumn = activeEnquiry && activeEnquiry.status === stage.status;
  const isLockedColumn = stage.status === "CONVERTED";

  const columnHighlightClass = isOver
    ? stage.status === "LOST"
      ? "ring-2 ring-rose-400 border-rose-300 bg-rose-50/40 shadow-md"
      : "ring-2 ring-teal-500 border-teal-400 bg-teal-50/30 shadow-md"
    : activeEnquiry && !isLockedColumn && !isCurrentColumn
    ? "border-dashed border-teal-300/80"
    : stage.borderClass;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] sm:min-w-[280px] max-w-[340px] rounded-2xl border flex flex-col select-none shrink-0 shadow-2xs overflow-hidden h-[calc(100vh-215px)] min-h-[480px] transition-colors duration-150 ${stage.columnBg} ${columnHighlightClass}`}
    >
      {/* Top Color Accent Bar */}
      <div className={`h-1.5 w-full shrink-0 ${stage.headerAccent}`} />

      <div className="p-3 flex flex-col flex-1 min-h-0">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-2 px-0.5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`h-2.5 w-2.5 rounded-full ${stage.accentBg} shrink-0`} />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
              {stage.label}
            </h4>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${stage.badgeBg} ${stage.badgeText} tabular-nums shrink-0`}
            >
              {enquiriesCount}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-600 tabular-nums shrink-0">
            {stageTotal > 0 ? formatCurrency(stageTotal) : "-"}
          </span>
        </div>

        {/* Locked Stage Banner when dragging */}
        {activeEnquiry && isLockedColumn && (
          <div className="mb-2 px-2 py-1 bg-slate-100/90 border border-slate-200 rounded-lg text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
            <Lock className="h-3 w-3 text-slate-400" />
            <span>Won via Confirmed Booking only</span>
          </div>
        )}

        {/* Drop Acceptance Prompt when hovered */}
        {isOver && activeEnquiry && (
          <div
            className={`p-2 mb-2 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs animate-pulse ${
              stage.status === "LOST"
                ? "border-rose-400 bg-rose-50/90 text-rose-800"
                : "border-teal-500 bg-teal-50/90 text-teal-900"
            }`}
          >
            {stage.status === "LOST" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                <span>Drop to specify Lost Reason</span>
              </>
            ) : (
              <span>Drop to move to {stage.label}</span>
            )}
          </div>
        )}

        {/* Cards Container with Flexible Sizing & Smooth Column Scrolling */}
        <div className="kanban-column-cards flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

interface DraggableEnquiryCardProps {
  enq: EnquiryWithRelations;
  isReadOnly?: boolean;
  isUpdating?: boolean;
  setSelectedEnquiryForLog: (enq: EnquiryWithRelations) => void;
  onAssign?: (enq: EnquiryWithRelations) => void;
  onConvertTrip?: (id: string) => void;
  onMoveStage: (enq: EnquiryWithRelations, e: React.MouseEvent, status: EnquiryStatus) => void;
  router: ReturnType<typeof useRouter>;
  formatDate: (date: Date | string | null | undefined) => string;
}

function DraggableEnquiryCard({
  enq,
  isReadOnly = false,
  isUpdating = false,
  setSelectedEnquiryForLog,
  onAssign,
  onConvertTrip,
  onMoveStage,
  router,
  formatDate,
}: DraggableEnquiryCardProps) {
  const isDraggable = !isReadOnly && !isUpdating && enq.status !== "CONVERTED";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: enq.id,
    data: { enquiry: enq },
    disabled: !isDraggable,
    attributes: {
      role: "article",
      roleDescription: "enquiry ticket",
    },
  });

  const customer = enq.customer;
  const customerName = customer?.name || "Unknown Customer";
  const initials = getCustomerInitials(customerName);
  const avatar = getAvatarColor(customerName);
  const totalPax = enq.adults + enq.children + enq.infants;
  const urgencyResult = classifyEnquiryUrgency(enq);
  const primaryAction = urgencyResult.primaryNextAction;

  const handleCardClick = (e: React.MouseEvent) => {
    // If dragging was active, ignore the click to prevent accidental navigation
    if (isDragging) return;
    router.push(`/enquiries/${enq.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      data-dnd-card="true"
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
      style={{
        opacity: isDragging ? 0.35 : undefined,
        touchAction: "pan-x pan-y",
      }}
      onClick={handleCardClick}
      className={`bg-white rounded-xl border p-2.5 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all duration-150 select-none space-y-1.5 group relative ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${
        isDragging
          ? "border-dashed border-teal-400 bg-teal-50/20 shadow-lg cursor-grabbing"
          : "border-slate-200/90"
      }`}
    >
      {isUpdating && (
        <div className="absolute inset-0 bg-white/75 backdrop-blur-xs rounded-xl flex items-center justify-center z-20">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        </div>
      )}

      {/* Card Header: Drag Handle Affordance, Avatar, Name, Enquiry#, Source and Quick Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Visual Drag Handle Affordance */}
          {isDraggable && (
            <div
              className="p-0.5 -ml-1 text-slate-300 group-hover:text-slate-500 rounded shrink-0 transition-colors"
              aria-label={`Drag enquiry ${enq.enquiryNumber} to change stage`}
              title="Drag enquiry card to move stage"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}

          {/* Customer Avatar Circle */}
          <div
            className={`h-6 w-6 rounded-full ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold text-[9px] shrink-0 ring-1 ${avatar.ring}`}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
              {customerName}
            </h5>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono min-w-0">
              <span className="whitespace-nowrap shrink-0">{enq.enquiryNumber}</span>
              {enq.source && (
                <>
                  <span className="shrink-0">•</span>
                  <span className="text-slate-500 font-sans font-medium truncate">
                    {formatEnumLabel(enq.source)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0" data-no-dnd="true">
          {/* WhatsApp Click-to-Chat Link */}
          {customer?.phone && (
            <a
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              data-no-dnd="true"
              className="h-5.5 w-5.5 inline-flex items-center justify-center rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="h-2.5 w-2.5 text-emerald-600" />
            </a>
          )}

          {/* Quick Log Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isReadOnly}
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEnquiryForLog(enq);
            }}
            className="h-5.5 px-1.5 text-[9px] font-semibold text-teal-800 bg-teal-50 border-teal-200 hover:bg-teal-100 rounded-md cursor-pointer gap-0.5 transition-all"
            title="Quick Log Interaction"
          >
            <Phone className="h-2.5 w-2.5 text-teal-600" />
            <span>Log</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  data-no-dnd="true"
                  onClick={(e) => e.stopPropagation()}
                  className="h-5.5 w-5.5 p-0 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="end"
              className="w-52 bg-white border border-slate-200 rounded-xl p-1 text-xs shadow-lg"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="cursor-pointer gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>View Workspace</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={isReadOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEnquiryForLog(enq);
                  }}
                  className="cursor-pointer text-teal-700 font-medium gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5 text-teal-600" />
                  <span>Quick Log Interaction</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={isReadOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign?.(enq);
                  }}
                  className="cursor-pointer text-indigo-700 font-medium gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Reassign Lead</span>
                </DropdownMenuItem>

                {enq.convertedTripId ? (
                  <DropdownMenuItem
                    onClick={() => router.push(`/trips/${enq.convertedTripId}`)}
                    className="cursor-pointer text-indigo-700 font-medium gap-1.5"
                  >
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Open Linked Trip</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={isReadOnly || enq.status === "LOST" || enq.status === "CANCELLED" || enq.status === "CONVERTED"}
                    onClick={() => onConvertTrip?.(enq.id)}
                    className="cursor-pointer text-indigo-700 font-medium gap-1.5"
                  >
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Convert to Trip</span>
                  </DropdownMenuItem>
                )}

                {PIPELINE_STAGES
                  .filter((s) => s.status !== enq.status && s.status !== "CONVERTED")
                  .map((target) => (
                    <DropdownMenuItem
                      key={target.status}
                      disabled={isReadOnly}
                      onClick={(e) => onMoveStage(enq, e, target.status)}
                      className={`cursor-pointer ${
                        target.status === "LOST"
                          ? "text-rose-600 hover:bg-rose-50"
                          : ""
                      }`}
                    >
                      Move to {target.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Destination, Travel Dates & Linked Workspaces (Compact Single-Row Strip) */}
      {(enq.destination || enq.startDate || enq.convertedTrip || enq.convertedQuotation) && (
        <div className="flex items-center justify-between gap-1 px-2 py-1 bg-slate-50/90 rounded-md border border-slate-100 text-[10px]">
          {enq.destination ? (
            <div className="flex items-center gap-1 font-semibold text-slate-800 truncate min-w-0">
              <MapPin className="h-2.5 w-2.5 text-teal-600 shrink-0" />
              <span className="truncate">{enq.destination}</span>
            </div>
          ) : (
            <div className="text-slate-400 italic text-[9.5px]">No destination</div>
          )}

          <div className="flex items-center gap-1 shrink-0 text-slate-500 font-medium">
            {enq.startDate && (
              <span className="text-[9.5px] text-slate-500">
                {formatDate(enq.startDate)}
                {enq.endDate ? ` → ${formatDate(enq.endDate)}` : ""}
              </span>
            )}
            {enq.convertedTrip && (
              <div
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/trips/${enq.convertedTrip!.id}`);
                }}
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                title="Open Linked Trip Workspace"
              >
                <Compass className="h-2 w-2 text-indigo-600" />
                <span>Trip</span>
              </div>
            )}
            {enq.convertedQuotation && (
              <div
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/quotations/${enq.convertedQuotation!.id}`);
                }}
                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                title="Open Linked Quotation"
              >
                <FileText className="h-2 w-2 text-emerald-600" />
                <span>Quote</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Urgency & Primary Next Action Indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <div className="flex items-center gap-1 flex-wrap">
            {urgencyResult.urgency === "OVERDUE" && (
              <button
                type="button"
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEnquiryForLog(enq);
                }}
                disabled={isReadOnly}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200 transition-colors cursor-pointer"
                title={`${urgencyResult.accessibleDescription}. Click to log interaction.`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                <Clock className="h-2.5 w-2.5 text-rose-600 shrink-0" />
                <span>{urgencyResult.badgeLabel}</span>
              </button>
            )}
            {urgencyResult.urgency === "DUE_TODAY" && (
              <button
                type="button"
                data-no-dnd="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEnquiryForLog(enq);
                }}
                disabled={isReadOnly}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 transition-colors cursor-pointer"
                title={`${urgencyResult.accessibleDescription}. Click to log interaction.`}
              >
                <Clock className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                <span>Due today</span>
              </button>
            )}
            {urgencyResult.urgency === "UPCOMING" && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-sky-50 text-sky-800 border border-sky-200"
                title={urgencyResult.accessibleDescription}
              >
                <Calendar className="h-2.5 w-2.5 text-sky-600 shrink-0" />
                <span>{urgencyResult.badgeLabel}</span>
              </span>
            )}
            {urgencyResult.urgency === "NO_NEXT_ACTION" && (
              !["CONVERTED", "LOST", "CANCELLED"].includes(enq.status) ? (
                <button
                  type="button"
                  data-no-dnd="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEnquiryForLog(enq);
                  }}
                  disabled={isReadOnly}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                  title="No follow-up scheduled. Click to schedule next action."
                >
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                  <span>No action</span>
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                  title={urgencyResult.accessibleDescription}
                >
                  <Clock className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                  <span>No action</span>
                </span>
              )
            )}
            {urgencyResult.overdueCount > 1 && (
              <span className="text-[8.5px] font-semibold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                +{urgencyResult.overdueCount - 1}
              </span>
            )}
            {urgencyResult.isStale && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-200"
                title="No qualifying customer contact in 7+ days"
              >
                <AlertTriangle className="h-2.5 w-2.5 text-orange-600" />
                <span>Stale ({urgencyResult.inactiveDays}d)</span>
              </span>
            )}
          </div>

          {/* Relative Last Contact Indicator */}
          <span className="text-[9px] text-slate-400 font-medium shrink-0">
            {urgencyResult.inactiveDays === 0
              ? "Today"
              : urgencyResult.inactiveDays === 1
              ? "Yesterday"
              : urgencyResult.inactiveDays < 900
              ? `${urgencyResult.inactiveDays}d ago`
              : "No contact"}
          </span>
        </div>

        {/* Scheduled Next Action */}
        {primaryAction ? (
          <div
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEnquiryForLog(enq);
            }}
            className="text-[9.5px] text-slate-700 bg-slate-50/80 hover:bg-teal-50/70 hover:border-teal-200 px-1.5 py-0.5 rounded border border-slate-200/70 flex items-center justify-between transition-colors cursor-pointer group/action"
            title="Click to log this interaction or view follow-up"
          >
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="h-2.5 w-2.5 text-slate-400 group-hover/action:text-teal-600 shrink-0" />
              <span className="font-semibold text-slate-800 group-hover/action:text-teal-800">
                {primaryAction.type}
              </span>
              {(primaryAction.notes || primaryAction.outcome) && (
                <span className="italic text-slate-400 truncate max-w-[110px] hidden sm:inline">
                  - {primaryAction.notes || primaryAction.outcome}
                </span>
              )}
            </div>
            <span className="text-[8.5px] text-slate-500 font-medium shrink-0 pl-1">
              {new Date(primaryAction.scheduledAt).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}
              {", "}
              {new Date(primaryAction.scheduledAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : !["CONVERTED", "LOST", "CANCELLED"].includes(enq.status) ? (
          <div
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEnquiryForLog(enq);
            }}
            className="text-[9.5px] text-amber-800 bg-amber-50/50 hover:bg-amber-100/70 hover:border-amber-300 px-1.5 py-0.5 rounded border border-dashed border-amber-300 flex items-center justify-between transition-colors cursor-pointer group/noaction"
            title="No follow-up scheduled. Click to log interaction or schedule next action."
          >
            <span className="flex items-center gap-1 font-medium text-amber-800">
              <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
              <span>No follow-up set</span>
            </span>
            <span className="text-[8.5px] font-bold text-amber-700 bg-white/90 px-1 py-0.2 rounded border border-amber-200 group-hover/noaction:bg-amber-200">
              + Schedule
            </span>
          </div>
        ) : null}
      </div>

      {/* Lost Reason badge if present */}
      {enq.lostReason && (
        <div className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded text-[9.5px] text-rose-700 font-medium truncate">
          Reason: {enq.lostReason.replace(/_/g, " ")}
        </div>
      )}

      {/* Footer Info: Priority, Pax, Lead Owner, Budget (Single Sleek Row) */}
      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          <PriorityBadge priority={enq.priority} className="shrink-0 text-[8.5px] px-1.5 py-0.2" />
          {totalPax > 0 && (
            <span className="text-slate-500 flex items-center gap-0.5 font-medium shrink-0 text-[9px]">
              <Users className="h-2.5 w-2.5 text-slate-400" />
              <span>{totalPax}</span>
            </span>
          )}

          {/* Lead Owner / Assignee pill */}
          {enq.assignedTo ? (
            <button
              type="button"
              data-no-dnd="true"
              disabled={isReadOnly}
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(enq);
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer truncate max-w-[85px] disabled:cursor-default shrink-0"
              title={`Assigned to ${enq.assignedTo}. Click to reassign.`}
            >
              <span className="h-3 w-3 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[7px] font-bold shrink-0">
                {enq.assignedTo.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate">{enq.assignedTo.split(" ")[0]}</span>
            </button>
          ) : (
            <button
              type="button"
              data-no-dnd="true"
              disabled={isReadOnly}
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.(enq);
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer disabled:cursor-default shrink-0"
              title="Unassigned lead. Click to assign an owner."
            >
              <UserX className="h-2 w-2 text-amber-500" />
              <span>Unassigned</span>
            </button>
          )}
        </div>

        <span className="font-mono font-black text-emerald-700 text-[11px] tabular-nums shrink-0">
          {enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible"}
        </span>
      </div>
    </div>
  );
}

function EnquiryCardPreview({ enq }: { enq: EnquiryWithRelations }) {
  const customer = enq.customer;
  const customerName = customer?.name || "Unknown Customer";
  const initials = getCustomerInitials(customerName);
  const avatar = getAvatarColor(customerName);
  const totalPax = enq.adults + enq.children + enq.infants;

  return (
    <div className="bg-white rounded-xl border-2 border-teal-500 p-2.5 shadow-2xl scale-102 rotate-1 pointer-events-none opacity-95 w-[280px] select-none space-y-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`h-6 w-6 rounded-full ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold text-[9px] shrink-0 ring-1 ${avatar.ring}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-bold text-slate-900 truncate">
              {customerName}
            </h5>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
              <span>{enq.enquiryNumber}</span>
              {enq.source && (
                <>
                  <span>•</span>
                  <span>{formatEnumLabel(enq.source)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <PriorityBadge priority={enq.priority} />
      </div>

      {enq.destination && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
          <MapPin className="h-2.5 w-2.5 text-teal-600 shrink-0" />
          <span className="truncate">{enq.destination}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
        <span className="text-slate-500 flex items-center gap-0.5 font-medium text-[9.5px]">
          {totalPax > 0 && (
            <>
              <Users className="h-2.5 w-2.5 text-slate-400" /> {totalPax} pax
            </>
          )}
        </span>
        <span className="font-mono font-black text-emerald-700 text-[11px] tabular-nums">
          {enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible"}
        </span>
      </div>
    </div>
  );
}

export function EnquiryPipeline({
  enquiries,
  isReadOnly = false,
  updatingIds,
  onStatusChange,
  onConvertTrip,
  onArchive,
  onRefresh,
  onAssign,
}: EnquiryPipelineProps) {
  const router = useRouter();
  const [selectedEnquiryForLog, setSelectedEnquiryForLog] = React.useState<EnquiryWithRelations | null>(null);

  // Inline Mark as Lost Modal State
  const [lostModalEnquiry, setLostModalEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [lostReason, setLostReason] = React.useState<string>("PRICE_TOO_HIGH");
  const [lostExplanation, setLostExplanation] = React.useState<string>("");
  const [savingLost, setSavingLost] = React.useState<boolean>(false);

  // Drag and drop state
  const [isMounted, setIsMounted] = React.useState<boolean>(false);
  const [activeEnquiry, setActiveEnquiry] = React.useState<EnquiryWithRelations | null>(null);
  const [optimisticStatusMap, setOptimisticStatusMap] = React.useState<Record<string, EnquiryStatus>>({});

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Clear optimistic map when upstream enquiries refresh
  React.useEffect(() => {
    setOptimisticStatusMap({});
  }, [enquiries]);

  // Accessible Sensors Configuration with Smart Pointer/Mouse/Touch filtration
  const sensors = useSensors(
    useSensor(SmartPointerSensor, {
      activationConstraint: {
        distance: 8, // 8px drag threshold distinguishes intentional drag from ordinary click
      },
    }),
    useSensor(SmartMouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press-and-hold enables normal mobile page/column scrolling
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: defaultKeyboardCoordinateGetter,
    })
  );

  // Wheel listener for natural Kanban horizontal & vertical scrolling
  const boardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user holds Shift or deltaX is dominant, allow native horizontal scroll
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      // Check if cursor is over a vertically scrollable column cards container
      const target = e.target as HTMLElement | null;
      const columnCards = target?.closest(".kanban-column-cards") as HTMLElement | null;

      if (columnCards) {
        const canScrollDown =
          e.deltaY > 0 &&
          columnCards.scrollTop + columnCards.clientHeight < columnCards.scrollHeight - 1;
        const canScrollUp = e.deltaY < 0 && columnCards.scrollTop > 1;
        if (canScrollDown || canScrollUp) {
          // Allow native vertical scrolling within the column
          return;
        }
      }

      // Otherwise, convert vertical wheel delta to horizontal board scrolling
      if (Math.abs(e.deltaY) > 0) {
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleMoveStage = async (enq: EnquiryWithRelations, e: React.MouseEvent, status: EnquiryStatus) => {
    e.stopPropagation();
    if (status === "LOST") {
      setLostModalEnquiry(enq);
      setLostReason("PRICE_TOO_HIGH");
      setLostExplanation("");
      return;
    }
    if (status === "CONVERTED") {
      toast.info("Leads are automatically marked as Won upon confirmed booking to preserve financial auditability.");
      return;
    }
    try {
      if (onStatusChange) {
        await onStatusChange(enq.id, status);
      }
    } catch {
      // Toast notification is handled by onStatusChange in parent
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const enq = enquiries.find((e) => e.id === event.active.id);
    if (enq) {
      setActiveEnquiry(enq);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEnquiry(null);

    if (!over) return;

    const enquiryId = active.id as string;
    const targetStatus = over.id as EnquiryStatus;
    const enq = enquiries.find((e) => e.id === enquiryId);
    if (!enq) return;

    const currentStatus = optimisticStatusMap[enq.id] ?? enq.status;
    if (currentStatus === targetStatus) return;

    // Safeguard A & B: CONVERTED is strictly restricted to confirmed bookings
    if (targetStatus === "CONVERTED") {
      toast.info("Leads are automatically marked as Won upon confirmed booking to preserve financial auditability.");
      return;
    }

    // Safeguard C: LOST requires structured reason modal
    if (targetStatus === "LOST") {
      setLostModalEnquiry(enq);
      setLostReason("PRICE_TOO_HIGH");
      setLostExplanation("");
      return;
    }

    // Apply optimistic move
    setOptimisticStatusMap((prev) => ({ ...prev, [enq.id]: targetStatus }));

    try {
      if (onStatusChange) {
        await onStatusChange(enq.id, targetStatus);
      } else {
        await enquiryClient.updateEnquiry(enq.id, { status: targetStatus });
        toast.success(`Enquiry moved to ${targetStatus}.`);
        onRefresh?.();
      }
    } catch (err: any) {
      // Rollback optimistic update on error!
      setOptimisticStatusMap((prev) => {
        const copy = { ...prev };
        delete copy[enq.id];
        return copy;
      });
    }
  };

  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalEnquiry || isReadOnly) return;

    try {
      setSavingLost(true);
      const res = await enquiryClient.markLost(lostModalEnquiry.id, {
        lostReason,
        lostExplanation: lostExplanation.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Enquiry ${lostModalEnquiry.enquiryNumber} marked as Lost.`);
        setLostModalEnquiry(null);
        onRefresh?.();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark enquiry as lost.");
    } finally {
      setSavingLost(false);
    }
  };

  const kanbanColumns = (
    <div
      ref={boardRef}
      className="flex gap-3.5 overflow-x-auto pb-4 pt-1 min-h-[340px] kanban-scrollbar select-none"
    >
      {PIPELINE_STAGES.map((stage) => {
        const stageEnquiries = enquiries.filter(
          (e) => (optimisticStatusMap[e.id] ?? e.status) === stage.status
        );
        const stageTotal = stageEnquiries.reduce(
          (acc, curr) => acc + (curr.budget ? Number(curr.budget) : 0),
          0
        );

        return (
          <KanbanDroppableColumn
            key={stage.status}
            stage={stage}
            enquiriesCount={stageEnquiries.length}
            stageTotal={stageTotal}
            isReadOnly={isReadOnly}
            activeEnquiry={activeEnquiry}
          >
            {stageEnquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 border border-dashed border-slate-200/90 rounded-xl text-center p-2 text-slate-400 text-xs bg-white/50">
                <span>No leads in {stage.label}</span>
              </div>
            ) : (
              stageEnquiries.map((enq) => (
                <DraggableEnquiryCard
                  key={enq.id}
                  enq={enq}
                  isReadOnly={isReadOnly}
                  isUpdating={Boolean(updatingIds?.[enq.id])}
                  setSelectedEnquiryForLog={setSelectedEnquiryForLog}
                  onAssign={onAssign}
                  onConvertTrip={onConvertTrip}
                  onMoveStage={handleMoveStage}
                  router={router}
                  formatDate={formatDate}
                />
              ))
            )}
          </KanbanDroppableColumn>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Horizontal Kanban Columns Container with DndContext */}
      {isMounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={(args) => {
            const pointerCollisions = pointerWithin(args);
            if (pointerCollisions.length > 0) {
              return pointerCollisions;
            }
            return rectIntersection(args);
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {kanbanColumns}
          <DragOverlay dropAnimation={null}>
            {activeEnquiry ? <EnquiryCardPreview enq={activeEnquiry} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        kanbanColumns
      )}

      {/* Quick Log Modal */}
      <QuickLogModal
        enquiry={selectedEnquiryForLog}
        isOpen={Boolean(selectedEnquiryForLog)}
        onClose={() => setSelectedEnquiryForLog(null)}
        onSuccess={() => {
          setSelectedEnquiryForLog(null);
          onRefresh?.();
        }}
      />

      {/* Inline Lost Reason Dialog */}
      <Dialog
        open={Boolean(lostModalEnquiry)}
        onOpenChange={(open) => {
          if (!open) setLostModalEnquiry(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded bg-rose-50 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </span>
              <span>Mark Enquiry as Lost</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please specify the primary reason why lead{" "}
              <strong className="text-slate-800">
                {lostModalEnquiry?.enquiryNumber}
              </strong>{" "}
              was lost. This is required for conversion analytics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmLost} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Primary Reason <span className="text-rose-500">*</span>
              </label>
              <Select
                value={lostReason}
                onValueChange={(val) => setLostReason(val || "PRICE_TOO_HIGH")}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {STANDARD_LOST_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Detailed Explanation{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Textarea
                rows={3}
                value={lostExplanation}
                onChange={(e) => setLostExplanation(e.target.value)}
                placeholder="Add any specific context or customer feedback..."
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLostModalEnquiry(null)}
                disabled={savingLost}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingLost}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {savingLost ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Mark as Lost</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
