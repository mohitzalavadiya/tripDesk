const fs = require('fs');
let c = fs.readFileSync('src/app/api/dashboard/export/route.ts', 'utf8');
c = c.replace(/if\s*\(!hasPermission\([^\)]+\)\)\s*\{[\s\S]*?throw new ForbiddenError\([^\)]+\);\s*\}/, 'await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DASHBOARD", "EXPORT");');
fs.writeFileSync('src/app/api/dashboard/export/route.ts', c);
console.log('Fixed dashboard/export/route.ts');

