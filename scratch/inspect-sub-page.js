const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/subscription/page.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(0, 60).join('\n'));

