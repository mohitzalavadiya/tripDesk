const fs = require('fs');

const p = 'src/components/team/staff-permissions-modal.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Invariant: handleToggle disables all sub-actions when view is turned off
c = c.replace(
  /\/\/ Invariant: If view is toggled OFF, automatically disable child mutations\r?\n\s+if \(actionKey === "view" && !value\) \{\r?\n\s+updatedModule\.create = false;\r?\n\s+updatedModule\.update = false;\r?\n\s+updatedModule\.delete = false;\r?\n\s+if \("recordReceipt" in updatedModule\) updatedModule\.recordReceipt = false;\r?\n\s+if \("logInteraction" in updatedModule\) updatedModule\.logInteraction = false;\r?\n\s+\}/,
  `// Invariant: If view is toggled OFF, automatically disable all child mutations
      if (actionKey === "view" && !value) {
        for (const k of Object.keys(updatedModule)) {
          updatedModule[k] = false;
        }
      }`
);

// 2. handleToggleRow: cleanly clears all permissions without leaving orphaned sub-actions
c = c.replace(
  /const handleToggleRow = \(page: PagePermissionConfig\) => \{\r?\n\s+if \(page\.isOwnerOnly\) return;\r?\n\s+const current = permissions\[page\.moduleKey\] \|\| \{\};\r?\n\s+const isCurrentlyView = Boolean\(current\.view\);\r?\n\s+if \(isCurrentlyView\) \{\r?\n\s+\/\/ Toggle row OFF\r?\n\s+handleToggle\(page\.moduleKey, "view", false\);\r?\n\s+\} else \{\r?\n\s+\/\/ Toggle row ON with standard operational permissions for this module\r?\n\s+setPermissions\(\(prev\) => \(\{\r?\n\s+\.\.\.prev,\r?\n\s+\[page\.moduleKey\]: \{\r?\n\s+\.\.\.page\.defaultPermissions,\r?\n\s+view: true,\r?\n\s+\},\r?\n\s+\}\)\);\r?\n\s+\}\r?\n\s+\};/,
  `const handleToggleRow = (page: PagePermissionConfig) => {
    if (page.isOwnerOnly) return;
    const current = permissions[page.moduleKey] || {};
    const isCurrentlyView = Boolean(current.view);

    setPermissions((prev) => {
      if (isCurrentlyView) {
        // Disabling page row: cleanly disable ALL permissions for this row without leaving orphaned sub-actions
        const cleared: StaffModulePermissions = {};
        for (const k of Object.keys(current)) {
          cleared[k] = false;
        }
        cleared.view = false;
        cleared.create = false;
        cleared.update = false;
        cleared.delete = false;
        return {
          ...prev,
          [page.moduleKey]: cleared,
        };
      } else {
        // Enabling page row: grant standard/safe default permissions for this page
        return {
          ...prev,
          [page.moduleKey]: {
            ...page.defaultPermissions,
            view: true,
          },
        };
      }
    });
  };`
);

// 3. handleApplyReadOnly
c = c.replace(
  /const handleApplyReadOnly = \(\) => \{\r?\n\s+setPermissions\(\(prev\) => \{\r?\n\s+const updated: StaffPermissionsProfileMap = \{ \.\.\.prev \};\r?\n\s+PAGE_PERMISSIONS_REGISTRY\.forEach\(\(page\) => \{\r?\n\s+if \(!page\.isOwnerOnly\) \{\r?\n\s+updated\[page\.moduleKey\] = \{\r?\n\s+view: true,\r?\n\s+create: false,\r?\n\s+update: false,\r?\n\s+delete: false,\r?\n\s+recordReceipt: false,\r?\n\s+logInteraction: false,\r?\n\s+\};\r?\n\s+\}\r?\n\s+\}\);\r?\n\s+return updated;\r?\n\s+\}\);\r?\n\s+toast\.info\("Applied Read-Only Mode across all delegable pages\."\);\r?\n\s+\};/,
  `const handleApplyReadOnly = () => {
    setPermissions((prev) => {
      const updated: StaffPermissionsProfileMap = { ...prev };
      PAGE_PERMISSIONS_REGISTRY.forEach((page) => {
        if (!page.isOwnerOnly) {
          const cleared: StaffModulePermissions = { view: true };
          for (const k of Object.keys(updated[page.moduleKey] || {})) {
            if (k !== "view") cleared[k] = false;
          }
          cleared.create = false;
          cleared.update = false;
          cleared.delete = false;
          cleared.recordReceipt = false;
          cleared.logInteraction = false;
          cleared.export = false;
          updated[page.moduleKey] = cleared;
        }
      });
      return updated;
    });
    toast.info("Applied Read-Only Mode across all delegable pages.");
  };`
);

// 4. handleRevokeAll
c = c.replace(
  /const handleRevokeAll = \(\) => \{\r?\n\s+setPermissions\(\(prev\) => \{\r?\n\s+const updated: StaffPermissionsProfileMap = \{ \.\.\.prev \};\r?\n\s+PAGE_PERMISSIONS_REGISTRY\.forEach\(\(page\) => \{\r?\n\s+if \(!page\.isOwnerOnly\) \{\r?\n\s+updated\[page\.moduleKey\] = \{\r?\n\s+view: false,\r?\n\s+create: false,\r?\n\s+update: false,\r?\n\s+delete: false,\r?\n\s+recordReceipt: false,\r?\n\s+logInteraction: false,\r?\n\s+\};\r?\n\s+\}\r?\n\s+\}\);\r?\n\s+return updated;\r?\n\s+\}\);\r?\n\s+toast\.warning\("Revoked all delegable permissions for this staff member\."\);\r?\n\s+\};/,
  `const handleRevokeAll = () => {
    setPermissions((prev) => {
      const updated: StaffPermissionsProfileMap = { ...prev };
      PAGE_PERMISSIONS_REGISTRY.forEach((page) => {
        if (!page.isOwnerOnly) {
          const cleared: StaffModulePermissions = {};
          for (const k of Object.keys(updated[page.moduleKey] || {})) {
            cleared[k] = false;
          }
          cleared.view = false;
          cleared.create = false;
          cleared.update = false;
          cleared.delete = false;
          cleared.recordReceipt = false;
          cleared.logInteraction = false;
          cleared.export = false;
          updated[page.moduleKey] = cleared;
        }
      });
      return updated;
    });
    toast.warning("Revoked all delegable permissions for this staff member.");
  };`
);

// 5. Header: Rename Toggle to Page Access
c = c.replace(
  /<th className="py-2 px-3 text-right w-20">Toggle<\/th>/,
  '<th className="py-2 px-3 text-right w-24">Page Access</th>'
);

// 6. Edit column for REPORTS (Export checkbox)
c = c.replace(
  /\{page\.isOwnerOnly \? \(\r?\n\s+<span className="text-slate-300 select-none">—<\/span>\r?\n\s+\) : isEditDelegable \? \(/,
  `{page.isOwnerOnly ? (
                                      <span className="text-slate-300 select-none">—</span>
                                    ) : page.moduleKey === "REPORTS" ? (
                                      <label
                                        className={\`inline-flex items-center gap-1 text-[11px] select-none \${
                                          isViewEnabled
                                            ? "text-slate-700 cursor-pointer"
                                            : "text-slate-300 cursor-not-allowed opacity-40"
                                        }\`}
                                        title="Export operational & BI reports"
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isViewEnabled}
                                          checked={Boolean(isViewEnabled && modulePerms.export)}
                                          onChange={(e) =>
                                            handleToggle(page.moduleKey, "export", e.target.checked)
                                          }
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span className="text-[10px] font-medium">Export</span>
                                      </label>
                                    ) : isEditDelegable ? (`
);

// 7. Toggle column row button styling
c = c.replace(
  /<Button\r?\n\s+type="button"\r?\n\s+variant="ghost"\r?\n\s+size="sm"\r?\n\s+onClick=\{\(\) => handleToggleRow\(page\)\}\r?\n\s+className="h-6 px-2 text-\[10px\] text-slate-600 hover:text-slate-900 cursor-pointer"\r?\n\s+>\r?\n\s+\{isViewEnabled \? "Disable" : "Enable"\}\r?\n\s+<\/Button>/,
  `<Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleRow(page)}
                                        className={\`h-6 px-2 text-[10px] font-medium cursor-pointer transition-colors \${
                                          isViewEnabled
                                            ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                                            : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                        }\`}
                                      >
                                        {isViewEnabled ? "Disable" : "Enable"}
                                      </Button>`
);

fs.writeFileSync(p, c, 'utf8');
console.log('Patched modal successfully');

