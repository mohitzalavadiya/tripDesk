"use client"

import * as React from "react"
import { useEnquiry } from "@/context/enquiry-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, ArrowRight, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { StatusBadge } from "../enquiries/status-badge"

export function RecentEnquiriesTable() {
  const router = useRouter()
  const { enquiries, customers } = useEnquiry()

  // Get top 5 recent enquiries
  const recentEnquiries = React.useMemo(() => {
    return [...enquiries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [enquiries])

  const formatRupees = (val: number) => {
    return `₹${val.toLocaleString("en-IN")}`
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer ? customer.name : "Unknown"
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Recent Enquiries
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview of the latest client requests
          </p>
        </div>
        <button 
          onClick={() => router.push("/enquiries")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Desktop view (table) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] font-semibold text-slate-700">Customer</TableHead>
              <TableHead className="font-semibold text-slate-700">Destination</TableHead>
              <TableHead className="font-semibold text-slate-700">Travel Date</TableHead>
              <TableHead className="font-semibold text-slate-700">Travellers</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">Budget</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentEnquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                  No enquiries recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              recentEnquiries.map((enq) => (
                <TableRow
                  key={enq.id}
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="hover:bg-slate-50/50 cursor-pointer"
                >
                  <TableCell className="font-medium text-slate-900 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{getCustomerName(enq.customerId)}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700 truncate max-w-[150px]">
                    {enq.destination}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{formatDate(enq.startDate)}</TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {enq.adults}A {enq.children > 0 && `+ ${enq.children}C`}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {enq.budget ? formatRupees(enq.budget) : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={enq.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/enquiries/${enq.id}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="View Enquiry"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view (cards stack) */}
      <div className="block md:hidden space-y-3">
        {recentEnquiries.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No enquiries recorded yet.
          </div>
        ) : (
          recentEnquiries.map((enq) => (
            <div
              key={enq.id}
              onClick={() => router.push(`/enquiries/${enq.id}`)}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/20 space-y-3 hover:border-slate-200 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{getCustomerName(enq.customerId)}</span>
                </div>
                <StatusBadge status={enq.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-100 py-2">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Destination</span>
                  <span className="text-slate-800 font-medium truncate block">{enq.destination}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Budget</span>
                  <span className="text-slate-800 font-semibold">{enq.budget ? formatRupees(enq.budget) : "-"}</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Travel Date</span>
                  <span className="text-slate-600">{formatDate(enq.startDate)}</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-medium">Travellers</span>
                  <span className="text-slate-600 truncate block">
                    {enq.adults} Adults {enq.children > 0 && `+ ${enq.children}C`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  ID: <span className="font-semibold text-slate-600">{enq.id}</span>
                </span>
                <button
                  onClick={() => router.push(`/enquiries/${enq.id}`)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                >
                  Details
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
