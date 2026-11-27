const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function canAccessFinancialMargins')) {
    console.log(lines.slice(i - 2, i + 25).join('\n'));
  }
});

