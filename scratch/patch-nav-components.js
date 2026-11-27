const fs = require('fs');
const path = require('path');

// 1. Patch sidebar.tsx
const sidebarPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'sidebar.tsx');
let sidebar = fs.readFileSync(sidebarPath, 'utf8').replace(/\r\n/g, '\n');

// Replace visibleItems filtering
const oldSidebarFilter = `          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.ownerOnly && !isAgencyOwner) return false;
              if (isAgencyStaff && item.moduleKey && !hasStaffPermission(item.moduleKey, "view")) {
                return false;
              }
              return true;
            });
            if (visibleItems.length === 0) return null;`;

const newSidebarFilter = `          {navSections.map((section) => {
            const visibleItems = isPlatform
              ? section.items.filter((item) => {
                  if (item.ownerOnly && !isAgencyOwner && !isPlatformOwner) return false;
                  return true;
                })
              : section.items;
            if (visibleItems.length === 0) return null;`;

sidebar = sidebar.replace(oldSidebarFilter, newSidebarFilter);

// Replace isLocked calculation
const oldSidebarLock = `                  const isFeatureGated = !isPlatform && Boolean(item.featureKey);
                  const isLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);`;

const newSidebarLock = `                  const isFeatureGated = !isPlatform && Boolean(item.featureKey);
                  const isEntitlementLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);
                  const isStaffRestricted = !isPlatform && isAgencyStaff && item.moduleKey ? !hasStaffPermission(item.moduleKey, "view") : false;
                  const isOwnerRestricted = !isPlatform && !isAgencyOwner && Boolean(item.ownerOnly);
                  const isLocked = isEntitlementLocked || isStaffRestricted || isOwnerRestricted;`;

sidebar = sidebar.replace(oldSidebarLock, newSidebarLock);

fs.writeFileSync(sidebarPath, sidebar.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched sidebar.tsx');

// 2. Patch mobile-nav.tsx
const mobileNavPath = path.join(__dirname, '..', 'src', 'components', 'layout', 'mobile-nav.tsx');
let mobileNav = fs.readFileSync(mobileNavPath, 'utf8').replace(/\r\n/g, '\n');

const oldMobileFilter = `              {navSections.map((section) => {
                const visibleItems = section.items.filter((item) => {
                if (item.ownerOnly && !isAgencyOwner) return false;
                if (isAgencyStaff && item.moduleKey && !hasStaffPermission(item.moduleKey, "view")) {
                  return false;
                }
                return true;
              });
              if (visibleItems.length === 0) return null;`;

const newMobileFilter = `              {navSections.map((section) => {
                const visibleItems = isPlatform
                  ? section.items.filter((item) => {
                      if (item.ownerOnly && !isAgencyOwner && !isPlatformOwner) return false;
                      return true;
                    })
                  : section.items;
                if (visibleItems.length === 0) return null;`;

mobileNav = mobileNav.replace(oldMobileFilter, newMobileFilter);

const oldMobileLock = `                  const isFeatureGated = !isPlatform && Boolean(item.featureKey);
                  const isLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);`;

const newMobileLock = `                  const isFeatureGated = !isPlatform && Boolean(item.featureKey);
                  const isEntitlementLocked = isFeatureGated && !isFeatureAllowed(item.featureKey as keyof EntitlementsState);
                  const isStaffRestricted = !isPlatform && isAgencyStaff && item.moduleKey ? !hasStaffPermission(item.moduleKey, "view") : false;
                  const isOwnerRestricted = !isPlatform && !isAgencyOwner && Boolean(item.ownerOnly);
                  const isLocked = isEntitlementLocked || isStaffRestricted || isOwnerRestricted;`;

mobileNav = mobileNav.replace(oldMobileLock, newMobileLock);

fs.writeFileSync(mobileNavPath, mobileNav.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched mobile-nav.tsx');

