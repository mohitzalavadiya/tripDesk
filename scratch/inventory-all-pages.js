const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file === 'page.tsx') {
      results.push(fullPath);
    }
  });
  return results;
}

const pages = getFiles('src/app/(dashboard)');
console.log('Total dashboard page.tsx files:', pages.length);
const rows = pages.sort().map((p, idx) => {
  const rel = p.replace(/\\/g, '/');
  const content = fs.readFileSync(p, 'utf8');
  const hasOwnerRestricted = content.includes('OwnerRestrictedCard');
  const hasIsAgencyOwner = content.includes('isAgencyOwner');
  const hasHasStaffPerm = content.includes('hasStaffPermission');
  const hasUseAuth = content.includes('useAuth');
  return {
    index: idx + 1,
    path: rel,
    hasOwnerRestricted,
    hasIsAgencyOwner,
    hasHasStaffPerm,
    hasUseAuth
  };
});

console.log(JSON.stringify(rows, null, 2));

