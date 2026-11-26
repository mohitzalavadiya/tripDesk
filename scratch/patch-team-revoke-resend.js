const fs = require("fs");

// 1. Revoke
let revokeCode = fs.readFileSync("src/app/api/team/invitations/[id]/revoke/route.ts", "utf8");
revokeCode = revokeCode.replace(
  'import { ForbiddenError, apiSuccess, handleApiError } from "@/lib/api";',
  'import { apiSuccess, handleApiError } from "@/lib/api";\nimport { enforceStaffPermission } from "@/lib/services/staff-permission-service";'
);
revokeCode = revokeCode.replace(
  `    const authContext = await requireWriteAccess();
    if (authContext.dbUser.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can revoke invitations.");
    }`,
  `    const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "DELETE", "Only authorized users can revoke invitations.");`
);
fs.writeFileSync("src/app/api/team/invitations/[id]/revoke/route.ts", revokeCode, "utf8");

// 2. Resend
let resendCode = fs.readFileSync("src/app/api/team/invitations/[id]/resend/route.ts", "utf8");
resendCode = resendCode.replace(
  'import { ForbiddenError, apiSuccess, handleApiError } from "@/lib/api";',
  'import { apiSuccess, handleApiError } from "@/lib/api";\nimport { enforceStaffPermission } from "@/lib/services/staff-permission-service";'
);
resendCode = resendCode.replace(
  `    const authContext = await requireWriteAccess();
    if (authContext.dbUser.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can resend invitations.");
    }`,
  `    const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "UPDATE", "Only authorized users can resend invitations.");`
);
fs.writeFileSync("src/app/api/team/invitations/[id]/resend/route.ts", resendCode, "utf8");

console.log("Revoke and resend routes patched successfully!");

