const fs = require("fs");

// 1. Invitations POST
let invCode = fs.readFileSync("src/app/api/team/invitations/route.ts", "utf8");
invCode = invCode.replace(
  `    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "CREATE", "Only authorized users can invite new team members.");`,
  `    const context = await requireWriteAccess();
    if (context.dbUser.role !== "AGENCY_OWNER") {
      await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "CREATE", "Only authorized users can invite new team members.");
    }`
);
fs.writeFileSync("src/app/api/team/invitations/route.ts", invCode, "utf8");

// 2. Revoke POST
let revokeCode = fs.readFileSync("src/app/api/team/invitations/[id]/revoke/route.ts", "utf8");
revokeCode = revokeCode.replace(
  `    const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "DELETE", "Only authorized users can revoke invitations.");`,
  `    const authContext = await requireWriteAccess();
    if (authContext.dbUser.role !== "AGENCY_OWNER") {
      await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "DELETE", "Only authorized users can revoke invitations.");
    }`
);
fs.writeFileSync("src/app/api/team/invitations/[id]/revoke/route.ts", revokeCode, "utf8");

// 3. Resend POST
let resendCode = fs.readFileSync("src/app/api/team/invitations/[id]/resend/route.ts", "utf8");
resendCode = resendCode.replace(
  `    const authContext = await requireWriteAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "UPDATE", "Only authorized users can resend invitations.");`,
  `    const authContext = await requireWriteAccess();
    if (authContext.dbUser.role !== "AGENCY_OWNER") {
      await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "UPDATE", "Only authorized users can resend invitations.");
    }`
);
fs.writeFileSync("src/app/api/team/invitations/[id]/resend/route.ts", resendCode, "utf8");

console.log("Team routes updated with exact matching string pattern!");

