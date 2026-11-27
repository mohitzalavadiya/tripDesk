const fs = require('fs');

let code = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');

// Replace FINANCE block
const financeTarget = `  {
    moduleKey: "FINANCE",
    name: "Financial Margins & Ledger",
    description: "Agency profitability, gross margins, supplier disbursements, and bank ledger",
    route: "/finance",
    category: "Finance & Invoicing",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "create", "update", "delete"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`;

const financeReplacement = `  {
    moduleKey: "FINANCE",
    name: "Financial Margins & Ledger",
    description: "Operational financial ledger and tour expenses (supplier payables & commercial margins redacted)",
    route: "/finance",
    category: "Finance & Invoicing",
    isOwnerOnly: false,
    delegableActions: ["view", "create"],
    ownerOnlyActions: ["commercialMargins", "supplierDisbursements", "delete"],
    defaultPermissions: { view: false, create: false, delete: false },
  },`;

// Replace SETTINGS block
const settingsTarget = `  {
    moduleKey: "SETTINGS",
    name: "Agency Settings",
    description: "Company profile, logo, tax registration (GST), and team management",
    route: "/settings",
    category: "Settings & Admin",
    isOwnerOnly: true,
    delegableActions: [],
    ownerOnlyActions: ["view", "manage"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`;

const settingsReplacement = `  {
    moduleKey: "SETTINGS",
    name: "Agency Settings",
    description: "Company profile, communication templates, and GST settings (team management is Owner Only)",
    route: "/settings",
    category: "Settings & Admin",
    isOwnerOnly: false,
    delegableActions: ["view", "update"],
    ownerOnlyActions: ["teamManagement", "legalTaxProfile"],
    defaultPermissions: { view: false, create: false, update: false, delete: false },
  },`;

// Normalize line breaks for matching
code = code.replace(/\r\n/g, '\n');
const normalizedFinTarget = financeTarget.replace(/\r\n/g, '\n');
const normalizedSetTarget = settingsTarget.replace(/\r\n/g, '\n');

if (code.includes(normalizedFinTarget)) {
  code = code.replace(normalizedFinTarget, financeReplacement);
  console.log('Successfully replaced FINANCE');
} else {
  console.error('Could not find FINANCE target');
}

if (code.includes(normalizedSetTarget)) {
  code = code.replace(normalizedSetTarget, settingsReplacement);
  console.log('Successfully replaced SETTINGS');
} else {
  console.error('Could not find SETTINGS target');
}

// Update FEEDBACK delegableActions to include "create"
code = code.replace(
  'moduleKey: "FEEDBACK",\n    name: "Feedback & Reviews",\n    description: "Customer trip reviews, ratings, and service recovery logging",\n    route: "/feedback",\n    category: "Engagement & Analytics",\n    isOwnerOnly: false,\n    delegableActions: ["view", "update", "delete"],',
  'moduleKey: "FEEDBACK",\n    name: "Feedback & Reviews",\n    description: "Customer trip reviews, ratings, and service recovery logging",\n    route: "/feedback",\n    category: "Engagement & Analytics",\n    isOwnerOnly: false,\n    delegableActions: ["view", "create", "update", "delete"],'
);

fs.writeFileSync('src/lib/auth/permissions.ts', code);

