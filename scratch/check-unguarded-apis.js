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
const nonAdminRoutes = apiRoutes.filter(r => 
  !r.includes('/admin/') && !r.includes('\\admin\\') &&
  !r.includes('/auth/') && !r.includes('\\auth\\') &&
  !r.includes('/customer/') && !r.includes('\\customer\\') &&
  !r.includes('/public/') && !r.includes('\\public\\') &&
  !r.includes('/webhooks/') && !r.includes('\\webhooks\\') &&
  !r.includes('health')
);

const unguided = [];
for (const r of nonAdminRoutes) {
  const content = fs.readFileSync(r, 'utf8');
  const rel = r.replace(/\\/g, '/').replace('src/app/api/', '');
  const hasGuard = 
    content.includes('enforceStaffPermission') ||
    content.includes('staffPermissionService') ||
    content.includes('requireAgencyOwnerContext') ||
    content.includes('canAccessFinancialMargins') ||
    content.includes('hasStaffPermission') ||
    content.includes('hasPermission');
  
  if (!hasGuard) {
    unguided.push(rel);
  }
}

console.log('Total checked API routes:', nonAdminRoutes.length);
console.log('Routes without staff/owner permission guard:', unguided.length);
console.log(unguided);

