import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../src/context/auth-context.tsx');
let content = fs.readFileSync(file, 'utf-8');

const targetImport = `import { createClient } from "@/lib/supabase/client";
import * as React from "react";
import { toast } from "sonner";`;

const replaceImport = `import { createClient } from "@/lib/supabase/client";
import {
  evaluateStaffPermission,
  DEFAULT_STAFF_PERMISSIONS,
  StaffPermissionsProfileMap,
} from "@/lib/auth/permissions";
import * as React from "react";
import { toast } from "sonner";`;

const targetType = `  isAgencyOwner: boolean;
  isAgencyStaff: boolean;
  updateAgencyStatus: (`;

const replaceType = `  isAgencyOwner: boolean;
  isAgencyStaff: boolean;
  staffPermissions: StaffPermissionsProfileMap | null;
  hasStaffPermission: (moduleKey: string, actionKey?: string) => boolean;
  updateAgencyStatus: (`;

const targetState = `  const [subscriptionAccess, setSubscriptionAccess] =
    React.useState<SubscriptionAccessInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);`;

const replaceState = `  const [subscriptionAccess, setSubscriptionAccess] =
    React.useState<SubscriptionAccessInfo | null>(null);
  const [staffPermissions, setStaffPermissions] =
    React.useState<StaffPermissionsProfileMap | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);`;

const targetSetSession = `          setSubscriptionAccess(json.data.subscriptionAccess || null);
        }
      }
    } catch (err) {`;

const replaceSetSession = `          setSubscriptionAccess(json.data.subscriptionAccess || null);
          setStaffPermissions(json.data.staffPermissions || null);
        }
      }
    } catch (err) {`;

const targetSignOut = `      if (event === "SIGNED_OUT") {
        setCurrentUser(defaultUser);
        setCurrentAgency(defaultAgency);
        setSubscriptionAccess(null);
        setIsLoading(false);`;

const replaceSignOut = `      if (event === "SIGNED_OUT") {
        setCurrentUser(defaultUser);
        setCurrentAgency(defaultAgency);
        setSubscriptionAccess(null);
        setStaffPermissions(null);
        setIsLoading(false);`;

const targetReturn = `  const isAgencyOwner = currentUser.role === "AGENCY_OWNER" && !isPlatformOwner;
  const isAgencyStaff = currentUser.role === "AGENCY_STAFF";`;

const replaceReturn = `  const isAgencyOwner = currentUser.role === "AGENCY_OWNER" && !isPlatformOwner;
  const isAgencyStaff = currentUser.role === "AGENCY_STAFF";

  const hasStaffPermission = React.useCallback(
    (moduleKey: string, actionKey: string = "view"): boolean => {
      if (currentUser.role === "AGENCY_OWNER") return true;
      if (currentUser.role !== "AGENCY_STAFF") return false;
      return evaluateStaffPermission(
        currentUser.role,
        staffPermissions || DEFAULT_STAFF_PERMISSIONS,
        moduleKey,
        actionKey
      );
    },
    [currentUser.role, staffPermissions]
  );`;

const targetValue = `      value={{
        currentUser,
        currentAgency,
        agencies,
        subscriptionAccess,
        isLoading,
        isPlatformOwner,
        isAgencyOwner,
        isAgencyStaff,
        updateAgencyStatus,
        registerAgency,
        logout,
        refreshAuth: fetchSession,
      }}`;

const replaceValue = `      value={{
        currentUser,
        currentAgency,
        agencies,
        subscriptionAccess,
        isLoading,
        isPlatformOwner,
        isAgencyOwner,
        isAgencyStaff,
        staffPermissions,
        hasStaffPermission,
        updateAgencyStatus,
        registerAgency,
        logout,
        refreshAuth: fetchSession,
      }}`;

const normalized = content.replace(/\r\n/g, '\n');
if (!normalized.includes(targetImport)) {
  console.error('Target import not found!');
  process.exit(1);
}
if (!normalized.includes(targetType)) {
  console.error('Target type not found!');
  process.exit(1);
}
if (!normalized.includes(targetState)) {
  console.error('Target state not found!');
  process.exit(1);
}
if (!normalized.includes(targetSetSession)) {
  console.error('Target set session not found!');
  process.exit(1);
}
if (!normalized.includes(targetSignOut)) {
  console.error('Target sign out not found!');
  process.exit(1);
}
if (!normalized.includes(targetReturn)) {
  console.error('Target return not found!');
  process.exit(1);
}
if (!normalized.includes(targetValue)) {
  console.error('Target value not found!');
  process.exit(1);
}

const updated = normalized
  .replace(targetImport, replaceImport)
  .replace(targetType, replaceType)
  .replace(targetState, replaceState)
  .replace(targetSetSession, replaceSetSession)
  .replace(targetSignOut, replaceSignOut)
  .replace(targetReturn, replaceReturn)
  .replace(targetValue, replaceValue);

const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated auth-context.tsx!');
