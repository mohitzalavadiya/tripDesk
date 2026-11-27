const fs = require('fs');
const readline = require('readline');

async function restore() {
  const rl = readline.createInterface({
    input: fs.createReadStream('C:/Users/hp/.gemini/antigravity/brain/5f7ac8c3-d2a3-45c5-ab91-ed83b687d083/.system_generated/logs/transcript_full.jsonl')
  });

  let initialContent = '';
  let edit1963, edit1967, edit2020;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1470) initialContent = JSON.parse(line).tool_calls[0].args.Content;
    if (lineNum === 1963) edit1963 = JSON.parse(line).tool_calls[0].args;
    if (lineNum === 1967) edit1967 = JSON.parse(line).tool_calls[0].args;
    if (lineNum === 2020) edit2020 = JSON.parse(line).tool_calls[0].args;
  }

  let content = initialContent.replace(/\r\n/g, '\n');
  fs.writeFileSync('prisma/test-staff-failures-phase1.ts', content, 'utf8');

  // Run patch-test-suite.ts using tsx or node
  require('child_process').execSync('npx tsx scratch/patch-test-suite.ts', { stdio: 'inherit' });

  // Read back
  content = fs.readFileSync('prisma/test-staff-failures-phase1.ts', 'utf8').replace(/\r\n/g, '\n');

  // Apply 1963
  content = content.replace(edit1963.Target.replace(/\r\n/g, '\n'), edit1963.Replacement.replace(/\r\n/g, '\n'));
  // Apply 1967
  content = content.replace(edit1967.Target.replace(/\r\n/g, '\n'), edit1967.Replacement.replace(/\r\n/g, '\n'));
  // Apply 2020
  content = content.replace(edit2020.Target.replace(/\r\n/g, '\n'), edit2020.Replacement.replace(/\r\n/g, '\n'));

  fs.writeFileSync('prisma/test-staff-failures-phase1.ts', content, 'utf8');
  console.log('Restoration complete! Current file length:', content.length);
}

restore().catch(console.error);

