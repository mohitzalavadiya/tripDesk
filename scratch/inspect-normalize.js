const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('function normalizeStaffPermissions'));
console.log(lines.slice(idx, idx + 45).join('\n'));

