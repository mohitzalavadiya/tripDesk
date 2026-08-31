"use client";

import * as React from "react";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UnifiedTransactionItem } from "@/lib/services/finance-service";
import { TransactionType } from "@/lib/validation/finance-schema";
import { formatCurrency } from "@/lib/costing-engine";

interface FinanceTransactionTableProps {
  transactions: UnifiedTransactionItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  loading?: boolean;
  onPageChange: (page: number) => void;
  onTypeChange: (type: TransactionType) => void;
  onSearchChange: (search: string) => void;
  selectedType: TransactionType;
  search: string;
}

export function FinanceTransactionTable({
  transactions,
  meta,
  loading = false,
  onPageChange,
  onTypeChange,
  onSearchChange,
  selectedType,
  search,
}: FinanceTransactionTableProps) {
  const getBadgeForType = (type: UnifiedTransactionItem["type"]) => {
    switch (type) {
      case "CUSTOMER_PAYMENT":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
            <ArrowDownLeft className="h-3 w-3" /> Customer Payment
          </Badge>
        );
      case "CUSTOMER_REFUND":
        return (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <RotateCcw className="h-3 w-3" /> Refund
          </Badge>
        );
      case "SUPPLIER_PAYMENT":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] gap-1">
            <ArrowUpRight className="h-3 w-3" /> Supplier Disbursement
          </Badge>
        );
      case "EXPENSE":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] gap-1">
            <Receipt className="h-3 w-3" /> Expense
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Unified Transaction Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Complete chronological audit trail of all customer collections, refunds, disbursements, and expenses.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search number, party, ref..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={selectedType}
              onValueChange={(val) => onTypeChange(val as TransactionType)}
            >
              <SelectTrigger className="h-8 text-xs w-44 bg-background">
                <SelectValue placeholder="All Transaction Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Transactions</SelectItem>
                <SelectItem value="CUSTOMER_PAYMENT">Customer Payments</SelectItem>
                <SelectItem value="CUSTOMER_REFUND">Refunds</SelectItem>
                <SelectItem value="SUPPLIER_PAYMENT">Supplier Disbursements</SelectItem>
                <SelectItem value="EXPENSE">Operational Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Txn #</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Party / Description</TableHead>
                <TableHead className="text-xs font-semibold">Booking / Trip</TableHead>
                <TableHead className="text-xs font-semibold">Method / Ref</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-10 text-center text-xs text-muted-foreground">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                    No transactions match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => {
                  const isIncoming = txn.type === "CUSTOMER_PAYMENT";
                  return (
                    <TableRow key={txn.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium">
                        {txn.transactionNumber}
                      </TableCell>
                      <TableCell>{getBadgeForType(txn.type)}</TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">
                          {txn.partyName}
                        </div>
                        {txn.description && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {txn.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {txn.bookingNumber ? (
                          <div>
                            <span className="text-xs font-semibold text-primary">
                              {txn.bookingNumber}
                            </span>
                            {txn.tripTitle && (
                              <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                {txn.tripTitle}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">
                          {txn.paymentMethod || "Direct"}
                        </div>
                        {txn.referenceNumber && (
                          <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                            Ref: {txn.referenceNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell
                        className={`text-xs font-bold text-right ${
                          isIncoming
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isIncoming ? "+" : "−"} {formatCurrency(txn.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <div>
            Showing {transactions.length} of {meta.total} transactions
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              Page {meta.page} of {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPageChange(meta.page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
