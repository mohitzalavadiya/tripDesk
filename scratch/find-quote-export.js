const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', 'utf8');
const match = content.match(/export default function\s+([A-Za-z0-9_]+)/);
console.log(match ? match[0] : 'no match');

