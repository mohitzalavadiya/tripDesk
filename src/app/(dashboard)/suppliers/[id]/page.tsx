"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supplierClient, SupplierDetails360 } from "@/lib/api-client";
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
  Truck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Edit2,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Hotel,
  Car,
  Ticket,
  Sparkles,
  Building2,
  MoreVertical,
  Loader2,
  IndianRupee,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
];

function getInitials(name: string) {
  if (!name) return "S";
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

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Data states
  const [supplier, setSupplier] = React.useState<SupplierDetails360 | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "confirmations" | "payables" | "activeRates" | "expiredRates" | "hotels" | "vehicles" | "activities"
  >("overview");

  // Edit Supplier Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editType, setEditType] = React.useState("");
  const [editContactPerson, setEditContactPerson] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editAlternatePhone, setEditAlternatePhone] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editState, setEditState] = React.useState("");
  const [editPostalCode, setEditPostalCode] = React.useState("");
  const [editGstNumber, setEditGstNumber] = React.useState("");
  const [editPanNumber, setEditPanNumber] = React.useState("");
  const [editPaymentTerms, setEditPaymentTerms] = React.useState("");
  const [editBankDetails, setEditBankDetails] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [editInternalNotes, setEditInternalNotes] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Load supplier details
  const loadSupplier = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await supplierClient.getSupplier(id);
      if (res.success && res.data) {
        setSupplier(res.data);
        // Pre-fill edit form
        setEditName(res.data.name || "");
        setEditType(res.data.type || "Hotel Supplier");
        setEditContactPerson(res.data.contactPerson || "");
        setEditPhone(res.data.phone || "");
        setEditAlternatePhone(res.data.alternatePhone || "");
        setEditEmail(res.data.email || "");
        setEditAddress(res.data.address || "");
        setEditCity(res.data.city || "");
        setEditState(res.data.state || "");
        setEditPostalCode(res.data.postalCode || "");
        setEditGstNumber(res.data.gstNumber || "");
        setEditPanNumber(res.data.panNumber || "");
        setEditPaymentTerms(res.data.paymentTerms || "");
        setEditBankDetails(res.data.bankDetails || "");
        setEditNotes(res.data.notes || "");
        setEditInternalNotes(res.data.internalNotes || "");
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load supplier record.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) loadSupplier();
  }, [id, loadSupplier]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    try {
      setSavingEdit(true);
      const res = await supplierClient.updateSupplier(id, {
        name: editName.trim(),
        type: editType.trim(),
        contactPerson: editContactPerson.trim() || null,
        phone: editPhone.trim() || null,
        alternatePhone: editAlternatePhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        postalCode: editPostalCode.trim() || null,
        gstNumber: editGstNumber.trim() || null,
        panNumber: editPanNumber.trim() || null,
        paymentTerms: editPaymentTerms.trim() || null,
        bankDetails: editBankDetails.trim() || null,
        notes: editNotes.trim() || null,
        internalNotes: editInternalNotes.trim() || null,
      });

      if (res.success) {
        toast.success("Supplier profile updated successfully!");
        setIsEditOpen(false);
        await loadSupplier();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update supplier.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleArchive = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!supplier) return;
    if (!confirm(`Archive supplier ${supplier.name}? Linked rate sheets will remain safe.`)) {
      return;
    }

    try {
      await supplierClient.archiveSupplier(id);
      toast.success(`Supplier ${supplier.name} archived.`);
      router.push("/suppliers");
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive supplier.");
    }
  };

  const handleReactivate = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    if (!supplier) return;

    try {
      await supplierClient.reactivateSupplier(id);
      toast.success(`Supplier ${supplier.name} reactivated.`);
      await loadSupplier();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reactivate supplier.");
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading supplier profile...</h3>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50/50">
        <AlertTriangle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Supplier Profile Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested supplier does not exist or has been archived."}
        </p>
        <Link href="/suppliers" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Supplier Profile" />}

        {/* Top Hero Command Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-50/70 via-emerald-50/20 to-transparent pointer-events-none" />

          {/* Breadcrumb & Badges */}
          <div className="flex items-center gap-2.5 z-10">
            <Link
              href="/suppliers"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Truck className="h-3 w-3 text-emerald-500" />
              Supplier Profile
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {supplier.supplierCode || "SUP-LEGACY"}
            </span>
            {supplier.archivedAt && (
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
                  supplier.name
                )} text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0`}
              >
                {getInitials(supplier.name)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{supplier.name}</h1>
                  <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700">
                    {supplier.type || "Vendor"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {supplier.phone && (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="flex items-center gap-1 hover:text-indigo-600 font-semibold transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{supplier.phone}</span>
                    </a>
                  )}

                  {supplier.contactPerson && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500 font-medium">{supplier.contactPerson}</span>
                    </>
                  )}

                  {supplier.email && (
                    <>
                      <span>•</span>
                      <a
                        href={`mailto:${supplier.email}`}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{supplier.email}</span>
                      </a>
                    </>
                  )}

                  {supplier.city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{supplier.city}, {supplier.state || supplier.country}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              {supplier.status === "INACTIVE" || supplier.archivedAt ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivate}
                  disabled={isReadOnly}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold h-9 rounded-xl shadow-2xs cursor-pointer gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reactivate Supplier
                </Button>
              ) : null}

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
                onClick={() => router.push(`/rate-sheets/new?supplierId=${supplier.id}`)}
                disabled={isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs cursor-pointer gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Rate Sheet
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
                    {supplier.status === "INACTIVE" || supplier.archivedAt ? (
                      <DropdownMenuItem
                        onClick={handleReactivate}
                        disabled={isReadOnly}
                        className="text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                        Reactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={handleArchive}
                        disabled={isReadOnly}
                        className="text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                        Archive Supplier
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Telemetry KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Hotel className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Hotels</span>
              <h4 className="text-base font-black text-slate-900">{supplier.hotels.length}</h4>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Fleet</span>
              <h4 className="text-base font-black text-slate-900">{supplier.vehicles.length}</h4>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Rate Sheets</span>
              <h4 className="text-base font-black text-slate-900">{supplier.activeRateSheets.length}</h4>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Confirmations</span>
              <h4 className="text-base font-black text-slate-900">{supplier.hotelConfirmations?.length || 0}</h4>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <IndianRupee className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Total Invoiced</span>
              <h4 className="text-sm font-black text-slate-900 truncate">
                {formatCurrency(supplier.financialSummary?.totalPayableAmount || 0)}
              </h4>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">Outstanding</span>
              <h4 className="text-sm font-black text-rose-700 truncate">
                {formatCurrency(supplier.financialSummary?.totalOutstandingAmount || 0)}
              </h4>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-px overflow-x-auto text-xs no-scrollbar">
          {[
            { id: "overview", label: "Commercial Profile" },
            { id: "confirmations", label: `Confirmations (${supplier.hotelConfirmations?.length || 0})` },
            { id: "payables", label: `Payables & Finance (${supplier.payables?.length || 0})` },
            { id: "activeRates", label: `Active Rates (${supplier.activeRateSheets.length})` },
            { id: "expiredRates", label: `Expired Rates (${supplier.expiredRateSheets.length})` },
            { id: "hotels", label: `Hotels (${supplier.hotels.length})` },
            { id: "vehicles", label: `Fleet (${supplier.vehicles.length})` },
            { id: "activities", label: `Activities (${supplier.activities.length})` },
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

        {/* Tab 1: Commercial Profile & Tax */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Info */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Business & Contact Information
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Office Address</span>
                  <p className="text-slate-800 font-semibold">
                    {supplier.address || "—"}
                    {supplier.city ? `, ${supplier.city}` : ""}
                    {supplier.state ? `, ${supplier.state}` : ""}
                    {supplier.postalCode ? ` - ${supplier.postalCode}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">GST Number</span>
                    <p className="text-slate-800 font-mono font-bold">{supplier.gstNumber || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">PAN Number</span>
                    <p className="text-slate-800 font-mono font-bold">{supplier.panNumber || "—"}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Terms</span>
                  <p className="text-slate-800 font-semibold">{supplier.paymentTerms || "Standard B2B Terms"}</p>
                </div>

                {supplier.notes && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Supplier Remarks</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                      {supplier.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Banking & Internal */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Bank Wire & Operational Remarks
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Wire Transfer Bank Account</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-mono text-xs whitespace-pre-wrap mt-1">
                    {supplier.bankDetails || "No bank details registered."}
                  </p>
                </div>

                {supplier.internalNotes && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Internal Agency Remarks</span>
                    <p className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-amber-900 leading-relaxed whitespace-pre-wrap mt-1">
                      {supplier.internalNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Operational Confirmations */}
        {activeTab === "confirmations" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Operational Confirmations & Tours ({supplier.hotelConfirmations?.length || 0})</span>
              </h3>
            </div>

            {!supplier.hotelConfirmations || supplier.hotelConfirmations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No operational confirmations linked to this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Confirmation #</TableHead>
                    <TableHead>Trip / Tour</TableHead>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Stay / Service Window</TableHead>
                    <TableHead>Room / Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.hotelConfirmations.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 text-xs">
                      <TableCell className="font-mono font-bold text-slate-800">
                        {c.confirmationNumber || "CONF-PENDING"}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {c.tripOperation?.trip?.title || c.tripOperation?.trip?.tripNumber || "Tour"}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">
                        {c.tripOperation?.booking?.bookingNumber || "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {c.checkIn ? `${formatDateDisplay(c.checkIn)} → ${formatDateDisplay(c.checkOut)}` : "—"}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {c.roomDetails || c.tripHotel?.roomType || "Standard"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            c.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : c.status === "REQUESTED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : c.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.tripOperation?.tripId && (
                          <Link
                            href={`/operations/${c.tripOperation.tripId}`}
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            Open Operations
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab: Payables & Finance */}
        {activeTab === "payables" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-indigo-600" />
                <span>Supplier Payables & Disbursements ({supplier.payables?.length || 0})</span>
              </h3>
            </div>

            {!supplier.payables || supplier.payables.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No financial payables recorded for this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Payable #</TableHead>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Invoiced Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.payables.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-slate-50 text-xs">
                      <TableCell className="font-mono font-bold text-slate-800">
                        {p.payableNumber || "PAYABLE"}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">
                        {p.booking?.bookingNumber || "—"}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {formatCurrency(Number(p.actualAmount || p.plannedAmount || 0))}
                      </TableCell>
                      <TableCell className="font-extrabold text-emerald-700">
                        {formatCurrency(Number(p.paidAmount || 0))}
                      </TableCell>
                      <TableCell className="font-extrabold text-rose-700">
                        {formatCurrency(Number(p.outstandingAmount || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.status === "PARTIALLY_PAID"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : p.status === "CANCELLED"
                              ? "bg-slate-50 text-slate-700 border-slate-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.bookingId && (
                          <Link
                            href={`/bookings/${p.bookingId}`}
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            View Booking
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab: Active Rate Sheets */}
        {activeTab === "activeRates" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Active Seasonal Rate Sheets ({supplier.activeRateSheets.length})</span>
              </h3>
              <Button
                size="sm"
                onClick={() => router.push(`/rate-sheets/new?supplierId=${supplier.id}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 rounded-lg cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New Rate Sheet
              </Button>
            </div>

            {supplier.activeRateSheets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active rate sheets found for this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Rate Sheet #</TableHead>
                    <TableHead>Inventory Item</TableHead>
                    <TableHead>Season & Validity</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.activeRateSheets.map((rs: any) => (
                    <TableRow
                      key={rs.id}
                      onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                      className="hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <TableCell className="font-mono font-bold text-slate-800">
                        {rs.rateSheetNumber || "RAT"}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {rs.hotel?.name || rs.vehicle?.name || rs.activity?.name || rs.name}
                        {rs.roomType ? ` (${rs.roomType})` : ""}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{rs.seasonName || "Standard Season"}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatDateDisplay(rs.validFrom)} → {formatDateDisplay(rs.validTo)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-extrabold text-emerald-700">
                        {formatCurrency(Number(rs.costPrice))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          P-{rs.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/rate-sheets/${rs.id}`} className="text-indigo-600 font-semibold hover:underline">
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

        {/* Tab 3: Expired Rate Sheets */}
        {activeTab === "expiredRates" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Expired Tariffs & Past Seasons ({supplier.expiredRateSheets.length})</span>
              </h3>
            </div>

            {supplier.expiredRateSheets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No expired rate sheets recorded.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Rate Sheet #</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Season</TableHead>
                    <TableHead>Expired Validity</TableHead>
                    <TableHead>Past Rate</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.expiredRateSheets.map((rs: any) => (
                    <TableRow key={rs.id} className="text-xs opacity-75">
                      <TableCell className="font-mono text-slate-600">{rs.rateSheetNumber}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{rs.name}</TableCell>
                      <TableCell>{rs.seasonName || "Past Season"}</TableCell>
                      <TableCell>{formatDateDisplay(rs.validFrom)} → {formatDateDisplay(rs.validTo)}</TableCell>
                      <TableCell className="font-bold text-slate-700">{formatCurrency(Number(rs.costPrice))}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/rate-sheets/${rs.id}`} className="text-indigo-600 hover:underline">
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

        {/* Tab 4: Hotels */}
        {activeTab === "hotels" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Hotel className="h-4 w-4 text-blue-600" />
                <span>Contracted Hotel Properties ({supplier.hotels.length})</span>
              </h3>
            </div>

            {supplier.hotels.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No hotel properties explicitly assigned to this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Hotel Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City / Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.hotels.map((h: any) => (
                    <TableRow key={h.id} className="text-xs">
                      <TableCell className="font-bold text-slate-900">{h.name}</TableCell>
                      <TableCell>{h.category || "Boutique"}</TableCell>
                      <TableCell>{h.city || "—"}</TableCell>
                      <TableCell>{h.phone || h.email || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/hotels/${h.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Open Hotel
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 5: Vehicles */}
        {activeTab === "vehicles" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-emerald-600" />
                <span>Fleet & Transport Units ({supplier.vehicles.length})</span>
              </h3>
            </div>

            {supplier.vehicles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No vehicles linked to this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Vehicle Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Driver Contact</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.vehicles.map((v: any) => (
                    <TableRow key={v.id} className="text-xs">
                      <TableCell className="font-bold text-slate-900">{v.name}</TableCell>
                      <TableCell>{v.type}</TableCell>
                      <TableCell>{v.capacity} Seats</TableCell>
                      <TableCell>{v.driverPhone || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/vehicles/${v.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Open Vehicle
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 6: Activities */}
        {activeTab === "activities" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-600" />
                <span>Tours & Activities ({supplier.activities.length})</span>
              </h3>
            </div>

            {supplier.activities.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No activities linked to this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <TableRow>
                    <TableHead>Activity Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.activities.map((a: any) => (
                    <TableRow key={a.id} className="text-xs">
                      <TableCell className="font-bold text-slate-900">{a.name}</TableCell>
                      <TableCell>{a.location || "—"}</TableCell>
                      <TableCell>{a.duration || "Half Day"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/activities/${a.id}`} className="text-indigo-600 font-semibold hover:underline">
                          Open Activity
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* ─── EDIT SUPPLIER MODAL ─── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 shadow-xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-600" />
                  <span>Edit Supplier Details</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Update commercial contact, address, and payment terms for {supplier.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier Name *</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Category Type</label>
                    <Input
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Person</label>
                    <Input
                      value={editContactPerson}
                      onChange={(e) => setEditContactPerson(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">GST Number</label>
                    <Input
                      value={editGstNumber}
                      onChange={(e) => setEditGstNumber(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">PAN Number</label>
                    <Input
                      value={editPanNumber}
                      onChange={(e) => setEditPanNumber(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Terms</label>
                  <Input
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Account Details</label>
                  <Textarea
                    value={editBankDetails}
                    onChange={(e) => setEditBankDetails(e.target.value)}
                    rows={2}
                    className="bg-slate-50/50 border-slate-200 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Remarks & Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
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
