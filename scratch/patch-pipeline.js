import fs from "fs";

let content = fs.readFileSync("src/components/enquiries/enquiry-pipeline.tsx", "utf8");

// 1. Add updatingIds to interface
content = content.replace(
  "interface EnquiryPipelineProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;",
  "interface EnquiryPipelineProps {\n  enquiries: EnquiryWithRelations[];\n  isReadOnly?: boolean;\n  updatingIds?: Record<string, boolean>;"
);

// 2. Destructure updatingIds
content = content.replace(
  "export function EnquiryPipeline({\n  enquiries,\n  isReadOnly,\n  onStatusChange,",
  "export function EnquiryPipeline({\n  enquiries,\n  isReadOnly,\n  updatingIds,\n  onStatusChange,"
);

// 3. Update column height and width
content = content.replace(
  "className={`flex-1 min-w-73.75 max-w-82.5 rounded-2xl border flex flex-col select-none shrink-0 shadow-2xs overflow-hidden h-[calc(100vh-380px)] min-h-[360px] max-h-[750px] ${stage.columnBg} ${stage.borderClass}`}",
  "className={`flex-1 min-w-[280px] max-w-[340px] rounded-2xl border flex flex-col select-none shrink-0 shadow-2xs overflow-hidden h-[calc(100vh-215px)] min-h-[480px] ${stage.columnBg} ${stage.borderClass}`}"
);

// 4. Add card spinner overlay when updating
const targetCard = `<div
                          key={enq.id}
                          onClick={() => router.push(\`/enquiries/\${enq.id}\`)}
                          className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md hover:border-teal-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer space-y-2 group relative"
                        >`;

const replacementCard = `<div
                          key={enq.id}
                          onClick={() => router.push(\`/enquiries/\${enq.id}\`)}
                          className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md hover:border-teal-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer space-y-2 group relative"
                        >
                          {updatingIds?.[enq.id] && (
                            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs rounded-xl flex items-center justify-center z-20">
                              <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
                            </div>
                          )}`;

if (!content.includes(targetCard)) {
  console.error("targetCard not found!");
  process.exit(1);
}

content = content.replace(targetCard, replacementCard);
fs.writeFileSync("src/components/enquiries/enquiry-pipeline.tsx", content, "utf8");
console.log("Updated enquiry-pipeline.tsx successfully!");

