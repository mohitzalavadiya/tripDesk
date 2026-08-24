"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Enquiry, Customer, EnquiryStatus } from "@/types"
import { useEnquiry } from "@/context/enquiry-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Calendar, Users, MapPin, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface EnquiryPipelineProps {
  enquiries: Enquiry[]
}

const PIPELINE_STAGES: { label: string; status: EnquiryStatus; color: string }[] = [
  { label: "New", status: "New", color: "bg-blue-500" },
  { label: "Contacted", status: "Contacted", color: "bg-slate-500" },
  { label: "Qualified", status: "Qualified", color: "bg-teal-500" },
  { label: "Quoted", status: "Quoted", color: "bg-indigo-500" },
  { label: "Follow-up", status: "Follow-up", color: "bg-amber-500" },
  { label: "Confirmed", status: "Confirmed", color: "bg-emerald-500" },
]

export function EnquiryPipeline({ enquiries }: EnquiryPipelineProps) {
  const router = useRouter()
  const { customers, updateEnquiryStatus } = useEnquiry()

  const getCustomer = (customerId: string): Customer | undefined => {
    return customers.find((c) => c.id === customerId)
  }

  const formatRupees = (val?: number) => {
    if (val === undefined) return "-"
    if (val >= 100000) {
      return `₹ ${(val / 100000).toFixed(2)}L`
    }
    return `₹ ${val.toLocaleString("en-IN")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })
  }

  const handleMoveStage = (id: string, e: React.MouseEvent, status: EnquiryStatus) => {
    e.stopPropagation()
    updateEnquiryStatus(id, status)
    toast.success(`Moved lead to ${status}`)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth min-h-[550px] no-scrollbar">
      {PIPELINE_STAGES.map((stage) => {
        const stageEnquiries = enquiries.filter((e) => e.status === stage.status)
        const stageTotal = stageEnquiries.reduce((acc, curr) => acc + (curr.budget || 0), 0)

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
                {formatRupees(stageTotal)}
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
                  const customer = getCustomer(enq.customerId)
                  return (
                    <div
                      key={enq.id}
                      onClick={() => router.push(`/enquiries/${enq.id}`)}
                      className="bg-white rounded-lg border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer space-y-3 group relative"
                    >
                      {/* Customer & Actions */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                            {customer?.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                            {enq.id}
                          </span>
                        </div>
                        
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" className="h-7 w-7 p-0 cursor-pointer">
                                  <MoreVertical className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="bg-white border border-slate-200">
                               <DropdownMenuGroup>
                                 <DropdownMenuLabel className="text-xs">Pipeline</DropdownMenuLabel>
                                 <DropdownMenuItem onClick={() => router.push(`/enquiries/${enq.id}`)}>
                                   <ArrowRight className="h-3 w-3 mr-1 text-slate-400" /> View details
                                 </DropdownMenuItem>
                               </DropdownMenuGroup>
                               
                               <DropdownMenuSeparator />
                               
                               <DropdownMenuGroup>
                                 <DropdownMenuLabel className="text-[10px] text-slate-400">Move to stage</DropdownMenuLabel>
                                 {PIPELINE_STAGES.map((st) => (
                                   <DropdownMenuItem
                                     key={st.status}
                                     disabled={enq.status === st.status}
                                     onClick={(e) => handleMoveStage(enq.id, e, st.status)}
                                     className="text-xs"
                                   >
                                     {st.label}
                                   </DropdownMenuItem>
                                 ))}
                               </DropdownMenuGroup>
                             </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Travel Specs */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border-t border-slate-50 pt-2.5 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-900 font-semibold">{enq.destination}</span>
                        </div>
                        <div className="text-right text-slate-900 font-bold">
                          {formatRupees(enq.budget)}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{formatDate(enq.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Users className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{enq.adults}A {enq.children > 0 && `+ ${enq.children}C`}</span>
                        </div>
                      </div>

                      {/* Card Footer badges */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[10px]">
                        <span className="inline-flex items-center rounded-sm bg-slate-100 px-1 py-0.5 font-bold text-slate-600">
                          {enq.source}
                        </span>
                        
                        {enq.nextFollowUp && (
                          <span className="text-amber-600 font-bold flex items-center gap-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            {formatDate(enq.nextFollowUp)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
