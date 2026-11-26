const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'layout', 'mobile-nav.tsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const oldFilter = `              {navSections.map((section) => {
                const visibleItems = section.items.filter((item) => {
                if (item.ownerOnly && !isAgencyOwner) return false;
                if (isAgencyStaff && item.moduleKey && !hasStaffPermission(item.moduleKey, "view")) {
                  return false;
                }
                return true;
              });`;

const newFilter = `              {navSections.map((section) => {
                const visibleItems = isPlatform
                  ? section.items.filter((item) => {
                      if (item.ownerOnly && !isAgencyOwner && !isPlatformOwner) return false;
                      return true;
                    })
                  : section.items;`;

const oldLock = `const isLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);`;

const newLock = `const isEntitlementLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);
                      const isStaffRestricted = !isPlatform && isAgencyStaff && item.moduleKey ? !hasStaffPermission(item.moduleKey, "view") : false;
                      const isOwnerRestricted = !isPlatform && !isAgencyOwner && Boolean(item.ownerOnly);
                      const isLocked = isEntitlementLocked || isStaffRestricted || isOwnerRestricted;`;

content = content.replace(oldFilter, newFilter);
content = content.replace(oldLock, newLock);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated mobile-nav.tsx');
