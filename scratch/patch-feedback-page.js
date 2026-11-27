const fs = require('fs');

let code = fs.readFileSync('src/app/(dashboard)/feedback/page.tsx', 'utf8');

code = code.replace(
  'const { isAgencyOwner } = useAuth();',
  `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();
  const canManageSettings = isAgencyOwner || (isAgencyStaff && hasStaffPermission("FEEDBACK", "update"));`
);

code = code.replace(
  'primaryAction={isAgencyOwner ? {',
  'primaryAction={canManageSettings ? {'
);

code = code.replace(
  '{isSettingsOpen && isAgencyOwner && (',
  '{isSettingsOpen && canManageSettings && ('
);

fs.writeFileSync('src/app/(dashboard)/feedback/page.tsx', code);
console.log('Successfully updated src/app/(dashboard)/feedback/page.tsx');

