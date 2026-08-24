"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Quotation,
  QuotationSection,
  QuotationSectionType,
} from "@/types"
import { QuotationRenderer } from "./quotation-renderer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  Share2,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  Clock,
  RotateCcw,
  CalendarCheck,
} from "lucide-react"
import { toast } from "sonner"
import { exportQuotationPDF } from "@/lib/quotation/pdf-service"

interface QuotationEditorProps {
  initialQuotation: Quotation
  onSave: (updated: Quotation) => void
  onShare: () => void
  onPreview: () => void
}

export function QuotationEditor({
  initialQuotation,
  onSave,
  onShare,
  onPreview,
}: QuotationEditorProps) {
  const router = useRouter()
  const [quotation, setQuotation] = React.useState<Quotation>(initialQuotation)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activeAccordion, setActiveAccordion] = React.useState<string>("general")

  // Sync state if prop changes
  React.useEffect(() => {
    setQuotation(initialQuotation)
    setHasUnsavedChanges(false)
  }, [initialQuotation.id])

  const updateField = <K extends keyof Quotation>(key: K, value: Quotation[K]) => {
    setQuotation((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }))
    setHasUnsavedChanges(true)
  }

  // ─── Section Visibility & Ordering ────────────────────────────────────
  const toggleSectionVisibility = (sectionId: string) => {
    const updatedSections = quotation.sections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
    updateField("sections", updatedSections)
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    const sorted = [...quotation.sections].sort((a, b) => a.order - b.order)
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    const temp = sorted[index]
    sorted[index] = sorted[targetIndex]
    sorted[targetIndex] = temp

    // Re-assign 1-based order
    const updated = sorted.map((sec, idx) => ({ ...sec, order: idx + 1 }))
    updateField("sections", updated)
  }

  // ─── Inclusions & Exclusions Management ───────────────────────────────
  const [newInclusion, setNewInclusion] = React.useState("")
  const [newExclusion, setNewExclusion] = React.useState("")

  const addInclusion = () => {
    if (!newInclusion.trim()) return
    updateField("inclusions", [...quotation.inclusions, newInclusion.trim()])
    setNewInclusion("")
  }

  const removeInclusion = (idx: number) => {
    updateField(
      "inclusions",
      quotation.inclusions.filter((_, i) => i !== idx)
    )
  }

  const addExclusion = () => {
    if (!newExclusion.trim()) return
    updateField("exclusions", [...quotation.exclusions, newExclusion.trim()])
    setNewExclusion("")
  }

  const removeExclusion = (idx: number) => {
    updateField(
      "exclusions",
      quotation.exclusions.filter((_, i) => i !== idx)
    )
  }

  // ─── Save Trigger ─────────────────────────────────────────────────────
  const handleSave = () => {
    onSave(quotation)
    setHasUnsavedChanges(false)
  }

  const sortedSections = React.useMemo(() => {
    return [...quotation.sections].sort((a, b) => a.order - b.order)
  }, [quotation.sections])

  return (
    <div className="space-y-6">
      {/* ─── TOP COMMAND BAR ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold font-mono text-sm shrink-0">
            QT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {quotation.quotationNumber}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  quotation.status === "Sent"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : quotation.status === "Ready"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : quotation.status === "Viewed"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {quotation.status}
              </span>
              {hasUnsavedChanges && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <strong className="text-slate-800">{quotation.customerSnapshot.name}</strong> • Selling Price: <strong className="text-indigo-600">₹{quotation.sellingPrice.toLocaleString("en-IN")}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1 text-slate-400" />
            Full Preview
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportQuotationPDF(quotation)}
            className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
            Download PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-9 rounded-xl cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 mr-1 text-indigo-600" />
            Share Link
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/bookings/new?quotationId=${quotation.id}`)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80 text-xs font-bold h-9 rounded-xl cursor-pointer"
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Create Booking
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* ─── 3-COLUMN WORKSPACE: SECTIONS | EDITOR | LIVE PREVIEW ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Section Order & Visibility (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Sections Order
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {sortedSections.filter((s) => s.visible).length} / {sortedSections.length} Visible
            </span>
          </div>

          <div className="space-y-1.5">
            {sortedSections.map((sec, idx) => (
              <div
                key={sec.id}
                className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                  sec.visible
                    ? "bg-slate-50/90 border-slate-200 text-slate-900"
                    : "bg-slate-100/40 border-slate-200/50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleSectionVisibility(sec.id)}
                    className="cursor-pointer text-slate-400 hover:text-slate-700"
                    title={sec.visible ? "Hide Section" : "Show Section"}
                  >
                    {sec.visible ? (
                      <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                  <span className={`font-semibold truncate ${!sec.visible && "line-through"}`}>
                    {sec.title}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveSection(idx, "up")}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sortedSections.length - 1}
                    onClick={() => moveSection(idx, "down")}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: Content Customizer Accordions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Title & Validity */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5 text-xs">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              General Proposal Information
            </h3>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Quotation Title</Label>
              <Input
                value={quotation.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Subtitle / Destination Route</Label>
              <Input
                value={quotation.subtitle || ""}
                onChange={(e) => updateField("subtitle", e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Price Valid Until</Label>
              <Input
                type="date"
                value={quotation.validUntil}
                onChange={(e) => updateField("validUntil", e.target.value)}
                className="h-8.5 text-xs bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Welcome Greeting & Custom Remarks</Label>
              <Textarea
                rows={2}
                value={quotation.customNotes || ""}
                onChange={(e) => updateField("customNotes", e.target.value)}
                placeholder="Personalized welcoming message for customer..."
                className="text-xs bg-slate-50/50 min-h-[60px]"
              />
            </div>
          </div>

          {/* Card 2: Inclusions & Exclusions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5 text-xs">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Inclusions & Exclusions
            </h3>

            {/* Inclusions */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-emerald-900 uppercase">Inclusions Checklist</Label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {quotation.inclusions.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[11px] text-slate-700 truncate">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeInclusion(i)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  placeholder="Add inclusion..."
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInclusion()}
                  className="h-8 text-xs bg-slate-50/50"
                />
                <Button size="sm" type="button" onClick={addInclusion} className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Exclusions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-[10px] font-bold text-rose-900 uppercase">Exclusions Checklist</Label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {quotation.exclusions.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[11px] text-slate-700 truncate">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeExclusion(i)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  placeholder="Add exclusion..."
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                  className="h-8 text-xs bg-slate-50/50"
                />
                <Button size="sm" type="button" onClick={addExclusion} className="h-8 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card 3: Terms & Policies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              Terms, Payment & Cancellation
            </h3>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Payment Terms</Label>
              <Textarea
                rows={2}
                value={quotation.paymentTerms}
                onChange={(e) => updateField("paymentTerms", e.target.value)}
                className="text-xs bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">Cancellation Policy</Label>
              <Textarea
                rows={2}
                value={quotation.cancellationPolicy}
                onChange={(e) => updateField("cancellationPolicy", e.target.value)}
                className="text-xs bg-slate-50/50"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600 uppercase">General Conditions</Label>
              <Textarea
                rows={2}
                value={quotation.termsAndConditions}
                onChange={(e) => updateField("termsAndConditions", e.target.value)}
                className="text-xs bg-slate-50/50"
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Live Preview with Device Switcher (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center gap-1.5">
              <span>Live Preview</span>
            </span>

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewDevice === "desktop" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Desktop View"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewDevice === "tablet" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  previewDevice === "mobile" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Mobile View (390px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Render Frame */}
          <div className="max-h-[80vh] overflow-y-auto pr-1 rounded-2xl">
            <QuotationRenderer quotation={quotation} previewMode={previewDevice} />
          </div>
        </div>

      </div>
    </div>
  )
}
