const fs = require("fs");
let code = fs.readFileSync("src/app/(dashboard)/settings/page.tsx", "utf8");

code = code.replace(
  `          {isAgencyOwner && (
            <button
              onClick={() => setActiveTab("team")}`,
  `          {(isAgencyOwner || hasStaffPermission("TEAM", "view")) && (
            <button
              onClick={() => setActiveTab("team")}`
);

code = code.replace(
  `          isAgencyOwner ? (
            <TeamManagementPanel />
          ) : (
            <OwnerRestrictedCard
              featureName="Team Management"
              badgeText="Access Restricted"
              description="Inviting team members, modifying staff roles, and configuring staff permissions are strictly restricted to the Agency Owner."
            />
          )`,
  `          (isAgencyOwner || hasStaffPermission("TEAM", "view")) ? (
            <TeamManagementPanel />
          ) : (
            <OwnerRestrictedCard
              featureName="Team Management"
              badgeText="Access Restricted"
              description="Inviting team members, modifying staff roles, and configuring staff permissions are restricted to authorized users. Please contact your Agency Owner to request access."
            />
          )`
);

fs.writeFileSync("src/app/(dashboard)/settings/page.tsx", code, "utf8");
console.log("settings/page.tsx patched successfully!");

