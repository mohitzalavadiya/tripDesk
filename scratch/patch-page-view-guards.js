const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const pages = [
  {
    file: 'src/app/(dashboard)/customers/page.tsx',
    moduleKey: 'CUSTOMERS',
    featureName: 'Customer Records',
    hookRegex: /export default function CustomersPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/customers/[id]/page.tsx',
    moduleKey: 'CUSTOMERS',
    featureName: 'Customer Details',
    hookRegex: /export default function CustomerDetailPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/enquiries/page.tsx',
    moduleKey: 'ENQUIRIES',
    featureName: 'Enquiries Pipeline',
    hookRegex: /export default function EnquiriesPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/enquiries/[id]/page.tsx',
    moduleKey: 'ENQUIRIES',
    featureName: 'Enquiry Details',
    hookRegex: /export default function EnquiryDetailPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/follow-ups/page.tsx',
    moduleKey: 'FOLLOW_UPS',
    featureName: 'Follow-ups & CRM Activity',
    hookRegex: /export default function FollowUpsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/trips/page.tsx',
    moduleKey: 'TRIPS',
    featureName: 'Trips Planning',
    hookRegex: /export default function TripsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/trips/[id]/page.tsx',
    moduleKey: 'TRIPS',
    featureName: 'Trip Dossier',
    hookRegex: /export default function TripDetailPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/quotations/page.tsx',
    moduleKey: 'QUOTATIONS',
    featureName: 'Quotations & Proposals',
    hookRegex: /export default function QuotationsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/bookings/page.tsx',
    moduleKey: 'BOOKINGS',
    featureName: 'Bookings Workspace',
    hookRegex: /export default function BookingsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/documents/page.tsx',
    moduleKey: 'DOCUMENTS',
    featureName: 'Travel Documents',
    hookRegex: /export default function DocumentsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/operations/page.tsx',
    moduleKey: 'OPERATIONS',
    featureName: 'Operations & Dispatch',
    hookRegex: /export default function OperationsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/destinations/page.tsx',
    moduleKey: 'DESTINATIONS',
    featureName: 'Destinations Catalog',
    hookRegex: /export default function DestinationsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/hotels/page.tsx',
    moduleKey: 'HOTELS',
    featureName: 'Hotels Directory',
    hookRegex: /export default function HotelsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/vehicles/page.tsx',
    moduleKey: 'VEHICLES',
    featureName: 'Vehicles Fleet',
    hookRegex: /export default function VehiclesPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/activities/page.tsx',
    moduleKey: 'ACTIVITIES',
    featureName: 'Activities Catalog',
    hookRegex: /export default function ActivitiesPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/feedback/page.tsx',
    moduleKey: 'FEEDBACK',
    featureName: 'Feedback & Reviews',
    hookRegex: /export default function FeedbackPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/communications/page.tsx',
    moduleKey: 'COMMUNICATIONS',
    featureName: 'Client Communications',
    hookRegex: /export default function CommunicationsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/referrals/page.tsx',
    moduleKey: 'REFERRALS',
    featureName: 'Referrals & Rewards',
    hookRegex: /export default function ReferralsAndRewardsPage\(\) \{/,
  },
  {
    file: 'src/app/(dashboard)/support/page.tsx',
    moduleKey: 'SUPPORT_CHAT',
    featureName: 'Support Chat',
    hookRegex: /export default function SupportPage\(\) \{/,
  },
];

for (const p of pages) {
  const fullPath = path.join(rootDir, p.file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${p.file}`);
    continue;
  }

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

