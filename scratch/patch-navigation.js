const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'navigation.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// Ensure Gift is imported
if (!content.includes('Gift,')) {
  content = content.replace(
    'FileText,',
    'FileText,\nGift,'
  );
}

// In RESOURCES, add Suppliers after Rate Sheets
const rateSheetBlock = `      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        ownerOnly: true,
        moduleKey: "RATE_SHEETS",
      },`;

const suppliersBlock = `      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        ownerOnly: true,
        moduleKey: "RATE_SHEETS",
      },
      {
        label: "Suppliers",
        href: "/suppliers",
        icon: Building,
        ownerOnly: true,
        moduleKey: "SUPPLIERS",
      },`;

content = content.replace(rateSheetBlock, suppliersBlock);

// In FINANCE & REPORTING, add Invoices and Referrals
const financeBlock = `      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        ownerOnly: true,
        moduleKey: "FINANCE",
      },`;

const invoicesAndFinanceBlock = `      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        ownerOnly: true,
        moduleKey: "FINANCE",
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: FileText,
        ownerOnly: true,
        moduleKey: "INVOICES",
      },`;

content = content.replace(financeBlock, invoicesAndFinanceBlock);

const commsBlock = `      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        moduleKey: "COMMUNICATIONS",
      },`;

const commsAndReferralsBlock = `      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        moduleKey: "COMMUNICATIONS",
      },
      {
        label: "Referrals & Rewards",
        href: "/referrals",
        icon: Gift,
        moduleKey: "REFERRALS",
      },`;

content = content.replace(commsBlock, commsAndReferralsBlock);

fs.writeFileSync(targetPath, content.replace(/\r?\n/g, '\r\n'), 'utf8');
console.log('Successfully patched src/lib/navigation.ts');

