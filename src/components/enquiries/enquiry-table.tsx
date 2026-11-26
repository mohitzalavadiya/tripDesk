"use client";

import { Button } from "@/components/ui/button";
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuGroup,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { EnquiryWithRelations } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import type { EnquiryStatus } from "@prisma/client";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Compass,
  Eye,
  MapPin,
  MoreVertical,
  Phone,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { classifyEnquiryUrgency } from "@/lib/utils/crm-urgency";
import { PriorityBadge,StatusBadge } from "./status-badge";

interface EnquiryTableProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  updatingIds?: Record<string, boolean>;
  onStatusChange?: (id: string, status: EnquiryStatus) => void;
  onConvertTrip?: (id: string) => void;
  onArchive?: (id: string, enquiryNumber: string) => void;
  onQuickLog?: (enquiry: EnquiryWithRelations) => void;
  onAssign?: (enquiry: EnquiryWithRelations) => void;
}

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function EnquiryTable({
  enquiries,
  isReadOnly = false,
  updatingIds,
  onStatusChange,
  onConvertTrip,
  onArchive,
  onQuickLog,
  onAssign,
}: EnquiryTableProps) {
  const router = useRouter();

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-hidden">
      {/* Desktop view (table) */}
      <div className="hidden lg:block overflow-x-auto max-h-[calc(100vh-420px)] min-h-[300px] overflow-y-auto custom-scrollbar overscroll-contain">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
            <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
              <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Enquiry & Customer</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Dates</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Pax & Budget</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Status & Priority</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Lead Owner</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Next Follow-up</TableHead>
              <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((enq) => {
              const totalPax = enq.adults + enq.children + enq.infants;
              const customerName = enq.customer?.name || "Unknown";

              return (
                <TableRow
                  key={enq.id}
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                >
                  {/* Lead / Customer Profile */}
                  <TableCell className="py-3 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full bg-gradient-to-tr ${getGradient(
                          customerName
                        )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}
                      >
                        {getInitials(customerName)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                          {customerName}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate font-mono">
                          {enq.enquiryNumber} {enq.customer?.phone ? `• ${enq.customer.phone}` : ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Destination */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{enq.destination}</span>
                    </div>
                  </TableCell>

                  {/* Travel Dates */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(enq.startDate)} → {formatDate(enq.endDate)}</span>
                    </div>
                  </TableCell>

                  {/* Pax & Budget */}
                  <TableCell className="py-3 px-4">
                    <div className="flex flex-col text-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{totalPax} {totalPax === 1 ? "Pax" : "Guests"}</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        {enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status & Priority */}
                  <TableCell className="py-3 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={enq.status} />
                      <PriorityBadge priority={enq.priority} />
                    </div>
                  </TableCell>

                  {/* Lead Owner / Assignee */}
                  <TableCell className="py-3 px-4 text-xs" onClick={(e) => e.stopPropagation()}>
                    {enq.assignedTo ? (
                      <button
                        type="button"
                        onClick={() => onAssign?.(enq)}
                        disabled={isReadOnly}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 font-medium transition-colors cursor-pointer group/owner disabled:cursor-default"
                        title="Click to reassign lead"
                      >
                        <div className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                          {enq.assignedTo.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[100px]">{enq.assignedTo}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssign?.(enq)}
                        disabled={isReadOnly}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold transition-colors cursor-pointer disabled:cursor-default"
                        title="Unassigned lead. Click to assign an owner."
                      >
                        <UserX className="h-3 w-3 text-amber-500" />
                        <span>Unassigned</span>
                      </button>
                    )}
                  </TableCell>

                  {/* Next Follow-up & Activity */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    {(() => {
                      const urgencyResult = classifyEnquiryUrgency(enq);
                      const action = urgencyResult.primaryNextAction;
                      return (
                        <div className="flex flex-col gap-1">
                          {urgencyResult.urgency === "OVERDUE" && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold w-fit gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <Clock className="h-2.5 w-2.5 text-rose-600" />
                              {urgencyResult.badgeLabel}
                            </Badge>
                          )}
                          {urgencyResult.urgency === "DUE_TODAY" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold w-fit gap-1">
                              <Clock className="h-2.5 w-2.5 text-amber-600" />
                              Due Today
                            </Badge>
                          )}
                          {urgencyResult.urgency === "UPCOMING" && (
                            <Badge className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-medium w-fit gap-1">
                              <Calendar className="h-2.5 w-2.5 text-sky-600" />
                              {urgencyResult.badgeLabel}
                            </Badge>
                          )}
                          {urgencyResult.urgency === "NO_NEXT_ACTION" && (
                            !["CONVERTED", "LOST", "CANCELLED"].includes(enq.status) ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickLog?.(enq);
                                }}
                                disabled={isReadOnly}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors w-fit disabled:cursor-default"
                                title="No follow-up scheduled. Click to schedule next action."
                              >
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                <span>No follow-up</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Closed</span>
                            )
                          )}

                          {action && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {action.type} • {formatDate(action.scheduledAt)}
                            </span>
                          )}

                          {urgencyResult.isStale && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[9px] font-bold w-fit gap-1">
                              <AlertTriangle className="h-2 w-2 text-orange-600" />
                              Stale ({urgencyResult.inactiveDays}d inactive)
                            </Badge>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>

                  {/* Row Actions */}
                  <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickLog?.(enq);
                        }}
                        className="h-7 px-2 text-xs font-semibold text-teal-800 bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300 rounded-lg cursor-pointer gap-1 transition-all"
                        title="Quick Log Interaction"
                      >
                        <Phone className="h-3 w-3 text-teal-600" />
                        <span>Log</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => onQuickLog?.(enq)}
                              disabled={isReadOnly}
                              className="text-xs cursor-pointer rounded-md text-teal-800 font-semibold gap-1.5"
                            >
                              <Phone className="h-3.5 w-3.5 text-teal-600" />
                              <span>Quick Log Interaction</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/enquiries/${enq.id}`)}
                              className="text-xs cursor-pointer rounded-md gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-400" />
                              <span>View Workspace</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isReadOnly}
                              onClick={() => onAssign?.(enq)}
                              className="text-xs text-indigo-700 font-semibold cursor-pointer rounded-md gap-1.5"
                            >
                              <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Reassign Lead</span>
                            </DropdownMenuItem>

                          {enq.convertedTripId ? (
                            <DropdownMenuItem
                              onClick={() => router.push(`/trips/${enq.convertedTripId}`)}
                              className="text-xs cursor-pointer rounded-md text-emerald-700"
                            >
                              <Compass className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                              Open Converted Trip
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onConvertTrip?.(enq.id)}
                              disabled={isReadOnly}
                              className="text-xs cursor-pointer rounded-md text-indigo-600"
                            >
                              <Compass className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                              Convert to Trip
                            </DropdownMenuItem>
                          )}

                          {onArchive && (
                            <DropdownMenuItem
                              onClick={() => onArchive(enq.id, enq.enquiryNumber)}
                              disabled={isReadOnly}
                              className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                              Archive Enquiry
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {enquiries.map((enq) => {
          const urgencyResult = classifyEnquiryUrgency(enq);

          return (
            <div
              key={enq.id}
              onClick={() => router.push(`/enquiries/${enq.id}`)}
              className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{enq.customer?.name}</h4>
                  <p className="text-[11px] text-slate-500">{enq.destination} • {enq.enquiryNumber}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={enq.status} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isReadOnly}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickLog?.(enq);
                    }}
                    className="h-6 px-2 text-[10px] font-semibold text-teal-800 bg-teal-50 border-teal-200 rounded-md"
                  >
                    <Phone className="h-2.5 w-2.5 text-teal-600 mr-1" />
                    Log
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {urgencyResult.urgency === "OVERDUE" && (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-bold">
                    Overdue
                  </Badge>
                )}
                {urgencyResult.urgency === "DUE_TODAY" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-bold">
                    Due Today
                  </Badge>
                )}
                {urgencyResult.isStale && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[9px] font-bold">
                    Stale ({urgencyResult.inactiveDays}d)
                  </Badge>
                )}
                {enq.assignedTo ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <UserCheck className="h-2.5 w-2.5" />
                    {enq.assignedTo}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <UserX className="h-2.5 w-2.5" />
                    Unassigned
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1">
                <span>{enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible Budget"}</span>
                <span className="text-[11px] font-normal text-slate-500">{formatDate(enq.startDate)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
