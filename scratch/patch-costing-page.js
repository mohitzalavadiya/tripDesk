const fs = require("fs");
let code = fs.readFileSync("src/app/(dashboard)/trips/[id]/costing/page.tsx", "utf8");

// Normalize line endings to LF for clean regex matching
code = code.replace(/\r\n/g, "\n");

const target = `export default function TripCostingDedicatedPage() {
  const { isAgencyOwner } = useAuth();

  if (!isAgencyOwner) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Trip Costing Studio"
          description="Internal supplier contract rates, net costs, agency markup schedules, and commercial margin calculations are restricted to Agency Owners."
        />
      </div>
    );
  }

  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Fetch real trip costing
  const fetchCosting = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationClient.getTripQuotation(tripId);
      if (res.success && res.data) {
        setCosting(res.data.costing);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load trip costing.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    if (tripId) fetchCosting();
  }, [tripId, fetchCosting]);`;

const replacement = `export default function TripCostingDedicatedPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("TRIP_COSTING", "view"));

  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [costing, setCosting] = React.useState<TripCostingResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Fetch real trip costing with network fetch suppression for unauthorized staff
  const fetchCosting = React.useCallback(async () => {
    if (!isViewAllowed) return;
    try {
      setLoading(true);
      setError(null);
      const res = await quotationClient.getTripQuotation(tripId);
      if (res.success && res.data) {
        setCosting(res.data.costing);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load trip costing.");
    } finally {
      setLoading(false);
    }
  }, [tripId, isViewAllowed]);

  React.useEffect(() => {
    if (tripId && isViewAllowed) fetchCosting();
  }, [tripId, isViewAllowed, fetchCosting]);

  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Trip Costing Studio"
          badgeText="Access Restricted"
          description="Internal supplier contract rates, net costs, agency markup schedules, and commercial margin calculations are restricted. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync("src/app/(dashboard)/trips/[id]/costing/page.tsx", code, "utf8");
  console.log("Successfully replaced costing guard with dynamic hasStaffPermission!");
} else {
  console.error("Target NOT found in costing page!");
}
