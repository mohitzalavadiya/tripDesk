const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('export async function evaluateStaffPermission'));
console.log(lines.slice(idx, idx + 15).join('\n'));

