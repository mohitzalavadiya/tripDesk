import fs from "fs";

// 1. operations/[tripId]/page.tsx
let opDetail = fs.readFileSync("src/app/(dashboard)/operations/[tripId]/page.tsx", "utf8");
opDetail = opDetail.replace(
  "const fetchOperationData = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
opDetail = opDetail.replace(
  "const fetchOperationData = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchOperationData = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
opDetail = opDetail.replace(
  "} finally {\n      setLoading(false);\n    }\n  }, [tripId]);",
  "} finally {\n      if (!isSilent) setLoading(false);\n    }\n  }, [tripId]);"
);
opDetail = opDetail.replace(
  "} finally {\r\n      setLoading(false);\r\n    }\r\n  }, [tripId]);",
  "} finally {\r\n      if (!isSilent) setLoading(false);\r\n    }\r\n  }, [tripId]);"
);
opDetail = opDetail.replace(
  "if (loading) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto\">\n        <PageSkeleton />",
  "if (loading && !operation) {\n    return (\n      <div className=\"min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto\">\n        <PageSkeleton />"
);
opDetail = opDetail.replace(
  "if (loading) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto\">\r\n        <PageSkeleton />",
  "if (loading && !operation) {\r\n    return (\r\n      <div className=\"min-h-screen bg-slate-50 p-6 sm:p-8 max-w-[1550px] mx-auto\">\r\n        <PageSkeleton />"
);

// Replace post-mutation calls
opDetail = opDetail.replace(/await\s+fetchOperationData\(\);/g, "await fetchOperationData(true);");
opDetail = opDetail.replace(/(\s+)fetchOperationData\(\);/g, (match, prefix, offset) => {
  const preceding = opDetail.slice(Math.max(0, offset - 50), offset);
  if (preceding.includes("useEffect") || preceding.includes("useCallback")) return match;
  return prefix + "fetchOperationData(true);";
});
opDetail = opDetail.replace(/onSuccess={fetchOperationData}/g, "onSuccess={() => fetchOperationData(true)}");

fs.writeFileSync("src/app/(dashboard)/operations/[tripId]/page.tsx", opDetail, "utf8");
console.log("Patched operations/[tripId]/page.tsx");

// 2. operations/page.tsx
let opsList = fs.readFileSync("src/app/(dashboard)/operations/page.tsx", "utf8");
opsList = opsList.replace(
  "const fetchOperations = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchOperations = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
opsList = opsList.replace(
  "const fetchOperations = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchOperations = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
opsList = opsList.replace(
  "} finally {\n      setLoading(false);",
  "} finally {\n      if (!isSilent) setLoading(false);"
);
opsList = opsList.replace(
  "} finally {\r\n      setLoading(false);",
  "} finally {\r\n      if (!isSilent) setLoading(false);"
);
opsList = opsList.replace("{loading && (", "{loading && operations.length === 0 && (");
opsList = opsList.replace("{!loading && error && (", "{!loading && error && operations.length === 0 && (");
opsList = opsList.replace("{!loading && !error && operations.length === 0 ? (", "{(!loading || operations.length > 0) && !error && operations.length === 0 ? (");
opsList = opsList.replace(") : !loading && !error && (", ") : (!loading || operations.length > 0) && !error && (");
opsList = opsList.replace("onSuccess={fetchOperations}", "onSuccess={() => fetchOperations(true)}");
fs.writeFileSync("src/app/(dashboard)/operations/page.tsx", opsList, "utf8");
console.log("Patched operations/page.tsx");

// 3. operations/issues/page.tsx
let opIssues = fs.readFileSync("src/app/(dashboard)/operations/issues/page.tsx", "utf8");
opIssues = opIssues.replace(
  "const fetchIssues = React.useCallback(async () => {\n    try {\n      setLoading(true);",
  "const fetchIssues = React.useCallback(async (isSilent = false) => {\n    try {\n      if (!isSilent) setLoading(true);"
);
opIssues = opIssues.replace(
  "const fetchIssues = React.useCallback(async () => {\r\n    try {\r\n      setLoading(true);",
  "const fetchIssues = React.useCallback(async (isSilent = false) => {\r\n    try {\r\n      if (!isSilent) setLoading(true);"
);
opIssues = opIssues.replace(
  "} finally {\n      setLoading(false);",
  "} finally {\n      if (!isSilent) setLoading(false);"
);
opIssues = opIssues.replace(
  "} finally {\r\n      setLoading(false);",
  "} finally {\r\n      if (!isSilent) setLoading(false);"
);
opIssues = opIssues.replace("{loading && (", "{loading && issues.length === 0 && (");
opIssues = opIssues.replace("{!loading && error && (", "{!loading && error && issues.length === 0 && (");
opIssues = opIssues.replace("{!loading && !error && issues.length === 0 ? (", "{(!loading || issues.length > 0) && !error && issues.length === 0 ? (");
opIssues = opIssues.replace(") : !loading && !error && (", ") : (!loading || issues.length > 0) && !error && (");
opIssues = opIssues.replace(/(\s+)fetchIssues\(\);/g, (match, prefix, offset) => {
  const preceding = opIssues.slice(Math.max(0, offset - 50), offset);
  if (preceding.includes("useEffect") || preceding.includes("useCallback")) return match;
  return prefix + "fetchIssues(true);";
});
opIssues = opIssues.replace(/onSuccess={fetchIssues}/g, "onSuccess={() => fetchIssues(true)}");
fs.writeFileSync("src/app/(dashboard)/operations/issues/page.tsx", opIssues, "utf8");
console.log("Patched operations/issues/page.tsx");

