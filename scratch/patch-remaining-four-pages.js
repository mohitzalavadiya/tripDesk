const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const remainingPages = [
  {
    file: 'src/app/(dashboard)/bookings/page.tsx',
    moduleKey: 'BOOKINGS',
    featureName: 'Bookings Workspace',
    hookRegex: /export default function BookingsDashboardPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/documents/page.tsx',
    moduleKey: 'DOCUMENTS',
    featureName: 'Travel Documents',
    hookRegex: /export default function DocumentCenterPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/operations/page.tsx',
    moduleKey: 'OPERATIONS',
    featureName: 'Operations & Dispatch',
    hookRegex: /export default function OperationsDashboardPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/feedback/page.tsx',
    moduleKey: 'FEEDBACK',
    featureName: 'Feedback & Reviews',
    hookRegex: /export default function FeedbackAndReviewsPage\(\) \{/,
  },
];

for (const p of remainingPages) {
  const fullPath = path.join(rootDir, p.file);
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');

  if (content.includes(`hasStaffPermission("${p.moduleKey}", "view")`)) {
    console.log(`Guard already present in ${p.file}`);
    continue;
  }

  // Ensure imports
  if (!content.includes('OwnerRestrictedCard')) {
    content = `import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n` + content;
  }
  if (!content.includes('useAuth')) {
    content = `import { useAuth } from "@/context/auth-context";\n` + content;
  }

  const guardCode = `
  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("${p.moduleKey}", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="${p.featureName}"
          badgeText="Access Restricted"
          description="You do not have permission to view this section. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;

  if (p.hookRegex.test(content)) {
    content = content.replace(p.hookRegex, (match) => `${match}${guardCode}`);
    fs.writeFileSync(fullPath, content.replace(/\n/g, '\r\n'), 'utf8');
    console.log(`Successfully added view guard to ${p.file}`);
  } else {
    console.error(`Hook regex did not match in ${p.file}`);
  }
}

