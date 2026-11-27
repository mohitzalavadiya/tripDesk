const fs = require('fs');
let c = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');

c = c.replace(
`    // Sub-actions preserved only if view is allowed (forced false otherwise)
    for (const [subAction, subVal] of Object.entries(valObj)) {
      if (!["view", "create", "update", "delete"].includes(subAction)) {
        normalized[cleanKey][subAction] = viewAllowed ? Boolean(subVal) : false;
      }
    }`,
`    // Sub-actions preserved only if view is allowed
    if (viewAllowed) {
      for (const [subAction, subVal] of Object.entries(valObj)) {
        if (!["view", "create", "update", "delete"].includes(subAction)) {
          normalized[cleanKey][subAction] = Boolean(subVal);
        }
      }
    }`
);

fs.writeFileSync('src/lib/auth/permissions.ts', c);
console.log('Restored original sub-actions behavior in normalizeStaffPermissions');

