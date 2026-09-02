"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { customerClient, CustomerDetails360 } from "@/lib/api-client";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Compass,
  CreditCard,
  FileText,
  Edit2,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Check,
  Building,
  Users,
  IndianRupee,
  MoreVertical,
  Loader2,
  DollarSign,
  Cake,
  Globe,
  MessageSquare,
  Send,
  RotateCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { communicationClient, CommunicationLogItem } from "@/lib/api-client/communication-client";

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function getInitials(name: string) {
  if (!name) return "C";
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

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [customer, setCustomer] = React.useState<CustomerDetails360 | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "enquiries" | "trips" | "quotations" | "bookings" | "travelers" | "communications"
  >("overview");

  // Communication states
  const [communications, setCommunications] = React.useState<CommunicationLogItem[]>([]);
  const [loadingComms, setLoadingComms] = React.useState(false);
  const [isMsgModalOpen, setIsMsgModalOpen] = React.useState(false);
  const [msgChannel, setMsgChannel] = React.useState<"EMAIL" | "WHATSAPP">("WHATSAPP");
  const [msgTitle, setMsgTitle] = React.useState("");
  const [msgBody, setMsgBody] = React.useState("");
  const [sendingMsg, setSendingMsg] = React.useState(false);

  // Edit Customer Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editAlternatePhone, setEditAlternatePhone] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editDateOfBirth, setEditDateOfBirth] = React.useState("");
  const [editGender, setEditGender] = React.useState("");
  const [editNationality, setEditNationality] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editState, setEditState] = React.useState("");
  const [editPostalCode, setEditPostalCode] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [editInternalNotes, setEditInternalNotes] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  const loadCommunications = React.useCallback(async () => {
    try {
      setLoadingComms(true);
      const res = await communicationClient.listLogs({ customerId: id, limit: 50 });
      setCommunications(res.data);
    } catch {
      // safe fallback
    } finally {
      setLoadingComms(false);
    }
  }, [id]);

  // Load real customer 360 profile from PostgreSQL API
  const loadCustomer = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await customerClient.getCustomer(id);
      if (res.success && res.data) {
        setCustomer(res.data);
        // Pre-fill edit form
        setEditName(res.data.name || "");
        setEditPhone(res.data.phone || "");
        setEditAlternatePhone(res.data.alternatePhone || "");
        setEditEmail(res.data.email || "");
        setEditDateOfBirth(
          res.data.dateOfBirth
            ? new Date(res.data.dateOfBirth).toISOString().split("T")[0]
            : ""
        );
        setEditGender(res.data.gender || "");
        setEditNationality(res.data.nationality || "");
        setEditAddress(res.data.address || "");
        setEditCity(res.data.city || "");
        setEditState(res.data.state || "");
        setEditPostalCode(res.data.postalCode || "");
        setEditNotes(res.data.notes || "");
        setEditInternalNotes(res.data.internalNotes || "");
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load customer record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) {
      loadCustomer();
      loadCommunications();
    }
  }, [id, loadCustomer, loadCommunications]);

  const handleSendCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast.error("Please enter a subject and message body.");
      return;
    }

    try {
      setSendingMsg(true);
      await communicationClient.sendManual({
        customerId: id,
        channel: msgChannel,
        title: msgTitle.trim(),
        message: msgBody.trim(),
      });
      toast.success("Message dispatched successfully", {
        description: `Sent via ${msgChannel} to customer.`,
      });
      setIsMsgModalOpen(false);
      setMsgTitle("");
      setMsgBody("");
      loadCommunications();
    } catch (err: any) {
      toast.error("Failed to send message", {
        description: err?.message || "Please check recipient details and retry.",
      });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleResendMsg = async (commsId: string) => {
    try {
      toast.info("Retrying message dispatch...");
      await communicationClient.resend(commsId);
      toast.success("Message resent successfully");
      loadCommunications();
    } catch (err: any) {
      toast.error("Failed to resend message", {
        description: err?.message || "Error resending.",
      });
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      setSavingEdit(true);
      const res = await customerClient.updateCustomer(id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        alternatePhone: editAlternatePhone.trim() || null,
        email: editEmail.trim() || null,
        dateOfBirth: editDateOfBirth ? new Date(editDateOfBirth) : null,
        gender: editGender || null,
        nationality: editNationality.trim() || null,
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        postalCode: editPostalCode.trim() || null,
        notes: editNotes.trim() || null,
        internalNotes: editInternalNotes.trim() || null,
      });

      if (res.success) {
        toast.success("Customer profile updated successfully!");
        setIsEditOpen(false);
        await loadCustomer();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update customer.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Archive Customer
  const handleArchive = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!customer) return;
    if (
      !confirm(
        `Archive customer ${customer.name}? All historical trips, quotations, and bookings remain safe in the database.`
      )
    ) {
      return;
    }

    try {
      await customerClient.archiveCustomer(id);
      toast.success(`Customer ${customer.name} archived.`);
      router.push("/customers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive customer.");
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTimeDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading Customer 360 profile...</h3>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertTriangle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Customer Profile Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested customer profile does not exist or has been archived."}
        </p>
        <Link href="/customers" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  // Extract all unique travelers across this customer's trips
  const allTravelers = customer.trips.flatMap((t: any) =>
    (t.travelers || []).map((tr: any) => ({
      ...tr,
      tripTitle: t.title,
      tripNumber: t.tripNumber,
    }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Customer Profile" />}

        {/* Top Hero Command Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Breadcrumb & Badges */}
          <div className="flex items-center gap-2.5 z-10">
            <Link
              href="/customers"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100">
              <Users className="h-3 w-3 text-blue-500" />
              Customer 360 Profile
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {customer.customerNumber || "CUS-LEGACY"}
            </span>
            {customer.archivedAt && (
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                Archived
              </span>
            )}
          </div>

          {/* Main Info Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 z-10">
            <div className="flex items-start gap-4">
              <div
                className={`h-16 w-16 rounded-2xl bg-gradient-to-tr ${getGradient(
                  customer.name
                )} text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0`}
              >
                {getInitials(customer.name)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{customer.name}</h1>
                  {customer.isRepeatCustomer ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-bold">
                      Repeat Client
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-medium">
                      New Client
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-1 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{customer.phone}</span>
                  </a>

                  {customer.alternatePhone && (
                    <span className="text-slate-400">({customer.alternatePhone})</span>
                  )}

                  {customer.email && (
                    <>
                      <span>•</span>
                      <a
                        href={`mailto:${customer.email}`}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{customer.email}</span>
                      </a>
                    </>
                  )}

                  {(customer.city || customer.address) && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{customer.city || customer.address}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                disabled={isReadOnly}
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs cursor-pointer gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                Edit Profile
              </Button>

              <Button
                onClick={() => router.push(`/trips/new?customerId=${customer.id}`)}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs cursor-pointer gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-slate-50 border-slate-200 h-9 w-9 p-0 rounded-xl shadow-2xs cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => router.push(`/enquiries/new?customerId=${customer.id}`)}
                      className="cursor-pointer"
                    >
                      <Inbox className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                      Create Enquiry
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleArchive}
                      disabled={isReadOnly}
                      className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                      Archive Customer
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Financial & Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Lifetime Spend</span>
              <h4 className="text-lg font-black text-slate-900">
                {formatCurrency(customer.financials.totalSpent)}
              </h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Paid</span>
              <h4 className="text-lg font-black text-emerald-700">
                {formatCurrency(customer.financials.totalPaid)}
              </h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Outstanding Balance</span>
              <h4 className="text-lg font-black text-amber-700">
                {formatCurrency(customer.financials.totalOutstandingBalance)}
              </h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Bookings / Conversion</span>
              <h4 className="text-lg font-black text-purple-700">
                {customer.financials.totalBookings} Bookings
              </h4>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-px overflow-x-auto text-xs no-scrollbar">
          {[
            { id: "overview", label: "Overview & Timeline" },
            { id: "enquiries", label: `Enquiries (${customer.enquiries.length})` },
            { id: "trips", label: `Trips (${customer.trips.length})` },
            { id: "quotations", label: `Quotations (${customer.quotations.length})` },
            { id: "bookings", label: `Bookings & Payments (${customer.bookings.length})` },
            { id: "travelers", label: `Travelers (${allTravelers.length})` },
            { id: "communications", label: `Communications (${communications.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 border-slate-200 shadow-2xs"
                  : "bg-slate-50/60 text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & CRM Activity Timeline */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Details Box */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Client Profile & Preferences
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Date of Birth</span>
                    <p className="text-slate-800 font-semibold">{formatDateDisplay(customer.dateOfBirth)}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Gender & Nationality</span>
                    <p className="text-slate-800 font-semibold">
                      {customer.gender || "—"} • {customer.nationality || "Indian"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Address / City</span>
                    <p className="text-slate-800 font-semibold">
                      {customer.address || "—"}
                      {customer.city ? `, ${customer.city}` : ""}
                      {customer.state ? `, ${customer.state}` : ""}
                      {customer.postalCode ? ` - ${customer.postalCode}` : ""}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Acquisition Source</span>
                    <p className="text-slate-800 font-semibold">{customer.source || "Direct"}</p>
                  </div>

                  {customer.notes && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Client Preferences</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                        {customer.notes}
                      </p>
                    </div>
                  )}

                  {customer.internalNotes && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Internal Agency Remarks</span>
                      <p className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-amber-900 mt-1 leading-relaxed whitespace-pre-wrap">
                        {customer.internalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Derived CRM Activity Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span>CRM Activity Timeline ({customer.timeline?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">All historical touchpoints</span>
                </div>

                <div className="space-y-4">
                  {customer.timeline?.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3.5 p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors text-xs"
                    >
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
                        <Clock className="h-4 w-4" />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 truncate">{ev.title}</h4>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatDateTimeDisplay(ev.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">{ev.description}</p>
                      </div>

                      {ev.referenceUrl && (
                        <Link
                          href={ev.referenceUrl}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-indigo-600 shrink-0"
                          title="Open record"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Enquiries */}
        {activeTab === "enquiries" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Inbox className="h-4 w-4 text-blue-600" />
                <span>Captured Inquiries ({customer.enquiries.length})</span>
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/enquiries/new?customerId=${customer.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New Enquiry
              </Button>
            </div>

            {customer.enquiries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No inquiries recorded for this customer yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Enquiry #</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Pax & Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.enquiries.map((enq: any) => (
                    <TableRow
                      key={enq.id}
                      onClick={() => router.push(`/enquiries/${enq.id}`)}
                      className="hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <TableCell className="font-mono font-bold text-slate-800">{enq.enquiryNumber}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{enq.destination}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatDateDisplay(enq.startDate)} → {formatDateDisplay(enq.endDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-emerald-700">
                          {enq.budget ? formatCurrency(Number(enq.budget)) : "Flexible"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {enq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/enquiries/${enq.id}`} className="text-indigo-600 font-semibold hover:underline">
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Trips */}
        {activeTab === "trips" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Compass className="h-4 w-4 text-teal-600" />
                <span>Trip Workspaces ({customer.trips.length})</span>
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/trips/new?customerId=${customer.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New Trip
              </Button>
            </div>

            {customer.trips.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No trips initialized for this customer yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Trip Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Travelers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.trips.map((tr: any) => (
                    <TableRow
                      key={tr.id}
                      onClick={() => router.push(`/trips/${tr.id}`)}
                      className="hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <TableCell className="font-mono font-bold text-slate-800">{tr.tripNumber}</TableCell>
                      <TableCell className="font-bold text-slate-900">{tr.title}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatDateDisplay(tr.startDate)} → {formatDateDisplay(tr.endDate)}
                      </TableCell>
                      <TableCell className="text-slate-700 font-semibold">
                        {tr._count?.travelers || tr.travelers?.length || 1} Pax
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {tr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/trips/${tr.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Open Trip
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 4: Quotations */}
        {activeTab === "quotations" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Quotations & Proposals ({customer.quotations.length})</span>
              </h3>
            </div>

            {customer.quotations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No quotation proposals generated for this customer yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Trip Reference</TableHead>
                    <TableHead>Final Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.quotations.map((q: any) => (
                    <TableRow
                      key={q.id}
                      onClick={() => router.push(`/trips/${q.tripId}/quotation`)}
                      className="hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <TableCell className="font-mono font-bold text-slate-800">
                        {q.quotationNumber} (v{q.version})
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{q.trip?.title || q.trip?.tripNumber}</TableCell>
                      <TableCell className="font-extrabold text-emerald-700">
                        {formatCurrency(Number(q.finalAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {q.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">{formatDateDisplay(q.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/trips/${q.tripId}/quotation`} className="text-indigo-600 font-semibold hover:underline">
                          View Proposal
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 5: Bookings & Payments */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Confirmed Bookings & Ledger ({customer.bookings.length})</span>
              </h3>
            </div>

            {customer.bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active bookings recorded for this customer yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Trip Reference</TableHead>
                    <TableHead>Total Package</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.bookings.map((bk: any) => (
                    <TableRow
                      key={bk.id}
                      onClick={() => router.push(`/bookings/${bk.id}`)}
                      className="hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <TableCell className="font-mono font-bold text-slate-800">{bk.bookingNumber}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{bk.trip?.title}</TableCell>
                      <TableCell className="font-bold text-slate-900">{formatCurrency(Number(bk.totalAmount))}</TableCell>
                      <TableCell className="font-bold text-emerald-700">{formatCurrency(Number(bk.paidAmount))}</TableCell>
                      <TableCell className="font-bold text-amber-700">{formatCurrency(Number(bk.balanceAmount))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {bk.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/bookings/${bk.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Open Booking
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 6: Travelers */}
        {activeTab === "travelers" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Associated Travelers / Passengers ({allTravelers.length})</span>
              </h3>
            </div>

            {allTravelers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No travelers listed across this customer's trips yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Traveler Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Trip Reference</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTravelers.map((tr: any, idx: number) => (
                    <TableRow key={`${tr.id}-${idx}`} className="text-xs">
                      <TableCell className="font-bold text-slate-900">{tr.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {tr.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {tr.phone || tr.email || "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {tr.tripTitle} ({tr.tripNumber})
                      </TableCell>
                      <TableCell>
                        {tr.isPrimary ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Primary Contact
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Co-traveler</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 7: Communications & Outbound History */}
        {activeTab === "communications" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Communication History</h3>
                <p className="text-xs text-slate-500">
                  Automated proposals, reminders, and manual messages sent to {customer.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={loadCommunications}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-2.5 text-slate-600 gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`h-3 w-3 ${loadingComms ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => setIsMsgModalOpen(true)}
                  disabled={isReadOnly}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Send className="h-3 w-3" />
                  Send Direct Message
                </Button>
              </div>
            </div>

            {loadingComms ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RotateCw className="h-4 w-4 animate-spin text-indigo-600" />
                Loading communications...
              </div>
            ) : communications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No communications dispatched to this customer yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-slate-400 font-bold uppercase bg-slate-50/50">
                    <TableHead>Channel & Event</TableHead>
                    <TableHead>Subject / Title</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Dispatched At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {communications.map((comm) => (
                    <TableRow key={comm.id} className="text-xs hover:bg-slate-50/80">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              comm.channel === "WHATSAPP"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : comm.channel === "EMAIL"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {comm.channel}
                          </Badge>
                          <span className="text-[11px] font-medium text-slate-600">{comm.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="font-bold text-slate-900 truncate">{comm.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{comm.message}</p>
                      </TableCell>
                      <TableCell className="text-slate-600 font-mono text-[11px]">
                        {comm.recipient || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            comm.status === "DELIVERED" || comm.status === "SENT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : comm.status === "FAILED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {comm.status}
                        </Badge>
                        {comm.failureReason && (
                          <p className="text-[10px] text-rose-600 mt-0.5 max-w-[160px] truncate" title={comm.failureReason}>
                            {comm.failureReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(comm.sentAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleResendMsg(comm.id)}
                          disabled={isReadOnly}
                          variant="ghost"
                          size="sm"
                          className="text-[11px] h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold cursor-pointer"
                        >
                          Retry / Resend
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* ─── SEND DIRECT MESSAGE MODAL ─── */}
        <Dialog open={isMsgModalOpen} onOpenChange={setIsMsgModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleSendCustomMessage}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-600" />
                  <span>Send Direct Message to {customer.name}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Dispatch an ad-hoc WhatsApp message or Email directly to the customer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Channel *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMsgChannel("WHATSAPP")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        msgChannel === "WHATSAPP"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      WhatsApp ({customer.phone})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMsgChannel("EMAIL")}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        msgChannel === "EMAIL"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      Email ({customer.email || "No email on file"})
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Subject / Title *</label>
                  <Input
                    value={msgTitle}
                    onChange={(e) => setMsgTitle(e.target.value)}
                    placeholder="e.g. Flight schedule update"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Message Body *</label>
                  <Textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={4}
                    placeholder="Enter message content for traveler..."
                    className="bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={sendingMsg || isReadOnly}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingMsg ? "Sending..." : "Dispatch Message"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── EDIT CUSTOMER MODAL ─── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-600" />
                  <span>Edit Customer Details</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Update primary contact details, address, and client preferences for {customer.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name *</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Primary Phone *</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Alternate Phone</label>
                    <Input
                      value={editAlternatePhone}
                      onChange={(e) => setEditAlternatePhone(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Date of Birth</label>
                    <Input
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                    <Input
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Street Address</label>
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Client Notes / Preferences</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Internal Agency Remarks</label>
                  <Textarea
                    value={editInternalNotes}
                    onChange={(e) => setEditInternalNotes(e.target.value)}
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={savingEdit}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
