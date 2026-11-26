const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'auth', 'permissions.ts');
let content = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

const oldReduce = `export const DEFAULT_STAFF_PERMISSIONS: StaffPermissionsProfileMap = PAGE_PERMISSIONS_REGISTRY.reduce(
  (acc, page) => {
    acc[page.moduleKey] = { ...page.defaultPermissions };
    return acc;
  },
  {} as StaffPermissionsProfileMap
);`;

const newReduce = `export const DEFAULT_STAFF_PERMISSIONS: StaffPermissionsProfileMap = PAGE_PERMISSIONS_REGISTRY.reduce(
  (acc, page) => {
    if (!page.isOwnerOnly) {
      acc[page.moduleKey] = { ...page.defaultPermissions };
    }
    return acc;
  },
  {} as StaffPermissionsProfileMap
);`;

if (content.includes(oldReduce)) {
  content = content.replace(oldReduce, newReduce);
  fs.writeFileSync(targetPath, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated DEFAULT_STAFF_PERMISSIONS in permissions.ts');
} else {
  console.error('Target not found in permissions.ts');
}

