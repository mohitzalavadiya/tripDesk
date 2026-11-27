const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. customer-insights/page.tsx
const ciPath = path.join(rootDir, 'src/app/(dashboard)/customer-insights/page.tsx');
let ciContent = fs.readFileSync(ciPath, 'utf8').replace(/\r\n/g, '\n');
const ciTarget = `  const { isAgencyOwner } = useAuth();

  if (!isAgencyOwner) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Customer Insights & Lifetime Analytics"
          description="Customer lifetime valuation, churn analysis, and financial retention metrics are restricted to the Agency Owner."
        />
      </div>
    );
  }`;

const ciReplace = `  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (!isAgencyOwner && (!isAgencyStaff || !hasStaffPermission("CUSTOMER_INSIGHTS", "view"))) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Customer Insights & Lifetime Analytics"
          badgeText="Access Restricted"
          description="Customer lifetime valuation, churn analysis, and financial retention metrics are restricted to authorized personnel."
        />
      </div>
    );
  }`;

if (ciContent.includes(ciTarget)) {
  ciContent = ciContent.replace(ciTarget, ciReplace);
  fs.writeFileSync(ciPath, ciContent.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated customer-insights/page.tsx');
} else {
  console.error('Target not found in customer-insights/page.tsx');
}

// 2. payments/page.tsx
const payPath = path.join(rootDir, 'src/app/(dashboard)/payments/page.tsx');
let payContent = fs.readFileSync(payPath, 'utf8').replace(/\r\n/g, '\n');

if (!payContent.includes('OwnerRestrictedCard')) {
  payContent = `import { OwnerRestrictedCard } from "@/components/shared/owner-restricted-card";\n` + payContent;
}

const payTarget = `export default function PaymentsPage() {
  const { isAgencyOwner } = useAuth();`;

const payReplace = `export default function PaymentsPage() {
  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  if (isAgencyStaff && !hasStaffPermission("PAYMENTS", "view")) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Payments & Receipts"
          badgeText="Access Restricted"
          description="You do not have permission to view Payments and Receipts. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }`;

if (payContent.includes(payTarget)) {
  payContent = payContent.replace(payTarget, payReplace);
  fs.writeFileSync(payPath, payContent.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated payments/page.tsx');
} else {
  console.error('Target not found in payments/page.tsx');
}

