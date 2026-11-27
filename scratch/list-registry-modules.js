const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const regex = /moduleKey:\s*"([^"]+)"/g;
let match;
const modules = [];
while ((match = regex.exec(content)) !== null) {
  modules.push(match[1]);
}
console.log('Total modules in registry:', modules.length);
console.log(modules);

