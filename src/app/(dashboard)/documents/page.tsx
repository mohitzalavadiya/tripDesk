"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Hotel,
  Car,
  Ticket,
  Receipt,
  MapPin,
  ExternalLink,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import {
  documentClient,
  DocumentItem,
  ListDocumentsParams,
} from "@/lib/api-client/document-client";
import {
  TravelDocumentType,
  TravelDocumentStatus,
  NotificationChannel,
} from "@prisma/client";
import { toast } from "sonner";

export default function DocumentCenterPage() {
  const [loading, setLoading] = React.useState(true);
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Filters
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Modals state
  const [previewDoc, setPreviewDoc] = React.useState<DocumentItem | null>(null);
  const [issueDoc, setIssueDoc] = React.useState<DocumentItem | null>(null);
  const [revokeDoc, setRevokeDoc] = React.useState<DocumentItem | null>(null);
  const [resendDoc, setResendDoc] = React.useState<DocumentItem | null>(null);

  // Form states
  const [issuing, setIssuing] = React.useState(false);
  const [notifyCustomerOnIssue, setNotifyCustomerOnIssue] = React.useState(true);
  const [issueChannel, setIssueChannel] = React.useState<NotificationChannel>(NotificationChannel.EMAIL);

  const [revoking, setRevoking] = React.useState(false);
  const [revokeReason, setRevokeReason] = React.useState("");

  const [resending, setResending] = React.useState(false);
  const [resendChannel, setResendChannel] = React.useState<NotificationChannel>(NotificationChannel.EMAIL);
  const [customRecipient, setCustomRecipient] = React.useState("");

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: ListDocumentsParams = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        type: typeFilter !== "ALL" ? (typeFilter as TravelDocumentType) : undefined,
        status: statusFilter !== "ALL" ? (statusFilter as TravelDocumentStatus) : undefined,
      };

      const res = await documentClient.list(params);
      setDocuments(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch documents.");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Actions
  const handleIssue = async () => {
    if (!issueDoc) return;
    setIssuing(true);
    try {
      await documentClient.issue(issueDoc.id, {
        notifyCustomer: notifyCustomerOnIssue,
        channel: issueChannel,
      });
      toast.success(`Document ${issueDoc.documentNumber} issued successfully!`);
      setIssueDoc(null);
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue document.");
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeDoc) return;
    if (!revokeReason.trim() || revokeReason.length < 3) {
      toast.error("Please enter a valid revocation reason (min 3 chars).");
      return;
    }
    setRevoking(true);
    try {
      await documentClient.revoke(revokeDoc.id, { reason: revokeReason });
      toast.success(`Document ${revokeDoc.documentNumber} has been revoked.`);
      setRevokeDoc(null);
      setRevokeReason("");
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke document.");
    } finally {
      setRevoking(false);
    }
  };

  const handleResend = async () => {
    if (!resendDoc) return;
    setResending(true);
    try {
      await documentClient.resend(resendDoc.id, {
        channel: resendChannel,
        customRecipient: customRecipient.trim() || undefined,
      });
      toast.success(`Document ${resendDoc.documentNumber} sent via ${resendChannel}!`);
      setResendDoc(null);
      setCustomRecipient("");
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend document.");
    } finally {
      setResending(false);
    }
  };

  const renderTypeBadge = (type: TravelDocumentType) => {
    switch (type) {
      case "HOTEL_VOUCHER":
        return (
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 gap-1 text-[10px] font-bold">
            <Hotel className="h-3 w-3" /> Hotel Voucher
          </Badge>
        );
      case "VEHICLE_VOUCHER":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] font-bold">
            <Car className="h-3 w-3" /> Vehicle Voucher
          </Badge>
        );
      case "ACTIVITY_VOUCHER":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 text-[10px] font-bold">
            <Ticket className="h-3 w-3" /> Activity Pass
          </Badge>
        );
      case "BOOKING_CONFIRMATION":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3" /> Booking Confirmation
          </Badge>
        );
      case "PAYMENT_RECEIPT":
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 gap-1 text-[10px] font-bold">
            <Receipt className="h-3 w-3" /> Payment Receipt
          </Badge>
        );
      case "CUSTOMER_ITINERARY":
      case "TRAVEL_SUMMARY":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[10px] font-bold">
            <FileText className="h-3 w-3" /> Travel Itinerary
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
            {type}
          </Badge>
        );
    }
  };

  const renderStatusBadge = (status: TravelDocumentStatus, isLatest: boolean) => {
    switch (status) {
      case "ISSUED":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Issued
          </Badge>
        );
      case "GENERATED":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold gap-1">
            <Clock className="h-3 w-3 text-amber-600" /> Draft / Generated
          </Badge>
        );
      case "REVOKED":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold gap-1">
            <XCircle className="h-3 w-3 text-rose-600" /> Revoked
          </Badge>
        );
      case "SUPERSEDED":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold gap-1">
            <RotateCcw className="h-3 w-3 text-slate-400" /> Superseded
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      <PageHeader
        title="Travel Documents & Vouchers"
        description="Official travel vouchers, booking confirmations, payment receipts, and customer itineraries."
        breadcrumbs={[{ label: "Documents" }]}
        primaryAction={{
          label: "Refresh List",
          onClick: fetchDocuments,
          icon: RefreshCw,
        }}
      />

      <div className="px-4 py-6 md:px-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search document #, customer, or booking ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(val) => { if (val) { setTypeFilter(val); setPage(1); } }}>
              <SelectTrigger className="h-9 text-xs w-[160px] bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Document Types</SelectItem>
                <SelectItem value="HOTEL_VOUCHER">Hotel Voucher</SelectItem>
                <SelectItem value="VEHICLE_VOUCHER">Vehicle Voucher</SelectItem>
                <SelectItem value="ACTIVITY_VOUCHER">Activity Pass</SelectItem>
                <SelectItem value="BOOKING_CONFIRMATION">Booking Confirmation</SelectItem>
                <SelectItem value="CUSTOMER_ITINERARY">Travel Itinerary</SelectItem>
                <SelectItem value="PAYMENT_RECEIPT">Payment Receipt</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(val) => { if (val) { setStatusFilter(val); setPage(1); } }}>
              <SelectTrigger className="h-9 text-xs w-[140px] bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="GENERATED">Draft / Generated</SelectItem>
                <SelectItem value="ISSUED">Officially Issued</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="SUPERSEDED">Superseded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-600">Loading travel documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
              <FileText className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No travel documents found</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Travel documents are automatically initialized from confirmed bookings and payments in the booking workspace.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600">
                  <TableRow>
                    <TableHead className="py-3 px-4">Document #</TableHead>
                    <TableHead className="py-3 px-4">Type</TableHead>
                    <TableHead className="py-3 px-4">Document Title</TableHead>
                    <TableHead className="py-3 px-4">Customer & Trip</TableHead>
                    <TableHead className="py-3 px-4">Status</TableHead>
                    <TableHead className="py-3 px-4">Issue Date</TableHead>
                    <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs">
                  {documents.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-slate-50/50">
                      {/* Document # & Version */}
                      <TableCell className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{doc.documentNumber}</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            v{doc.version}
                          </span>
                        </div>
                      </TableCell>

                      {/* Document Type */}
                      <TableCell className="py-3.5 px-4">
                        {renderTypeBadge(doc.documentType)}
                      </TableCell>

                      {/* Document Title */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{doc.title}</div>
                        {doc.bookingNumber && (
                          <div className="text-[10px] text-slate-500">
                            Booking: <Link href={`/bookings/${doc.bookingId}`} className="text-indigo-600 hover:underline">{doc.bookingNumber}</Link>
                          </div>
                        )}
                      </TableCell>

                      {/* Customer & Trip */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{doc.customerName}</div>
                        <div className="text-[10px] text-slate-500">{doc.tripTitle || doc.tripNumber || "—"}</div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 px-4">
                        {renderStatusBadge(doc.status, doc.isLatest)}
                      </TableCell>

                      {/* Issue Date */}
                      <TableCell className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {formatDate(doc.issuedAt || doc.generatedAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview PDF */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewDoc(doc)}
                            className="h-8 px-2 text-slate-600 hover:text-indigo-600 cursor-pointer"
                            title="Preview PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Download PDF */}
                          <a
                            href={documentClient.getDownloadUrl(doc.id)}
                            download
                            className="inline-flex items-center justify-center h-8 px-2 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* Issue Action (if GENERATED) */}
                          {doc.status === "GENERATED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIssueDoc(doc)}
                              className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold cursor-pointer gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Issue
                            </Button>
                          )}

                          {/* Send / Resend Action (if ISSUED) */}
                          {doc.status === "ISSUED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResendDoc(doc);
                                setCustomRecipient(doc.customerEmail || doc.customerPhone || "");
                              }}
                              className="h-8 px-2.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold cursor-pointer gap-1"
                            >
                              <Send className="h-3 w-3" /> Send
                            </Button>
                          )}

                          {/* Revoke Action (if ISSUED) */}
                          {doc.status === "ISSUED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevokeDoc(doc)}
                              className="h-8 px-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Revoke Document"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <span className="font-bold text-slate-700">{page}</span> of{" "}
                <span className="font-bold text-slate-700">{totalPages}</span> ({total} total documents)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. PDF PREVIEW MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Preview: {previewDoc?.title} ({previewDoc?.documentNumber})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official document rendering with zero commercial data leakage.
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="flex-1 min-h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100 my-3">
              <iframe
                src={documentClient.getPreviewUrl(previewDoc.id)}
                className="w-full h-full min-h-[500px]"
                title="Document PDF Preview"
              />
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="text-xs"
            >
              Close
            </Button>
            {previewDoc && (
              <a
                href={documentClient.getDownloadUrl(previewDoc.id)}
                download
                className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. ISSUE DOCUMENT MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!issueDoc} onOpenChange={(open) => !open && setIssueDoc(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Issue Travel Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Officially mark {issueDoc?.documentNumber} ({issueDoc?.title}) as issued and immutable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-900 text-[11px] leading-relaxed">
              Once issued, the document is visible in the customer traveler portal and can be dispatched via WhatsApp or Email.
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="notifyCustomer"
                checked={notifyCustomerOnIssue}
                onChange={(e) => setNotifyCustomerOnIssue(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <label htmlFor="notifyCustomer" className="font-bold text-slate-700 cursor-pointer">
                Notify customer immediately via notification channel
              </label>
            </div>

            {notifyCustomerOnIssue && (
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Select Dispatch Channel</label>
                <Select value={issueChannel} onValueChange={(val) => setIssueChannel(val as NotificationChannel)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NotificationChannel.EMAIL}>Email ({issueDoc?.customerEmail || "Customer Email"})</SelectItem>
                    <SelectItem value={NotificationChannel.WHATSAPP}>WhatsApp ({issueDoc?.customerPhone || "Customer Phone"})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIssueDoc(null)} disabled={issuing}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleIssue}
              disabled={issuing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              {issuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. RESEND / SEND MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!resendDoc} onOpenChange={(open) => !open && setResendDoc(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-700">
              <Send className="h-5 w-5 text-indigo-600" />
              <span>Send Document to Traveler</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch {resendDoc?.documentNumber} via Phase 15 automated messaging gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Communication Channel</label>
              <Select value={resendChannel} onValueChange={(val) => setResendChannel(val as NotificationChannel)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NotificationChannel.EMAIL}>Email</SelectItem>
                  <SelectItem value={NotificationChannel.WHATSAPP}>WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                {resendChannel === NotificationChannel.EMAIL ? "Recipient Email" : "Recipient Phone Number"}
              </label>
              <Input
                placeholder={resendChannel === NotificationChannel.EMAIL ? "traveler@example.com" : "+91 9876543210"}
                value={customRecipient}
                onChange={(e) => setCustomRecipient(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setResendDoc(null)} disabled={resending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResend}
              disabled={resending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
            >
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. REVOKE DOCUMENT MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!revokeDoc} onOpenChange={(open) => !open && setRevokeDoc(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>Revoke Travel Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Revoking {revokeDoc?.documentNumber} will invalidate it for the customer and mark it revoked in audit trails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <label className="font-bold text-slate-700">Revocation Reason (Required)</label>
            <Input
              placeholder="e.g. Hotel reservation amended, rescheduled dates, etc."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRevokeDoc(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
            >
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Confirm Revocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
