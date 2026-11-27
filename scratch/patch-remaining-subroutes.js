const fs = require('fs');

// 1. operations/[tripId]/page.tsx
let ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8');
const targetStr = '  return (\n    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">';
if (ops.includes(targetStr) && !ops.includes('featureName="Operations Workspace"')) {
  ops = ops.replace(
    targetStr,
    `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Operations Workspace"
          badgeText="Access Restricted"
          description="You do not have permission to view trip operations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }

${targetStr}`
  );
  fs.writeFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', ops);
  console.log('Patched operations/[tripId]/page.tsx successfully');
}

// 2. trips/[id]/quotation/page.tsx
let qPage = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', 'utf8');
if (!qPage.includes('OwnerRestrictedCard')) {
  qPage = qPage.replace(
    'import { QuotationStatusBadge } from "@/app/(dashboard)/quotations/page";',
    `import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\nimport { useAuth } from "@/context/auth-context";\nimport { QuotationStatusBadge } from "@/app/(dashboard)/quotations/page";`
  );
  qPage = qPage.replace(
    'export default function TripQuotationBuilderPage() {',
    `export default function TripQuotationBuilderPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  // find return (
  const lines = qPage.split('\n');
  const retLineIdx = lines.findIndex(l => l.startsWith('  return (') || l.startsWith('  return <'));
  if (retLineIdx !== -1) {
    lines.splice(
      retLineIdx,
      0,
      `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("QUOTATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Trip Quotation"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`
    );
    qPage = lines.join('\n');
    fs.writeFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', qPage);
    console.log('Patched trips/[id]/quotation/page.tsx');
  }
}

// 3. trips/[id]/quotation/preview/page.tsx
let pPage = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx', 'utf8');
if (!pPage.includes('OwnerRestrictedCard')) {
  pPage = pPage.replace(
    'import { Button } from "@/components/ui/button";',
    `import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\nimport { useAuth } from "@/context/auth-context";\nimport { Button } from "@/components/ui/button";`
  );
  pPage = pPage.replace(
    'export default function ProposalPreviewPage() {',
    `export default function ProposalPreviewPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`
  );
  const pLines = pPage.split('\n');
  const pRetIdx = pLines.findIndex(l => l.startsWith('  return (') || l.startsWith('  return <'));
  if (pRetIdx !== -1) {
    pLines.splice(
      pRetIdx,
      0,
      `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("QUOTATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Quotation Preview"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`
    );
    pPage = pLines.join('\n');
    fs.writeFileSync('src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx', pPage);
    console.log('Patched trips/[id]/quotation/preview/page.tsx');
  }
}

// 4. quotations/[id]/page.tsx
let rPage = fs.readFileSync('src/app/(dashboard)/quotations/[id]/page.tsx', 'utf8');
if (!rPage.includes('evaluateStaffPermission')) {
  rPage = rPage.replace(
    'import { redirect } from "next/navigation";',
    `import { redirect } from "next/navigation";\nimport { evaluateStaffPermission } from "@/lib/auth/permissions";`
  );
  rPage = rPage.replace(
    '  // Find quotation with strict tenant isolation',
    `  // Check staff view permission
  if (!user.isPlatformOwner && user.role === "AGENCY_STAFF" && user.agency?.id) {
    const canView = await evaluateStaffPermission(user.role, user.agency.id, user.id, "QUOTATIONS", "VIEW");
    if (!canView) {
      redirect("/quotations");
    }
  }

  // Find quotation with strict tenant isolation`
  );
  fs.writeFileSync('src/app/(dashboard)/quotations/[id]/page.tsx', rPage);
  console.log('Patched quotations/[id]/page.tsx');
}

