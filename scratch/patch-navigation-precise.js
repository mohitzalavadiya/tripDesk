const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'navigation.ts');
let content = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

if (!content.includes('Gift,')) {
  content = content.replace('FileText,\n', 'FileText,\n  Gift,\n');
}

if (!content.includes('href: "/suppliers"')) {
  const target = `      {
        label: "Rate Sheets",
        href: "/rate-sheets",
        icon: FileSpreadsheet,
        ownerOnly: true,
        moduleKey: "RATE_SHEETS",
      },`;
  const replacement = `      {
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
  content = content.replace(target, replacement);
}

if (!content.includes('href: "/invoices"')) {
  const target = `      {
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        ownerOnly: true,
        moduleKey: "FINANCE",
      },`;
  const replacement = `      {
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
  content = content.replace(target, replacement);
}

if (!content.includes('href: "/referrals"')) {
  const target = `      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        moduleKey: "COMMUNICATIONS",
      },`;
  const replacement = `      {
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
  content = content.replace(target, replacement);
}

fs.writeFileSync(targetPath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched src/lib/navigation.ts with suppliers, invoices, and referrals.');

