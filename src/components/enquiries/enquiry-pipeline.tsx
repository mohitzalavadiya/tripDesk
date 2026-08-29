"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EnquiryWithRelations } from "@/lib/api-client";
import { PriorityBadge } from "./status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Calendar, Users, MapPin, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { EnquiryStatus } from "@prisma/client";

interface EnquiryPipelineProps {
  enquiries: EnquiryWithRelations[];
  isReadOnly?: boolean;
  onStatusChange?: (id: string, status: EnquiryStatus) => void;
}

const PIPELINE_STAGES: { label: string; status: EnquiryStatus; color: string }[] = [
  { label: "New", status: EnquiryStatus.NEW, color: "bg-blue-500" },
  { label: "Contacted", status: EnquiryStatus.CONTACTED, color: "bg-purple-500" },
  { label: "Qualified", status: EnquiryStatus.QUALIFIED, color: "bg-teal-500" },
  { label: "Quoted", status: EnquiryStatus.QUOTATION_SENT, color: "bg-indigo-500" },
  { label: "Follow-up", status: EnquiryStatus.FOLLOW_UP, color: "bg-amber-500" },
  { label: "Negotiation", status: EnquiryStatus.NEGOTIATION, color: "bg-orange-500" },
  { label: "Converted", status: EnquiryStatus.CONVERTED, color: "bg-emerald-500" },
];

export function EnquiryPipeline({
  enquiries,
  isReadOnly = false,
  onStatusChange,
}: EnquiryPipelineProps) {
  const router = useRouter();

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleMoveStage = (id: string, e: React.MouseEvent, status: EnquiryStatus) => {
    e.stopPropagation();
    onStatusChange?.(id, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth min-h-[550px] no-scrollbar">
      {PIPELINE_STAGES.map((stage) => {
        const stageEnquiries = enquiries.filter((e) => e.status === stage.status);
        const stageTotal = stageEnquiries.reduce(
          (acc, curr) => acc + (curr.budget ? Number(curr.budget) : 0),
          0
        );

        return (
          <div
            key={stage.status}
            className="flex-1 min-w-[270px] max-w-[320px] bg-slate-50/50 rounded-xl border border-slate-200/60 p-3 flex flex-col snap-align-start select-none shrink-0"
          >
            {/* Stage Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {stage.label}
                </h4>
                <span className="text-[10px] font-bold bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {stageEnquiries.length}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">
                {formatCurrency(stageTotal)}
              </span>
            </div>

            {/* Stage Cards Container */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[400px] no-scrollbar">
              {stageEnquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-28 border border-dashed border-slate-200 rounded-lg text-center p-3 text-slate-400 text-xs">
                  <span>No leads in {stage.label}</span>
                </div>
              ) : (
                stageEnquiries.map((enq) => {
                  const customer = enq.customer;
                  const totalPax = enq.adults + enq.children + enq.infants;

                  return (
                    <div
                      key={enq.id}
                      onClick={() => router.push(`/enquiries/${enq.id}`)}
                      className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-sm hover:border-indigo-200/80 transition-all cursor-pointer space-y-2.5 group relative"
                    >
                      {/* Top bar */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {customer?.name || "Unknown"}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {enq.enquiryNumber}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => router.push(`/enquiries/${enq.id}`)}
                                className="cursor-pointer"
                              >
                                View Workspace
                              </DropdownMenuItem>
                              {PIPELINE_STAGES.filter((s) => s.status !== stage.status).map((target) => (
                                <DropdownMenuItem
                                  key={target.status}
                                  disabled={isReadOnly}
                                  onClick={(e) => handleMoveStage(enq.id, e, target.status)}
                                  className="cursor-pointer"
                                >
                                  Move to {target.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Destination & Dates */}
                      <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-md border border-slate-100">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{enq.destination}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {formatDate(enq.startDate)} → {formatDate(enq.endDate)}
                          </span>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={enq.priority} />
                          <span className="text-slate-500 flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {totalPax}
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-xs">
                          {enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
