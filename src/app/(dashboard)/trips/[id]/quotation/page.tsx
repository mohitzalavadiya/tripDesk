"use client";

import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";
import { useAuth } from "@/context/auth-context";
import { formatEmbeddedEnums } from "@/lib/utils/enum-formatters";
import { QuotationStatusBadge } from "@/app/(dashboard)/quotations/page";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QuotaExceededDialog } from "@/components/shared/quota-exceeded-dialog";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { ReadOnlyModeDialog } from "@/components/shared/read-only-mode-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useSubscription } from "@/context/subscription-context";
import {
  bookingClient,
  quotationClient,
  QuotationWithRelations,
  taxClient,
  TaxRateItem,
  TripCostingResult,
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { getErrorMessage } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/utils/enum-formatters";
import { isValidDecimal,isValidInteger } from "@/lib/validation/field-validators";
import {
GstTreatment,
ProposalItemType,
QuotationItem,
QuotationPaymentMilestone,
QuotationProposalItem,
QuotationStatus,
TaxMode,
} from "@prisma/client";
import {
AlertCircle,
AlertTriangle,
ArrowDown,
ArrowLeft,
ArrowUp,
Calendar,
CalendarCheck,
Check,
CheckCircle2,
Clock,
Copy,
CreditCard,
DollarSign,
Download,
Edit2,
Eye,
FileCheck,
History,
Info,
Layers,
Loader2,
MessageSquare,
Package,
Plus,
ShieldCheck,
Sparkles,
Ticket,
Trash2,
X
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

type ActiveTabType = "pricing" | "inclusions" | "milestones" | "policies";

export interface LocalMilestoneItem {
  id?: string;
  title: string;
  description: string;
  percentage: number;
  amount?: number | null;
  dueDate: string;
  sortOrder: number;
}

export default function TripQuotationEditorPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = params.id as string;
  const queryQuotationId = searchParams?.get("quotationId") || null;

  const { isReadOnly: isCentralReadOnly, readOnlyReason, canCreate, refreshSubscription } = useSubscription();

  // Data states
  const [quotations, setQuotations] = React.useState<QuotationWithRelations[]>([]);
  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [activeQuoteId, setActiveQuoteId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [localReadOnly, setLocalReadOnly] = React.useState(false);
  const [showReadOnlyDialog, setShowReadOnlyDialog] = React.useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = React.useState(false);
  const [quotaEntityType, setQuotaEntityType] = React.useState<"QUOTATION" | "BOOKING">("QUOTATION");
  const [generating, setGenerating] = React.useState(false);
  const [forkingVersion, setForkingVersion] = React.useState(false);
  const [updatingPricing, setUpdatingPricing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ActiveTabType>("pricing");

  const isReadOnly = isCentralReadOnly || localReadOnly;

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

  // Payment Schedule & Milestone Editor states (Phase 2C)
  const [milestonesForm, setMilestonesForm] = React.useState<LocalMilestoneItem[]>([]);
  const [schedulePaymentTerms, setSchedulePaymentTerms] = React.useState("");
  const [scheduleSaveStatus, setScheduleSaveStatus] = React.useState<"idle" | "saving" | "saved" | "unsaved" | "error">("idle");
  const [scheduleSaveError, setScheduleSaveError] = React.useState<string | null>(null);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = React.useState<number | null>(null);
  const scheduleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const scheduleInFlightRef = React.useRef(false);
  const schedulePendingRef = React.useRef<{ terms: string; milestones: LocalMilestoneItem[] } | null>(null);
  const scheduleSeqRef = React.useRef(0);
  const latestScheduleRef = React.useRef({ terms: "", milestones: [] as LocalMilestoneItem[] });
  const lastSyncedScheduleQuoteIdRef = React.useRef<string | null>(null);

  // Milestone Add/Edit Modal states
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = React.useState(false);
  const [milestoneTitle, setMilestoneTitle] = React.useState("");
  const [milestoneDesc, setMilestoneDesc] = React.useState("");
  const [milestonePct, setMilestonePct] = React.useState("");
  const [milestoneDueDate, setMilestoneDueDate] = React.useState("");

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
    privacyPolicy: "",
  });
  const [markupInput, setMarkupInput] = React.useState("0");
  const [discountInput, setDiscountInput] = React.useState("0");
  const [savingPolicies, setSavingPolicies] = React.useState(false);
  const [policySaveStatus, setPolicySaveStatus] = React.useState<"idle" | "saving" | "saved" | "unsaved" | "error">("idle");
  const [policySaveError, setPolicySaveError] = React.useState<string | null>(null);
  const policyTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const policyInFlightRef = React.useRef(false);
  const policyPendingRef = React.useRef<typeof policyForm | null>(null);
  const policySeqRef = React.useRef(0);
  const latestPolicyRef = React.useRef(policyForm);
  latestPolicyRef.current = policyForm;

  // Load trip quotations & live costing
  const fetchTripQuotationData = React.useCallback(async (isSilent = false) => {
    if (!isAgencyOwner && (!isAgencyStaff || (!hasStaffPermission("QUOTATIONS", "view") && !hasStaffPermission("QUOTATION_DETAIL", "view")))) {
      setLoading(false);
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await quotationClient.getTripQuotation(tripId);
      if (res.success && res.data) {
        setCosting(res.data.costing);
        setQuotations(res.data.quotations);
        if (res.data.quotations.length > 0) {
          if (queryQuotationId && res.data.quotations.some((q) => q.id === queryQuotationId)) {
            setActiveQuoteId(queryQuotationId);
          } else if (!activeQuoteId || !res.data.quotations.some((q) => q.id === activeQuoteId)) {
            setActiveQuoteId(res.data.quotations[0].id);
          }
        }
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setLocalReadOnly(true);
      }
      setError(err?.message || "Failed to load trip quotations.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [tripId, activeQuoteId, queryQuotationId]);

  // Load active tax rates catalog from DB
  const loadTaxRates = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || (!hasStaffPermission("QUOTATIONS", "view") && !hasStaffPermission("QUOTATION_DETAIL", "view")))) {
      setTaxRatesLoading(false);
      return;
    }
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

  // Synchronize active quotation when URL query parameter targets a specific quotation
  React.useEffect(() => {
    if (queryQuotationId && quotations.length > 0 && quotations.some((q) => q.id === queryQuotationId)) {
      setActiveQuoteId(queryQuotationId);
    }
  }, [queryQuotationId, quotations]);

  const activeQuote = quotations.find((q) => q.id === activeQuoteId) || quotations[0] || null;

  const latestVersionNumber = React.useMemo(() => {
    if (!activeQuote || quotations.length === 0) return activeQuote?.version || 1;
    const sameNumberQuotes = quotations.filter((q) => q.quotationNumber === activeQuote.quotationNumber);
    return Math.max(...sameNumberQuotes.map((q) => q.version), activeQuote.version);
  }, [activeQuote, quotations]);

  const isHistoricalVersion = Boolean(activeQuote && activeQuote.version < latestVersionNumber);
  const latestQuoteForNumber = React.useMemo(() => {
    if (!activeQuote) return null;
    return (
      quotations.find(
        (q) => q.quotationNumber === activeQuote.quotationNumber && q.version === latestVersionNumber
      ) || null
    );
  }, [activeQuote, quotations, latestVersionNumber]);

  const lastSyncedQuoteIdRef = React.useRef<string | null>(null);

  // Sync policy form on active quote change (preserve local in-flight edits on same quote)
  React.useEffect(() => {
    if (!activeQuote) return;
    const isDifferentQuote = lastSyncedQuoteIdRef.current !== activeQuote.id;
    if (isDifferentQuote || (policySaveStatus !== "unsaved" && policySaveStatus !== "saving")) {
      lastSyncedQuoteIdRef.current = activeQuote.id;
      setPolicyForm({
        proposalSubtitle: activeQuote.proposalSubtitle || "",
        customerMessage: activeQuote.customerMessage || "",
        inclusionsIntro: activeQuote.inclusionsIntro || "",
        exclusionsIntro: activeQuote.exclusionsIntro || "",
        paymentTerms: activeQuote.paymentTerms || "",
        cancellationPolicy: activeQuote.cancellationPolicy || "",
        importantNotes: activeQuote.importantNotes || "",
        terms: activeQuote.terms || "",
        privacyPolicy: activeQuote.privacyPolicy || "",
      });
      setMarkupInput(String(Number(activeQuote.markupPercentage || 0)));
      setDiscountInput(String(Number(activeQuote.discountPercentage || 0)));
    }
  }, [activeQuote, policySaveStatus]);

  // Sync payment schedule on active quote change (preserve local in-flight edits on same quote)
  React.useEffect(() => {
    if (!activeQuote) return;
    const isDifferentQuote = lastSyncedScheduleQuoteIdRef.current !== activeQuote.id;
    if (isDifferentQuote || (scheduleSaveStatus !== "unsaved" && scheduleSaveStatus !== "saving")) {
      lastSyncedScheduleQuoteIdRef.current = activeQuote.id;
      const initialTerms = activeQuote.paymentTerms || "";
      const initialMilestones: LocalMilestoneItem[] = (activeQuote.paymentMilestones || []).map((m, idx) => ({
        id: m.id,
        title: m.title,
        description: m.description || "",
        percentage: Number(m.percentage || 0),
        amount: m.amount ? Number(m.amount) : null,
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "",
        sortOrder: m.sortOrder ?? idx,
      })).sort((a, b) => a.sortOrder - b.sortOrder);

      setSchedulePaymentTerms(initialTerms);
      setMilestonesForm(initialMilestones);
      latestScheduleRef.current = { terms: initialTerms, milestones: initialMilestones };
      setScheduleSaveStatus("idle");
      setScheduleSaveError(null);
    }
  }, [activeQuote, scheduleSaveStatus]);

  // Generate Quotation Snapshot
  const handleGenerate = async () => {
    if (isCentralReadOnly) {
      setShowReadOnlyDialog(true);
      return;
    }
    if (!activeQuote && !canCreate("QUOTATIONS").allowed) {
      setQuotaEntityType("QUOTATION");
      setShowQuotaDialog(true);
      return;
    }
    if (isReadOnly) {
      toast.error("Modifications are restricted in read-only mode.");
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
        toast.success(`Proposal snapshot ${res.data.quotationNumber} (V${res.data.version}) created!`);
        refreshSubscription();
        await fetchTripQuotationData(true);
        setActiveQuoteId(res.data.id);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setLocalReadOnly(true);
        refreshSubscription();
        toast.error("Modifications restricted. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to generate proposal.");
      }
    } finally {
      setGenerating(false);
    }
  };

  // Fork New Version
  const handleForkVersion = async () => {
    if (isCentralReadOnly) {
      setShowReadOnlyDialog(true);
      return;
    }
    if (!canCreate("QUOTATIONS").allowed) {
      setQuotaEntityType("QUOTATION");
      setShowQuotaDialog(true);
      return;
    }
    if (!activeQuote || isReadOnly) return;
    try {
      setForkingVersion(true);
      const res = await quotationClient.createQuotationVersion(activeQuote.id);
      if (res.success && res.data) {
        toast.success(`Forked new version V${res.data.version} successfully!`);
        refreshSubscription();
        await fetchTripQuotationData(true);
        setActiveQuoteId(res.data.id);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setLocalReadOnly(true);
        refreshSubscription();
        toast.error("Modifications restricted. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to create new quotation version.");
      }
    } finally {
      setForkingVersion(false);
    }
  };

  const handleConvertToBooking = () => {
    if (isCentralReadOnly) {
      setShowReadOnlyDialog(true);
      return;
    }
    if (!canCreate("BOOKINGS").allowed) {
      setQuotaEntityType("BOOKING");
      setShowQuotaDialog(true);
      return;
    }
    if (!activeQuote) return;

    if (activeQuote.status !== QuotationStatus.ACCEPTED) {
      toast.error("Only accepted quotations can be converted to a booking.");
      return;
    }

    const existingBookingId = activeQuote.bookings?.[0]?.id;
    if (existingBookingId) {
      router.push(`/bookings/${existingBookingId}`);
      return;
    }

    setConfirmAction({
      title: "Convert Accepted Quotation to Booking?",
      description: `Create a new booking from Quotation #${activeQuote.quotationNumber} (V${activeQuote.version} - ${activeQuote.tier || "Standard"}) for ${formatCurrency(Number(activeQuote.finalAmount), activeQuote.currency)}. A draft booking will be created in your bookings management for final confirmation and invoice issuance.`,
      confirmText: "Convert to Booking",
      variant: "default",
      action: async () => {
        try {
          const res = await bookingClient.convertQuotationToBooking(activeQuote.id);
          if (res.success && res.data) {
            toast.success(`Booking ${res.data.bookingNumber} created successfully!`);
            refreshSubscription();
            router.push(`/bookings/${res.data.id}`);
          }
        } catch (err: any) {
          toast.error(err?.message || "Failed to convert quotation to booking.");
        }
      },
    });
  };

  // Status Change
  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (isCentralReadOnly) {
      setShowReadOnlyDialog(true);
      return;
    }
    if (!activeQuote || isReadOnly) return;
    try {
      const res = await quotationClient.updateQuotation(activeQuote.id, { status: newStatus });
      if (res.success && res.data) {
        toast.success(`Status updated to ${newStatus}`);
        setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setLocalReadOnly(true);
        refreshSubscription();
        toast.error("Modifications restricted. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to update status.");
      }
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

    if (!isValidInteger(itemQuantity, { min: 1, max: 9999 })) {
      toast.error("Quantity must be a valid whole number greater than 0");
      return;
    }
    if (!isValidDecimal(itemUnitPrice, { min: 0 })) {
      toast.error("RateSheet Rate must be a valid positive amount");
      return;
    }

    try {
      setItemSaving(true);
      const qty = Number(itemQuantity);
      const rateSheetRate = Number(itemUnitPrice);
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
        await fetchTripQuotationData(true);
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

    if (!isValidInteger(itemQuantity, { min: 1, max: 9999 })) {
      toast.error("Quantity must be a valid whole number greater than 0");
      return;
    }

    try {
      setItemSaving(true);
      const qty = Number(itemQuantity);
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
        await fetchTripQuotationData(true);
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
            await fetchTripQuotationData(true);
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
      await fetchTripQuotationData(true);
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
      await fetchTripQuotationData(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete proposal item.");
    }
  };

  // Payment Schedule & Milestone Handlers (Phase 2C)
  const executeScheduleSave = React.useCallback(async (payloadToSave: { terms: string; milestones: LocalMilestoneItem[] }) => {
    if (!activeQuote || isReadOnly) return;

    if (scheduleInFlightRef.current) {
      schedulePendingRef.current = payloadToSave;
      return;
    }

    const totalPct = payloadToSave.milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    // If milestones are configured, require total percentage to equal 100% before persisting
    if (payloadToSave.milestones.length > 0 && Math.abs(totalPct - 100) >= 0.01) {
      setScheduleSaveStatus("unsaved");
      return;
    }

    scheduleInFlightRef.current = true;
    setScheduleSaveStatus("saving");
    setScheduleSaveError(null);
    const currentSeq = ++scheduleSeqRef.current;

    try {
      const res = await quotationClient.syncPaymentSchedule(activeQuote.id, {
        paymentTerms: payloadToSave.terms ? payloadToSave.terms.trim() : null,
        milestones: payloadToSave.milestones.map((m, idx) => ({
          id: m.id,
          title: m.title.trim(),
          description: m.description ? m.description.trim() : null,
          percentage: Number(m.percentage),
          amount: m.amount ?? null,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          sortOrder: idx,
        })),
      });

      if (currentSeq === scheduleSeqRef.current) {
        if (res.success && res.data) {
          setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
          setScheduleSaveStatus("saved");
          setTimeout(() => {
            setScheduleSaveStatus((curr) => (curr === "saved" ? "idle" : curr));
          }, 2500);
        }
      }
    } catch (err: any) {
      if (currentSeq === scheduleSeqRef.current) {
        setScheduleSaveStatus("error");
        setScheduleSaveError(err?.message || "Failed to persist payment schedule.");
      }
    } finally {
      scheduleInFlightRef.current = false;
      if (schedulePendingRef.current) {
        const nextPayload = schedulePendingRef.current;
        schedulePendingRef.current = null;
        executeScheduleSave(nextPayload);
      }
    }
  }, [activeQuote, isReadOnly]);

  const triggerDebouncedScheduleSave = React.useCallback((terms: string, milestones: LocalMilestoneItem[]) => {
    latestScheduleRef.current = { terms, milestones };
    setScheduleSaveStatus("unsaved");

    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
    }

    const totalPct = milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    if (milestones.length === 0 || Math.abs(totalPct - 100) < 0.01) {
      scheduleTimerRef.current = setTimeout(() => {
        executeScheduleSave({ terms, milestones });
      }, 800);
    }
  }, [executeScheduleSave]);

  React.useEffect(() => {
    return () => {
      if (scheduleTimerRef.current) {
        clearTimeout(scheduleTimerRef.current);
      }
    };
  }, []);

  const handlePaymentTermsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 3000) return;
    setSchedulePaymentTerms(val);
    triggerDebouncedScheduleSave(val, milestonesForm);
  };

  const handleManualScheduleSave = async () => {
    if (!activeQuote || isReadOnly) return;
    const currentSchedule = latestScheduleRef.current;
    const totalPct = currentSchedule.milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    if (currentSchedule.milestones.length > 0 && Math.abs(totalPct - 100) >= 0.01) {
      toast.error(`Total milestone percentage must equal 100% (currently ${totalPct}%). Please adjust milestone percentages.`);
      return;
    }
    await executeScheduleSave(currentSchedule);
    toast.success("Payment schedule saved.");
  };

  const handleMoveMilestoneUp = (index: number) => {
    if (index <= 0 || isReadOnly) return;
    const next = [...milestonesForm];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    const reordered = next.map((m, idx) => ({ ...m, sortOrder: idx }));
    setMilestonesForm(reordered);
    triggerDebouncedScheduleSave(schedulePaymentTerms, reordered);
  };

  const handleMoveMilestoneDown = (index: number) => {
    if (index >= milestonesForm.length - 1 || isReadOnly) return;
    const next = [...milestonesForm];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    const reordered = next.map((m, idx) => ({ ...m, sortOrder: idx }));
    setMilestonesForm(reordered);
    triggerDebouncedScheduleSave(schedulePaymentTerms, reordered);
  };

  const handleApplyScheduleTemplate = (templateKey: "STANDARD_3_TIER" | "ADVANCE_BALANCE" | "FULL_ADVANCE") => {
    if (!activeQuote || isReadOnly) return;
    let newMilestones: LocalMilestoneItem[] = [];
    if (templateKey === "STANDARD_3_TIER") {
      newMilestones = [
        {
          title: "Booking Deposit",
          description: "Required upon booking confirmation to secure travel reservations",
          percentage: 30,
          amount: null,
          dueDate: "",
          sortOrder: 0,
        },
        {
          title: "Pre-Travel Clearance",
          description: "Required 30 days prior to travel for voucher issuance",
          percentage: 50,
          amount: null,
          dueDate: "",
          sortOrder: 1,
        },
        {
          title: "Final Balance",
          description: "Due 7 days prior to departure date",
          percentage: 20,
          amount: null,
          dueDate: "",
          sortOrder: 2,
        },
      ];
    } else if (templateKey === "ADVANCE_BALANCE") {
      newMilestones = [
        {
          title: "Booking Advance",
          description: "Initial confirmation deposit upon proposal approval",
          percentage: 50,
          amount: null,
          dueDate: "",
          sortOrder: 0,
        },
        {
          title: "Final Balance",
          description: "Due 15 days prior to departure",
          percentage: 50,
          amount: null,
          dueDate: "",
          sortOrder: 1,
        },
      ];
    } else if (templateKey === "FULL_ADVANCE") {
      newMilestones = [
        {
          title: "Full Payment Advance",
          description: "100% advance required upon package booking",
          percentage: 100,
          amount: null,
          dueDate: "",
          sortOrder: 0,
        },
      ];
    }

    setMilestonesForm(newMilestones);
    triggerDebouncedScheduleSave(schedulePaymentTerms, newMilestones);
    toast.success("Schedule preset applied!");
  };

  const handleClearMilestones = () => {
    if (!activeQuote || isReadOnly) return;
    setConfirmAction({
      title: "Clear all payment milestones?",
      description: "This will remove all milestones from the payment schedule for this quotation version. The customer proposal will show payment terms only.",
      confirmText: "Clear Milestones",
      variant: "destructive",
      action: async () => {
        setMilestonesForm([]);
        triggerDebouncedScheduleSave(schedulePaymentTerms, []);
        toast.success("Payment milestones cleared.");
      },
    });
  };

  const handleDeleteMilestoneItem = (index: number) => {
    if (!activeQuote || isReadOnly) return;
    const target = milestonesForm[index];
    if (!target) return;
    setConfirmAction({
      title: "Delete payment milestone?",
      description: `Remove "${target.title}" (${target.percentage}%) from this quotation?`,
      confirmText: "Delete Milestone",
      variant: "destructive",
      action: async () => {
        const next = milestonesForm.filter((_, idx) => idx !== index).map((m, idx) => ({ ...m, sortOrder: idx }));
        setMilestonesForm(next);
        triggerDebouncedScheduleSave(schedulePaymentTerms, next);
        toast.success("Milestone removed.");
      },
    });
  };

  const handleOpenAddMilestone = () => {
    setEditingMilestoneIdx(null);
    setMilestoneTitle("");
    setMilestoneDesc("");
    const currentTotal = milestonesForm.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
    const remaining = Math.max(0, 100 - currentTotal);
    setMilestonePct(remaining > 0 ? String(remaining) : "");
    setMilestoneDueDate("");
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestoneIdx = (index: number) => {
    const m = milestonesForm[index];
    if (!m) return;
    setEditingMilestoneIdx(index);
    setMilestoneTitle(m.title);
    setMilestoneDesc(m.description || "");
    setMilestonePct(m.percentage ? String(m.percentage) : "");
    setMilestoneDueDate(m.dueDate || "");
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestoneModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) {
      toast.error("Please enter a milestone title.");
      return;
    }
    const pct = Number(milestonePct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error("Percentage must be a positive number up to 100%.");
      return;
    }

    let next: LocalMilestoneItem[];
    if (editingMilestoneIdx !== null && editingMilestoneIdx >= 0 && editingMilestoneIdx < milestonesForm.length) {
      next = milestonesForm.map((m, idx) => {
        if (idx === editingMilestoneIdx) {
          return {
            ...m,
            title: milestoneTitle.trim(),
            description: milestoneDesc.trim(),
            percentage: pct,
            dueDate: milestoneDueDate,
          };
        }
        return m;
      });
      toast.success("Milestone updated.");
    } else {
      const newItem: LocalMilestoneItem = {
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        percentage: pct,
        amount: null,
        dueDate: milestoneDueDate,
        sortOrder: milestonesForm.length,
      };
      next = [...milestonesForm, newItem];
      toast.success("Milestone added.");
    }

    setMilestonesForm(next);
    setIsMilestoneModalOpen(false);
    triggerDebouncedScheduleSave(schedulePaymentTerms, next);
  };

  // Reliable Auto-Save for Policy & Terms Form (Workstream E)
  const executePolicySave = React.useCallback(async (payloadToSave: typeof policyForm) => {
    if (!activeQuote || isReadOnly) return;

    if (policyInFlightRef.current) {
      policyPendingRef.current = payloadToSave;
      return;
    }

    policyInFlightRef.current = true;
    setPolicySaveStatus("saving");
    setPolicySaveError(null);
    const currentSeq = ++policySeqRef.current;

    try {
      const res = await quotationClient.updateQuotation(activeQuote.id, {
        proposalSubtitle: payloadToSave.proposalSubtitle || null,
        customerMessage: payloadToSave.customerMessage || null,
        inclusionsIntro: payloadToSave.inclusionsIntro || null,
        exclusionsIntro: payloadToSave.exclusionsIntro || null,
        paymentTerms: payloadToSave.paymentTerms || null,
        cancellationPolicy: payloadToSave.cancellationPolicy || null,
        importantNotes: payloadToSave.importantNotes || null,
        terms: payloadToSave.terms || null,
        privacyPolicy: payloadToSave.privacyPolicy || null,
      });

      if (currentSeq === policySeqRef.current) {
        if (res.success && res.data) {
          setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
          setPolicySaveStatus("saved");
          setTimeout(() => {
            setPolicySaveStatus((curr) => (curr === "saved" ? "idle" : curr));
          }, 2500);
        }
      }
    } catch (err: any) {
      if (currentSeq === policySeqRef.current) {
        setPolicySaveStatus("error");
        setPolicySaveError(err?.message || "Failed to autosave proposal terms.");
      }
    } finally {
      policyInFlightRef.current = false;
      if (policyPendingRef.current) {
        const nextPayload = policyPendingRef.current;
        policyPendingRef.current = null;
        executePolicySave(nextPayload);
      }
    }
  }, [activeQuote, isReadOnly]);

  const updatePolicyField = React.useCallback((field: keyof typeof policyForm, value: string) => {
    setPolicyForm((prev) => {
      const next = { ...prev, [field]: value };
      latestPolicyRef.current = next;
      setPolicySaveStatus("unsaved");

      if (policyTimerRef.current) {
        clearTimeout(policyTimerRef.current);
      }
      policyTimerRef.current = setTimeout(() => {
        executePolicySave(next);
      }, 800);

      return next;
    });
  }, [executePolicySave]);

  React.useEffect(() => {
    return () => {
      if (policyTimerRef.current) {
        clearTimeout(policyTimerRef.current);
        policyTimerRef.current = null;
      }
    };
  }, []);
  // Save Policy / Terms Form
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (policyTimerRef.current) {
      clearTimeout(policyTimerRef.current);
      policyTimerRef.current = null;
    }
    await executePolicySave(policyForm);
    toast.success("Proposal terms and policies saved.");
  };

  // Copy Public Link
  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public proposal link copied to clipboard!");
  };

  if (loading && !costing && quotations.length === 0) {
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

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("QUOTATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Trip Quotation"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {isReadOnly && <ReadOnlyBanner moduleName="Quotations" />}

      <div className="max-w-[1360px] mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <Link
              href={`/trips/${tripId}?tab=quotation`}
              className="inline-flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold h-9 w-9 rounded-xl shadow-2xs transition-colors shrink-0 mt-0.5"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-snug">
                  {costing?.tripTitle || "Trip Quotation Studio"}
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeQuote && <QuotationStatusBadge status={activeQuote.status} />}
                  {activeQuote && (
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-indigo-50/50 text-indigo-700 border-indigo-200 shrink-0 whitespace-nowrap">
                      {activeQuote.quotationNumber} • V{activeQuote.version}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {costing?.tripNumber} • {costing?.customer.name} ({costing?.customer.phone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full lg:w-auto">
            {/* Version Switcher */}
            {quotations.length > 1 && (
              <Select value={activeQuoteId || ""} onValueChange={(val) => val && setActiveQuoteId(val)}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200 w-full sm:w-auto min-w-36 font-semibold">
                  <History className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Select Version">
                    {(val) => {
                      const q = quotations.find((x) => x.id === val);
                      return q ? `V${q.version} • ${formatCurrency(Number(q.finalAmount))} (${formatEnumLabel(q.status)})` : undefined;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id} className="text-xs">
                      V{q.version} • {formatCurrency(Number(q.finalAmount))} ({formatEnumLabel(q.status)})
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
                  className="flex-1 xs:flex-initial bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer disabled:opacity-50 justify-center whitespace-nowrap"
                >
                  <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  {forkingVersion ? "Forking..." : "Fork New Version"}
                </Button>

                {activeQuote.shareToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(activeQuote.shareToken!)}
                    className="flex-1 xs:flex-initial bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer justify-center whitespace-nowrap"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    Share Link
                  </Button>
                )}

                <a
                  href={`/api/quotations/${encodeURIComponent(activeQuote.id)}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 xs:flex-initial inline-flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold h-9 px-3 rounded-xl shadow-2xs gap-1 cursor-pointer text-slate-700 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  Export PDF
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/trips/${tripId}/quotation/preview`)}
                  className="flex-1 xs:flex-initial bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl shadow-2xs gap-1 cursor-pointer justify-center whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  Preview
                </Button>

                {activeQuote.bookings && activeQuote.bookings.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/bookings/${activeQuote.bookings![0].id}`)}
                    className="w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer justify-center whitespace-nowrap"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600 shrink-0" />
                    View Booking ({activeQuote.bookings[0].bookingNumber})
                  </Button>
                ) : activeQuote.status === QuotationStatus.ACCEPTED ? (
                  <Button
                    size="sm"
                    onClick={handleConvertToBooking}
                    disabled={isReadOnly}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-9 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer justify-center whitespace-nowrap"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 mr-1 shrink-0" />
                    Convert to Booking
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Quotation must be accepted by the customer before converting to a booking."
                    className="w-full sm:w-auto bg-slate-50 text-slate-400 border-slate-200 h-9 font-medium text-xs rounded-xl opacity-60 cursor-not-allowed justify-center whitespace-nowrap"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 mr-1 shrink-0" />
                    Convert to Booking
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || isReadOnly}
              className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
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
                  Automatic line items calculated from hotels and vehicles.
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

              {/* Payment Schedule Promo (Temporarily hidden from UI per Phase Cleanup) */}
              {/* <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Payment Schedule</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Multi-stage milestones dynamically synchronized to proposal total.
                </p>
              </div> */}
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

        {/* Customer Acceptance Banner */}
        {activeQuote?.status === QuotationStatus.ACCEPTED && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
            <div className="flex items-start gap-3.5 min-w-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-emerald-900 text-sm">Proposal Accepted by Customer</h4>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    V{activeQuote.version} Accepted
                  </Badge>
                  {isHistoricalVersion && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
                      Historical Version (Latest is V{latestVersionNumber})
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Customer accepted Quotation #{activeQuote.quotationNumber} (V{activeQuote.version}) for {formatCurrency(Number(activeQuote.finalAmount), activeQuote.currency)}.
                  {activeQuote.acceptedAt && (
                    <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">
                      Accepted on {new Date(activeQuote.acceptedAt).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
              {activeQuote.bookings && activeQuote.bookings.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/bookings/${activeQuote.bookings![0].id}`)}
                  className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold h-8.5 px-3 rounded-xl shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  View Booking #{activeQuote.bookings[0].bookingNumber}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConvertToBooking}
                  disabled={actionLoading || isReadOnly}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                  Convert to Booking
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Historical Version Notice Banner */}
        {isHistoricalVersion && latestQuoteForNumber && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Info className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                You are viewing a historical snapshot (<strong>V{activeQuote.version}</strong>). The latest active version is <strong>V{latestVersionNumber}</strong>.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveQuoteId(latestQuoteForNumber.id)}
              className="h-7 px-3 text-xs font-semibold bg-white hover:bg-slate-100 border-slate-300 text-slate-800 rounded-lg cursor-pointer shrink-0 self-end sm:self-center"
            >
              Open Latest (V{latestVersionNumber})
            </Button>
          </div>
        )}

        {/* Customer Feedback Banner if changes requested */}
        {(activeQuote?.customerFeedback || (activeQuote?.customerResponseHistory && activeQuote.customerResponseHistory.length > 0)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
            <MessageSquare className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-amber-900 text-sm">Customer Feedback / Revision Request Received</h4>
                {(activeQuote.customerFeedbackAt || (activeQuote.customerResponseHistory && activeQuote.customerResponseHistory.length > 0)) && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    Latest: {new Date(activeQuote.customerFeedbackAt || activeQuote.customerResponseHistory![activeQuote.customerResponseHistory!.length - 1].createdAt).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 leading-relaxed italic bg-white/60 p-2.5 rounded-xl border border-amber-200/60">
                &ldquo;{activeQuote.customerFeedback || activeQuote.customerResponseHistory?.[activeQuote.customerResponseHistory.length - 1]?.message}&rdquo;
              </p>

              {/* Revision History List if multiple responses exist */}
              {activeQuote.customerResponseHistory && activeQuote.customerResponseHistory.length > 1 && (
                <div className="mt-3 pt-2.5 border-t border-amber-200/70 space-y-2">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Historical Revision Requests ({activeQuote.customerResponseHistory.length} total)
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {activeQuote.customerResponseHistory.map((item, idx) => (
                      <div key={item.id || idx} className="text-[11px] bg-amber-100/50 rounded-lg p-2 border border-amber-200/50">
                        <div className="flex items-center justify-between text-[10px] text-amber-700 font-medium mb-0.5">
                          <span>{item.action === "QUOTATION_ACCEPTED" ? "Accepted" : "Change Request"} (V{item.version})</span>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-amber-900 italic">&ldquo;{item.message}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
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
              Payment Schedule ({milestonesForm.length})
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
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    className="w-full sm:w-auto justify-center bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-lg cursor-pointer disabled:opacity-50"
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
                      {activeQuote.items
                        .filter((item) => item.type !== "ACTIVITY" && (item as any).sourceType !== "TRIP_ACTIVITY")
                        .map((item) => {
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
                                  <p className="text-[11px] font-normal text-slate-500">{formatEmbeddedEnums(item.description)}</p>
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
                        value={markupInput}
                        onChange={(e) => setMarkupInput(e.target.value)}
                        onBlur={() => {
                          if (!isValidDecimal(markupInput, { min: 0, max: 500 })) {
                            toast.error("Markup percentage must be a valid number between 0 and 500");
                            setMarkupInput(String(activeQuote.markupPercentage || 0));
                            return;
                          }
                          const val = Number(markupInput);
                          if (val !== Number(activeQuote.markupPercentage)) {
                            handleUpdatePricingRules({ markupPercentage: val });
                          }
                        }}
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
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        onBlur={() => {
                          if (!isValidDecimal(discountInput, { min: 0, max: 100 })) {
                            toast.error("Discount percentage must be a valid number between 0 and 100");
                            setDiscountInput(String(activeQuote.discountPercentage || 0));
                            return;
                          }
                          const val = Number(discountInput);
                          if (val !== Number(activeQuote.discountPercentage)) {
                            handleUpdatePricingRules({ discountPercentage: val });
                          }
                        }}
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
                      Select commercial GST treatment for this quotation. Your Travel Desk does not automatically determine legal GST treatment.
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
        {activeQuote && activeTab === "inclusions" && (() => {
          const tripActivities = (activeQuote as any)?.trip?.tripActivities || costing?.activities || [];
          const includedActivities = tripActivities.filter((a: any) => a.type === "INCLUDED" || a.type === "INCLUSION");
          const notIncludedActivities = tripActivities.filter((a: any) => a.type === "EXCLUDED" || a.type === "OPTIONAL" || a.type === "EXCLUSION");

          return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">Package Inclusions</h3>
                    <p className="text-[11px] text-slate-500 truncate">Services and items covered under this proposal</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddProposalItem(ProposalItemType.INCLUSION)}
                  className="w-full sm:w-auto justify-center h-8 text-xs font-semibold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Inclusion
                </Button>
              </div>

              {inclusions.length === 0 && includedActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No inclusions added yet.</div>
              ) : (
                <div className="space-y-3">
                  {inclusions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">{item.title}</h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">{item.description}</p>
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

                  {/* Included Activities Section */}
                  {includedActivities.length > 0 && (
                    <div className="pt-3 border-t border-emerald-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Included Activities ({includedActivities.length})</span>
                        </h5>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                          Package Inclusion
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {includedActivities.map((act: any) => (
                          <div
                            key={act.id}
                            className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/50 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-semibold text-slate-900 leading-snug break-words">{act.name || act.activityName || act.activity?.name || "Sightseeing Experience"}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 whitespace-nowrap">
                              Included
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exclusions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <X className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">Package Exclusions</h3>
                    <p className="text-[11px] text-slate-500 truncate">Items not included in this package price</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddProposalItem(ProposalItemType.EXCLUSION)}
                  className="w-full sm:w-auto justify-center h-8 text-xs font-semibold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Exclusion
                </Button>
              </div>

              {exclusions.length === 0 && notIncludedActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No exclusions added yet.</div>
              ) : (
                <div className="space-y-3">
                  {exclusions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <X className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">{item.title}</h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words">{item.description}</p>
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

                  {/* Not Included Activities Section */}
                  {notIncludedActivities.length > 0 && (
                    <div className="pt-3 border-t border-rose-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Ticket className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Not Included Activities ({notIncludedActivities.length})</span>
                        </h5>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                          Direct Venue Purchase
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {notIncludedActivities.map((act: any) => (
                          <div
                            key={act.id}
                            className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/50 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 leading-snug break-words">{act.name || act.activityName || act.activity?.name || "Sightseeing Experience"}</span>
                                <p className="text-[10px] text-amber-700">Ticket directly payable at venue</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 whitespace-nowrap">
                              Not Included
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ─── TAB 4: PAYMENT SCHEDULE & MILESTONES (Phase 2C) ─── */}
        {activeQuote && activeTab === "milestones" && (() => {
          const totalAllocated = milestonesForm.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
          const roundedAllocated = Math.round(totalAllocated * 10) / 10;
          const isComplete = Math.abs(totalAllocated - 100) < 0.01;
          const isOver = totalAllocated > 100;
          const isUnder = totalAllocated < 100 && milestonesForm.length > 0;

          return (
            <div className="space-y-6">
              {/* Main Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">Payment Terms & Milestone Schedule</h3>
                      {scheduleSaveStatus === "saving" && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Saving...
                        </Badge>
                      )}
                      {scheduleSaveStatus === "saved" && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          <Check className="h-3 w-3 mr-1 text-emerald-600" />
                          Saved
                        </Badge>
                      )}
                      {scheduleSaveStatus === "unsaved" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          <Clock className="h-3 w-3 mr-1 text-amber-600" />
                          Unsaved changes
                        </Badge>
                      )}
                      {scheduleSaveStatus === "error" && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1 text-rose-600" />
                          Save failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure booking advance, pre-travel clearances, and balance schedules presented to the customer on Quotation V{activeQuote.version}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleManualScheduleSave}
                      disabled={scheduleSaveStatus === "saving" || isReadOnly || isOver || isUnder}
                      className="h-8.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      {scheduleSaveStatus === "saving" ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                        </>
                      ) : scheduleSaveStatus === "error" ? (
                        <>Retry Save</>
                      ) : (
                        <>Save Schedule</>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Templates & Add Milestone Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Templates:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyScheduleTemplate("STANDARD_3_TIER")}
                      disabled={isReadOnly}
                      className="h-7 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Standard (30% / 50% / 20%)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyScheduleTemplate("ADVANCE_BALANCE")}
                      disabled={isReadOnly}
                      className="h-7 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Advance & Balance (50% / 50%)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyScheduleTemplate("FULL_ADVANCE")}
                      disabled={isReadOnly}
                      className="h-7 text-xs font-semibold bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Full Advance (100%)
                    </Button>
                    {milestonesForm.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleClearMilestones}
                        disabled={isReadOnly}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer ml-1"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear Schedule
                      </Button>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={handleOpenAddMilestone}
                    disabled={isReadOnly}
                    className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                  </Button>
                </div>

                {/* Percentage Allocation Health Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  milestonesForm.length === 0
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : isComplete
                    ? "bg-emerald-50/60 border-emerald-200/90 text-emerald-950"
                    : isOver
                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {milestonesForm.length === 0 ? (
                        <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : isComplete ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : isOver ? (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold">
                        {milestonesForm.length === 0
                          ? "No payment milestones configured (Terms-only schedule)"
                          : isComplete
                          ? `Schedule Complete: 100% allocated across ${milestonesForm.length} milestone(s)`
                          : isOver
                          ? `Over-allocated: ${roundedAllocated}% allocated (${Math.round((roundedAllocated - 100) * 10) / 10}% over 100%)`
                          : `Under-allocated: ${roundedAllocated}% of 100% allocated (${Math.round((100 - roundedAllocated) * 10) / 10}% remaining)`}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold">
                      {roundedAllocated}% of 100%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isComplete ? "bg-emerald-500" : isOver ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, totalAllocated))}%` }}
                    />
                  </div>

                  {/* Validation notice */}
                  {(isOver || isUnder) && (
                    <p className="text-[11px] mt-2 font-medium">
                      {isOver
                        ? "The total milestone percentage cannot exceed 100%. Please adjust milestone percentages."
                        : "To persist a complete payment schedule, total percentage must sum to exactly 100%."}
                    </p>
                  )}
                </div>

                {/* Milestones Cards Grid */}
                {milestonesForm.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">No Payment Milestones Configured</h4>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                        Customer proposals will show general payment terms only. Add milestones to present a structured payment timeline.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleApplyScheduleTemplate("STANDARD_3_TIER")}
                        disabled={isReadOnly}
                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Apply Standard Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenAddMilestone}
                        disabled={isReadOnly}
                        className="text-xs font-semibold border-slate-200 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add First Milestone
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {milestonesForm.map((m, index) => (
                      <div
                        key={m.id || `local-milestone-${index}`}
                        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 relative group hover:border-indigo-300 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          {/* Step Badge & Controls */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              Step {index + 1}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {/* Move Up */}
                              <button
                                type="button"
                                onClick={() => handleMoveMilestoneUp(index)}
                                disabled={index === 0 || isReadOnly}
                                title="Move Up"
                                className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer transition-colors"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              {/* Move Down */}
                              <button
                                type="button"
                                onClick={() => handleMoveMilestoneDown(index)}
                                disabled={index === milestonesForm.length - 1 || isReadOnly}
                                title="Move Down"
                                className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer transition-colors"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditMilestoneIdx(index)}
                                disabled={isReadOnly}
                                title="Edit Milestone"
                                className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestoneItem(index)}
                                disabled={isReadOnly}
                                title="Delete Milestone"
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2.5">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{m.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-3">
                              {m.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer: Percentage and Due Date (Preserving Single Final Package Price Invariant) */}
                        <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <Badge variant="outline" className="font-black text-xs text-indigo-700 bg-indigo-50/60 border-indigo-200">
                            {m.percentage}%
                          </Badge>
                          {m.dueDate ? (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              Due: {new Date(m.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Timing upon booking</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Booking Payment Terms Section */}
                <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Payment Terms & Settlement Instructions
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Visible on customer web proposals and PDF exports. Includes bank details, deposit policies, and clearance conditions.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {schedulePaymentTerms.length} / 3000 chars
                    </span>
                  </div>

                  <Textarea
                    value={schedulePaymentTerms}
                    onChange={handlePaymentTermsChange}
                    placeholder="Enter wire transfer bank instructions, credit card policies, cancellation terms, and advance clearance instructions..."
                    rows={4}
                    maxLength={3000}
                    disabled={isReadOnly}
                    className="text-xs bg-white border-slate-200 resize-y rounded-xl leading-relaxed"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── TAB 5: TERMS & POLICIES ─── */}
        {activeQuote && activeTab === "policies" && (
          <form onSubmit={handleSavePolicies} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Proposal Branding & Policy Terms</h3>
                <p className="text-xs text-slate-500">
                  Customize welcome messaging, cancellation policies, and terms displayed to the client.
                </p>
              </div>

              {/* Visible Save Status Badge (Workstream E) */}
              <div className="flex items-center gap-2 shrink-0">
                {policySaveStatus === "saving" && (
                  <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving changes...
                  </span>
                )}
                {policySaveStatus === "saved" && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200">
                    <Check className="h-3.5 w-3.5" /> All changes saved
                  </span>
                )}
                {policySaveStatus === "unsaved" && (
                  <button
                    type="button"
                    onClick={() => executePolicySave(policyForm)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                    title="Click to save now"
                  >
                    Unsaved changes (Save)
                  </button>
                )}
                {policySaveStatus === "error" && (
                  <button
                    type="button"
                    onClick={() => executePolicySave(policyForm)}
                    className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                    title={policySaveError || "Save failed, click to retry"}
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Save failed (Retry)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Proposal Subtitle</label>
                <Input
                  value={policyForm.proposalSubtitle}
                  onChange={(e) => updatePolicyField("proposalSubtitle", e.target.value)}
                  placeholder="e.g. 5 Nights Kerala Honeymoon Retreat"
                  className="text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Customer Welcome Note</label>
                <Textarea
                  value={policyForm.customerMessage}
                  onChange={(e) => updatePolicyField("customerMessage", e.target.value)}
                  placeholder="Warm message greeting the traveler..."
                  rows={2}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Inclusions Introduction</label>
                <Input
                  value={policyForm.inclusionsIntro}
                  onChange={(e) => updatePolicyField("inclusionsIntro", e.target.value)}
                  placeholder="e.g. Your customized holiday package includes:"
                  className="text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Exclusions Introduction</label>
                <Input
                  value={policyForm.exclusionsIntro}
                  onChange={(e) => updatePolicyField("exclusionsIntro", e.target.value)}
                  placeholder="e.g. Please note the following are excluded from this quote:"
                  className="text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Payment Terms</label>
                <Textarea
                  value={policyForm.paymentTerms}
                  onChange={(e) => updatePolicyField("paymentTerms", e.target.value)}
                  placeholder="Deposit requirements, milestone schedules, and bank transfer instructions..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Cancellation Policy</label>
                <Textarea
                  value={policyForm.cancellationPolicy}
                  onChange={(e) => updatePolicyField("cancellationPolicy", e.target.value)}
                  placeholder="Detailed cancellation timeline and refund percentages..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Important Traveler Notes</label>
                <Textarea
                  value={policyForm.importantNotes}
                  onChange={(e) => updatePolicyField("importantNotes", e.target.value)}
                  placeholder="Government ID rules, check-in timings, altitude advisories..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Terms & Conditions</label>
                <Textarea
                  value={policyForm.terms}
                  onChange={(e) => updatePolicyField("terms", e.target.value)}
                  placeholder="Standard agency terms, booking validity, liability limits..."
                  rows={3}
                  className="text-xs bg-slate-50 resize-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700">Privacy Policy</label>
                <Textarea
                  value={policyForm.privacyPolicy}
                  onChange={(e) => updatePolicyField("privacyPolicy", e.target.value)}
                  placeholder="Agency privacy policy and data handling terms..."
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

        {/* ─── ADD / EDIT MILESTONE MODAL (Phase 2C) ─── */}
        <Dialog open={isMilestoneModalOpen} onOpenChange={setIsMilestoneModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveMilestoneModal}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">
                  {editingMilestoneIdx !== null ? "Edit Payment Milestone" : "Add Payment Milestone"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Configure milestone title, payment percentage, due date, and customer instructions.
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const currentAllocatedExcludingSelf = milestonesForm.reduce(
                  (acc, m, idx) => acc + (idx === editingMilestoneIdx ? 0 : (Number(m.percentage) || 0)),
                  0
                );
                const remainingAvailable = Math.max(0, Math.round((100 - currentAllocatedExcludingSelf) * 10) / 10);

                return (
                  <div className="space-y-3.5 mt-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Milestone Title *</label>
                      <Input
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        placeholder="e.g. Booking Deposit, 2nd Installment, Final Balance"
                        className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Percentage (%) *</label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          step="any"
                          value={milestonePct}
                          onChange={(e) => setMilestonePct(e.target.value)}
                          placeholder="e.g. 30"
                          className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                          required
                        />
                        <p className="text-[10px] text-slate-400">
                          Available: <span className="font-semibold text-slate-700">{remainingAvailable}%</span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Due Date (Optional)</label>
                        <Input
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                        />
                        <p className="text-[10px] text-slate-400">Payment deadline</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Description (Optional)</label>
                      <Textarea
                        value={milestoneDesc}
                        onChange={(e) => setMilestoneDesc(e.target.value)}
                        placeholder="e.g. Required upon confirmation to lock hotel vouchers and flight bookings."
                        rows={3}
                        className="text-xs bg-slate-50/50 border-slate-200 resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                );
              })()}

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
                  disabled={isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold"
                >
                  {editingMilestoneIdx !== null ? "Update Milestone" : "Add to Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Read-Only Mode Warning Dialog */}
        <ReadOnlyModeDialog
          open={showReadOnlyDialog}
          onOpenChange={setShowReadOnlyDialog}
          reason={readOnlyReason}
          actionName="Editing or generating quotation proposals"
        />

        {/* Quota Exceeded Dialog */}
        <QuotaExceededDialog
          open={showQuotaDialog}
          onOpenChange={setShowQuotaDialog}
          resourceName={quotaEntityType === "QUOTATION" ? "Quotations" : "Bookings"}
        />

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
