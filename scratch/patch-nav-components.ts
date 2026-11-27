import * as fs from 'fs';
import * as path from 'path';

// 1. Patch sidebar.tsx
const sidebarFile = path.join(__dirname, '../src/components/layout/sidebar.tsx');
let sidebarContent = fs.readFileSync(sidebarFile, 'utf-8');

const sbTargetAuth = `const { isPlatformOwner, isAgencyOwner } = useAuth();`;
const sbReplaceAuth = `const { isPlatformOwner, isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`;

const sbTargetFilter = `const visibleItems = section.items.filter((item) => !item.ownerOnly || isAgencyOwner);`;
const sbReplaceFilter = `const visibleItems = section.items.filter((item) => {
              if (item.ownerOnly && !isAgencyOwner) return false;
              if (isAgencyStaff && item.moduleKey && !hasStaffPermission(item.moduleKey, "view")) {
                return false;
              }
              return true;
            });`;

let sbNorm = sidebarContent.replace(/\r\n/g, '\n');
if (!sbNorm.includes(sbTargetAuth) || !sbNorm.includes(sbTargetFilter)) {
  console.error('Sidebar targets not found!');
  process.exit(1);
}
sbNorm = sbNorm.replace(sbTargetAuth, sbReplaceAuth).replace(sbTargetFilter, sbReplaceFilter);
const sbFinal = sidebarContent.includes('\r\n') ? sbNorm.replace(/\n/g, '\r\n') : sbNorm;
fs.writeFileSync(sidebarFile, sbFinal, 'utf-8');
console.log('Successfully updated sidebar.tsx!');

// 2. Patch mobile-nav.tsx
const mobileFile = path.join(__dirname, '../src/components/layout/mobile-nav.tsx');
let mobileContent = fs.readFileSync(mobileFile, 'utf-8');

const mbTargetAuth = `const { isPlatformOwner, isAgencyOwner } = useAuth();`;
const mbReplaceAuth = `const { isPlatformOwner, isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();`;

const mbTargetFilter = `const visibleItems = section.items.filter((item) => !item.ownerOnly || isAgencyOwner);`;
const mbReplaceFilter = `const visibleItems = section.items.filter((item) => {
                if (item.ownerOnly && !isAgencyOwner) return false;
                if (isAgencyStaff && item.moduleKey && !hasStaffPermission(item.moduleKey, "view")) {
                  return false;
                }
                return true;
              });`;

let mbNorm = mobileContent.replace(/\r\n/g, '\n');
if (!mbNorm.includes(mbTargetAuth) || !mbNorm.includes(mbTargetFilter)) {
  console.error('Mobile nav targets not found!');
  process.exit(1);
}
mbNorm = mbNorm.replace(mbTargetAuth, mbReplaceAuth).replace(mbTargetFilter, mbReplaceFilter);
const mbFinal = mobileContent.includes('\r\n') ? mbNorm.replace(/\n/g, '\r\n') : mbNorm;
fs.writeFileSync(mobileFile, mbFinal, 'utf-8');
console.log('Successfully updated mobile-nav.tsx!');

