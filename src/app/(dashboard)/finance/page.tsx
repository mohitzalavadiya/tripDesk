"use client";

import { useAuth } from "@/context/auth-context";
import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";

import { CreateExpenseDialog } from "@/components/finance/create-expense-dialog";
import { EditPayableDialog } from "@/components/finance/edit-payable-dialog";
import { FinanceKpiGrid } from "@/components/finance/finance-kpi-grid";
import { FinanceTransactionTable } from "@/components/finance/finance-transaction-table";
import { OutstandingBalancesCard } from "@/components/finance/outstanding-balances-card";
import { ProfitabilityCard } from "@/components/finance/profitability-card";
import { RecordPayableDialog } from "@/components/finance/record-payable-dialog";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { RecordSupplierPaymentDialog } from "@/components/finance/record-supplier-payment-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import {
financeClient,
FinanceDashboardResult,
FinancePreset,
TransactionType,
UnifiedTransactionItem,
} from "@/lib/api-client";
import {
ArrowDownLeft,
ArrowUpRight,
Calendar,
Download,
Plus,
Receipt,
RefreshCw
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export default function FinanceDashboardPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("FINANCE", "view"));

  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Financial Management"
          badgeText="Access Restricted"
          description="The agency finance ledger and operational financial tools are restricted. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

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

  const [recordPayableDialogOpen, setRecordPayableDialogOpen] = React.useState(false);
  const [editPayableDialogOpen, setEditPayableDialogOpen] = React.useState(false);
  const [selectedPayableForEdit, setSelectedPayableForEdit] = React.useState<string | null>(null);

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

  const handleRecordPayable = () => {
    setRecordPayableDialogOpen(true);
  };

  const handleEditPayable = (payableId: string) => {
    setSelectedPayableForEdit(payableId);
    setEditPayableDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50 pb-4 md:pb-6">
      <div className="max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 space-y-4">
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
              label: "Add Payable",
              onClick: handleRecordPayable,
              icon: Plus,
              variant: "outline",
            },
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col min-[360px]:flex-row min-[360px]:items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 shrink-0">Financial Period:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 w-full min-[360px]:w-auto">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <Select value={preset} onValueChange={(val) => setPreset(val as FinancePreset)}>
                <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none w-full min-[360px]:w-40 focus:ring-0 font-medium whitespace-nowrap">
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
          <div className="text-[11px] text-slate-400 font-medium">
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
            {isAgencyOwner ? (
              <ProfitabilityCard profitability={data.profitability} />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center space-y-2">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Commercial Margins Redacted</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Profitability margins and net supplier contract terms are restricted to Agency Owners.
                </p>
              </div>
            )}
            <OutstandingBalancesCard
              customerReceivables={data.customerReceivables}
              supplierPayables={isAgencyOwner ? data.supplierPayables : { totalOutstanding: 0, overdueCount: 0, overdueAmount: 0, items: [] }}
              onRecordCustomerPayment={handleRecordCustomerPayment}
              onRecordSupplierPayment={isAgencyOwner ? handleRecordSupplierPayment : () => {}}
              onRecordPayable={isAgencyOwner ? handleRecordPayable : () => {}}
              onEditPayable={isAgencyOwner ? handleEditPayable : () => {}}
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

        <RecordPayableDialog
          open={recordPayableDialogOpen}
          onOpenChange={setRecordPayableDialogOpen}
          onSuccess={() => {
            loadDashboard(true);
            loadTransactions();
          }}
        />

        <EditPayableDialog
          open={editPayableDialogOpen}
          onOpenChange={setEditPayableDialogOpen}
          payableId={selectedPayableForEdit}
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
