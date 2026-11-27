const fs = require("fs");
let code = fs.readFileSync("src/app/(dashboard)/subscription/page.tsx", "utf8");

// Insert guard & state
code = code.replace(
  `export default function AgencySubscriptionPage() {
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const [data, setData] = React.useState<AgencySubscriptionData | null>(null);`,
  `export default function AgencySubscriptionPage() {
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("SUBSCRIPTION", "view"));

  const [data, setData] = React.useState<AgencySubscriptionData | null>(null);`
);

// Add network fetch suppression
code = code.replace(
  `  const fetchData = React.useCallback(async () => {
    setLoading(true);`,
  `  const fetchData = React.useCallback(async () => {
    if (!isViewAllowed) return;
    setLoading(true);`
);

code = code.replace(
  `  }, [refreshSubscription]);


  React.useEffect(() => {
    fetchData();
  }, [fetchData]);`,
  `  }, [refreshSubscription, isViewAllowed]);

  React.useEffect(() => {
    if (isViewAllowed) {
      fetchData();
    }
  }, [fetchData, isViewAllowed]);`
);

// Insert render guard before handleContactSupport
code = code.replace(
  `  const handleContactSupport = () => {`,
  `  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Subscription & Billing"
          badgeText="Access Restricted"
          description="Plan tiers, usage entitlements, billing renewals, and invoice receipts are restricted. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  const handleContactSupport = () => {`
);

// Disable upgrade button for non-owner
code = code.replace(
  `                    {/* CTA Button */}
                    <div className="pt-4 border-t border-slate-100">
                      {isCurrentActive ? (
                        <Button
                          disabled
                          className="w-full bg-slate-100 text-slate-500 font-bold text-xs h-10 rounded-2xl cursor-not-allowed"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                          Current Active Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenPurchase(plan)}`,
  `                    {/* CTA Button */}
                    <div className="pt-4 border-t border-slate-100">
                      {isCurrentActive ? (
                        <Button
                          disabled
                          className="w-full bg-slate-100 text-slate-500 font-bold text-xs h-10 rounded-2xl cursor-not-allowed"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                          Current Active Plan
                        </Button>
                      ) : !isAgencyOwner ? (
                        <Button
                          disabled
                          className="w-full bg-slate-100 text-slate-400 font-bold text-xs h-10 rounded-2xl cursor-not-allowed"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Owner Only to Upgrade
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenPurchase(plan)}`
);

fs.writeFileSync("src/app/(dashboard)/subscription/page.tsx", code, "utf8");
console.log("subscription/page.tsx patched successfully!");

