const fs = require('fs');
const path = require('path');

// 1. customers/[id]/page.tsx
{
  const file = 'src/app/(dashboard)/customers/[id]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('!__hasStaffPermGuard("CUSTOMERS", "view")', '!__hasStaffPermGuard("CUSTOMER_DETAIL", "view")');
  content = content.replace('featureName="Customer Records"', 'featureName="Customer Detail"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 2. enquiries/[id]/page.tsx
{
  const file = 'src/app/(dashboard)/enquiries/[id]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('!__hasStaffPermGuard("ENQUIRIES", "view")', '!__hasStaffPermGuard("ENQUIRY_DETAIL", "view")');
  content = content.replace('featureName="Enquiries & Leads"', 'featureName="Enquiry Detail"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 3. trips/[id]/page.tsx
{
  const file = 'src/app/(dashboard)/trips/[id]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('!__hasStaffPermGuard("TRIPS", "view")', '!__hasStaffPermGuard("TRIP_DETAIL", "view")');
  content = content.replace('featureName="Trips & Itineraries"', 'featureName="Trip Dossier"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 4. customers/new/page.tsx
{
  const file = 'src/app/(dashboard)/customers/new/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { PageHeader } from "@/components/shared/page-header";',
      'import { PageHeader } from "@/components/shared/page-header";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("CUSTOMERS", "create")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Customer Creation"
          badgeText="Access Restricted"
          description="You do not have permission to add new customers. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function NewCustomerPage() {', 'export default function NewCustomerPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 5. enquiries/new/page.tsx
{
  const file = 'src/app/(dashboard)/enquiries/new/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { useRouter } from "next/navigation";',
      'import { useRouter } from "next/navigation";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("ENQUIRIES", "create")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Enquiry Creation"
          badgeText="Access Restricted"
          description="You do not have permission to create enquiries. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function NewEnquiryPage() {', 'export default function NewEnquiryPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 6. trips/new/page.tsx
{
  const file = 'src/app/(dashboard)/trips/new/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { useRouter } from "next/navigation";',
      'import { useRouter } from "next/navigation";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("TRIPS", "create")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Trip Creation"
          badgeText="Access Restricted"
          description="You do not have permission to plan or create new trips. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function NewTripPage() {', 'export default function NewTripPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 7. quotations/new/page.tsx
{
  const file = 'src/app/(dashboard)/quotations/new/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { useRouter } from "next/navigation";',
      'import { useRouter } from "next/navigation";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("QUOTATIONS", "create")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Quotation Creation"
          badgeText="Access Restricted"
          description="You do not have permission to draft quotations. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function NewQuotationPage() {', 'export default function NewQuotationPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 8. bookings/[id]/page.tsx
{
  const file = 'src/app/(dashboard)/bookings/[id]/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { ConfirmDialog } from "@/components/shared/confirm-dialog";',
      'import { ConfirmDialog } from "@/components/shared/confirm-dialog";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("BOOKING_DETAIL", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Booking Dossier"
          badgeText="Access Restricted"
          description="You do not have permission to view booking details. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function BookingDetailPage() {', 'export default function BookingDetailPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 9. bookings/new/page.tsx
{
  const file = 'src/app/(dashboard)/bookings/new/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { useRouter } from "next/navigation";',
      'import { useRouter } from "next/navigation";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("BOOKINGS", "create")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Booking Creation"
          badgeText="Access Restricted"
          description="You do not have permission to create bookings. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export default function NewBookingPage() {', 'export default function NewBookingPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 10. operations/issues/page.tsx
{
  const file = 'src/app/(dashboard)/operations/issues/page.tsx';
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('OwnerRestrictedCard')) {
    content = content.replace(
      'import { EmptyState } from "@/components/shared/empty-state";',
      'import { EmptyState } from "@/components/shared/empty-state";\nimport { useAuth } from "@/context/auth-context";\nimport { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";'
    );
    const guard = `  const { isAgencyStaff: __isStaffGuard, hasStaffPermission: __hasStaffPermGuard } = useAuth();
  if (__isStaffGuard && !__hasStaffPermGuard("OPERATIONS_ISSUES", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Operations Issues"
          badgeText="Access Restricted"
          description="You do not have permission to view operations issues. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }
`;
    content = content.replace('export function GlobalIssuesDashboardPage() {', 'export function GlobalIssuesDashboardPage() {\n' + guard);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Patched', file);
  }
}

// 11. API: customers/[id]/route.ts
{
  const file = 'src/app/api/customers/[id]/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"CUSTOMERS",\n        "VIEW"', '"CUSTOMER_DETAIL",\n        "VIEW"');
  content = content.replace('"CUSTOMERS",\n        "UPDATE"', '"CUSTOMER_DETAIL",\n        "UPDATE"');
  content = content.replace('"CUSTOMERS", "DELETE"', '"CUSTOMER_DETAIL", "DELETE"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 12. API: enquiries/[id]/route.ts
{
  const file = 'src/app/api/enquiries/[id]/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"ENQUIRIES",\n        "VIEW"', '"ENQUIRY_DETAIL",\n        "VIEW"');
  content = content.replace('"ENQUIRIES",\n        "UPDATE"', '"ENQUIRY_DETAIL",\n        "UPDATE"');
  content = content.replace('"ENQUIRIES", "DELETE"', '"ENQUIRY_DETAIL", "DELETE"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 13. API: trips/[id]/route.ts
{
  const file = 'src/app/api/trips/[id]/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"TRIPS",\n        "VIEW"', '"TRIP_DETAIL",\n        "VIEW"');
  content = content.replace('"TRIPS",\n        "UPDATE"', '"TRIP_DETAIL",\n        "UPDATE"');
  content = content.replace('"TRIPS", "DELETE"', '"TRIP_DETAIL", "DELETE"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 14. API: quotations/[id]/route.ts
{
  const file = 'src/app/api/quotations/[id]/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"QUOTATIONS", "UPDATE"', '"QUOTATION_DETAIL", "UPDATE"');
  content = content.replace('"QUOTATIONS", "DELETE"', '"QUOTATION_DETAIL", "DELETE"');
  content = content.replace('"QUOTATIONS", "VIEW"', '"QUOTATION_DETAIL", "VIEW"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 15. API: bookings/[id]/route.ts
{
  const file = 'src/app/api/bookings/[id]/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"BOOKINGS",\n        "VIEW"', '"BOOKING_DETAIL",\n        "VIEW"');
  content = content.replace('"BOOKINGS",\n        "UPDATE"', '"BOOKING_DETAIL",\n        "UPDATE"');
  content = content.replace('"BOOKINGS", "DELETE"', '"BOOKING_DETAIL", "DELETE"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

// 16. API: operations/issues/route.ts
{
  const file = 'src/app/api/operations/issues/route.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('"OPERATIONS", "VIEW"', '"OPERATIONS_ISSUES", "VIEW"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched', file);
}

console.log("All sub-routes and API routes patched successfully!");

