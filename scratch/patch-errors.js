import fs from "fs";

let content = fs.readFileSync("src/lib/api/errors.ts", "utf8");

content = content.replace(
  /export class NotFoundError extends ApiError \{\s*constructor\(resource = "Requested resource", details\?: any\) \{\s*super\(404, "NOT_FOUND", `\$\{resource\} not found\.`, details\);\s*\}\s*\}/,
  `export class NotFoundError extends ApiError {
  constructor(resource = "Requested resource", details?: any) {
    const msg = resource.endsWith(" not found.") || resource.endsWith(" not found")
      ? (resource.endsWith(".") ? resource : \`\${resource}.\`)
      : resource.includes(" not found")
      ? (resource.endsWith(".") ? resource : \`\${resource}.\`)
      : \`\${resource} not found.\`;
    super(404, "NOT_FOUND", msg, details);
  }
}`
);

fs.writeFileSync("src/lib/api/errors.ts", content, "utf8");
console.log("Updated errors.ts successfully!");

