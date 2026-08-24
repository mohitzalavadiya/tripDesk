"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Enquiry, Customer } from "@/types"
import { StatusBadge } from "./status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { MoreVertical, Eye, Phone, MapPin, Calendar, Users, Send, ArrowUpRight } from "lucide-react"
import { useEnquiry } from "@/context/enquiry-context"
import { toast } from "sonner"

interface EnquiryTableProps {
  enquiries: Enquiry[]
}

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
]

function getInitials(name: string) {
  if (!name) return "U"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export function EnquiryTable({ enquiries }: EnquiryTableProps) {
  const router = useRouter()
  const { customers, updateEnquiryStatus, convertToTrip } = useEnquiry()

  const getCustomer = (customerId: string): Customer | undefined => {
    return customers.find((c) => c.id === customerId)
  }

  const formatRupees = (val?: number) => {
    if (val === undefined) return "-"
    return `₹${val.toLocaleString("en-IN")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const handleStatusChange = (id: string, e: React.MouseEvent, status: Enquiry["status"]) => {
    e.stopPropagation()
    updateEnquiryStatus(id, status)
    toast.success(`Enquiry status updated to ${status}`)
  }

  const handleConvertTrip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const trip = convertToTrip(id)
      toast.success(`Converted successfully! Trip ${trip.id} created.`)
      router.push(`/trips/${trip.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to convert")
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop view (table) */}
      <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
            <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
              <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Customer</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Dates</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Party</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600 text-right">Budget</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Source</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-600">Next Action</TableHead>
              <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                  No enquiries found matching active search or filters.
                </TableCell>
              </TableRow>
            ) : (
              enquiries.map((enq) => {
                const customer = getCustomer(enq.customerId)
                const custName = customer?.name || "Unknown Customer"
                const gradient = getGradient(custName)

                return (
                  <TableRow
                    key={enq.id}
                    onClick={() => router.push(`/enquiries/${enq.id}`)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                  >
                    {/* Customer */}
                    <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0`}>
                          {getInitials(custName)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                            {custName}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {customer?.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Destination */}
                    <TableCell className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50/60 text-indigo-900 border border-indigo-100/60">
                        <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate max-w-[130px]">{enq.destination}</span>
                      </span>
                    </TableCell>

                    {/* Travel Dates */}
                    <TableCell className="py-3.5 px-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(enq.startDate)}</span>
                      </div>
                    </TableCell>

                    {/* Party Count */}
                    <TableCell className="py-3.5 px-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{enq.adults}A {enq.children > 0 && `+ ${enq.children}C`}</span>
                      </div>
                    </TableCell>

                    {/* Budget */}
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 text-xs">{formatRupees(enq.budget)}</span>
                        {enq.budgetType && (
                          <span className="text-[10px] font-medium text-slate-400 capitalize">
                            {enq.budgetType.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Source */}
                    <TableCell className="py-3.5 px-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200/50">
                        {enq.source}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5 px-4">
                      <StatusBadge status={enq.status} />
                    </TableCell>

                    {/* Next Action */}
                    <TableCell className="py-3.5 px-4 text-slate-500 text-xs font-medium">
                      {enq.nextFollowUp ? (
                        <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 text-[11px]">
                          {formatDate(enq.nextFollowUp)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-48">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/enquiries/${enq.id}`)} className="text-xs cursor-pointer rounded-md">
                              <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                              View Enquiry
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleConvertTrip(enq.id, e)}
                              className="text-xs text-indigo-600 font-semibold cursor-pointer rounded-md focus:text-indigo-700 focus:bg-indigo-50"
                              disabled={enq.status === "Confirmed"}
                            >
                              <Send className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                              Convert to Trip
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuSeparator className="my-1 border-slate-100" />
                          
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Change Status</DropdownMenuLabel>
                            {(["New", "Contacted", "Qualified", "Quoted", "Follow-up", "Confirmed", "Lost"] as const).map(
                              (st) => (
                                <DropdownMenuItem
                                  key={st}
                                  disabled={enq.status === st}
                                  onClick={(e) => handleStatusChange(enq.id, e, st)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  {st}
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view (cards stack for screens below 1024px) */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {enquiries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No enquiries found matching active search.
          </div>
        ) : (
          enquiries.map((enq) => {
            const customer = getCustomer(enq.customerId)
            const custName = customer?.name || "Unknown Customer"
            const gradient = getGradient(custName)

            return (
              <div
                key={enq.id}
                onClick={() => router.push(`/enquiries/${enq.id}`)}
                className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                      {getInitials(custName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{custName}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{customer?.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={enq.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Destination</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      {enq.destination}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Budget</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{formatRupees(enq.budget)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Travel: {formatDate(enq.startDate)}</span>
                  <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                    View <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
