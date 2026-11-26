const fs = require('fs');

// 1. src/app/(dashboard)/rate-sheets/page.tsx
{
  const p = 'src/app/(dashboard)/rate-sheets/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /const \{ isAgencyOwner \} = useAuth\(\);\r?\n\s+if \(!isAgencyOwner\) \{\r?\n\s+return \(\r?\n\s+<div className="max-w-7xl mx-auto p-4 sm:p-6">\r?\n\s+<OwnerRestrictedCard\r?\n\s+featureName="Supplier Rate Sheets"\r?\n\s+description="Supplier contracts, contracted seasonal net rates, and margin rate sheets are restricted to the Agency Owner\."\r?\n\s+\/>\r?\n\s+<\/div>\r?\n\s+\);\r?\n\s+\}/,
    `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("RATE_SHEETS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Supplier Rate Sheets"
          badgeText="Access Restricted"
          description="You do not have permission to view supplier rate sheets. Contact your Agency Owner to request access."
        />
      </div>
    );
  }`
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Patched:', p);
}

// 2. src/app/(dashboard)/suppliers/page.tsx
{
  const p = 'src/app/(dashboard)/suppliers/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /const \{ isAgencyOwner \} = useAuth\(\);\r?\n\s+if \(!isAgencyOwner\) \{\r?\n\s+return \(\r?\n\s+<div className="max-w-7xl mx-auto p-4 sm:p-6">\r?\n\s+<OwnerRestrictedCard\r?\n\s+featureName="Supplier Management"\r?\n\s+description="Supplier directory, payables, contracts, and commercial accounts are restricted to the Agency Owner\."\r?\n\s+\/>\r?\n\s+<\/div>\r?\n\s+\);\r?\n\s+\}/,
    `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("SUPPLIERS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Supplier Management"
          badgeText="Access Restricted"
          description="You do not have permission to view supplier records. Contact your Agency Owner to request access."
        />
      </div>
    );
  }`
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Patched:', p);
}

// 3. src/app/(dashboard)/reports/page.tsx
{
  const p = 'src/app/(dashboard)/reports/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(
    /const \{ isAgencyOwner \} = useAuth\(\);\r?\n\s+if \(!isAgencyOwner\) \{\r?\n\s+return \(\r?\n\s+<div className="max-w-7xl mx-auto p-4 sm:p-6">\r?\n\s+<OwnerRestrictedCard\r?\n\s+featureName="Reports & BI Analytics"\r?\n\s+description="Executive business intelligence, revenue metrics, receivables, and payables reports are restricted to the Agency Owner\."\r?\n\s+\/>\r?\n\s+<\/div>\r?\n\s+\);\r?\n\s+\}/,
    `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("REPORTS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Reports & BI Analytics"
          badgeText="Access Restricted"
          description="You do not have permission to view reports and business analytics. Contact your Agency Owner to request access."
        />
      </div>
    );
  }`
  );
  fs.writeFileSync(p, c, 'utf8');
  console.log('Patched:', p);
}

// 4. src/app/(dashboard)/invoices/page.tsx
{
  const p = 'src/app/(dashboard)/invoices/page.tsx';
  let c = `"use client";

import { useAuth } from "@/context/auth-context";
import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function InvoicesRedirectPage() {
  const router = useRouter();
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  const isAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("INVOICES", "view"));

  React.useEffect(() => {
    if (isAllowed) {
      router.replace("/bookings");
    }
  }, [router, isAllowed]);

  if (!isAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Invoices & Billing"
          badgeText="Access Restricted"
          description="You do not have permission to view invoices. Contact your Agency Owner to request access."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">Invoices are managed within Bookings</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
        Redirecting you to the Bookings Workspace where you can view, generate, and manage invoices for your confirmed trips.
      </p>
      <Link href="/bookings">
        <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl gap-1.5 cursor-pointer">
          <CalendarCheck className="h-3.5 w-3.5" />
          Go to Bookings
        </Button>
      </Link>
    </div>
  );
}
`;
  fs.writeFileSync(p, c, 'utf8');
  console.log('Patched:', p);
}

// 5. src/app/(dashboard)/rate-sheets/new/page.tsx
{
  const p = 'src/app/(dashboard)/rate-sheets/new/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('useAuth')) {
    c = c.replace(
      /"use client";\r?\n/,
      `"use client";\n\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n`
    );
    c = c.replace(
      /function NewRateSheetForm\(\) \{\r?\n\s+const router = useRouter\(\);/,
      `function NewRateSheetForm() {\n  const router = useRouter();\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n\n  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("RATE_SHEETS", "create"))) {\n    return (\n      <div className="max-w-7xl mx-auto p-4 sm:p-6">\n        <OwnerRestrictedCard\n          featureName="Create Rate Sheet"\n          badgeText="Access Restricted"\n          description="You do not have permission to create rate sheets. Contact your Agency Owner to request access."\n        />\n      </div>\n    );\n  }`
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Patched:', p);
  }
}

// 6. src/app/(dashboard)/rate-sheets/[id]/page.tsx
{
  const p = 'src/app/(dashboard)/rate-sheets/[id]/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('useAuth')) {
    c = c.replace(
      /"use client";\r?\n/,
      `"use client";\n\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n`
    );
    c = c.replace(
      /export default function RateSheetDetailPage\(\) \{\r?\n\s+const router = useRouter\(\);/,
      `export default function RateSheetDetailPage() {\n  const router = useRouter();\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n\n  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("RATE_SHEETS", "view"))) {\n    return (\n      <div className="max-w-7xl mx-auto p-4 sm:p-6">\n        <OwnerRestrictedCard\n          featureName="Rate Sheet Details"\n          badgeText="Access Restricted"\n          description="You do not have permission to view rate sheet details. Contact your Agency Owner to request access."\n        />\n      </div>\n    );\n  }`
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Patched:', p);
  }
}

// 7. src/app/(dashboard)/suppliers/new/page.tsx
{
  const p = 'src/app/(dashboard)/suppliers/new/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('useAuth')) {
    c = c.replace(
      /"use client";\r?\n/,
      `"use client";\n\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n`
    );
    c = c.replace(
      /export default function NewSupplierPage\(\) \{\r?\n\s+const router = useRouter\(\);/,
      `export default function NewSupplierPage() {\n  const router = useRouter();\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n\n  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("SUPPLIERS", "create"))) {\n    return (\n      <div className="max-w-7xl mx-auto p-4 sm:p-6">\n        <OwnerRestrictedCard\n          featureName="Create Supplier"\n          badgeText="Access Restricted"\n          description="You do not have permission to create supplier records. Contact your Agency Owner to request access."\n        />\n      </div>\n    );\n  }`
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Patched:', p);
  }
}

// 8. src/app/(dashboard)/suppliers/[id]/page.tsx
{
  const p = 'src/app/(dashboard)/suppliers/[id]/page.tsx';
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('useAuth')) {
    c = c.replace(
      /"use client";\r?\n/,
      `"use client";\n\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n`
    );
    c = c.replace(
      /export default function SupplierDetailPage\(\) \{\r?\n\s+const router = useRouter\(\);/,
      `export default function SupplierDetailPage() {\n  const router = useRouter();\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n\n  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("SUPPLIERS", "view"))) {\n    return (\n      <div className="max-w-7xl mx-auto p-4 sm:p-6">\n        <OwnerRestrictedCard\n          featureName="Supplier Details"\n          badgeText="Access Restricted"\n          description="You do not have permission to view supplier details. Contact your Agency Owner to request access."\n        />\n      </div>\n    );\n  }`
    );
    fs.writeFileSync(p, c, 'utf8');
    console.log('Patched:', p);
  }
}

