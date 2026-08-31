"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Share2,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  AlertCircle,
  Sparkles,
  MoreVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Compass,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { quotationClient, QuotationWithRelations } from "@/lib/api-client";
import { QuotationStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export function QuotationStatusBadge({ status }: { status: QuotationStatus | string }) {
  switch (status) {
    case QuotationStatus.ACCEPTED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Accepted
        </span>
      );
    case QuotationStatus.SENT:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Send className="h-3 w-3" /> Sent
        </span>
      );
    case QuotationStatus.VIEWED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Eye className="h-3 w-3" /> Viewed
        </span>
      );
    case QuotationStatus.REJECTED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <X className="h-3 w-3" /> Rejected
        </span>
      );
    case QuotationStatus.EXPIRED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" /> Expired
        </span>
      );
    case QuotationStatus.CANCELLED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          Cancelled
        </span>
      );
    case QuotationStatus.DRAFT:
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          Draft
        </span>
      );
  }
}

export default function QuotationsPage() {
  const router = useRouter();

  // Data states
  const [quotations, setQuotations] = React.useState<QuotationWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Share Modal State
  const [shareQuote, setShareQuote] = React.useState<QuotationWithRelations | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch real quotations from database API
  const fetchQuotations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await quotationClient.getQuotations({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? (statusFilter as QuotationStatus) : undefined,
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setQuotations(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load quotations from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "" || statusFilter !== "all";

  // Soft Archive Quotation
  const handleDelete = async (id: string, number: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    if (!confirm(`Archive quotation ${number}? This keeps historical records safe.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await quotationClient.deleteQuotation(id);
      toast.success(`Quotation ${number} archived successfully.`);
      await fetchQuotations();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive quotation.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenShare = (q: QuotationWithRelations) => {
    setShareQuote(q);
    setIsShareModalOpen(true);
  };

  const copyShareLink = (token: string | null) => {
    if (!token) return;
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public quotation link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Quotations & Proposals" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <FileText className="h-3 w-3 text-indigo-500" />
                Commercial Proposals
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} proposals generated
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Quotations & Proposals
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Generate, manage, snapshot, and share client pricing proposals
              </span>
            </div>

            {/* Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {[
                { label: "All", value: "all" },
                { label: "Draft", value: QuotationStatus.DRAFT },
                { label: "Sent", value: QuotationStatus.SENT },
                { label: "Viewed", value: QuotationStatus.VIEWED },
                { label: "Accepted", value: QuotationStatus.ACCEPTED },
                { label: "Rejected", value: QuotationStatus.REJECTED },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    statusFilter === tab.value
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/trips")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Generate from Trip
            </Button>
          </div>
        </div>

        {/* Master Card (Filter Bar + Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by quote number, title, customer name, or trip title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Filter
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching quotations from database...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchQuotations()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && quotations.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={FileText}
                title={isFilterActive ? "No matching quotations found" : "No quotations generated yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search or status filter."
                    : "Select a trip from your workspace to automatically snapshot costing and generate client proposals."
                }
                actionText={isFilterActive ? "Clear Filter" : "Go to Trips"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/trips")}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Quotation</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Trip & Customer</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Line Items</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Proposal Value</TableHead>
                      <TableHead className="py-3 px-4 w-[110px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((q) => (
                      <TableRow
                        key={q.id}
                        onClick={() => router.push(`/trips/${q.tripId}/quotation`)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                      >
                        <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {q.quotationNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate">
                                {q.title || `v${q.version}`}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">{q.trip?.title || "Trip Workspace"}</span>
                            <span className="text-[11px] text-slate-500">
                              {q.customer?.name} {q.customer?.phone ? `(${q.customer.phone})` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <QuotationStatusBadge status={q.status} />
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{q.items?.length || 0}</span> items snapshot
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatCurrency(Number(q.finalAmount))}
                            </span>
                            {Number(q.discountAmount) > 0 && (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Incl. {Number(q.discountPercentage)}% Discount
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {q.shareToken && (
                              <button
                                onClick={() => handleOpenShare(q)}
                                title="Share proposal"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                            )}

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
                                    Quotation Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/trips/${q.tripId}/quotation`)}
                                    className="text-xs cursor-pointer rounded-md"
                                  >
                                    <Edit className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    Edit in Workspace
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/trips/${q.tripId}/quotation/preview`)}
                                    className="text-xs cursor-pointer rounded-md"
                                  >
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    Preview Proposal
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(`/api/quotations/${encodeURIComponent(q.id)}/pdf`, "_blank")}
                                    className="text-xs cursor-pointer rounded-md font-medium text-indigo-600"
                                  >
                                    <Download className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                    Download PDF Proposal
                                  </DropdownMenuItem>
                                  {q.shareToken && (
                                    <DropdownMenuItem
                                      onClick={() => window.open(`/q/${q.shareToken}`, "_blank")}
                                      className="text-xs cursor-pointer rounded-md"
                                    >
                                      <ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                      Open Public Link
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(q.id, q.quotationNumber)}
                                    disabled={isReadOnly || deletingId === q.id}
                                    className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md disabled:opacity-50"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                    {deletingId === q.id ? "Archiving..." : "Archive Quotation"}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {quotations.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => router.push(`/trips/${q.tripId}/quotation`)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{q.quotationNumber}</h4>
                        <p className="text-[11px] text-slate-500">{q.trip?.title} • {q.customer?.name}</p>
                      </div>
                      <QuotationStatusBadge status={q.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1">
                      <span>{formatCurrency(Number(q.finalAmount))}</span>
                      <span className="text-[11px] font-normal text-slate-500">{q.items?.length || 0} items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{quotations.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> proposals
            </span>

            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-1">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Share Link Modal */}
        {shareQuote && (
          <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-indigo-600" />
                  <span>Share Customer Proposal</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Send this public interactive proposal link to {shareQuote.customer?.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Proposal Reference</span>
                  <p className="font-bold text-slate-900">{shareQuote.quotationNumber} — {shareQuote.title}</p>
                  <p className="text-indigo-600 font-extrabold text-sm">{formatCurrency(Number(shareQuote.finalAmount))}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Public Share URL</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/q/${shareQuote.shareToken}` : ""}
                      className="h-9 bg-slate-50 text-xs select-all font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => copyShareLink(shareQuote.shareToken)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 h-9 rounded-lg shrink-0 cursor-pointer"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Close
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
