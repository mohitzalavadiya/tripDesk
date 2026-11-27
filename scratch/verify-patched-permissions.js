const fs = require("fs");
const code = fs.readFileSync("src/lib/auth/permissions.ts", "utf8");

console.log("IMMUTABLE_OWNER_ONLY_MODULES:", code.match(/export const IMMUTABLE_OWNER_ONLY_MODULES = [^;]+;/)?.[0]);
console.log("DELEGABLE_STAFF_DELETE_MODULES has TEAM:", code.includes('"TEAM",\n]);'));
console.log("PAGE_PERMISSIONS_REGISTRY has TRIP_COSTING:", code.includes('moduleKey: "TRIP_COSTING"'));
console.log("PAGE_PERMISSIONS_REGISTRY has TEAM:", code.includes('moduleKey: "TEAM"'));
console.log("SUBSCRIPTION isOwnerOnly:", code.match(/moduleKey: "SUBSCRIPTION",[\s\S]*?isOwnerOnly: ([a-z]+)/)?.[1]);

