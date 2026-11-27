const fs = require('fs');

// 1. operations/[tripId]/page.tsx
let ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8');
if (!ops.includes('export default function TripOperationsDetailPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  ops = ops.replace(
    'export default function TripOperationsDetailPage() {',
    'export default function TripOperationsDetailPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();'
  );
  fs.writeFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', ops);
  console.log('Fixed operations/[tripId]/page.tsx');
}

// 2. trips/[id]/quotation/page.tsx
let qPage = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', 'utf8');
if (!qPage.includes('export default function TripQuotationEditorPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  qPage = qPage.replace(
    'export default function TripQuotationEditorPage() {',
    'export default function TripQuotationEditorPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();'
  );
  fs.writeFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', qPage);
  console.log('Fixed trips/[id]/quotation/page.tsx');
}

// 3. trips/[id]/quotation/preview/page.tsx
let pPage = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx', 'utf8');
// remove from ProposalPreviewSkeleton
const badGuard = `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("QUOTATIONS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Quotation Preview"
          badgeText="Access Restricted"
          description="You do not have permission to view quotations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }`;
pPage = pPage.replace(badGuard, '');
// add useAuth into ProposalPreviewPage
if (!pPage.includes('export default function ProposalPreviewPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();')) {
  pPage = pPage.replace(
    'export default function ProposalPreviewPage() {',
    'export default function ProposalPreviewPage() {\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();'
  );
}
// add guard before ProposalPreviewPage return
const goodGuard = `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("QUOTATIONS", "view"))) {
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans`;

pPage = pPage.replace('  return (\n    <div className="min-h-screen bg-slate-50 font-sans', goodGuard);
fs.writeFileSync('src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx', pPage);
console.log('Fixed trips/[id]/quotation/preview/page.tsx');

// 4. quotations/[id]/page.tsx
let rPage = fs.readFileSync('src/app/(dashboard)/quotations/[id]/page.tsx', 'utf8');
rPage = rPage.replace(
  'import { evaluateStaffPermission } from "@/lib/auth/permissions";',
  'import { staffPermissionService } from "@/lib/services/staff-permission-service";'
);
rPage = rPage.replace(
  `  // Check staff view permission
  if (!user.isPlatformOwner && user.role === "AGENCY_STAFF" && user.agency?.id) {
    const canView = await evaluateStaffPermission(user.role, user.agency.id, user.id, "QUOTATIONS", "VIEW");
    if (!canView) {
      redirect("/quotations");
    }
  }`,
  `  // Check staff view permission
  if (!user.isPlatformOwner && user.isAgencyStaff && user.agency?.id) {
    const canView = await staffPermissionService.hasStaffPermission(
      user.dbUser.role,
      user.agency.id,
      user.dbUser.id,
      "QUOTATIONS",
      "VIEW"
    );
    if (!canView) {
      redirect("/quotations");
    }
  }`
);
fs.writeFileSync('src/app/(dashboard)/quotations/[id]/page.tsx', rPage);
console.log('Fixed quotations/[id]/page.tsx');

// 5. dashboard/export/route.ts
let de = fs.readFileSync('src/app/api/dashboard/export/route.ts', 'utf8');
de = de.replace(
  `    if (!hasPermission(context.dbUser.role, "DASHBOARD_CRM", "EXPORT")) {
      throw new ForbiddenError("You do not have permission to export dashboard reports.");
    }`,
  `    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DASHBOARD", "EXPORT");`
);
fs.writeFileSync('src/app/api/dashboard/export/route.ts', de);
console.log('Fixed dashboard/export/route.ts');

