const fs = require('fs');

const subrouteConfigs = [
  {
    path: 'src/app/(dashboard)/activities/new/page.tsx',
    module: 'ACTIVITIES',
    action: 'create',
    featureName: 'Create Activity',
    componentMatch: /export default function NewActivityPage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/activities/[id]/page.tsx',
    module: 'ACTIVITIES',
    action: 'view',
    featureName: 'Activity Details',
    componentMatch: /export default function EditActivityPage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/hotels/new/page.tsx',
    module: 'HOTELS',
    action: 'create',
    featureName: 'Create Hotel',
    componentMatch: /export default function NewHotelPage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/hotels/[id]/page.tsx',
    module: 'HOTELS',
    action: 'view',
    featureName: 'Hotel Details',
    componentMatch: /export default function EditHotelPage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/vehicles/new/page.tsx',
    module: 'VEHICLES',
    action: 'create',
    featureName: 'Create Vehicle',
    componentMatch: /export default function NewVehiclePage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/vehicles/[id]/page.tsx',
    module: 'VEHICLES',
    action: 'view',
    featureName: 'Vehicle Details',
    componentMatch: /export default function EditVehiclePage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/operations/[tripId]/page.tsx',
    module: 'OPERATIONS',
    action: 'view',
    featureName: 'Operations Workspace',
    componentMatch: /export default function TripOperationsPage\(\)\s*\{/,
  },
  {
    path: 'src/app/(dashboard)/operations/analytics/page.tsx',
    module: 'OPERATIONS',
    action: 'view',
    featureName: 'Operations Analytics',
    componentMatch: /export default function OperationsAnalyticsPage\(\)\s*\{/,
  },
];

subrouteConfigs.forEach(cfg => {
  let code = fs.readFileSync(cfg.path, 'utf8');

  // Add imports if missing
  if (!code.includes('useAuth')) {
    code = 'import { useAuth } from "@/context/auth-context";\n' + code;
  }
  if (!code.includes('OwnerRestrictedCard')) {
    code = 'import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n' + code;
  }

  // Insert guard inside component
  const guardCode = `
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("${cfg.module}", "${cfg.action}"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="${cfg.featureName}"
          badgeText="Access Restricted"
          description="You do not have permission to access this page. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;

  code = code.replace(cfg.componentMatch, (match) => match + guardCode);

  fs.writeFileSync(cfg.path, code);
  console.log(`Successfully patched guard into ${cfg.path}`);
});
