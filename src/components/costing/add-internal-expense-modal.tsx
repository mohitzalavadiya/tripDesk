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
import { internalExpenseSchema } from "@/lib/validation-schemas"
import { InternalExpense, InternalExpenseCategory } from "@/types"
import { formatCurrency } from "@/lib/costing-engine"
import { Layers, Plus, Edit } from "lucide-react"

interface AddInternalExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  editingExpense?: InternalExpense | null
  onSubmitExpense: (data: Omit<InternalExpense, "id" | "createdAt" | "updatedAt">) => void
  onUpdateExpense?: (id: string, updates: Partial<InternalExpense>) => void
}

const EXPENSE_CATEGORIES: InternalExpenseCategory[] = [
  "Payment Gateway Fee",
  "Sales Commission",
  "Agent Commission",
  "Marketing Expense",
  "Office Expense",
  "Other",
]

export function AddInternalExpenseModal({
  open,
  onOpenChange,
  tripId,
  editingExpense,
  onSubmitExpense,
  onUpdateExpense,
}: AddInternalExpenseModalProps) {
  const formik = useFormik({
    initialValues: {
      category: (editingExpense?.category || "Payment Gateway Fee") as InternalExpenseCategory,
      name: editingExpense?.name || "",
      amount: editingExpense?.amount || 500,
      currency: editingExpense?.currency || "INR",
      date: editingExpense?.date || "",
      notes: editingExpense?.notes || "",
    },
    enableReinitialize: true,
    validationSchema: internalExpenseSchema,
    onSubmit: (values) => {
      const amt = Number(values.amount) || 0

      if (editingExpense && onUpdateExpense) {
        onUpdateExpense(editingExpense.id, {
          category: values.category,
          name: values.name.trim(),
          amount: amt,
          date: values.date || undefined,
          notes: values.notes.trim() || undefined,
        })
      } else {
        onSubmitExpense({
          tripId,
          category: values.category,
          name: values.name.trim(),
          amount: amt,
          currency: values.currency,
          date: values.date || undefined,
          notes: values.notes.trim() || undefined,
        })
      }

      formik.resetForm()
      onOpenChange(false)
    },
  })

  const getFieldError = (field: string) => {
    const touched = formik.touched[field as keyof typeof formik.touched]
    const error = formik.errors[field as keyof typeof formik.errors]
    return touched && error ? (error as string) : undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6">
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <span>{editingExpense ? "Edit Internal Expense" : "Add Agency Internal Expense"}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Internal overheads such as payment gateway fees and sales commissions are added to Total Cost for profit tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs mt-2">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Expense Category *</label>
              <Select
                value={formik.values.category}
                onValueChange={(val) => formik.setFieldValue("category", val as InternalExpenseCategory)}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Description / Name *</label>
              <Input
                placeholder="e.g. Razorpay 2% Gateway Surcharge, Sales Booking Bonus..."
                {...formik.getFieldProps("name")}
                className={`h-9 text-xs bg-slate-50/50 border-slate-200 ${
                  getFieldError("name") ? "border-red-500" : ""
                }`}
              />
              {getFieldError("name") && (
                <p className="text-[10px] text-red-500 font-semibold">{getFieldError("name")}</p>
              )}
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Amount (₹) *</label>
                <Input
                  type="number"
                  min={0}
                  {...formik.getFieldProps("amount")}
                  className={`h-9 text-xs font-bold bg-slate-50/50 border-slate-200 ${
                    getFieldError("amount") ? "border-red-500" : ""
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Date</label>
                <Input
                  type="date"
                  {...formik.getFieldProps("date")}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">Internal Notes</label>
              <Textarea
                placeholder="Optional internal justification or accounting code..."
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-5 shadow-xs"
            >
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
