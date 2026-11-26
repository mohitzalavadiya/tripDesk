const fs = require('fs');
let content = fs.readFileSync('TRIPDESK_MASTER_CONTEXT_FINAL_V3.md', 'utf8');

const target = "- **Phase 1 Focused Suite (`npm run test:staff:failures`):** **16 / 16 Passed (100%)**";
const replacement = `- **Phase 1 Focused Suite (\`npm run test:staff:failures\`):** **25 / 25 Passed (100%)**`;

if (!content.includes(target)) {
  console.error("Could not find target");
  process.exit(1);
}

content = content.replace(target, replacement);

const cat4Target = "    - Real database execution against connected PostgreSQL asserts fail-closed `{}` for unmigrated table";
const cat5Addition = `    - Real database execution against connected PostgreSQL asserts fail-closed \`{}\` for unmigrated table
  - Category 5 (Team Permissions API, Mutation Guards & Error Handling Invariants): 9/9 passed
    - 503 MIGRATION_REQUIRED verified for unmigrated schema; successful update; schema validation (400); unauthorized & forbidden access (401/403); cross-tenant isolation (404); self-modification guard (400); database failure privacy (500 non-leaking); frontend error message parsing contracts`;

content = content.replace(cat4Target, cat5Addition);

fs.writeFileSync('TRIPDESK_MASTER_CONTEXT_FINAL_V3.md', content, 'utf8');
console.log("Updated V3 with Category 5 results");

