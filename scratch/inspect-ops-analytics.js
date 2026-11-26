const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/operations/analytics/page.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(70, 115).join('\n'));

