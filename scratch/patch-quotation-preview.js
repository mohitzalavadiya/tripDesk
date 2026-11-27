const fs = require('fs');

// 1. Patch src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx
const previewPath = 'src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx';
let previewContent = fs.readFileSync(previewPath, 'utf8').replace(/\r\n/g, '\n');

// Add auth hook and view check
const targetPreviewFn = `function TripQuotationPreviewContent() {
  const params = useParams();`;

const replacementPreviewFn = `function TripQuotationPreviewContent() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const isViewAllowed = isAgencyOwner || (isAgencyStaff && (hasStaffPermission("QUOTATIONS", "view") || hasStaffPermission("QUOTATION_DETAIL", "view")));
  const params = useParams();`;

if (previewContent.includes(targetPreviewFn)) {
  previewContent = previewContent.replace(targetPreviewFn, replacementPreviewFn);
  console.log('Added useAuth and isViewAllowed to TripQuotationPreviewContent');
} else {
  console.error('Target targetPreviewFn not found');
}

// Add fetch suppression to loadData
const targetLoadData = `  // Stable data loader that runs only when tripId changes
  const loadData = React.useCallback(async () => {
    // 1. Guard against empty or malformed tripId`;

const replacementLoadData = `  // Stable data loader that runs only when tripId changes
  const loadData = React.useCallback(async () => {
    if (!isViewAllowed) {
      setLoading(false);
      return;
    }
    // 1. Guard against empty or malformed tripId`;

if (previewContent.includes(targetLoadData)) {
  previewContent = previewContent.replace(targetLoadData, replacementLoadData);
  console.log('Added fetch suppression to loadData in preview');
} else {
  console.error('Target targetLoadData not found');
}

// Add dependency to loadData useCallback
previewContent = previewContent.replace(
  '  }, [tripId]); // Only depends on tripId — avoids redundant refetches when changing tiers',
  '  }, [tripId, isViewAllowed]); // Depend on tripId and isViewAllowed'
);

// Add OwnerRestrictedCard check before loading state
const targetLoadingState = `  // ─── 1. LOADING STATE ───
  if (loading) {
    return <ProposalPreviewSkeleton />;
  }`;

const replacementLoadingState = `  // ─── 0. ACCESS RESTRICTION CHECK ───
  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Quotation Preview"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations and proposals. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

  // ─── 1. LOADING STATE ───
  if (loading) {
    return <ProposalPreviewSkeleton />;
  }`;

if (previewContent.includes(targetLoadingState)) {
  previewContent = previewContent.replace(targetLoadingState, replacementLoadingState);
  console.log('Added OwnerRestrictedCard render in preview');
} else {
  console.error('Target targetLoadingState not found');
}

fs.writeFileSync(previewPath, previewContent, 'utf8');

// 2. Patch src/app/(dashboard)/trips/[id]/quotation/page.tsx
const quotationPath = 'src/app/(dashboard)/trips/[id]/quotation/page.tsx';
let quotationContent = fs.readFileSync(quotationPath, 'utf8').replace(/\r\n/g, '\n');

const targetQuotationFetch = `  // Load trip quotations & live costing
  const fetchTripQuotationData = React.useCallback(async () => {
    try {
      setLoading(true);`;

const replacementQuotationFetch = `  // Load trip quotations & live costing
  const fetchTripQuotationData = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || (!hasStaffPermission("QUOTATIONS", "view") && !hasStaffPermission("QUOTATION_DETAIL", "view")))) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);`;

if (quotationContent.includes(targetQuotationFetch)) {
  quotationContent = quotationContent.replace(targetQuotationFetch, replacementQuotationFetch);
  console.log('Added fetch suppression to fetchTripQuotationData');
} else {
  console.error('Target targetQuotationFetch not found');
}

// Also check loadTaxRates fetch suppression
const targetTaxFetch = `  // Load active tax rates catalog from DB
  const loadTaxRates = React.useCallback(async () => {
    try {
      setTaxRatesLoading(true);`;

const replacementTaxFetch = `  // Load active tax rates catalog from DB
  const loadTaxRates = React.useCallback(async () => {
    if (!isAgencyOwner && (!isAgencyStaff || (!hasStaffPermission("QUOTATIONS", "view") && !hasStaffPermission("QUOTATION_DETAIL", "view")))) {
      setTaxRatesLoading(false);
      return;
    }
    try {
      setTaxRatesLoading(true);`;

if (quotationContent.includes(targetTaxFetch)) {
  quotationContent = quotationContent.replace(targetTaxFetch, replacementTaxFetch);
  console.log('Added fetch suppression to loadTaxRates');
} else {
  console.error('Target targetTaxFetch not found');
}

fs.writeFileSync(quotationPath, quotationContent, 'utf8');
console.log('Successfully patched preview and quotation pages');

