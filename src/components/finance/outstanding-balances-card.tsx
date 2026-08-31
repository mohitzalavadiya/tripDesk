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
}

export function OutstandingBalancesCard({
  customerReceivables,
  supplierPayables,
  onRecordCustomerPayment,
  onRecordSupplierPayment,
}: OutstandingBalancesCardProps) {
  const [activeTab, setActiveTab] = React.useState<"customers" | "suppliers">("customers");

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          Outstanding Balances & Collections
        </CardTitle>
        <CardDescription className="text-xs">
          Track receivables from travelers and payables owed to service vendors.
        </CardDescription>
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                Total Customer Outstanding: {formatCurrency(customerReceivables.totalOutstanding)}
              </span>
              {customerReceivables.overdueCount > 0 && (
                <Badge variant="destructive" className="text-[11px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
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
                    className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {item.bookingNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {item.paymentStatus}
                        </Badge>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            Travel Started / Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground">
                        {item.customerName}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {item.customerPhone}
                        </span>
                        <span>•</span>
                        <span>{item.tripTitle}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1.5">
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(item.outstandingAmount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        of {formatCurrency(item.totalAmount)}
                      </div>
                      {onRecordCustomerPayment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
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
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
              <span className="font-semibold text-purple-800 dark:text-purple-300">
                Total Supplier Outstanding: {formatCurrency(supplierPayables.totalOutstanding)}
              </span>
              {supplierPayables.overdueCount > 0 && (
                <Badge variant="destructive" className="text-[11px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
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
                    className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {item.payableNumber}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.serviceType}
                        </Badge>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {item.supplierName}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.description}
                        {item.dueDate && (
                          <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" /> Due: {new Date(item.dueDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1.5">
                      <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(item.outstandingAmount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Paid: {formatCurrency(item.paidAmount)} / {formatCurrency(item.actualAmount)}
                      </div>
                      {onRecordSupplierPayment && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => onRecordSupplierPayment(item.payableId)}
                        >
                          <Plus className="h-3 w-3" />
                          Pay Vendor
                        </Button>
                      )}
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
