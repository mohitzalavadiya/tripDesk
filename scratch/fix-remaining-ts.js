import fs from "fs";

// 1. Fix EnquiryPipelineProps in enquiry-pipeline.tsx
{
  let pipe = fs.readFileSync("src/components/enquiries/enquiry-pipeline.tsx", "utf8");
  const isCrlf = pipe.includes("\r\n");
  if (isCrlf) pipe = pipe.replace(/\r\n/g, "\n");

  pipe = pipe.replace(
    "interface EnquiryPipelineProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;\n  updatingIds?: Record<string, boolean>;\n  onStatusChange?: (id: string, status: EnquiryStatus) => void;",
    "interface EnquiryPipelineProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;\n  updatingIds?: Record<string, boolean>;\n  onStatusChange?: (id: string, status: EnquiryStatus) => void;\n  onArchive?: (id: string, enquiryNumber: string) => void;"
  );

  if (isCrlf) pipe = pipe.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/components/enquiries/enquiry-pipeline.tsx", pipe, "utf8");
  console.log("1. Fixed onArchive in EnquiryPipelineProps");
}

// 2. Fix actionUrl -> linkUrl in enquiry-service.ts
{
  let svc = fs.readFileSync("src/lib/services/enquiry-service.ts", "utf8");
  const isCrlf = svc.includes("\r\n");
  if (isCrlf) svc = svc.replace(/\r\n/g, "\n");

  svc = svc.replace("actionUrl: `/enquiries/${enquiry.id}`,", "linkUrl: `/enquiries/${enquiry.id}`,");

  if (isCrlf) svc = svc.replace(/\n/g, "\r\n");
  fs.writeFileSync("src/lib/services/enquiry-service.ts", svc, "utf8");
  console.log("2. Fixed linkUrl in enquiry-service.ts");
}

