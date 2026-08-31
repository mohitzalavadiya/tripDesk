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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Gross Revenue / Sales */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Sales (Gross)
          </CardTitle>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(kpis.totalSales)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>{kpis.totalBookingsCount} total bookings in period</span>
          </p>
        </CardContent>
      </Card>

      {/* 2. Amount Received */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Customer Received (Net)
          </CardTitle>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(kpis.amountReceived)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.customerRefunded > 0
              ? `₹${kpis.customerRefunded.toLocaleString("en-IN")} refunded`
              : "0 refunds processed"}
          </p>
        </CardContent>
      </Card>

      {/* 3. Customer Outstanding */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Customer Outstanding
          </CardTitle>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Coins className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(kpis.customerOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.fullyPaidBookingsCount} paid, {kpis.partiallyPaidBookingsCount} partial, {kpis.unpaidBookingsCount} unpaid
          </p>
        </CardContent>
      </Card>

      {/* 4. Supplier Payable (Cost) */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Supplier Costs / Payable
          </CardTitle>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(kpis.supplierPayable)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Paid: {formatCurrency(kpis.supplierPaid)}
          </p>
        </CardContent>
      </Card>

      {/* 5. Supplier Outstanding */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Supplier Outstanding
          </CardTitle>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(kpis.supplierOutstanding)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pending disbursements to vendors
          </p>
        </CardContent>
      </Card>

      {/* 6. Operational Expenses */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operational Expenses
          </CardTitle>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Receipt className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(kpis.operationalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Toll, fuel, allowance, meals & misc
          </p>
        </CardContent>
      </Card>

      {/* 7. Gross Profit & Margin */}
      <Card className="border-border bg-card shadow-sm hover:shadow transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Gross Profit & Margin
          </CardTitle>
          <div
            className={`p-2 rounded-lg ${
              isProfitPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <Percent className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              isProfitPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {formatCurrency(kpis.grossProfit)}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-1">
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Net Cash Position
          </CardTitle>
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              kpis.netCashPosition >= 0
                ? "text-teal-600 dark:text-teal-400"
                : "text-destructive"
            }`}
          >
            {formatCurrency(kpis.netCashPosition)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cash Received − Disbursed − Expensed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
