const fs = require("fs");
let code = fs.readFileSync("src/lib/navigation.ts", "utf8");

code = code.replace(
  `      {\n        label: "Subscription",\n        href: "/subscription",\n        ownerOnly: true,\n        icon: CreditCard,\n        moduleKey: "SUBSCRIPTION",\n      },`,
  `      {\n        label: "Subscription",\n        href: "/subscription",\n        icon: CreditCard,\n        moduleKey: "SUBSCRIPTION",\n      },`
);

fs.writeFileSync("src/lib/navigation.ts", code, "utf8");
console.log("navigation.ts patched, ownerOnly removed from Subscription!");

