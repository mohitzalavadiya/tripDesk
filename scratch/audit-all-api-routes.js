const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (f === 'route.ts') {
      results.push(full);
    }
  }
  return results;
}

const apiRoutes = walk('src/app/api');
const nonAdminRoutes = apiRoutes.filter(r => !r.includes('/admin/') && !r.includes('\\admin\\') && !r.includes('/auth/') && !r.includes('\\auth\\') && !r.includes('/customer/') && !r.includes('\\customer\\'));

const summary = [];
for (const r of nonAdminRoutes) {
  const content = fs.readFileSync(r, 'utf8');
  const rel = r.replace(/\\/g, '/').replace('src/app/api/', '');
  const hasRequireRead = content.includes('requireReadAccess');
  const hasRequireWrite = content.includes('requireWriteAccess');
  const hasRequireOwner = content.includes('requireAgencyOwnerContext');
  const hasEnforce = content.includes('enforceStaffPermission');
  const hasCanAccessMargins = content.includes('canAccessFinancialMargins');
  const hasEvaluate = content.includes('evaluateStaffPermission') || content.includes('hasPermission');
  summary.push({
    rel,
    hasRequireRead,
    hasRequireWrite,
    hasRequireOwner,
    hasEnforce,
    hasCanAccessMargins,
    hasEvaluate,
  });
}

console.log('Total non-admin API routes:', summary.length);
const unguided = summary.filter(s => !s.hasEnforce && !s.hasRequireOwner && !s.hasCanAccessMargins);
console.log('Routes without explicit staff permission or owner check:', unguided.length);
console.log(unguided.map(u => u.rel));

