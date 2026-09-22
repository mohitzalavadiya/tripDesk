"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Plus,
  Sparkles,
  ExternalLink,
  Share2,
  DollarSign,
  AlertCircle,
  Copy,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Send,
  Building2,
  Car,
  Ticket,
  Calendar,
  CalendarCheck,
  Users,
  Check,
  X,
  AlertTriangle,
  Layers,
  CreditCard,
  FileCheck,
  ArrowUpDown,
  History,
  MessageSquare,
  Star,
  Package,
  Download,
} from "lucide-react";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  quotationClient,
  QuotationWithRelations,
  TripCostingResult,
  taxClient,
  TaxRateItem,
} from "@/lib/api-client";
import {
  QuotationStatus,
  QuotationItem,
  ProposalItemType,
  QuotationProposalItem,
  QuotationPaymentMilestone,
  TaxMode,
  GstTreatment,
} from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { formatEnumLabel } from "@/lib/utils/enum-formatters";
import { toast } from "sonner";
import { QuotationStatusBadge } from "@/app/(dashboard)/quotations/page";

type ActiveTabType = "pricing" | "inclusions" | "milestones" | "policies";

export default function TripQuotationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  // Data states
  const [quotations, setQuotations] = React.useState<QuotationWithRelations[]>([]);
  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [activeQuoteId, setActiveQuoteId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [forkingVersion, setForkingVersion] = React.useState(false);
  const [updatingPricing, setUpdatingPricing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ActiveTabType>("pricing");

  // Tax Rate Catalog states
  const [taxRates, setTaxRates] = React.useState<TaxRateItem[]>([]);
  const [taxRatesLoading, setTaxRatesLoading] = React.useState(false);
  const [taxRatesError, setTaxRatesError] = React.useState<string | null>(null);

  // Confirm Dialog state
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = React.useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<QuotationItem | null>(null);

  // Line Item Form states
  const [itemType, setItemType] = React.useState("CUSTOM");
  const [itemName, setItemName] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemQuantity, setItemQuantity] = React.useState(1);
  const [itemUnitPrice, setItemUnitPrice] = React.useState("");
  const [itemCostPrice, setItemCostPrice] = React.useState("");
  const [itemSaving, setItemSaving] = React.useState(false);



  // Proposal Item (Inclusion/Exclusion) Modal states
  const [isProposalItemModalOpen, setIsProposalItemModalOpen] = React.useState(false);
  const [editingProposalItem, setEditingProposalItem] = React.useState<QuotationProposalItem | null>(null);
  const [proposalItemType, setProposalItemType] = React.useState<ProposalItemType>(ProposalItemType.INCLUSION);
  const [proposalItemTitle, setProposalItemTitle] = React.useState("");
  const [proposalItemDesc, setProposalItemDesc] = React.useState("");
  const [proposalItemSaving, setProposalItemSaving] = React.useState(false);

  // Payment Milestone Modal states
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = React.useState(false);
  const [editingMilestone, setEditingMilestone] = React.useState<QuotationPaymentMilestone | null>(null);
  const [milestoneTitle, setMilestoneTitle] = React.useState("");
  const [milestoneDesc, setMilestoneDesc] = React.useState("");
  const [milestonePct, setMilestonePct] = React.useState("");
  const [milestoneAmt, setMilestoneAmt] = React.useState("");
  const [milestoneDueDate, setMilestoneDueDate] = React.useState("");
  const [milestoneSaving, setMilestoneSaving] = React.useState(false);

  // Policies Form states
  const [policyForm, setPolicyForm] = React.useState({
    proposalSubtitle: "",
    customerMessage: "",
    inclusionsIntro: "",
    exclusionsIntro: "",
    paymentTerms: "",
    cancellationPolicy: "",
    importantNotes: "",
    terms: "",
  });
  const [savingPolicies, setSavingPolicies] = React.useState(false);

  // Load trip quotations & live costing
  const fetchTripQuotationData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationClient.getTripQuotation(tripId);
      if (res.success && res.data) {
        setCosting(res.data.costing);
        setQuotations(res.data.quotations);
        if (res.data.quotations.length > 0 && !activeQuoteId) {
          setActiveQuoteId(res.data.quotations[0].id);
        }
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load trip quotations.");
    } finally {
      setLoading(false);
    }
  }, [tripId, activeQuoteId]);

  // Load active tax rates catalog from DB
  const loadTaxRates = React.useCallback(async () => {
    try {
      setTaxRatesLoading(true);
      setTaxRatesError(null);
      const rates = await taxClient.listTaxRates();
      setTaxRates(rates.filter((r) => r.isActive));
    } catch (err: any) {
      setTaxRatesError(err?.message || "Failed to load tax rate catalog.");
    } finally {
      setTaxRatesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tripId) {
      fetchTripQuotationData();
      loadTaxRates();
    }
  }, [tripId, fetchTripQuotationData, loadTaxRates]);

  const activeQuote = quotations.find((q) => q.id === activeQuoteId) || quotations[0] || null;

  // Sync policy form on active quote change
  React.useEffect(() => {
    if (activeQuote) {
      setPolicyForm({
        proposalSubtitle: activeQuote.proposalSubtitle || "",
        customerMessage: activeQuote.customerMessage || "",
        inclusionsIntro: activeQuote.inclusionsIntro || "",
        exclusionsIntro: activeQuote.exclusionsIntro || "",
        paymentTerms: activeQuote.paymentTerms || "",
        cancellationPolicy: activeQuote.cancellationPolicy || "",
        importantNotes: activeQuote.importantNotes || "",
        terms: activeQuote.terms || "",
      });
    }
  }, [activeQuote]);

  // Generate Quotation Snapshot
  const handleGenerate = async () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    try {
      setGenerating(true);
      const res = await quotationClient.generateTripQuotation(tripId, {
        markupPercentage: activeQuote ? Number(activeQuote.markupPercentage) : 10,
        discountPercentage: activeQuote ? Number(activeQuote.discountPercentage) : 0,
        taxPercentage: activeQuote ? Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0) : 0,
        taxRate: activeQuote ? Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0) : 0,
        taxMode: activeQuote?.taxMode || TaxMode.EXCLUSIVE,
        gstTreatment: activeQuote?.gstTreatment || GstTreatment.INTRA_STATE,
        autoPopulateInclusions: true,
        generatePaymentSchedule: true,
      });

      if (res.success && res.data) {
        toast.success(`Proposal snapshot ${res.data.quotationNumber} (v${res.data.version}) created!`);
        await fetchTripQuotationData();
        setActiveQuoteId(res.data.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate proposal.");
    } finally {
      setGenerating(false);
    }
  };

  // Fork New Version
  const handleForkVersion = async () => {
    if (!activeQuote || isReadOnly) return;
    try {
      setForkingVersion(true);
      const res = await quotationClient.createQuotationVersion(activeQuote.id);
      if (res.success && res.data) {
        toast.success(`Forked new version v${res.data.version} successfully!`);
        await fetchTripQuotationData();
        setActiveQuoteId(res.data.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create new quotation version.");
    } finally {
      setForkingVersion(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!activeQuote || isReadOnly) return;
    try {
      const res = await quotationClient.updateQuotation(activeQuote.id, { status: newStatus });
      if (res.success && res.data) {
        toast.success(`Status updated to ${newStatus}`);
        setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status.");
    }
  };

  // Request sequence counter for race condition protection (F-05)
  const pricingRequestIdRef = React.useRef(0);

  // Update Pricing & Tax Rules (Tax V1)
  const handleUpdatePricingRules = async (rules: {
    markupPercentage?: number;
    discountPercentage?: number;
    taxPercentage?: number;
    taxRate?: number;
    taxMode?: TaxMode;
    gstTreatment?: GstTreatment;
  }) => {
    if (!activeQuote || isReadOnly) return;
    const currentRequestId = ++pricingRequestIdRef.current;
    const targetQuoteId = activeQuote.id;
    try {
      setUpdatingPricing(true);
      const res = await quotationClient.updateQuotation(targetQuoteId, rules);
      // If a newer request was dispatched while this was in flight, ignore this stale response (F-05)
      if (currentRequestId !== pricingRequestIdRef.current) {
        return;
      }
      if (res.success && res.data) {
        toast.success("Pricing and tax updated successfully.");
        setQuotations((prev) => prev.map((q) => (q.id === targetQuoteId ? res.data! : q)));
      }
    } catch (err: any) {
      if (currentRequestId === pricingRequestIdRef.current) {
        toast.error(err?.message || "Failed to update pricing / tax.");
      }
    } finally {
      if (currentRequestId === pricingRequestIdRef.current) {
        setUpdatingPricing(false);
      }
    }
  };

  // Line Item Handlers
  const handleOpenAddItem = () => {
    setItemType("CUSTOM");
    setItemName("");
    setItemDescription("");
    setItemQuantity(1);
    setItemUnitPrice("");
    setItemCostPrice("");
    setIsAddItemOpen(true);
  };

  const handleSaveAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !itemName || isReadOnly) return;

    try {
      setItemSaving(true);
      const qty = Number(itemQuantity) || 1;
      const rateSheetRate = Number(itemUnitPrice) || 0;
      const lineBase = Math.round(rateSheetRate * qty);

      const res = await quotationClient.createQuotationItem(activeQuote.id, {
        type: itemType,
        name: itemName,
        description: itemDescription || undefined,
        quantity: qty,
        unitPrice: rateSheetRate,
        costPrice: lineBase,
      });

      if (res.success) {
        toast.success("Line item added.");
        setIsAddItemOpen(false);
        await fetchTripQuotationData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to add line item.");
    } finally {
      setItemSaving(false);
    }
  };

  const handleOpenEditItem = (item: QuotationItem) => {
    setEditingItem(item);
    setItemType(item.type);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemQuantity(item.quantity);
    const rateSheetRate = Number(
      item.unitPrice && Number(item.unitPrice) > 0
        ? item.unitPrice
        : item.quantity > 0
        ? Math.round(Number(item.costPrice) / item.quantity)
        : item.costPrice
    );
    setItemUnitPrice(String(rateSheetRate));
    setItemCostPrice(String(item.costPrice));
    setIsEditItemOpen(true);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !editingItem || !itemName || isReadOnly) return;

    try {
      setItemSaving(true);
      const qty = Number(itemQuantity) || 1;
      // RateSheet Rate is fixed and read-only
      const rateSheetRate = Number(
        editingItem.unitPrice && Number(editingItem.unitPrice) > 0
          ? editingItem.unitPrice
          : editingItem.quantity > 0
          ? Math.round(Number(editingItem.costPrice) / editingItem.quantity)
          : editingItem.costPrice
      );
      const lineBase = Math.round(rateSheetRate * qty);

      const res = await quotationClient.updateQuotationItem(activeQuote.id, editingItem.id, {
        type: itemType,
        name: itemName,
        description: itemDescription || null,
        quantity: qty,
        unitPrice: rateSheetRate,
        costPrice: lineBase,
      });

      if (res.success) {
        toast.success("Line item updated.");
        setIsEditItemOpen(false);
        await fetchTripQuotationData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update item.");
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = (itemId: string, name: string) => {
    if (!activeQuote || isReadOnly) return;
    setConfirmAction({
      title: "Remove quotation item?",
      description: `Remove "${name}" from this quotation?`,
      confirmText: "Remove Item",
      variant: "destructive",
      action: async () => {
        try {
          const res = await quotationClient.deleteQuotationItem(activeQuote.id, itemId);
          if (res.success) {
            toast.success("Item removed.");
            await fetchTripQuotationData();
          }
        } catch (err: any) {
          toast.error(getErrorMessage(err, "Failed to delete item. Please try again."));
        }
      },
    });
  };

  // Quotation Tier Change Handler
  const handleTierChange = async (newTier: string) => {
    if (!activeQuote || isReadOnly) return;
    try {
      const res = await quotationClient.updateQuotation(activeQuote.id, { tier: newTier as any });
      if (res.success && res.data) {
        toast.success(`Quotation tier set to ${newTier}`);
        setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update quotation tier.");
    }
  };

  // Proposal Item (Inclusion/Exclusion) Handlers
  const handleOpenAddProposalItem = (type: ProposalItemType) => {
    setEditingProposalItem(null);
    setProposalItemType(type);
    setProposalItemTitle("");
    setProposalItemDesc("");
    setIsProposalItemModalOpen(true);
  };

  const handleOpenEditProposalItem = (item: QuotationProposalItem) => {
    setEditingProposalItem(item);
    setProposalItemType(item.type);
    setProposalItemTitle(item.title);
    setProposalItemDesc(item.description || "");
    setIsProposalItemModalOpen(true);
  };

  const handleSaveProposalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !proposalItemTitle || isReadOnly) return;

    try {
      setProposalItemSaving(true);
      if (editingProposalItem) {
        await quotationClient.updateProposalItem(activeQuote.id, editingProposalItem.id, {
          type: proposalItemType,
          title: proposalItemTitle,
          description: proposalItemDesc || null,
        });
        toast.success("Proposal item updated.");
      } else {
        await quotationClient.createProposalItem(activeQuote.id, {
          type: proposalItemType,
          title: proposalItemTitle,
          description: proposalItemDesc || null,
        });
        toast.success("Proposal item added.");
      }
      setIsProposalItemModalOpen(false);
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save proposal item.");
    } finally {
      setProposalItemSaving(false);
    }
  };

  const handleDeleteProposalItem = async (itemId: string) => {
    if (!activeQuote || isReadOnly) return;
    try {
      await quotationClient.deleteProposalItem(activeQuote.id, itemId);
      toast.success("Item removed.");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete proposal item.");
    }
  };

  // Payment Milestone Handlers
  const handleOpenAddMilestone = () => {
    setEditingMilestone(null);
    setMilestoneTitle("");
    setMilestoneDesc("");
    setMilestonePct("");
    setMilestoneAmt("");
    setMilestoneDueDate("");
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (m: QuotationPaymentMilestone) => {
    setEditingMilestone(m);
    setMilestoneTitle(m.title);
    setMilestoneDesc(m.description || "");
    setMilestonePct(m.percentage ? String(m.percentage) : "");
    setMilestoneAmt(m.amount ? String(m.amount) : "");
    setMilestoneDueDate(m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "");
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !milestoneTitle || isReadOnly) return;

    try {
      setMilestoneSaving(true);
      const pct = milestonePct ? Number(milestonePct) : null;
      const amt = milestoneAmt ? Number(milestoneAmt) : null;

      if (editingMilestone) {
        await quotationClient.updatePaymentMilestone(activeQuote.id, editingMilestone.id, {
          title: milestoneTitle,
          description: milestoneDesc || null,
          percentage: pct,
          amount: amt,
          dueDate: milestoneDueDate ? new Date(milestoneDueDate) : null,
        });
        toast.success("Milestone updated.");
      } else {
        await quotationClient.createPaymentMilestone(activeQuote.id, {
          title: milestoneTitle,
          description: milestoneDesc || null,
          percentage: pct,
          amount: amt,
          dueDate: milestoneDueDate ? new Date(milestoneDueDate) : null,
        });
        toast.success("Milestone created.");
      }
      setIsMilestoneModalOpen(false);
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save milestone.");
    } finally {
      setMilestoneSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!activeQuote || isReadOnly) return;
    try {
      await quotationClient.deletePaymentMilestone(activeQuote.id, milestoneId);
      toast.success("Milestone removed.");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete milestone.");
    }
  };

  const handleGenerateDefaultMilestones = async () => {
    if (!activeQuote || isReadOnly) return;
    try {
      await quotationClient.generateDefaultPaymentSchedule(activeQuote.id, { template: "STANDARD_3_TIER" });
      toast.success("3-Tier payment schedule generated (30% / 50% / 20%)!");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate schedule.");
    }
  };

  // Save Policy / Terms Form
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || isReadOnly) return;

    try {
      setSavingPolicies(true);
      const res = await quotationClient.updateQuotation(activeQuote.id, {
        proposalSubtitle: policyForm.proposalSubtitle || null,
        customerMessage: policyForm.customerMessage || null,
        inclusionsIntro: policyForm.inclusionsIntro || null,
        exclusionsIntro: policyForm.exclusionsIntro || null,
        paymentTerms: policyForm.paymentTerms || null,
        cancellationPolicy: policyForm.cancellationPolicy || null,
        importantNotes: policyForm.importantNotes || null,
        terms: policyForm.terms || null,
      });

      if (res.success && res.data) {
        toast.success("Proposal terms and policies saved.");
        setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save policies.");
    } finally {
      setSavingPolicies(false);
    }
  };

  // Copy Public Link
  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public proposal link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">Loading proposal workspace...</h3>
        </div>
      </div>
    );
  }

  const inclusions = activeQuote?.proposalItems?.filter((p) => p.type === ProposalItemType.INCLUSION) || [];
  const exclusions = activeQuote?.proposalItems?.filter((p) => p.type === ProposalItemType.EXCLUSION) || [];
  const importantNotes = activeQuote?.proposalItems?.filter((p) => p.type === ProposalItemType.IMPORTANT_NOTE) || [];
  const milestones = activeQuote?.paymentMilestones || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {isReadOnly && <ReadOnlyBanner moduleName="Quotations" />}

      <div className="max-w-[1360px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/trips/${tripId}`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold h-9 w-9 rounded-xl shadow-2xs transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {costing?.tripTitle || "Trip Quotation Studio"}
                </h1>
                {activeQuote && <QuotationStatusBadge status={activeQuote.status} />}
                {activeQuote && (
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-indigo-50/50 text-indigo-700 border-indigo-200">
                    {activeQuote.quotationNumber} • v{activeQuote.version}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {costing?.tripNumber} • {costing?.customer.name} ({costing?.customer.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Version Switcher */}
            {quotations.length > 1 && (
              <Select value={activeQuoteId || ""} onValueChange={(val) => val && setActiveQuoteId(val)}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200 w-auto min-w-36 font-semibold">
                  <History className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Select Version">
                    {(val) => {
                      const q = quotations.find((x) => x.id === val);
                      return q ? `v${q.version} • ${formatCurrency(Number(q.finalAmount))} (${formatEnumLabel(q.status)})` : undefined;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id} className="text-xs">
                      v{q.version} • {formatCurrency(Number(q.finalAmount))} ({formatEnumLabel(q.status)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeQuote && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForkVersion}
                  disabled={forkingVersion || isReadOnly}
                  className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer disabled:opacity-50"
                >
                  <History className="h-3.5 w-3.5 text-slate-500" />
                  {forkingVersion ? "Forking..." : "Fork New Version"}
                </Button>

                {activeQuote.shareToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(activeQuote.shareToken!)}
                    className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    Share Link
                  </Button>
                )}

                <a
                  href={`/api/quotations/${encodeURIComponent(activeQuote.id)}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-9 px-3 rounded-xl shadow-2xs gap-1 cursor-pointer text-slate-700"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  Export PDF
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/trips/${tripId}/quotation/preview`)}
                  className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-indigo-600" />
                  Preview
                </Button>

                <Button
                  size="sm"
                  onClick={() => router.push(`/bookings/new?quotationId=${activeQuote.id}&tripId=${tripId}`)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Convert to Booking
                </Button>
              </>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeQuote ? "Re-sync Proposal" : "Generate Proposal"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Empty State when no quotations exist */}
        {!activeQuote && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center space-y-6 animate-in fade-in duration-300">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                No Quotation Proposal Created Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Generate an itemized customer proposal from this trip&apos;s itinerary, hotel stays, vehicle allocations, and live supplier rate sheets.
              </p>
            </div>

            {/* Feature highlights grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <DollarSign className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Costing Snapshot</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Automatic line items calculated from hotels, vehicles, and activities.
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Tiered Packages</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Provide Standard, Deluxe, and Luxury options for traveler choice.
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Payment Schedule</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Multi-stage milestones dynamically synchronized to proposal total.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Proposal...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Initial Proposal
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Customer Feedback Banner if changes requested */}
        {activeQuote?.customerFeedback && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
            <MessageSquare className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 text-sm">Customer Feedback / Revision Request Received</h4>
              <p className="text-xs text-amber-800 leading-relaxed italic">
                &ldquo;{activeQuote.customerFeedback}&rdquo;
              </p>
              {activeQuote.customerFeedbackAt && (
                <p className="text-[10px] text-amber-600">
                  Received on {new Date(activeQuote.customerFeedbackAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Tabs Navigation */}
        {activeQuote && (
          <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab("pricing")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "pricing"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              Costing & Pricing Snapshot
            </button>
            <button
              onClick={() => setActiveTab("inclusions")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "inclusions"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Inclusions & Exclusions ({inclusions.length + exclusions.length})
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "milestones"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payment Schedule ({milestones.length})
            </button>
            <button
              onClick={() => setActiveTab("policies")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "policies"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileCheck className="h-4 w-4" />
              Terms, Policies & Branding
            </button>
          </div>
        )}

        {/* ─── TAB 1: PRICING & LINE ITEMS ─── */}
        {activeQuote && activeTab === "pricing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col (2 cols): Line Items Snapshot */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Quotation Line Items Snapshot</h3>
                    <p className="text-xs text-slate-500">
                      Fixed price snapshots for client proposal. Modifying items recalculates totals.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isReadOnly}
                    onClick={handleOpenAddItem}
                    className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8 rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Item Description</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Type</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Qty</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">RateSheet Rate</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Line Base Total</TableHead>
                        <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeQuote.items.map((item) => {
                        const rateSheetRate = Number(
                          item.unitPrice && Number(item.unitPrice) > 0
                            ? item.unitPrice
                            : item.quantity > 0
                            ? Math.round(Number(item.costPrice) / item.quantity)
                            : item.costPrice
                        );
                        const lineBase = Number(item.costPrice || rateSheetRate * item.quantity);

                        return (
                          <TableRow key={item.id} className="border-b border-slate-100 text-xs hover:bg-slate-50/50">
                            <TableCell className="py-3 px-4 font-semibold text-slate-900">
                              <div>
                                <span>{item.name}</span>
                                {item.description && (
                                  <p className="text-[11px] font-normal text-slate-500">{item.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {item.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-slate-700">
                              {item.quantity} {item.unit || ""}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-slate-700 font-mono font-semibold">
                              {formatCurrency(rateSheetRate)}
                            </TableCell>
                            <TableCell className="py-3 px-4 font-extrabold text-slate-900">
                              {formatCurrency(lineBase)}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditItem(item)}
                                  disabled={isReadOnly}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
                                  title="Edit item quantity / description"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  disabled={isReadOnly}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Right Col: Commercial Pricing & Margins Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-indigo-600" />
                    <span>Pricing Breakdown</span>
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {activeQuote.currency}
                  </Badge>
                </div>

                {/* Recalculation Alert Banner (F-04) */}
                {updatingPricing && (
                  <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-xs font-semibold animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
                    <span>Recalculating quotation pricing & tax…</span>
                  </div>
                )}

                {/* Quotation Tier Selector */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Tier</label>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                      Naming Suffix
                    </Badge>
                  </div>
                  <Select
                    disabled={isReadOnly}
                    value={activeQuote.tier || "Deluxe"}
                    onValueChange={(val) => val && handleTierChange(val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 font-semibold">
                      <SelectValue placeholder="Select Tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Ultra Deluxe">Ultra Deluxe</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    Sets the quotation tier and updates the proposal title. Does not affect pricing or service selections.
                  </p>
                </div>

                {/* Status Selector */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700">Proposal Status</label>
                  <Select
                    value={activeQuote.status}
                    onValueChange={(val) => val && handleStatusChange(val as QuotationStatus)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={QuotationStatus.DRAFT}>Draft</SelectItem>
                      <SelectItem value={QuotationStatus.SENT}>Sent to Customer</SelectItem>
                      <SelectItem value={QuotationStatus.VIEWED}>Viewed by Customer</SelectItem>
                      <SelectItem value={QuotationStatus.ACCEPTED}>Accepted</SelectItem>
                      <SelectItem value={QuotationStatus.REJECTED}>Rejected</SelectItem>
                      <SelectItem value={QuotationStatus.EXPIRED}>Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pricing Fields & Commercial Base */}
                <div className={`space-y-3 pt-2 text-xs border-t border-slate-100 transition-opacity duration-200 ${updatingPricing ? "opacity-60" : "opacity-100"}`}>
                  <div className="flex justify-between text-slate-600">
                    <span>RateSheet Base Subtotal:</span>
                    <strong className="text-slate-900">{formatCurrency(Number(activeQuote.subtotal))}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Agency Markup:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        disabled={updatingPricing || isReadOnly}
                        defaultValue={Number(activeQuote.markupPercentage)}
                        onBlur={(e) => handleUpdatePricingRules({ markupPercentage: Number(e.target.value) || 0 })}
                        className="h-7 w-16 text-right text-xs bg-slate-50 font-bold"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                      <strong className={`min-w-[70px] text-right ${Number(activeQuote.markupAmount) < 0 ? "text-rose-600 font-semibold" : "text-slate-900"}`}>
                        {Number(activeQuote.markupAmount) >= 0 ? `+${formatCurrency(Number(activeQuote.markupAmount))}` : formatCurrency(Number(activeQuote.markupAmount))}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Gross Package Amount:</span>
                    <strong className="text-slate-900">
                      {formatCurrency(Number(activeQuote.subtotal) + Number(activeQuote.markupAmount))}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Special Discount:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        disabled={updatingPricing || isReadOnly}
                        defaultValue={Number(activeQuote.discountPercentage)}
                        onBlur={(e) => handleUpdatePricingRules({ discountPercentage: Number(e.target.value) || 0 })}
                        className="h-7 w-16 text-right text-xs bg-slate-50 font-bold"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                      <strong className="text-emerald-700 min-w-[70px] text-right">
                        -{formatCurrency(Number(activeQuote.discountAmount))}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ─── TAX V1 COMMERCIAL CONTROLS ─── */}
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      Tax V1 Configuration
                    </span>
                    {updatingPricing && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    )}
                  </div>

                  {/* Tax Rate Catalog Selector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">GST Rate</label>
                      {taxRatesError && (
                        <button
                          type="button"
                          onClick={loadTaxRates}
                          className="text-[10px] text-rose-600 underline font-medium hover:text-rose-700 cursor-pointer"
                        >
                          Retry Catalog
                        </button>
                      )}
                    </div>
                    {taxRatesLoading ? (
                      <div className="h-8 flex items-center gap-2 text-slate-400 text-xs px-2 bg-white rounded-lg border border-slate-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading rates...
                      </div>
                    ) : (
                      <Select
                        disabled={updatingPricing || isReadOnly}
                        value={String(Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0))}
                        onValueChange={(val) => {
                          const rateNum = Number(val);
                          handleUpdatePricingRules({ taxRate: rateNum, taxPercentage: rateNum });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                          <SelectValue placeholder="Select active tax rate" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {taxRates.map((rateItem) => (
                            <SelectItem key={rateItem.id} value={String(rateItem.rate)}>
                              {rateItem.name} ({rateItem.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Tax Mode Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tax Mode</label>
                    <Select
                      disabled={updatingPricing || isReadOnly}
                      value={activeQuote.taxMode || TaxMode.EXCLUSIVE}
                      onValueChange={(val) => handleUpdatePricingRules({ taxMode: val as TaxMode })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value={TaxMode.EXCLUSIVE}>
                          Tax Exclusive (+GST added to price)
                        </SelectItem>
                        <SelectItem value={TaxMode.INCLUSIVE}>
                          Tax Inclusive (GST included in price)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* GST Treatment Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">GST Treatment</label>
                    <Select
                      disabled={updatingPricing || isReadOnly}
                      value={activeQuote.gstTreatment || GstTreatment.INTRA_STATE}
                      onValueChange={(val) => handleUpdatePricingRules({ gstTreatment: val as GstTreatment })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value={GstTreatment.INTRA_STATE}>
                          Intra-State (CGST + SGST)
                        </SelectItem>
                        <SelectItem value={GstTreatment.INTER_STATE}>
                          Inter-State (IGST)
                        </SelectItem>
                        <SelectItem value={GstTreatment.NON_GST_EXEMPT}>
                          Non-GST Exempt (0% Tax)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 italic pt-0.5 leading-tight">
                      Select commercial GST treatment for this quotation. TripDesk does not automatically determine legal GST treatment.
                    </p>
                  </div>
                </div>

                {/* ─── SERVER-CALCULATED COMMERCIAL TAX SUMMARY ─── */}
                <div className={`space-y-2 pt-2 text-xs border-t border-slate-100 transition-opacity duration-200 ${updatingPricing ? "opacity-60" : "opacity-100"}`}>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount:</span>
                    <strong className="text-slate-900">
                      {formatCurrency(
                        Number(
                          activeQuote.taxableAmount ??
                            Math.max(
                              0,
                              Number(activeQuote.subtotal) +
                                Number(activeQuote.markupAmount) -
                                Number(activeQuote.discountAmount)
                            )
                        )
                      )}
                    </strong>
                  </div>

                  {/* GST Breakdown according to treatment */}
                  {activeQuote.gstTreatment === GstTreatment.INTRA_STATE && (
                    <>
                      <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                        <span>CGST ({(Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0) / 2)}%):</span>
                        <span className="font-semibold text-slate-700">
                          +{formatCurrency(Number(activeQuote.cgstAmount ?? Number(activeQuote.taxAmount) / 2))}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                        <span>SGST ({(Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0) / 2)}%):</span>
                        <span className="font-semibold text-slate-700">
                          +{formatCurrency(Number(activeQuote.sgstAmount ?? Number(activeQuote.taxAmount) / 2))}
                        </span>
                      </div>
                    </>
                  )}

                  {activeQuote.gstTreatment === GstTreatment.INTER_STATE && (
                    <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                      <span>IGST ({Number(activeQuote.taxRate ?? activeQuote.taxPercentage ?? 0)}%):</span>
                      <span className="font-semibold text-slate-700">
                        +{formatCurrency(Number(activeQuote.igstAmount ?? Number(activeQuote.taxAmount)))}
                      </span>
                    </div>
                  )}

                  {activeQuote.gstTreatment === GstTreatment.NON_GST_EXEMPT && (
                    <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                      <span>GST Status:</span>
                      <span className="font-semibold text-slate-700">Exempt (₹0.00)</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span>Total Tax Amount:</span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] h-4 px-1.5 font-bold uppercase bg-slate-100 text-slate-600"
                      >
                        {activeQuote.taxMode === TaxMode.INCLUSIVE ? "Inclusive" : "Exclusive"}
                      </Badge>
                    </span>
                    <strong className="text-slate-900">
                      +{formatCurrency(Number(activeQuote.taxAmount))}
                    </strong>
                  </div>

                  {/* Grand Customer Total */}
                  <div className="pt-3 border-t border-slate-200 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        Customer Price:
                        {updatingPricing && (
                          <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200 bg-indigo-50 animate-pulse font-normal">
                            Recalculating…
                          </Badge>
                        )}
                      </span>
                      <span className={`font-black text-xl transition-all duration-200 ${updatingPricing ? "text-slate-400" : "text-indigo-600"}`}>
                        {formatCurrency(Number(activeQuote.finalAmount))}
                      </span>
                    </div>
                    {activeQuote.taxMode === TaxMode.INCLUSIVE && Number(activeQuote.taxAmount) > 0 && (
                      <p className="text-[10px] text-emerald-700 font-semibold text-right">
                        Gross price includes {formatCurrency(Number(activeQuote.taxAmount))} GST
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* ─── TAB 3: STRUCTURED INCLUSIONS & EXCLUSIONS ─── */}
        {activeQuote && activeTab === "inclusions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Package Inclusions</h3>
                    <p className="text-[11px] text-slate-500">Services and items covered under this proposal</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddProposalItem(ProposalItemType.INCLUSION)}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Inclusion
                </Button>
              </div>

              {inclusions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No inclusions added yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {inclusions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditProposalItem(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProposalItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exclusions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <X className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Package Exclusions</h3>
                    <p className="text-[11px] text-slate-500">Items not included in this package price</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddProposalItem(ProposalItemType.EXCLUSION)}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Exclusion
                </Button>
              </div>

              {exclusions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No exclusions added yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {exclusions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <X className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditProposalItem(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProposalItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: PAYMENT MILESTONES ─── */}
        {activeQuote && activeTab === "milestones" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Payment Milestone Schedule</h3>
                <p className="text-xs text-slate-500">
                  Configure deposit, pre-travel clearances, and balance schedules presented to the customer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDefaultMilestones}
                  className="h-8.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border-slate-200"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                  Auto-Schedule (30% / 50% / 20%)
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAddMilestone}
                  className="h-8.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                </Button>
              </div>
            </div>

            {milestones.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">No payment schedule configured for this proposal.</p>
                <Button size="sm" onClick={handleGenerateDefaultMilestones} className="text-xs">
                  Generate Standard Schedule
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {milestones.map((m, index) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative group hover:border-indigo-200 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Step {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditMilestone(m)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                      {m.description && <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                      <div>
                        {m.percentage && <span className="text-xs font-black text-slate-700">{Number(m.percentage)}%</span>}
                        {m.dueDate && (
                          <p className="text-[10px] text-slate-400">
                            Due: {new Date(m.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className="font-black text-indigo-600 text-base">
                        {formatCurrency(Number(m.amount || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 5: TERMS & POLICIES ─── */}
        {activeQuote && activeTab === "policies" && (
          <form onSubmit={handleSavePolicies} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Proposal Branding & Policy Terms</h3>
              <p className="text-xs text-slate-500">
                Customize welcome messaging, cancellation policies, and terms displayed to the client.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Proposal Subtitle</label>
                <Input
                  value={policyForm.proposalSubtitle}
                  onChange={(e) => setPolicyForm({ ...policyForm, proposalSubtitle: e.target.value })}
                  placeholder="e.g. 5 Nights Kerala Honeymoon Retreat"
                  className="text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Customer Welcome Note</label>
                <Textarea
                  value={policyForm.customerMessage}
                  onChange={(e) => setPolicyForm({ ...policyForm, customerMessage: e.target.value })}
                  placeholder="Warm message greeting the traveler..."
                  rows={2}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Cancellation Policy</label>
                <Textarea
                  value={policyForm.cancellationPolicy}
                  onChange={(e) => setPolicyForm({ ...policyForm, cancellationPolicy: e.target.value })}
                  placeholder="Detailed cancellation timeline and refund percentages..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Important Traveler Notes</label>
                <Textarea
                  value={policyForm.importantNotes}
                  onChange={(e) => setPolicyForm({ ...policyForm, importantNotes: e.target.value })}
                  placeholder="Government ID rules, check-in timings, altitude advisories..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={savingPolicies || isReadOnly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-5 rounded-xl cursor-pointer"
              >
                {savingPolicies ? "Saving..." : "Save Proposal Terms"}
              </Button>
            </div>
          </form>
        )}

        {/* ─── ADD / EDIT LINE ITEM MODAL ─── */}
        <Dialog open={isAddItemOpen || isEditItemOpen} onOpenChange={(open) => { if (!open) { setIsAddItemOpen(false); setIsEditItemOpen(false); } }}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={isAddItemOpen ? handleSaveAddItem : handleSaveEditItem}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">
                  {isAddItemOpen ? "Add Custom Line Item" : "Edit Line Item"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  {isAddItemOpen
                    ? "Add a custom quotation line item with quantity and RateSheet unit rate."
                    : "Update line item quantity, description, or notes. RateSheet Rate is fixed and read-only."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name *</label>
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Candlelight Beach Dinner"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity *</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                      required
                    />
                  </div>
                  {isAddItemOpen ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">RateSheet Rate (₹) *</label>
                      <Input
                        type="number"
                        min={0}
                        value={itemUnitPrice}
                        onChange={(e) => setItemUnitPrice(e.target.value)}
                        placeholder="0.00"
                        className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">RateSheet Rate (Fixed)</label>
                      <div className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-md flex items-center font-mono font-bold text-slate-800 text-xs">
                        {formatCurrency(Number(itemUnitPrice) || 0)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Notes</label>
                  <Input
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="e.g. 2 room(s), 2 night(s) stay"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                {/* Real-time Line Base Total Calculation */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Line Item Base Amount:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(Math.round((Number(itemQuantity) || 1) * (Number(itemUnitPrice) || 0)))}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {formatCurrency(Number(itemUnitPrice) || 0)} × {itemQuantity} {editingItem?.unit || "unit(s)"}
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAddItemOpen(false); setIsEditItemOpen(false); }}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={itemSaving || isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold"
                >
                  {itemSaving ? "Saving..." : "Save Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>



        {/* ─── ADD / EDIT PROPOSAL ITEM MODAL ─── */}
        <Dialog open={isProposalItemModalOpen} onOpenChange={setIsProposalItemModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveProposalItem}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">
                  {editingProposalItem ? "Edit Proposal Item" : `Add ${proposalItemType}`}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Add structured inclusion, exclusion, or traveler notice item.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                  <Select
                    value={proposalItemType}
                    onValueChange={(v) => setProposalItemType(v as ProposalItemType)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value={ProposalItemType.INCLUSION}>Inclusion</SelectItem>
                      <SelectItem value={ProposalItemType.EXCLUSION}>Exclusion</SelectItem>
                      <SelectItem value={ProposalItemType.IMPORTANT_NOTE}>Important Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Item Title *</label>
                  <Input
                    value={proposalItemTitle}
                    onChange={(e) => setProposalItemTitle(e.target.value)}
                    placeholder="e.g. Airport Transfers in Private AC Sedan"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description / Details</label>
                  <Textarea
                    value={proposalItemDesc}
                    onChange={(e) => setProposalItemDesc(e.target.value)}
                    placeholder="e.g. Dedicated chauffeur for arrival & departure transfers."
                    rows={2}
                    className="text-xs bg-slate-50/50 border-slate-200 resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProposalItemModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={proposalItemSaving || isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold"
                >
                  {proposalItemSaving ? "Saving..." : "Save Proposal Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── ADD / EDIT MILESTONE MODAL ─── */}
        <Dialog open={isMilestoneModalOpen} onOpenChange={setIsMilestoneModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveMilestone}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">
                  {editingMilestone ? "Edit Payment Milestone" : "Add Payment Milestone"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Configure milestone name, percentage or exact amount, and due date.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Milestone Title *</label>
                  <Input
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="e.g. 30% Booking Advance"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Percentage (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={milestonePct}
                      onChange={(e) => setMilestonePct(e.target.value)}
                      placeholder="e.g. 30"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fixed Amount (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={milestoneAmt}
                      onChange={(e) => setMilestoneAmt(e.target.value)}
                      placeholder="e.g. 15000"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Due Date</label>
                  <Input
                    type="date"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <Textarea
                    value={milestoneDesc}
                    onChange={(e) => setMilestoneDesc(e.target.value)}
                    placeholder="e.g. Required upon confirmation to lock hotel bookings."
                    rows={2}
                    className="text-xs bg-slate-50/50 border-slate-200 resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={milestoneSaving || isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold"
                >
                  {milestoneSaving ? "Saving..." : "Save Milestone"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Global Action Confirmation Modal */}
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmAction?.title || ""}
          description={confirmAction?.description || ""}
          confirmText={confirmAction?.confirmText || "Confirm"}
          variant={confirmAction?.variant || "destructive"}
          loading={actionLoading}
          onConfirm={async () => {
            if (!confirmAction) return;
            setActionLoading(true);
            try {
              await confirmAction.action();
              setConfirmAction(null);
            } finally {
              setActionLoading(false);
            }
          }}
        />
      </div>
    </div>
  );
}
