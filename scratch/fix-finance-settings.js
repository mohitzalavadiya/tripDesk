const fs = require('fs');

// Fix finance/page.tsx
let fin = fs.readFileSync('src/app/(dashboard)/finance/page.tsx', 'utf8');
fin = fin.replace(
  /export default function FinanceDashboardPage\(\) \{[\s\S]*?const \[txLoading, setTxLoading\] = React\.useState\(false\);/,
  `export default function FinanceDashboardPage() {
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
  const [txLoading, setTxLoading] = React.useState(false);`
);
fs.writeFileSync('src/app/(dashboard)/finance/page.tsx', fin);
console.log('Fixed finance/page.tsx');

// Fix settings/page.tsx
let set = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');
set = set.replace(
  /export default function SettingsPage\(\) \{[\s\S]*?const \[activeTab, setActiveTab\] = React\.useState<\"communication\" \| \"tax\" \| \"branding\" \| \"team\">\(\"communication\"\);/,
  `export default function SettingsPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("SETTINGS", "view"));

  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Agency Settings"
          badgeText="Access Restricted"
          description="Agency profile settings, team management, tax profiles, and communication gateways are restricted. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  const { isFeatureAllowed, overview, isReadOnly: isCentralReadOnly, readOnlyReason, refreshSubscription } = useSubscription();
  const [activeTab, setActiveTab] = React.useState<"communication" | "tax" | "branding" | "team">("communication");`
);
fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', set);
console.log('Fixed settings/page.tsx');

