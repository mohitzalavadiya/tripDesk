const fs = require('fs');
function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules' || f === '.next' || f === '.git' || f === '.gemini') continue;
    const p = dir + '/' + f;
    try {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        search(p);
      } else if (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.txt')) {
        const txt = fs.readFileSync(p, 'utf8');
        if (txt.includes('SELECT "id", "agencyId", "convertedTripId"')) {
          console.log('Match:', p);
        }
      }
    } catch (e) {}
  }
}
search('.');

