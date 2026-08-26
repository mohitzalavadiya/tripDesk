"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EnquiryWithRelations } from "@/lib/api-client";
import { StatusBadge, PriorityBadge } from "./status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Eye,
  Phone,
  MapPin,
  Calendar,
  Users,
  Compass,
  Trash2,
  Clock,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { EnquiryStatus } from "@prisma/client";

interface EnquiryTableProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  onStatusChange?: (id: string, status: EnquiryStatus) => void;
  onConvertTrip?: (id: string) => void;
  onArchive?: (id: string, enquiryNumber: string) => void;
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
  onStatusChange,
  onConvertTrip,
  onArchive,
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
      <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
            <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
              <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Enquiry & Customer</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Dates</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Pax & Budget</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Status & Priority</TableHead>
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

                  {/* Next Follow-up */}
                  <TableCell className="py-3 px-4 text-xs text-slate-600">
                    {enq.nextFollowUpAt ? (
                      <div className="flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{formatDate(enq.nextFollowUpAt)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Not scheduled</span>
                    )}
                  </TableCell>

                  {/* Row Actions */}
                  <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/enquiries/${enq.id}`)}
                            className="text-xs cursor-pointer rounded-md"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                            View Workspace
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {enquiries.map((enq) => (
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
              <StatusBadge status={enq.status} />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1">
              <span>{enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible Budget"}</span>
              <span className="text-[11px] font-normal text-slate-500">{formatDate(enq.startDate)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
