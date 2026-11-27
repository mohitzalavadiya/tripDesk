const fs = require('fs');
let code = fs.readFileSync('src/lib/navigation.ts', 'utf8');

// Update Finance item in agencyNavigationConfig
code = code.replace(
  /\{\s*label:\s*"Finance",\s*href:\s*"\/finance",\s*icon:\s*IndianRupee,\s*ownerOnly:\s*true,\s*moduleKey:\s*"FINANCE",\s*\}/,
  `{
        label: "Finance",
        href: "/finance",
        icon: IndianRupee,
        moduleKey: "FINANCE",
      }`
);

// Update Agency Settings item in agencyNavigationConfig
code = code.replace(
  /\{\s*label:\s*"Agency Settings",\s*href:\s*"\/settings",\s*ownerOnly:\s*true,\s*icon:\s*Settings,\s*moduleKey:\s*"SETTINGS",\s*\}/,
  `{
        label: "Agency Settings",
        href: "/settings",
        icon: Settings,
        moduleKey: "SETTINGS",
      }`
);

fs.writeFileSync('src/lib/navigation.ts', code);
console.log('Successfully updated src/lib/navigation.ts');

