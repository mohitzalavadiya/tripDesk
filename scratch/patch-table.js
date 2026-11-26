import fs from "fs";

let content = fs.readFileSync("src/components/enquiries/enquiry-table.tsx", "utf8");

content = content.replace(
  "interface EnquiryTableProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;",
  "interface EnquiryTableProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;\n  updatingIds?: Record<string, boolean>;"
);

content = content.replace(
  "export function EnquiryTable({\n  enquiries,\n  isReadOnly = false,\n  onStatusChange,",
  "export function EnquiryTable({\n  enquiries,\n  isReadOnly = false,\n  updatingIds,\n  onStatusChange,"
);

fs.writeFileSync("src/components/enquiries/enquiry-table.tsx", content, "utf8");
console.log("Updated enquiry-table.tsx successfully!");

