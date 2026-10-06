"use client";

import * as React from "react";
import {
  TrendingUp,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Wallet,
  Coins,
  Percent,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceKPIOverview } from "@/lib/services/finance-service";
import { formatCurrency } from "@/lib/costing-engine";

interface FinanceKpiGridProps {
  kpis: FinanceKPIOverview;
  loading?: boolean;
}

export function FinanceKpiGrid({ kpis, loading = false }: FinanceKpiGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-muted/40 h-28 border-border" />
        ))}
      </div>
    );
  }

  const isProfitPositive = kpis.grossProfit >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Gross Revenue / Sales */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Total Sales (Gross)
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 ml-1">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-foreground truncate" title={formatCurrency(kpis.totalSales)}>
            {formatCurrency(kpis.totalSales)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <Layers className="h-3 w-3 shrink-0" />
            <span className="truncate">{kpis.totalBookingsCount} total bookings in period</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Amount Received */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Customer Received (Net)
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate" title={formatCurrency(kpis.amountReceived)}>
            {formatCurrency(kpis.amountReceived)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {kpis.customerRefunded > 0
              ? `₹${kpis.customerRefunded.toLocaleString("en-IN")} refunded`
              : "0 refunds processed"}
          </p>
        </CardContent>
      </Card>

      {/* 3. Customer Outstanding */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Customer Outstanding
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 ml-1">
            <Coins className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 truncate" title={formatCurrency(kpis.customerOutstanding)}>
            {formatCurrency(kpis.customerOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {kpis.fullyPaidBookingsCount} paid, {kpis.partiallyPaidBookingsCount} partial, {kpis.unpaidBookingsCount} unpaid
          </p>
        </CardContent>
      </Card>

      {/* 4. Supplier Payable (Cost) */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Supplier Costs / Payable
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 ml-1">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-foreground truncate" title={formatCurrency(kpis.supplierPayable)}>
            {formatCurrency(kpis.supplierPayable)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Paid: {formatCurrency(kpis.supplierPaid)}
          </p>
        </CardContent>
      </Card>

      {/* 5. Supplier Outstanding */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Supplier Outstanding
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 ml-1">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 truncate" title={formatCurrency(kpis.supplierOutstanding)}>
            {formatCurrency(kpis.supplierOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Pending disbursements to vendors
          </p>
        </CardContent>
      </Card>

      {/* 6. Operational Expenses */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Operational Expenses
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1">
            <Receipt className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-foreground truncate" title={formatCurrency(kpis.operationalExpenses)}>
            {formatCurrency(kpis.operationalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Toll, fuel, allowance, meals & misc
          </p>
        </CardContent>
      </Card>

      {/* 7. Gross Profit & Margin */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Gross Profit & Margin
          </CardTitle>
          <div
            className={`p-1.5 sm:p-2 rounded-lg shrink-0 ml-1 ${
              isProfitPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <Percent className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div
            className={`text-xl sm:text-2xl font-bold truncate ${
              isProfitPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
            title={formatCurrency(kpis.grossProfit)}
          >
            {formatCurrency(kpis.grossProfit)}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-1 truncate">
            Margin:{" "}
            <span
              className={
                isProfitPositive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-destructive font-semibold"
              }
            >
              {kpis.profitMarginPercent}%
            </span>
          </p>
        </CardContent>
      </Card>

      {/* 8. Net Cash Flow Position */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="p-3.5 sm:p-5 flex flex-row items-center justify-between pb-1.5 sm:pb-2 min-w-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Net Cash Position
          </CardTitle>
          <div className="p-1.5 sm:p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 ml-1">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 min-w-0">
          <div
            className={`text-xl sm:text-2xl font-bold truncate ${
              kpis.netCashPosition >= 0
                ? "text-teal-600 dark:text-teal-400"
                : "text-destructive"
            }`}
            title={formatCurrency(kpis.netCashPosition)}
          >
            {formatCurrency(kpis.netCashPosition)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Cash Received − Disbursed − Expensed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
