const fs = require("fs");
let code = fs.readFileSync("src/components/team/team-management-panel.tsx", "utf8");

// Add useAuth import
if (!code.includes('import { useAuth }')) {
  code = code.replace(
    'import { useSubscription } from "@/context/subscription-context";',
    'import { useSubscription } from "@/context/subscription-context";\nimport { useAuth } from "@/context/auth-context";'
  );
}

// Add auth capabilities
code = code.replace(
  'export function TeamManagementPanel() {\n  const { isReadOnly } = useSubscription();',
  `export function TeamManagementPanel() {
  const { isReadOnly } = useSubscription();
  const { isAgencyOwner, hasStaffPermission } = useAuth();
  const canInvite = isAgencyOwner || hasStaffPermission("TEAM", "create");
  const canUpdate = isAgencyOwner || hasStaffPermission("TEAM", "update");
  const canDelete = isAgencyOwner || hasStaffPermission("TEAM", "delete");`
);

// Conditional Invite Button
code = code.replace(
  `          <Button
            type="button"
            size="sm"
            onClick={() => {
              setInviteEmail("");
              setCreatedInviteToken(null);
              setInviteModalOpen(true);
            }}
            disabled={isReadOnly}
            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Invite Staff Member
          </Button>`,
  `          {canInvite && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setInviteEmail("");
                setCreatedInviteToken(null);
                setInviteModalOpen(true);
              }}
              disabled={isReadOnly}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Invite Staff Member
            </Button>
          )}`
);

// Permissions button only for Agency Owner
code = code.replace(
  `                        {!isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermissionsTarget(member)}
                            className="text-xs h-7 px-2.5 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Permissions
                          </Button>
                        )}`,
  `                        {!isOwner && isAgencyOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermissionsTarget(member)}
                            className="text-xs h-7 px-2.5 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 gap-1 cursor-pointer"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Permissions
                          </Button>
                        )}`
);

// Resend and Revoke buttons with permissions check
code = code.replace(
  `                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResend(inv)}
                              disabled={resendingId === inv.id || isReadOnly}
                              className="h-7 px-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            >
                              <RefreshCw
                                className={\`h-3 w-3 mr-1 \${resendingId === inv.id ? "animate-spin" : ""}\`}
                              />
                              Resend
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevokeTarget(inv)}
                              disabled={isReadOnly}
                              className="h-7 px-2 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Revoke
                            </Button>
                          </div>
                        )}`,
  `                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            {canUpdate && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(inv)}
                                disabled={resendingId === inv.id || isReadOnly}
                                className="h-7 px-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                              >
                                <RefreshCw
                                  className={\`h-3 w-3 mr-1 \${resendingId === inv.id ? "animate-spin" : ""}\`}
                                />
                                Resend
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeTarget(inv)}
                                disabled={isReadOnly}
                                className="h-7 px-2 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        )}`
);

fs.writeFileSync("src/components/team/team-management-panel.tsx", code, "utf8");
console.log("src/components/team/team-management-panel.tsx patched successfully!");

