import { agencyNavigationConfig } from "../src/lib/navigation";

const items = agencyNavigationConfig.flatMap((s) => s.items);
console.log("Total agencyNavigationConfig items:", items.length);
console.log(items.map((i) => `${i.label} -> ${i.href} (${i.moduleKey || "NONE"})`).join("\n"));
