const fs = require('fs');
const content = fs.readFileSync('src/lib/auth/permissions.ts', 'utf8');
const regex = /moduleKey:\s*"([^"]+)"[\s\S]*?isOwnerOnly:\s*(true|false)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  if (match[2] === 'true') {
    console.log(match[1], 'isOwnerOnly:', match[2]);
  }
}

