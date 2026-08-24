"use client"

import * as React from "react"
import { useFormik } from "formik"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { manualCostItemSchema } from "@/lib/validation-schemas"
import { CostCategory, CostItem, Supplier } from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import { Plus, Edit, Calculator } from "lucide-react"

interface AddManualCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  suppliers: Supplier[]
  editingItem?: CostItem | null
  onSubmitCost: (data: Omit<CostItem, "id" | "createdAt" | "updatedAt">) => void
  onUpdateCost?: (id: string, updates: Partial<CostItem>) => void
}

const COST_CATEGORIES: CostCategory[] = [
  "Driver",
  "Toll",
  "Parking",
  "Permit",
  "Guide",
  "Meals",
  "Entry Ticket",
  "Transfer",
  "Houseboat",
  "Flight",
  "Train",
  "Other",
]

export function AddManualCostModal({
  open,
  onOpenChange,
  tripId,
  suppliers,
  editingItem,
  onSubmitCost,
  onUpdateCost,
}: AddManualCostModalProps) {
  const formik = useFormik({
    initialValues: {
      category: (editingItem?.category || "Driver") as CostCategory,
      name: editingItem?.name || "",
      supplierId: editingItem?.supplierId || "",
      supplierName: editingItem?.supplierName || "",
      description: editingItem?.description || "",
      quantity: editingItem?.quantity || 1,
      unit: editingItem?.unit || "Unit",
      duration: editingItem?.duration || 1,
      unitCost: editingItem?.unitCost || 500,
      dateFrom: editingItem?.dateFrom || "",
      dateTo: editingItem?.dateTo || "",
      notes: editingItem?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: manualCostItemSchema,
    onSubmit: (values) => {
      const selectedSupplier = values.supplierId
        ? suppliers.find((s) => s.id === values.supplierId)
        : undefined

      const dur = Number(values.duration) || 1
      const qty = Number(values.quantity) || 1
      const uCost = Number(values.unitCost) || 0
      const totalCost = Math.round(qty * dur * uCost * 100) / 100

      if (editingItem && onUpdateCost) {
        onUpdateCost(editingItem.id, {
          category: values.category,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          supplierId: values.supplierId || undefined,
          supplierName: selectedSupplier?.name || values.supplierName.trim() || undefined,
          quantity: qty,
          duration: dur,
          unit: values.unit.trim() || undefined,
          unitCost: uCost,
          totalCost,
          dateFrom: values.dateFrom || undefined,
          dateTo: values.dateTo || undefined,
          notes: values.notes.trim() || undefined,
        })
      } else {
        onSubmitCost({
          tripId,
          category: values.category,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          supplierId: values.supplierId || undefined,
          supplierName: selectedSupplier?.name || values.supplierName.trim() || undefined,
          serviceType: "Manual",
          quantity: qty,
          duration: dur,
          unit: values.unit.trim() || undefined,
          unitCost: uCost,
          totalCost,
          currency: "INR",
          sourceType: "Manual",
          dateFrom: values.dateFrom || undefined,
          dateTo: values.dateTo || undefined,
          notes: values.notes.trim() || undefined,
        })
      }

      formik.resetForm()
      onOpenChange(false)
    },
  })

  // Live total preview
  const liveTotal = React.useMemo(() => {
    const q = Number(formik.values.quantity) || 0
    const d = Number(formik.values.duration) || 1
    const u = Number(formik.values.unitCost) || 0
    return Math.round(q * (d > 0 ? d : 1) * u * 100) / 100
  }, [formik.values.quantity, formik.values.duration, formik.values.unitCost])

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              {editingItem ? <Edit className="h-4 w-4 text-indigo-600" /> : <Plus className="h-4 w-4 text-indigo-600" />}
              <span>{editingItem ? "Edit Manual Cost Line" : "Add Manual Supplier Cost"}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Record miscellaneous costs such as driver allowances, highway tolls, parking fees, or entry tickets.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs mt-2">
            {/* Category & Supplier */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Category *</label>
                <Select
                  value={formik.values.category}
                  onValueChange={(val) => formik.setFieldValue("category", val as CostCategory)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {COST_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Supplier Partner</label>
                <Select
                  value={formik.values.supplierId}
                  onValueChange={(val) => formik.setFieldValue("supplierId", val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Direct / None" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="" className="text-xs">None / Direct</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id} className="text-xs">
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Service / Description *</label>
              <Input
                placeholder="e.g. Driver Daily Bata, Fastag Tolls, Tea Museum Entry..."
                {...formik.getFieldProps("name")}
                className={`h-9 text-xs bg-slate-50/50 border-slate-200 ${
                  getFieldError("name") ? "border-red-500" : ""
                }`}
              />
              {getFieldError("name") && (
                <p className="text-[10px] text-red-500 font-semibold">{getFieldError("name")}</p>
              )}
            </div>

            {/* Calculation Formula: Unit Cost × Quantity × Duration */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Unit Cost (₹) *</label>
                <Input
                  type="number"
                  min={0}
                  {...formik.getFieldProps("unitCost")}
                  className={`h-9 text-xs font-bold bg-slate-50/50 border-slate-200 ${
                    getFieldError("unitCost") ? "border-red-500" : ""
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Quantity *</label>
                <Input
                  type="number"
                  min={1}
                  {...formik.getFieldProps("quantity")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Duration / Days</label>
                <Input
                  type="number"
                  min={1}
                  {...formik.getFieldProps("duration")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            {/* Unit Label */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Unit Label</label>
                <Input
                  placeholder="e.g. Day, Person, Room, Lump Sum"
                  {...formik.getFieldProps("unit")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Date</label>
                <Input
                  type="date"
                  {...formik.getFieldProps("dateFrom")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            {/* Live Computed Total Display */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-indigo-600" />
                Computed Line Total:
              </span>
              <span className="text-sm font-extrabold text-indigo-900">
                {formatCurrency(liveTotal)}
              </span>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Internal Notes</label>
              <Textarea
                placeholder="Optional supplier payment terms or booking reference..."
                {...formik.getFieldProps("notes")}
                className="min-h-[60px] text-xs bg-slate-50/50 border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-white border-slate-200 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 shadow-xs"
            >
              {editingItem ? "Save Changes" : "Add Cost Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
