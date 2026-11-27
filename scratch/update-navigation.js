const fs = require('fs');
let content = fs.readFileSync('src/lib/navigation.ts', 'utf8');

// 1. Customer Insights: remove ownerOnly: true
content = content.replace(
  /label: "Customer Insights",\r?\n\s+href: "\/customer-insights",\r?\n\s+icon: TrendingUp,\r?\n\s+featureKey: "CUSTOMER_INSIGHTS",\r?\n\s+ownerOnly: true,\r?\n\s+moduleKey: "CUSTOMER_INSIGHTS",/,
  'label: "Customer Insights",\n        href: "/customer-insights",\n        icon: TrendingUp,\n        featureKey: "CUSTOMER_INSIGHTS",\n        moduleKey: "CUSTOMER_INSIGHTS",'
);

// 2. Rate Sheets: remove ownerOnly: true
content = content.replace(
  /label: "Rate Sheets",\r?\n\s+href: "\/rate-sheets",\r?\n\s+icon: FileSpreadsheet,\r?\n\s+ownerOnly: true,\r?\n\s+moduleKey: "RATE_SHEETS",/,
  'label: "Rate Sheets",\n        href: "/rate-sheets",\n        icon: FileSpreadsheet,\n        moduleKey: "RATE_SHEETS",'
);

// 3. Suppliers: remove ownerOnly: true
content = content.replace(
  /label: "Suppliers",\r?\n\s+href: "\/suppliers",\r?\n\s+icon: Building,\r?\n\s+ownerOnly: true,\r?\n\s+moduleKey: "SUPPLIERS",/,
  'label: "Suppliers",\n        href: "/suppliers",\n        icon: Building,\n        moduleKey: "SUPPLIERS",'
);

// 4. Invoices: remove ownerOnly: true
content = content.replace(
  /label: "Invoices",\r?\n\s+href: "\/invoices",\r?\n\s+icon: FileText,\r?\n\s+ownerOnly: true,\r?\n\s+moduleKey: "INVOICES",/,
  'label: "Invoices",\n        href: "/invoices",\n        icon: FileText,\n        moduleKey: "INVOICES",'
);

// 5. Reports: remove ownerOnly: true
content = content.replace(
  /label: "Reports & Analytics",\r?\n\s+href: "\/reports",\r?\n\s+icon: BarChart,\r?\n\s+featureKey: "REPORTS_ANALYTICS",\r?\n\s+ownerOnly: true,\r?\n\s+moduleKey: "REPORTS",/,
  'label: "Reports & Analytics",\n        href: "/reports",\n        icon: BarChart,\n        featureKey: "REPORTS_ANALYTICS",\n        moduleKey: "REPORTS",'
);

fs.writeFileSync('src/lib/navigation.ts', content, 'utf8');
console.log('Successfully updated navigation.ts');

