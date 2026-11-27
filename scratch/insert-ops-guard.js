const fs = require('fs');
let ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8');
const lines = ops.split('\n');
const retIdx = lines.findIndex(l => l.includes('from-slate-50 to-slate-100/50 pb-20'));
if (retIdx !== -1) {
  // line before is '  return ('
  const insertIdx = retIdx - 1;
  const guardCode = `  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("OPERATIONS", "view"))) {
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
`;
  lines.splice(insertIdx, 0, guardCode);
  fs.writeFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', lines.join('\n'));
  console.log('Successfully inserted guard into operations/[tripId]/page.tsx');
}

