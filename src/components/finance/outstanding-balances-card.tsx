"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Clock,
  Phone,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CustomerOutstandingItem,
  SupplierOutstandingItem,
} from "@/lib/services/finance-service";
import { formatCurrency } from "@/lib/costing-engine";
import { Pencil } from "lucide-react";

interface OutstandingBalancesCardProps {
  customerReceivables: {
    totalOutstanding: number;
    overdueCount: number;
    overdueAmount: number;
    items: CustomerOutstandingItem[];
  };
  supplierPayables: {
    totalOutstanding: number;
    overdueCount: number;
    overdueAmount: number;
    items: SupplierOutstandingItem[];
  };
  onRecordCustomerPayment?: (bookingId: string) => void;
  onRecordSupplierPayment?: (payableId: string) => void;
  onRecordPayable?: () => void;
  onEditPayable?: (payableId: string) => void;
}

export function OutstandingBalancesCard({
  customerReceivables,
  supplierPayables,
  onRecordCustomerPayment,
  onRecordSupplierPayment,
  onRecordPayable,
  onEditPayable,
}: OutstandingBalancesCardProps) {
  const [activeTab, setActiveTab] = React.useState<"customers" | "suppliers">("customers");

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Outstanding Balances & Collections
            </CardTitle>
            <CardDescription className="text-xs">
              Track receivables from travelers and payables owed to service vendors.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex rounded-lg bg-muted p-1 w-full sm:w-80">
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${
              activeTab === "customers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Customer Dues ({customerReceivables.items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${
              activeTab === "suppliers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Supplier Payables ({supplierPayables.items.length})
          </button>
        </div>

        {/* CUSTOMERS TAB */}
        {activeTab === "customers" && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                Total Customer Outstanding: {formatCurrency(customerReceivables.totalOutstanding)}
              </span>
              {customerReceivables.overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] sm:text-[11px] gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {customerReceivables.overdueCount} Overdue ({formatCurrency(customerReceivables.overdueAmount)})
                </Badge>
              )}
            </div>

            {customerReceivables.items.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                🎉 No pending customer balances! All active bookings are fully paid.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {customerReceivables.items.map((item) => (
                  <div
                    key={item.bookingId}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground shrink-0">
                          {item.bookingNumber}
                        </span>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase px-1.5 py-0 shrink-0">
                          {item.paymentStatus}
                        </Badge>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
                            Travel Started / Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground truncate">
                        {item.customerName}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                        {item.customerPhone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="h-3 w-3 shrink-0" /> {item.customerPhone}
                          </span>
                        )}
                        {item.customerPhone && item.tripTitle && <span>•</span>}
                        <span className="truncate">{item.tripTitle}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between sm:block">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(item.outstandingAmount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          of {formatCurrency(item.totalAmount)}
                        </div>
                      </div>
                      {onRecordCustomerPayment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-3 gap-1 self-end sm:self-auto shrink-0 cursor-pointer"
                          onClick={() => onRecordCustomerPayment(item.bookingId)}
                        >
                          <Plus className="h-3 w-3" />
                          Collect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {activeTab === "suppliers" && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
              <span className="font-semibold text-purple-800 dark:text-purple-300">
                Total Supplier Outstanding: {formatCurrency(supplierPayables.totalOutstanding)}
              </span>
              {supplierPayables.overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] sm:text-[11px] gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {supplierPayables.overdueCount} Past Due Date
                </Badge>
              )}
            </div>

            {supplierPayables.items.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                🎉 No pending supplier payables! All vendor disbursements are up to date.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {supplierPayables.items.map((item) => (
                  <div
                    key={item.payableId}
                    className="p-3 flex flex-col justify-between gap-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground shrink-0">
                          {item.payableNumber}
                        </span>
                        <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
                          {item.serviceType}
                        </Badge>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground flex items-center gap-1.5 truncate">
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                        <span className="truncate">{item.description}</span>
                        {item.dueDate && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3 shrink-0" /> Due: {new Date(item.dueDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between sm:block">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(item.outstandingAmount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Paid: {formatCurrency(item.paidAmount)} / {formatCurrency(item.actualAmount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {onEditPayable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 gap-1 cursor-pointer"
                            onClick={() => onEditPayable(item.payableId)}
                            title="Edit Payable"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        {onRecordSupplierPayment && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
                            onClick={() => onRecordSupplierPayment(item.payableId)}
                          >
                            <Plus className="h-3 w-3" />
                            Pay Vendor
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
