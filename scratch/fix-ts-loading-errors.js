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
  "const fetchDocuments = React.useCallback(async () => {\n    setLoading(true);",
  "const fetchDocuments = React.useCallback(async (isSilent = false) => {\n    if (!isSilent) setLoading(true);"
);
docs = docs.replace(
  "const fetchDocuments = React.useCallback(async () => {\r\n    setLoading(true);",
  "const fetchDocuments = React.useCallback(async (isSilent = false) => {\r\n    if (!isSilent) setLoading(true);"
);
fs.writeFileSync("src/app/(dashboard)/documents/page.tsx", docs, "utf8");
console.log("Fixed documents/page.tsx signature");

// 2. feedback/page.tsx
let fb = fs.readFileSync("src/app/(dashboard)/feedback/page.tsx", "utf8");
fb = fb.replace(
  "const fetchFeedbacks = React.useCallback(async () => {\n    setLoading(true);",
  "const fetchFeedbacks = React.useCallback(async (isSilent = false) => {\n    if (!isSilent) setLoading(true);"
);
fb = fb.replace(
  "const fetchFeedbacks = React.useCallback(async () => {\r\n    setLoading(true);",
  "const fetchFeedbacks = React.useCallback(async (isSilent = false) => {\r\n    if (!isSilent) setLoading(true);"
);
fs.writeFileSync("src/app/(dashboard)/feedback/page.tsx", fb, "utf8");
console.log("Fixed feedback/page.tsx signature");

// 3. referrals/page.tsx
let ref = fs.readFileSync("src/app/(dashboard)/referrals/page.tsx", "utf8");
ref = ref.replace(
  "const fetchReferrals = React.useCallback(async () => {\n    setLoading(true);",
  "const fetchReferrals = React.useCallback(async (isSilent = false) => {\n    if (!isSilent) setLoading(true);"
);
ref = ref.replace(
  "const fetchReferrals = React.useCallback(async () => {\r\n    setLoading(true);",
  "const fetchReferrals = React.useCallback(async (isSilent = false) => {\r\n    if (!isSilent) setLoading(true);"
);
fs.writeFileSync("src/app/(dashboard)/referrals/page.tsx", ref, "utf8");
console.log("Fixed referrals/page.tsx signature");

// 4. operations/[tripId]/page.tsx
let opDetail = fs.readFileSync("src/app/(dashboard)/operations/[tripId]/page.tsx", "utf8");
opDetail = opDetail.replace(
  "const fetchOperationData = React.useCallback(async () => {",
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {"
);
opDetail = opDetail.replace(
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\n    if (!isViewAllowed) return;\n    try {\n      setLoading(true);",
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\n    if (!isViewAllowed) return;\n    try {\n      if (!isSilent) setLoading(true);"
);
opDetail = opDetail.replace(
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\r\n    if (!isViewAllowed) return;\r\n    try {\r\n      setLoading(true);",
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\r\n    if (!isViewAllowed) return;\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
fs.writeFileSync("src/app/(dashboard)/operations/[tripId]/page.tsx", opDetail, "utf8");
console.log("Fixed operations/[tripId]/page.tsx signature");

// 5. payments/page.tsx
let payments = fs.readFileSync("src/app/(dashboard)/payments/page.tsx", "utf8");
payments = payments.replace(
  "{loading && payments.length === 0 && (",
  "{loading && filteredItems.length === 0 && ("
);
payments = payments.replace(
  "{!loading && error && payments.length === 0 && (",
  "{!loading && error && filteredItems.length === 0 && ("
);
payments = payments.replace(
  "{(!loading || payments.length > 0) && !error && filteredItems.length === 0 && (",
  "{(!loading || filteredItems.length > 0) && !error && filteredItems.length === 0 && ("
);
payments = payments.replace(
  "{(!loading || payments.length > 0) && !error && filteredItems.length > 0 && (",
  "{(!loading || filteredItems.length > 0) && !error && filteredItems.length > 0 && ("
);
fs.writeFileSync("src/app/(dashboard)/payments/page.tsx", payments, "utf8");
console.log("Fixed payments/page.tsx filteredItems variable");

// 6. follow-ups/page.tsx
let fu = fs.readFileSync("src/app/(dashboard)/follow-ups/page.tsx", "utf8");
fu = fu.replace("onClick={fetchData}", "onClick={() => fetchData()}");
fu = fu.replace('<Button onClick={fetchData} size="sm" variant="outline">', '<Button onClick={() => fetchData()} size="sm" variant="outline">');
fs.writeFileSync("src/app/(dashboard)/follow-ups/page.tsx", fu, "utf8");
console.log("Fixed follow-ups/page.tsx onClick handlers");

// 7. settings/page.tsx
let set = fs.readFileSync("src/app/(dashboard)/settings/page.tsx", "utf8");
set = set.replace("onClick={fetchLogs}", "onClick={() => fetchLogs()}");
fs.writeFileSync("src/app/(dashboard)/settings/page.tsx", set, "utf8");
console.log("Fixed settings/page.tsx onClick handler");

