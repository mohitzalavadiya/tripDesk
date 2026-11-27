const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(75, 90).join('\n'));

