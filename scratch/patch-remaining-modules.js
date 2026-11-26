import fs from "fs";

// 1. documents/page.tsx
let docs = fs.readFileSync("src/app/(dashboard)/documents/page.tsx", "utf8");
docs = docs.replace(
  "const fetchDocuments = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchDocuments = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
docs = docs.replace(
  "const fetchDocuments = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchDocuments = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
docs = docs.replace(
  "} finally {\n      setLoading(false);",
  "} finally {\n      if (!isSilent) setLoading(false);"
);
docs = docs.replace(
  "} finally {\r\n      setLoading(false);",
  "} finally {\r\n      if (!isSilent) setLoading(false);"
);
docs = docs.replace(
  "{loading ? (\n            <div className=\"p-4\">\n              <TableSkeleton rows={8} />\n            </div>",
  "{loading && documents.length === 0 ? (\n            <div className=\"p-4\">\n              <TableSkeleton rows={8} />\n            </div>"
);
docs = docs.replace(
  "{loading ? (\r\n            <div className=\"p-4\">\r\n              <TableSkeleton rows={8} />\r\n            </div>",
  "{loading && documents.length === 0 ? (\r\n            <div className=\"p-4\">\r\n              <TableSkeleton rows={8} />\r\n            </div>"
);
docs = docs.replace(/await\s+fetchDocuments\(\);/g, "await fetchDocuments(true);");
fs.writeFileSync("src/app/(dashboard)/documents/page.tsx", docs, "utf8");
console.log("Patched documents/page.tsx");

// 2. feedback/page.tsx
let fb = fs.readFileSync("src/app/(dashboard)/feedback/page.tsx", "utf8");
fb = fb.replace(
  "const fetchFeedbacks = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchFeedbacks = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
fb = fb.replace(
  "const fetchFeedbacks = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchFeedbacks = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
fb = fb.replace(
  "} finally {\n      setLoading(false);",
  "} finally {\n      if (!isSilent) setLoading(false);"
);
fb = fb.replace(
  "} finally {\r\n      setLoading(false);",
  "} finally {\r\n      if (!isSilent) setLoading(false);"
);
fb = fb.replace(
  "{loading ? (\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-3xl",
  "{loading && feedbacks.length === 0 ? (\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-3xl"
);
fb = fb.replace(
  "{loading ? (\r\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-3xl",
  "{loading && feedbacks.length === 0 ? (\r\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-3xl"
);
fb = fb.replace(/(\s+)fetchFeedbacks\(\);/g, (match, prefix, offset) => {
  const preceding = fb.slice(Math.max(0, offset - 50), offset);
  if (preceding.includes("useEffect") || preceding.includes("useCallback")) return match;
  return prefix + "fetchFeedbacks(true);";
});
fs.writeFileSync("src/app/(dashboard)/feedback/page.tsx", fb, "utf8");
console.log("Patched feedback/page.tsx");

// 3. referrals/page.tsx
let ref = fs.readFileSync("src/app/(dashboard)/referrals/page.tsx", "utf8");
ref = ref.replace(
  "const fetchReferrals = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchReferrals = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
ref = ref.replace(
  "const fetchReferrals = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchReferrals = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
ref = ref.replace(
  "} finally {\n      setLoading(false);",
  "} finally {\n      if (!isSilent) setLoading(false);"
);
ref = ref.replace(
  "} finally {\r\n      setLoading(false);",
  "} finally {\r\n      if (!isSilent) setLoading(false);"
);
ref = ref.replace(
  "{loading ? (\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-2xl",
  "{loading && referrals.length === 0 ? (\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-2xl"
);
ref = ref.replace(
  "{loading ? (\r\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-2xl",
  "{loading && referrals.length === 0 ? (\r\n            <div className=\"flex items-center justify-center p-16 bg-white rounded-2xl"
);
ref = ref.replace(/(\s+)fetchReferrals\(\);/g, (match, prefix, offset) => {
  const preceding = ref.slice(Math.max(0, offset - 50), offset);
  if (preceding.includes("useEffect") || preceding.includes("useCallback")) return match;
  return prefix + "fetchReferrals(true);";
});
fs.writeFileSync("src/app/(dashboard)/referrals/page.tsx", ref, "utf8");
console.log("Patched referrals/page.tsx");

