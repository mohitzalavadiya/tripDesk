const fs = require('fs');
const path = require('path');

function getDashboardPages(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getDashboardPages(full, list);
    } else if (entry.name === 'page.tsx') {
      list.push(full);
    }
  }
  return list;
}

const pages = getDashboardPages('src/app/(dashboard)');
console.log(`Found ${pages.length} dashboard routes.`);

const routeAnalysis = [];

for (const p of pages) {
  const rel = path.relative(process.cwd(), p).replace(/\\/g, '/');
  const routePath = '/' + path.relative('src/app/(dashboard)', path.dirname(p)).replace(/\\/g, '/');
  const normalizedRoute = routePath === '/.' ? '/' : routePath;

  const content = fs.readFileSync(p, 'utf8');

  // Check imports
  const hasRestrictedCardImport = content.includes('OwnerRestrictedCard');
  const hasAuthImport = content.includes('useAuth');

  // Check permission checks
  const checksPerm = content.includes('hasStaffPermission');
  const checksOwner = content.includes('isAgencyOwner');
  const checksStaff = content.includes('isAgencyStaff');

  // Check for hardcoded owner block
  const hasPureOwnerGate = /if\s*\(\s*(!isAgencyOwner|isAgencyOwner\s*===?\s*false)\s*\)/.test(content) && !content.includes('hasStaffPermission');

  routeAnalysis.push({
    file: rel,
    route: normalizedRoute,
    hasRestrictedCardImport,
    hasAuthImport,
    checksPerm,
    checksOwner,
    checksStaff,
    hasPureOwnerGate
  });
}

console.log(JSON.stringify(routeAnalysis, null, 2));
fs.writeFileSync('scratch/route-guard-analysis.json', JSON.stringify(routeAnalysis, null, 2));

