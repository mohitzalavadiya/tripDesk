"use client";

import * as React from "react";
import {
  TrendingUp,
  Percent,
  Wallet,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/costing-engine";

interface ProfitabilityCardProps {
  profitability: {
    revenue: number;
    supplierCost: number;
    operationalExpenses: number;
    grossProfit: number;
    profitMarginPercent: number;
    netCashPosition: number;
  };
}

export function ProfitabilityCard({ profitability }: ProfitabilityCardProps) {
  const { revenue, supplierCost, operationalExpenses, grossProfit, profitMarginPercent, netCashPosition } =
    profitability;

  const totalCost = supplierCost + operationalExpenses;
  const costPercentage = revenue > 0 ? Math.min(100, Math.round((totalCost / revenue) * 100)) : 0;
  const profitPercentage = revenue > 0 ? Math.max(0, Math.round((grossProfit / revenue) * 100)) : 0;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Agency Profitability & Financial Waterfall
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Server-authoritative gross profit, margin yield, and liquid cash conversion.
            </CardDescription>
          </div>
          <Badge
            variant={grossProfit >= 0 ? "outline" : "destructive"}
            className={
              grossProfit >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                : ""
            }
          >
            {profitMarginPercent}% Margin
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Waterfall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Cost Ratio: {costPercentage}%</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Profit Yield: {profitPercentage}%
            </span>
          </div>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-purple-500 transition-all duration-500"
              style={{
                width: `${revenue > 0 ? (supplierCost / revenue) * 100 : 0}%`,
              }}
              title={`Supplier Cost: ${formatCurrency(supplierCost)}`}
            />
            <div
              className="bg-indigo-500 transition-all duration-500"
              style={{
                width: `${revenue > 0 ? (operationalExpenses / revenue) * 100 : 0}%`,
              }}
              title={`Expenses: ${formatCurrency(operationalExpenses)}`}
            />
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.max(0, profitPercentage)}%`,
              }}
              title={`Gross Profit: ${formatCurrency(grossProfit)}`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" /> Supplier Cost
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" /> Op Expenses
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Gross Profit
            </span>
          </div>
        </div>

        {/* 4 Waterfall Breakdown Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium block">1. Gross Bookings</span>
            <span className="text-lg font-bold text-foreground mt-0.5 block">
              {formatCurrency(revenue)}
            </span>
            <span className="text-[11px] text-muted-foreground">100% of top-line</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium block">2. Supplier Obligations</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 block">
              − {formatCurrency(supplierCost)}
            </span>
            <span className="text-[11px] text-muted-foreground">Hotels, fleet & activities</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium block">3. Operational Expenses</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
              − {formatCurrency(operationalExpenses)}
            </span>
            <span className="text-[11px] text-muted-foreground">Fuel, tolls, meals & allowance</span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-emerald-500/5 dark:bg-emerald-500/10">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">
              4. Net Gross Profit
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              = {formatCurrency(grossProfit)}
            </span>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              {profitMarginPercent}% Margin retained
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
