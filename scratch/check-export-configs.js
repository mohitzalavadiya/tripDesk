const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('moduleKey: "REPORTS"') || l.includes('moduleKey: "OPERATIONS"') || l.includes('moduleKey: "DASHBOARD"')) {
    console.log(lines.slice(i, i + 12).join('\n'));
    console.log('---');
  }
});

