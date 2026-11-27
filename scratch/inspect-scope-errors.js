const fs = require('fs');

console.log('=== operations/[tripId]/page.tsx around line 90-110 ===');
const ops = fs.readFileSync('src/app/(dashboard)/operations/[tripId]/page.tsx', 'utf8').split('\n');
console.log(ops.slice(85, 115).join('\n'));

console.log('=== trips/[id]/quotation/page.tsx around line 740-755 ===');
const q = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', 'utf8').split('\n');
console.log(q.slice(740, 760).join('\n'));

console.log('=== trips/[id]/quotation/preview/page.tsx around line 45-65 ===');
const p = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/preview/page.tsx', 'utf8').split('\n');
console.log(p.slice(45, 65).join('\n'));

