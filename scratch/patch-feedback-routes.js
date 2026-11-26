const fs = require('fs');

// Patch src/app/api/feedback/route.ts
let route1 = fs.readFileSync('src/app/api/feedback/route.ts', 'utf8');
route1 = route1.replace(
  'import { requireAgencyOwnerContext, requireReadAccess,',
  'import { requireReadAccess, requireWriteAccess,'
);
route1 = route1.replace(
  'const authContext = await requireAgencyOwnerContext();',
  `const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "FEEDBACK", "CREATE");`
);
fs.writeFileSync('src/app/api/feedback/route.ts', route1);
console.log('Successfully updated src/app/api/feedback/route.ts');

// Patch src/app/api/feedback/[id]/route.ts
let route2 = fs.readFileSync('src/app/api/feedback/[id]/route.ts', 'utf8');
route2 = route2.replace(
  'import { requireAgencyOwnerContext, requireReadAccess,',
  'import { requireReadAccess, requireWriteAccess,'
);
route2 = route2.replace(
  'const authContext = await requireAgencyOwnerContext();',
  `const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "FEEDBACK", "UPDATE");`
);
fs.writeFileSync('src/app/api/feedback/[id]/route.ts', route2);
console.log('Successfully updated src/app/api/feedback/[id]/route.ts');

