"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuotation } from "@/context/quotation-context"
import { useEnquiry } from "@/context/enquiry-context"
import { Quotation, QuotationStatus } from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import { copyQuotationLink, openWhatsAppShare } from "@/lib/quotation/share-helpers"
import { exportQuotationPDF } from "@/lib/quotation/pdf-service"
import { QuotationShareModal } from "@/components/quotation/quotation-share-modal"
import { QuotationVersionModal } from "@/components/quotation/quotation-version-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Search,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Share2,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  AlertTriangle,
  Sparkles,
  MessageSquare,
} from "lucide-react"

export default function QuotationsPage() {
  const router = useRouter()
  const {
    quotations,
    deleteQuotation,
    createQuotationVersion,
    markQuotationSent,
  } = useQuotation()

  const { trips } = useEnquiry()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "high-price" | "low-price">("newest")

  // Modal States
  const [selectedQuotationForShare, setSelectedQuotationForShare] = React.useState<Quotation | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false)
  const [selectedQuotationForVersion, setSelectedQuotationForVersion] = React.useState<Quotation | null>(null)
  const [isVersionModalOpen, setIsVersionModalOpen] = React.useState(false)

  // ─── Filter & Sort ───────────────────────────────────────────────────
  const filteredQuotations = React.useMemo(() => {
    return quotations.filter((q) => {
      // Status Filter
      if (statusFilter !== "all" && q.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchNum = q.quotationNumber.toLowerCase().includes(query)
        const matchTitle = q.title.toLowerCase().includes(query)
        const matchCustomer = q.customerSnapshot.name.toLowerCase().includes(query)
        const matchDest = q.tripSnapshot.destination.toLowerCase().includes(query)
        if (!matchNum && !matchTitle && !matchCustomer && !matchDest) return false
      }

      return true
    })
  }, [quotations, statusFilter, searchQuery])

  const sortedQuotations = React.useMemo(() => {
    const list = [...filteredQuotations]
    if (sortBy === "newest") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    if (sortBy === "oldest") {
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    if (sortBy === "high-price") {
      return list.sort((a, b) => b.sellingPrice - a.sellingPrice)
    }
    if (sortBy === "low-price") {
      return list.sort((a, b) => a.sellingPrice - b.sellingPrice)
    }
    return list
  }, [filteredQuotations, sortBy])

  // ─── Metric Calculations ──────────────────────────────────────────────
  const draftCount = quotations.filter((q) => q.status === "Draft").length
  const readyCount = quotations.filter((q) => q.status === "Ready").length
  const sentCount = quotations.filter((q) => q.status === "Sent").length
  const viewedCount = quotations.filter((q) => q.status === "Viewed").length
  const totalProposalValue = quotations.reduce((acc, curr) => acc + curr.sellingPrice, 0)

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case "Sent":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Sent</Badge>
      case "Viewed":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">Viewed</Badge>
      case "Ready":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">Ready</Badge>
      case "Expired":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Expired</Badge>
      case "Draft":
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">Draft</Badge>
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50/70 to-slate-100/40 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 w-full">
        
        {/* ─── HERO COMMAND CARD ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold uppercase tracking-wider font-mono">
              <FileText className="h-3.5 w-3.5" />
              <span>Phase 6 · Quotation Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Customer Travel Quotations & Proposals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Create, customize, track views, share public links, and download professional client proposals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 z-10">
            <Link
              href="/trips"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4.5 rounded-xl shadow-xs cursor-pointer transition-colors leading-none"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Select Trip to Quote</span>
            </Link>
          </div>
        </div>

        {/* ─── 4 METRIC STAT CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Quotations</span>
            <div className="text-2xl font-black text-slate-900">{quotations.length}</div>
            <div className="text-[11px] text-slate-400 font-medium">Pipeline: {formatCurrency(totalProposalValue)}</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sent to Clients</span>
            <div className="text-2xl font-black text-emerald-700">{sentCount}</div>
            <div className="text-[11px] text-emerald-600 font-medium">Active shared proposals</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Client Viewed</span>
            <div className="text-2xl font-black text-purple-700">{viewedCount}</div>
            <div className="text-[11px] text-purple-600 font-medium">Opened via public link</div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Drafting</span>
            <div className="text-2xl font-black text-slate-700">{draftCount + readyCount}</div>
            <div className="text-[11px] text-slate-400 font-medium">Under preparation</div>
          </div>
        </div>

        {/* ─── TOOLBAR & STATUS FILTERS ────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "All Proposals", count: quotations.length },
                { id: "sent", label: "Sent", count: sentCount },
                { id: "viewed", label: "Viewed", count: viewedCount },
                { id: "ready", label: "Ready", count: readyCount },
                { id: "draft", label: "Drafts", count: draftCount },
                { id: "expired", label: "Expired", count: quotations.filter((q) => q.status === "Expired").length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === tab.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search quotation #, client, trip..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8.5 text-xs bg-slate-50/60 border-slate-200 rounded-xl"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl px-2.5 font-medium text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="high-price">Highest Amount</option>
                <option value="low-price">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* ─── QUOTATIONS DATA TABLE ─────────────────────────────────────── */}
          <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider select-none sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-4">Quotation Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Trip Package</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Validity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Number & Version */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/trips/${q.tripId}/quotation`}
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{q.quotationNumber}</span>
                          {q.version > 1 && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              V{q.version}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{q.customerSnapshot.name}</div>
                        <div className="text-[11px] text-slate-500">{q.customerSnapshot.travellersLabel}</div>
                      </td>

                      {/* Trip */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{q.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {q.tripSnapshot.destination} • {q.tripSnapshot.durationLabel}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {formatCurrency(q.sellingPrice, q.currency)}
                        </div>
                        {q.pricingSnapshot.perPersonPrice && (
                          <div className="text-[10px] text-slate-400">
                            ₹{q.pricingSnapshot.perPersonPrice.toLocaleString("en-IN")} / person
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(q.status)}
                      </td>

                      {/* Validity */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <div>Valid until {q.validUntil}</div>
                        <div className="text-[10px] text-slate-400">Created {q.createdAt.split("T")[0]}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit / Open */}
                          <Link
                            href={`/trips/${q.tripId}/quotation`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          {/* Fullscreen Preview */}
                          <Link
                            href={`/trips/${q.tripId}/quotation/preview`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Full-screen Preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          {/* Share Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuotationForShare(q)
                              setIsShareModalOpen(true)
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Share Link & WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            type="button"
                            onClick={() => exportQuotationPDF(q)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* Create Version */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuotationForVersion(q)
                              setIsVersionModalOpen(true)
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            title="Create Version"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete (Draft only) */}
                          {q.status === "Draft" && (
                            <button
                              type="button"
                              onClick={() => deleteQuotation(q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sortedQuotations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                        No quotations found matching the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── MODALS ──────────────────────────────────────────────────────── */}
        <QuotationShareModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          quotation={selectedQuotationForShare}
          onMarkSent={(id) => markQuotationSent(id)}
        />

        <QuotationVersionModal
          open={isVersionModalOpen}
          onOpenChange={setIsVersionModalOpen}
          quotation={selectedQuotationForVersion}
          onConfirmVersion={() => {
            if (selectedQuotationForVersion) {
              const newV = createQuotationVersion(selectedQuotationForVersion.id)
              router.push(`/trips/${newV.tripId}/quotation`)
            }
          }}
        />

      </div>
    </div>
  )
}
