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
} from "@/lib/api-client";
import {
  QuotationStatus,
  QuotationItem,
  ProposalItemType,
  QuotationProposalItem,
  QuotationPaymentMilestone,
  QuotationPackageOption,
} from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { QuotationStatusBadge } from "@/app/(dashboard)/quotations/page";

type ActiveTabType = "pricing" | "packages" | "inclusions" | "milestones" | "policies";

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

  // Package Option Modal states
  const [isPackageModalOpen, setIsPackageModalOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState<QuotationPackageOption | null>(null);
  const [pkgName, setPkgName] = React.useState("");
  const [pkgSubtitle, setPkgSubtitle] = React.useState("");
  const [pkgDescription, setPkgDescription] = React.useState("");
  const [pkgIsRecommended, setPkgIsRecommended] = React.useState(false);
  const [pkgSubtotal, setPkgSubtotal] = React.useState("");
  const [pkgMarkupPct, setPkgMarkupPct] = React.useState("10");
  const [pkgDiscountPct, setPkgDiscountPct] = React.useState("0");
  const [pkgTaxPct, setPkgTaxPct] = React.useState("5");
  const [pkgFinalAmount, setPkgFinalAmount] = React.useState("");
  const [pkgHotelNotes, setPkgHotelNotes] = React.useState("");
  const [pkgVehicleNotes, setPkgVehicleNotes] = React.useState("");
  const [pkgActivityNotes, setPkgActivityNotes] = React.useState("");
  const [pkgInclusionsText, setPkgInclusionsText] = React.useState("");
  const [pkgExclusionsText, setPkgExclusionsText] = React.useState("");
  const [packageSaving, setPackageSaving] = React.useState(false);

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

  React.useEffect(() => {
    if (tripId) fetchTripQuotationData();
  }, [tripId, fetchTripQuotationData]);

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
        taxPercentage: activeQuote ? Number(activeQuote.taxPercentage) : 5,
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

  // Update Pricing Rules
  const handleUpdatePricingRules = async (rules: {
    markupPercentage?: number;
    discountPercentage?: number;
    taxPercentage?: number;
  }) => {
    if (!activeQuote || isReadOnly) return;
    try {
      setUpdatingPricing(true);
      const res = await quotationClient.updateQuotation(activeQuote.id, rules);
      if (res.success && res.data) {
        toast.success("Pricing recalculated successfully.");
        setQuotations((prev) => prev.map((q) => (q.id === activeQuote.id ? res.data! : q)));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pricing.");
    } finally {
      setUpdatingPricing(false);
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
      const uPrice = Number(itemUnitPrice) || 0;
      const cPrice = Number(itemCostPrice) || uPrice * qty;

      const res = await quotationClient.createQuotationItem(activeQuote.id, {
        type: itemType,
        name: itemName,
        description: itemDescription || undefined,
        quantity: qty,
        unitPrice: uPrice,
        costPrice: cPrice,
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
    setItemUnitPrice(String(item.unitPrice));
    setItemCostPrice(String(item.costPrice));
    setIsEditItemOpen(true);
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !editingItem || !itemName || isReadOnly) return;

    try {
      setItemSaving(true);
      const qty = Number(itemQuantity) || 1;
      const uPrice = Number(itemUnitPrice) || 0;
      const cPrice = Number(itemCostPrice) || uPrice * qty;

      const res = await quotationClient.updateQuotationItem(activeQuote.id, editingItem.id, {
        type: itemType,
        name: itemName,
        description: itemDescription || null,
        quantity: qty,
        unitPrice: uPrice,
        costPrice: cPrice,
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

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!activeQuote || isReadOnly) return;
    if (!confirm(`Delete "${name}" from this quotation?`)) return;

    try {
      const res = await quotationClient.deleteQuotationItem(activeQuote.id, itemId);
      if (res.success) {
        toast.success("Item removed.");
        await fetchTripQuotationData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item.");
    }
  };

  // Package Option Handlers
  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setPkgName("");
    setPkgSubtitle("");
    setPkgDescription("");
    setPkgIsRecommended(false);
    setPkgSubtotal(activeQuote ? String(activeQuote.subtotal) : "30000");
    setPkgMarkupPct(activeQuote ? String(activeQuote.markupPercentage) : "10");
    setPkgDiscountPct("0");
    setPkgTaxPct("5");
    setPkgFinalAmount("");
    setPkgHotelNotes("");
    setPkgVehicleNotes("");
    setPkgActivityNotes("");
    setPkgInclusionsText("");
    setPkgExclusionsText("");
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: QuotationPackageOption) => {
    setEditingPackage(pkg);
    setPkgName(pkg.name);
    setPkgSubtitle(pkg.subtitle || "");
    setPkgDescription(pkg.description || "");
    setPkgIsRecommended(pkg.isRecommended);
    setPkgSubtotal(String(pkg.subtotal));
    setPkgMarkupPct(String(pkg.markupPercentage));
    setPkgDiscountPct(String(pkg.discountPercentage));
    setPkgTaxPct(String(pkg.taxPercentage));
    setPkgFinalAmount(String(pkg.finalAmount));
    setPkgHotelNotes(pkg.hotelNotes || "");
    setPkgVehicleNotes(pkg.vehicleNotes || "");
    setPkgActivityNotes(pkg.activityNotes || "");
    setPkgInclusionsText(pkg.inclusions.join("\n"));
    setPkgExclusionsText(pkg.exclusions.join("\n"));
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote || !pkgName || isReadOnly) return;

    try {
      setPackageSaving(true);
      const sub = Number(pkgSubtotal) || 0;
      const mkp = Number(pkgMarkupPct) || 0;
      const dsc = Number(pkgDiscountPct) || 0;
      const tax = Number(pkgTaxPct) || 0;
      const fin = pkgFinalAmount ? Number(pkgFinalAmount) : undefined;

      const incs = pkgInclusionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const excs = pkgExclusionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingPackage) {
        await quotationClient.updatePackageOption(activeQuote.id, editingPackage.id, {
          name: pkgName,
          subtitle: pkgSubtitle || null,
          description: pkgDescription || null,
          isRecommended: pkgIsRecommended,
          subtotal: sub,
          markupPercentage: mkp,
          discountPercentage: dsc,
          taxPercentage: tax,
          finalAmount: fin,
          hotelNotes: pkgHotelNotes || null,
          vehicleNotes: pkgVehicleNotes || null,
          activityNotes: pkgActivityNotes || null,
          inclusions: incs,
          exclusions: excs,
        });
        toast.success("Package option updated.");
      } else {
        await quotationClient.createPackageOption(activeQuote.id, {
          name: pkgName,
          subtitle: pkgSubtitle || null,
          description: pkgDescription || null,
          isRecommended: pkgIsRecommended,
          subtotal: sub,
          markupPercentage: mkp,
          discountPercentage: dsc,
          taxPercentage: tax,
          finalAmount: fin,
          hotelNotes: pkgHotelNotes || null,
          vehicleNotes: pkgVehicleNotes || null,
          activityNotes: pkgActivityNotes || null,
          inclusions: incs,
          exclusions: excs,
        });
        toast.success("Package option created.");
      }
      setIsPackageModalOpen(false);
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save package option.");
    } finally {
      setPackageSaving(false);
    }
  };

  const handleDeletePackage = async (optionId: string, name: string) => {
    if (!activeQuote || isReadOnly) return;
    if (!confirm(`Delete package tier "${name}"?`)) return;

    try {
      await quotationClient.deletePackageOption(activeQuote.id, optionId);
      toast.success("Package tier deleted.");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete package tier.");
    }
  };

  const handleSelectPackageOption = async (optionId: string) => {
    if (!activeQuote || isReadOnly) return;
    try {
      await quotationClient.selectPackageOption(activeQuote.id, optionId);
      toast.success("Selected package tier updated.");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to select package option.");
    }
  };

  const handleGenerateDefaultPackageTiers = async () => {
    if (!activeQuote || isReadOnly) return;
    try {
      await quotationClient.generateDefaultPackageTiers(activeQuote.id);
      toast.success("3 Standard package tiers generated (Standard, Deluxe, Luxury)!");
      await fetchTripQuotationData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate default package tiers.");
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
  const packageOptions = activeQuote?.packageOptions || [];

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
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200 w-36 font-semibold">
                  <History className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Select Version" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id} className="text-xs">
                      v{q.version} • {formatCurrency(Number(q.finalAmount))} ({q.status})
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
              onClick={() => setActiveTab("packages")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "packages"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Package className="h-4 w-4" />
              Package Tiers & Options ({packageOptions.length})
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
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Cost Price</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-slate-600">Selling Price</TableHead>
                        <TableHead className="py-2.5 px-4 text-right font-bold text-slate-600">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeQuote.items.map((item) => (
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
                          <TableCell className="py-3 px-4 text-slate-500 font-mono">
                            {formatCurrency(Number(item.costPrice))}
                          </TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-slate-900">
                            {formatCurrency(Number(item.totalPrice))}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                disabled={isReadOnly}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                disabled={isReadOnly}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Right Col: Commercial Pricing & Margins Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-indigo-600" />
                    <span>Pricing Breakdown</span>
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {activeQuote.currency}
                  </Badge>
                </div>

                {/* Selected Package Option notice */}
                {activeQuote.selectedPackageOption && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Active Package Tier</span>
                      {activeQuote.selectedPackageOption.isRecommended && (
                        <Badge className="bg-amber-500 text-white text-[9px] h-4">Recommended</Badge>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{activeQuote.selectedPackageOption.name}</div>
                    <div className="text-xs font-black text-indigo-700">{formatCurrency(Number(activeQuote.selectedPackageOption.finalAmount))}</div>
                  </div>
                )}

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

                {/* Pricing Fields */}
                <div className="space-y-3 pt-2 text-xs border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Supplier Cost:</span>
                    <strong className="text-slate-900">{formatCurrency(Number(activeQuote.subtotal))}</strong>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Agency Markup:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        defaultValue={Number(activeQuote.markupPercentage)}
                        onBlur={(e) => handleUpdatePricingRules({ markupPercentage: Number(e.target.value) || 0 })}
                        className="h-7 w-16 text-right text-xs bg-slate-50 font-bold"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                      <strong className="text-slate-900 min-w-[70px] text-right">
                        +{formatCurrency(Number(activeQuote.markupAmount))}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Special Discount:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={100}
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

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Tax / GST:</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={Number(activeQuote.taxPercentage)}
                        onBlur={(e) => handleUpdatePricingRules({ taxPercentage: Number(e.target.value) || 0 })}
                        className="h-7 w-16 text-right text-xs bg-slate-50 font-bold"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                      <strong className="text-slate-900 min-w-[70px] text-right">
                        +{formatCurrency(Number(activeQuote.taxAmount))}
                      </strong>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Customer Price:</span>
                    <span className="font-black text-indigo-600 text-xl">
                      {formatCurrency(Number(activeQuote.finalAmount))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: PACKAGE TIERS & OPTIONS ─── */}
        {activeQuote && activeTab === "packages" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Tiered Proposal Packages (Standard / Deluxe / Luxury)</h3>
                <p className="text-xs text-slate-500">
                  Offer 2–3 tiered packages with independent hotel categories, vehicle types, inclusions and selling prices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDefaultPackageTiers}
                  className="h-8.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border-slate-200"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                  Auto-Generate 3 Tiers
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAddPackage}
                  className="h-8.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Package Tier
                </Button>
              </div>
            </div>

            {packageOptions.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Package className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">No package options created for this proposal yet.</p>
                <Button size="sm" onClick={handleGenerateDefaultPackageTiers} className="text-xs">
                  Generate Standard, Deluxe & Luxury Tiers
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packageOptions.map((opt) => {
                  const isSelected = activeQuote.selectedPackageOptionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 relative ${
                        opt.isRecommended
                          ? "bg-gradient-to-b from-indigo-50/50 to-white border-indigo-300 shadow-md ring-2 ring-indigo-500/20"
                          : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                      }`}
                    >
                      {/* Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {opt.isRecommended && (
                            <Badge className="bg-indigo-600 text-white text-[10px] font-bold h-5 px-2 gap-1 rounded-md shadow-2xs">
                              <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                              Recommended
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold h-5 px-2 rounded-md">
                              Active Tier
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditPackage(opt)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(opt.id, opt.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Package Header */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-slate-900 text-base">{opt.name}</h4>
                        {opt.subtitle && <p className="text-xs text-indigo-700 font-semibold">{opt.subtitle}</p>}
                        {opt.description && <p className="text-[11px] text-slate-500 leading-relaxed">{opt.description}</p>}
                      </div>

                      {/* Price Section */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Selling Price</span>
                        <div className="text-2xl font-black text-indigo-600 tracking-tight">
                          {formatCurrency(Number(opt.finalAmount))}
                        </div>
                      </div>

                      {/* Highlights */}
                      <div className="space-y-2 text-xs">
                        {opt.hotelNotes && (
                          <div className="flex items-start gap-2 text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{opt.hotelNotes}</span>
                          </div>
                        )}
                        {opt.vehicleNotes && (
                          <div className="flex items-start gap-2 text-slate-700">
                            <Car className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{opt.vehicleNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Inclusions */}
                      {opt.inclusions.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Inclusions</span>
                          <ul className="space-y-1 text-[11px]">
                            {opt.inclusions.map((inc, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-slate-700">
                                <Check className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="leading-tight">{inc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Select Tier Action */}
                      <div className="pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant={isSelected ? "outline" : "default"}
                          onClick={() => handleSelectPackageOption(opt.id)}
                          className={`w-full text-xs font-bold h-8.5 rounded-xl cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {isSelected ? "Active Default Tier" : "Set as Active Tier"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  Configure line item description, quantity, and pricing.
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Number(e.target.value) || 1)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Selling Unit Price (₹)</label>
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
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Base Cost Price (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    value={itemCostPrice}
                    onChange={(e) => setItemCostPrice(e.target.value)}
                    placeholder="Supplier rate or net cost"
                    className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                  />
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

        {/* ─── ADD / EDIT PACKAGE OPTION MODAL ─── */}
        <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-3xl max-w-xl p-6 shadow-2xl">
            <form onSubmit={handleSavePackage}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base">
                  {editingPackage ? "Edit Package Tier Option" : "Add Package Tier Option"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Configure package option name, subtitle, pricing breakdown, hotel notes, and inclusions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Package Name *</label>
                    <Input
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      placeholder="e.g. Deluxe (4-Star)"
                      className="h-9 text-xs bg-slate-50/50"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subtitle / Tagline</label>
                    <Input
                      value={pkgSubtitle}
                      onChange={(e) => setPkgSubtitle(e.target.value)}
                      placeholder="e.g. Premium stays & upgraded SUV"
                      className="h-9 text-xs bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pkgIsRecommended"
                    checked={pkgIsRecommended}
                    onChange={(e) => setPkgIsRecommended(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded-sm"
                  />
                  <label htmlFor="pkgIsRecommended" className="font-bold text-slate-700 text-xs cursor-pointer">
                    Mark as &ldquo;Recommended Package&rdquo; for this proposal
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                  <Textarea
                    value={pkgDescription}
                    onChange={(e) => setPkgDescription(e.target.value)}
                    placeholder="Short overview of what makes this tier special..."
                    rows={2}
                    className="text-xs bg-slate-50/50 resize-none"
                  />
                </div>

                {/* Financials Grid */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Pricing Configuration</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Base Subtotal (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        value={pkgSubtotal}
                        onChange={(e) => setPkgSubtotal(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Markup (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        value={pkgMarkupPct}
                        onChange={(e) => setPkgMarkupPct(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Discount (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pkgDiscountPct}
                        onChange={(e) => setPkgDiscountPct(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tax (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pkgTaxPct}
                        onChange={(e) => setPkgTaxPct(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Exact Selling Price Override (₹) — <span className="font-normal text-slate-400">Leave blank to auto-calculate</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={pkgFinalAmount}
                      onChange={(e) => setPkgFinalAmount(e.target.value)}
                      placeholder="Auto calculated if empty"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Inventory / Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hotel Specification</label>
                    <Input
                      value={pkgHotelNotes}
                      onChange={(e) => setPkgHotelNotes(e.target.value)}
                      placeholder="e.g. 4-Star Boutique Resorts (Lake View)"
                      className="h-8 text-xs bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Specification</label>
                    <Input
                      value={pkgVehicleNotes}
                      onChange={(e) => setPkgVehicleNotes(e.target.value)}
                      placeholder="e.g. Dedicated AC Innova SUV"
                      className="h-8 text-xs bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Inclusions (One per line)</label>
                    <Textarea
                      value={pkgInclusionsText}
                      onChange={(e) => setPkgInclusionsText(e.target.value)}
                      placeholder="Daily Buffet Breakfast&#10;Dedicated AC Innova&#10;Entry tickets included"
                      rows={3}
                      className="text-xs bg-slate-50/50 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Exclusions (One per line)</label>
                    <Textarea
                      value={pkgExclusionsText}
                      onChange={(e) => setPkgExclusionsText(e.target.value)}
                      placeholder="Flight Tickets&#10;Lunch&#10;Personal Expenses"
                      rows={3}
                      className="text-xs bg-slate-50/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={packageSaving || isReadOnly}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-semibold"
                >
                  {packageSaving ? "Saving..." : "Save Package Tier"}
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
      </div>
    </div>
  );
}
