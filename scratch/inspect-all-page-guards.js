const fs = require("fs");
const path = require("path");

const pages = [
  "/activities",
  "/activities/[id]",
  "/activities/new",
  "/bookings",
  "/bookings/[id]",
  "/bookings/new",
  "/communications",
  "/customer-insights",
  "/customers",
  "/customers/[id]",
  "/customers/new",
  "/dashboard",
  "/destinations",
  "/documents",
  "/enquiries",
  "/enquiries/[id]",
  "/enquiries/new",
  "/feedback",
  "/finance",
  "/follow-ups",
  "/hotels",
  "/hotels/[id]",
  "/hotels/new",
  "/invoices",
  "/invoices/[id]",
  "/operations",
  "/operations/[tripId]",
  "/operations/analytics",
  "/operations/issues",
  "/payments",
  "/quotations",
  "/quotations/[id]",
  "/quotations/new",
  "/rate-sheets",
  "/rate-sheets/[id]",
  "/rate-sheets/new",
  "/referrals",
  "/reports",
  "/settings",
  "/subscription",
  "/suppliers",
  "/suppliers/[id]",
  "/suppliers/new",
  "/support",
  "/trips",
  "/trips/[id]",
  "/trips/[id]/costing",
  "/trips/[id]/quotation",
  "/trips/[id]/quotation/preview",
  "/trips/new",
  "/vehicles",
  "/vehicles/[id]",
  "/vehicles/new"
];

const results = [];

for (const p of pages) {
  const filePath = path.join("src/app/(dashboard)", p.replace(/\//g, path.sep), "page.tsx");
  if (!fs.existsSync(filePath)) {
    results.push({ page: p, exists: false });
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  
  // Extract hasStaffPermission check
  const permMatches = [...content.matchAll(/hasStaffPermission\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/g)];
  const permissionsChecked = permMatches.map(m => ({ module: m[1], action: m[2] || "view" }));
  
  // Check OwnerRestrictedCard
  const hasRestrictedCard = content.includes("OwnerRestrictedCard");
  const hasOwnerCheck = content.includes("isAgencyOwner");
  const hasStaffCheck = content.includes("isAgencyStaff");
  
  results.push({
    page: p,
    filePath,
    permissionsChecked,
    hasRestrictedCard,
    hasOwnerCheck,
    hasStaffCheck
  });
}

console.log(JSON.stringify(results, null, 2));

