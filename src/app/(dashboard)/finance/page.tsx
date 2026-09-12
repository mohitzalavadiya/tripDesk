"use client";

import * as React from "react";
import {
  TrendingUp,
  Download,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { FinanceKpiGrid } from "@/components/finance/finance-kpi-grid";
import { ProfitabilityCard } from "@/components/finance/profitability-card";
import { OutstandingBalancesCard } from "@/components/finance/outstanding-balances-card";
import { FinanceTransactionTable } from "@/components/finance/finance-transaction-table";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { RecordSupplierPaymentDialog } from "@/components/finance/record-supplier-payment-dialog";
import { CreateExpenseDialog } from "@/components/finance/create-expense-dialog";
import {
  financeClient,
  FinanceDashboardResult,
  FinancePreset,
  TransactionType,
  UnifiedTransactionItem,
} from "@/lib/api-client";
import { toast } from "sonner";

export default function FinanceDashboardPage() {
  const [preset, setPreset] = React.useState<FinancePreset>("LAST_30_DAYS");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [data, setData] = React.useState<FinanceDashboardResult | null>(null);

  // Transactions State
  const [transactions, setTransactions] = React.useState<UnifiedTransactionItem[]>([]);
  const [txMeta, setTxMeta] = React.useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [txLoading, setTxLoading] = React.useState(false);
  const [txType, setTxType] = React.useState<TransactionType>("ALL");
  const [txSearch, setTxSearch] = React.useState("");
  const [txPage, setTxPage] = React.useState(1);

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = React.useState<string | undefined>();

  const [supplierPaymentDialogOpen, setSupplierPaymentDialogOpen] = React.useState(false);
  const [selectedPayableForPayment, setSelectedPayableForPayment] = React.useState<string | undefined>();

  const [expenseDialogOpen, setExpenseDialogOpen] = React.useState(false);

  // Load Executive Summary
  const loadDashboard = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await financeClient.getFinanceSummary({ preset });
      if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load financial dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset]);

  // Load Transactions Ledger
  const loadTransactions = React.useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await financeClient.getTransactions({
        page: txPage,
        limit: txMeta.limit,
        type: txType,
        search: txSearch || undefined,
      });
      setTransactions(res.data || []);
      if (res.meta) {
        setTxMeta(res.meta);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load transactions ledger.");
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txMeta.limit, txType, txSearch]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard(true);
    loadTransactions();
  };

  const handleRecordCustomerPayment = (bookingId?: string) => {
    setSelectedBookingForPayment(bookingId);
    setPaymentDialogOpen(true);
  };

  const handleRecordSupplierPayment = (payableId?: string) => {
    setSelectedPayableForPayment(payableId);
    setSupplierPaymentDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      <div className="max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        <PageHeader
          title="Finance & Profitability"
          description="Server-authoritative revenue, customer collections, supplier payables, expenses, and net profit margins."
          breadcrumbs={[{ label: "Finance" }]}
          primaryAction={{
            label: "Collect Payment",
            onClick: () => handleRecordCustomerPayment(),
            icon: ArrowDownLeft,
          }}
          secondaryActions={[
            {
              label: "Pay Supplier",
              onClick: () => handleRecordSupplierPayment(),
              icon: ArrowUpRight,
              variant: "outline",
            },
            {
              label: "Log Expense",
              onClick: () => setExpenseDialogOpen(true),
              icon: Receipt,
              variant: "outline",
            },
            {
              label: "Export CSV",
              onClick: () => {
                window.open(financeClient.getFinanceExportUrl({ preset }), "_blank");
              },
              icon: Download,
              variant: "outline",
            },
            {
              label: refreshing ? "Refreshing..." : "Refresh",
              onClick: handleRefresh,
              icon: RefreshCw,
              variant: "outline",
            },
          ]}
        />

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Financial Period:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <Select value={preset} onValueChange={(val) => setPreset(val as FinancePreset)}>
                <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none w-36 focus:ring-0 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                  <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                  <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
                  <SelectItem value="CURRENT_MONTH">Current Month</SelectItem>
                  <SelectItem value="PREVIOUS_MONTH">Previous Month</SelectItem>
                  <SelectItem value="CURRENT_YEAR">Current Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Server-authoritative enterprise ledger
          </div>
        </div>

        {/* KPI Grid */}
        {data ? (
          <FinanceKpiGrid kpis={data.kpis} loading={loading} />
        ) : (
          <FinanceKpiGrid
            kpis={{
              totalSales: 0,
              amountReceived: 0,
              customerOutstanding: 0,
              customerRefunded: 0,
              supplierPayable: 0,
              supplierPaid: 0,
              supplierOutstanding: 0,
              operationalExpenses: 0,
              grossProfit: 0,
              profitMarginPercent: 0,
              netCashPosition: 0,
              totalBookingsCount: 0,
              fullyPaidBookingsCount: 0,
              partiallyPaidBookingsCount: 0,
              unpaidBookingsCount: 0,
            }}
            loading={loading}
          />
        )}

        {/* Profitability & Outstanding Dues Grid */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfitabilityCard profitability={data.profitability} />
            <OutstandingBalancesCard
              customerReceivables={data.customerReceivables}
              supplierPayables={data.supplierPayables}
              onRecordCustomerPayment={handleRecordCustomerPayment}
              onRecordSupplierPayment={handleRecordSupplierPayment}
            />
          </div>
        )}

        {/* Unified Transaction Ledger */}
        <FinanceTransactionTable
          transactions={transactions}
          meta={txMeta}
          loading={txLoading}
          onPageChange={setTxPage}
          onTypeChange={(t) => {
            setTxType(t);
            setTxPage(1);
          }}
          onSearchChange={(s) => {
            setTxSearch(s);
            setTxPage(1);
          }}
          selectedType={txType}
          search={txSearch}
        />

        {/* Dialog Modals */}
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          defaultBookingId={selectedBookingForPayment}
          onSuccess={() => {
            loadDashboard(true);
            loadTransactions();
          }}
        />

        <RecordSupplierPaymentDialog
          open={supplierPaymentDialogOpen}
          onOpenChange={setSupplierPaymentDialogOpen}
          defaultPayableId={selectedPayableForPayment}
          onSuccess={() => {
            loadDashboard(true);
            loadTransactions();
          }}
        />

        <CreateExpenseDialog
          open={expenseDialogOpen}
          onOpenChange={setExpenseDialogOpen}
          onSuccess={() => {
            loadDashboard(true);
            loadTransactions();
          }}
        />
      </div>
    </div>
  );
}
