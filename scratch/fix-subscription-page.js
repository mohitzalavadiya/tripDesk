const fs = require("fs");
let code = fs.readFileSync("src/app/(dashboard)/subscription/page.tsx", "utf8");

// Insert useAuth hook call
code = code.replace(
  '  const { refreshSubscription } = useSubscription();',
  '  const { refreshSubscription } = useSubscription();\n  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("SUBSCRIPTION", "view"));'
);

// Ensure fetchData has if (!isViewAllowed) return;
if (!code.includes('if (!isViewAllowed) return;')) {
  code = code.replace(
    '  const fetchData = React.useCallback(async () => {\n    setLoading(true);',
    '  const fetchData = React.useCallback(async () => {\n    if (!isViewAllowed) return;\n    setLoading(true);'
  );
}

// Ensure useEffect checks isViewAllowed
code = code.replace(
  `  React.useEffect(() => {
    fetchData();
  }, [fetchData]);`,
  `  React.useEffect(() => {
    if (isViewAllowed) {
      fetchData();
    }
  }, [fetchData, isViewAllowed]);`
);

fs.writeFileSync("src/app/(dashboard)/subscription/page.tsx", code, "utf8");
console.log("subscription/page.tsx patched properly with isViewAllowed!");

