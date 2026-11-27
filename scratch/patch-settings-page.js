const fs = require('fs');

let code = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');

// 1. Update auth destructured values and guard
code = code.replace(
  /const\s*\{\s*isAgencyOwner\s*\}\s*=\s*useAuth\(\);[\s\S]*?if\s*\(!isAgencyOwner\)\s*\{[\s\S]*?<OwnerRestrictedCard[\s\S]*?\/>[\s\S]*?\}[\s\S]*?\}/,
  `const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();

  const isViewAllowed = isAgencyOwner || (isAgencyStaff && hasStaffPermission("SETTINGS", "view"));

  if (!isViewAllowed) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <OwnerRestrictedCard
          featureName="Agency Settings"
          badgeText="Access Restricted"
          description="Agency profile settings, team management, tax profiles, and communication gateways are restricted. Please contact your Agency Owner to request access."
        />
      </div>
    );
  }`
);

// 2. Wrap Team tab button with isAgencyOwner
code = code.replace(
  /<button\s+onClick=\{\(\)\s*=>\s*setActiveTab\("team"\)\}[\s\S]*?Team & Staff Roles\s*<\/button>/,
  `{isAgencyOwner && (
            <button
              onClick={() => setActiveTab("team")}
              className={\`px-3 sm:px-4 py-2 sm:py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap \${
                activeTab === "team"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }\`}
            >
              <Users className="h-4 w-4 shrink-0" />
              Team & Staff Roles
            </button>
          )}`
);

// 3. Tab content: Team tab guard
code = code.replace(
  /\/\* ─── AGENCY TEAM & STAFF MANAGEMENT TAB ─── \*\/\s*<TeamManagementPanel\s*\/>/,
  `/* ─── AGENCY TEAM & STAFF MANAGEMENT TAB ─── */
          isAgencyOwner ? (
            <TeamManagementPanel />
          ) : (
            <OwnerRestrictedCard
              featureName="Team Management"
              badgeText="Access Restricted"
              description="Inviting team members, modifying staff roles, and configuring staff permissions are strictly restricted to the Agency Owner."
            />
          )`
);

fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', code);
console.log('Successfully updated src/app/(dashboard)/settings/page.tsx');

