const fs = require("fs");
let code = fs.readFileSync("src/app/api/team/invitations/route.ts", "utf8");

code = code.replace(
  'import { ForbiddenError, apiSuccess, handleApiError } from "@/lib/api";',
  'import { apiSuccess, handleApiError } from "@/lib/api";\nimport { enforceStaffPermission } from "@/lib/services/staff-permission-service";'
);

code = code.replace(
  `    const context = await requireWriteAccess();
    if (context.dbUser.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can invite new team members.");
    }`,
  `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "CREATE", "Only authorized users can invite new team members.");`
);

fs.writeFileSync("src/app/api/team/invitations/route.ts", code, "utf8");
console.log("api/team/invitations/route.ts updated successfully!");

