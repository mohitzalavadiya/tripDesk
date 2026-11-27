const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/trips/[id]/quotation/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function TripQuotationBuilderPage') || l.includes('useAuth')) {
    console.log(i + 1, l);
  }
});

