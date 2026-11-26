const fs = require('fs');

let code = fs.readFileSync('src/app/(dashboard)/finance/page.tsx', 'utf8');

// 1. Update guard
code = code.replace(
  /const\s*\{\s*isAgencyOwner\s*\}\s*=\s*useAuth\(\);[\s\S]*?if\s*\(!isAgencyOwner\)\s*\{[\s\S]*?<OwnerRestrictedCard[\s\S]*?\/>[\s\S]*?\}[\s\S]*?\}/,
  `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

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
  }`
);

// 2. Filter secondary actions for staff
code = code.replace(
  /secondaryActions=\{\[[\s\S]*?\{\s*label:\s*\"Add Payable\"[\s\S]*?\}\s*\]\}/,
  `secondaryActions={[
            ...(isAgencyOwner
              ? [
                  {
                    label: "Add Payable",
                    onClick: handleRecordPayable,
                    icon: Plus,
                    variant: "outline" as const,
                  },
                  {
                    label: "Pay Supplier",
                    onClick: () => handleRecordSupplierPayment(),
                    icon: ArrowUpRight,
                    variant: "outline" as const,
                  },
                ]
              : []),
            {
              label: "Log Expense",
              onClick: () => setExpenseDialogOpen(true),
              icon: Receipt,
              variant: "outline" as const,
            },
            ...(isAgencyOwner
              ? [
                  {
                    label: "Export CSV",
                    onClick: () => {
                      window.open(financeClient.getFinanceExportUrl({ preset }), "_blank");
                    },
                    icon: Download,
                    variant: "outline" as const,
                  },
                ]
              : []),
            {
              label: refreshing ? "Refreshing..." : "Refresh",
              onClick: handleRefresh,
              icon: RefreshCw,
              variant: "outline" as const,
            },
          ]}`
);

// 3. Profitability & Outstanding Balances Grid
code = code.replace(
  /\{data && \(\s*<div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">[\s\S]*?<ProfitabilityCard profitability=\{data\.profitability\} \/>[\s\S]*?<\/div>\s*\)\}/,
  `{data && (
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
              supplierPayables={isAgencyOwner ? data.supplierPayables : []}
              onRecordCustomerPayment={handleRecordCustomerPayment}
              onRecordSupplierPayment={isAgencyOwner ? handleRecordSupplierPayment : () => {}}
              onRecordPayable={isAgencyOwner ? handleRecordPayable : () => {}}
              onEditPayable={isAgencyOwner ? handleEditPayable : () => {}}
            />
          </div>
        )}`
);

fs.writeFileSync('src/app/(dashboard)/finance/page.tsx', code);
console.log('Successfully updated src/app/(dashboard)/finance/page.tsx');

