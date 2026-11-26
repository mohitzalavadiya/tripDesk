const fs = require('fs');

// Helper to preserve CRLF
function updateFile(filePath, updater) {
  const original = fs.readFileSync(filePath, 'utf8');
  const isCrlf = original.includes('\r\n');
  const normalized = original.replace(/\r\n/g, '\n');
  const updatedNormalized = updater(normalized);
  const finalContent = isCrlf ? updatedNormalized.replace(/\n/g, '\r\n') : updatedNormalized;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log(`Updated: ${filePath}`);
}

// 1. Update src/lib/navigation.ts
updateFile('src/lib/navigation.ts', (content) => {
  const target = `      {
        label: "Subscription",
        href: "/subscription",
        ownerOnly: true,
        icon: CreditCard,
        moduleKey: "SUBSCRIPTION",
      },`;
  const replacement = `      {
        label: "Subscription",
        href: "/subscription",
        icon: CreditCard,
        moduleKey: "SUBSCRIPTION",
      },`;
  if (!content.includes(target)) {
    throw new Error('Target not found in src/lib/navigation.ts');
  }
  return content.replace(target, replacement);
});

// 2. Update src/app/(dashboard)/trips/[id]/page.tsx
updateFile('src/app/(dashboard)/trips/[id]/page.tsx', (content) => {
  // Update useAuth destructuring
  const targetAuth = `  const { isAgencyOwner } = useAuth();`;
  const replacementAuth = `  const { isAgencyOwner, isAgencyStaff, hasStaffPermission } = useAuth();\n  const canViewCosting = isAgencyOwner || (isAgencyStaff && hasStaffPermission("TRIP_COSTING", "view"));`;
  if (!content.includes(targetAuth)) {
    throw new Error('Target auth not found in trips/[id]/page.tsx');
  }
  content = content.replace(targetAuth, replacementAuth);

  // Update tab filter
  const targetFilter = `.filter((tab) => tab.id !== "costing" || isAgencyOwner)`;
  const replacementFilter = `.filter((tab) => tab.id !== "costing" || canViewCosting)`;
  if (!content.includes(targetFilter)) {
    throw new Error('Target tab filter not found in trips/[id]/page.tsx');
  }
  content = content.replace(targetFilter, replacementFilter);

  // Update tab rendering
  const targetRender = `{activeTab === "costing" && isAgencyOwner && (`;
  const replacementRender = `{activeTab === "costing" && canViewCosting && (`;
  if (!content.includes(targetRender)) {
    throw new Error('Target tab render not found in trips/[id]/page.tsx');
  }
  content = content.replace(targetRender, replacementRender);

  return content;
});

// 3. Update src/app/(dashboard)/feedback/page.tsx
updateFile('src/app/(dashboard)/feedback/page.tsx', (content) => {
  const targetFetch = `      if (isAgencyOwner) {
        fetchSettings();
      }`;
  const replacementFetch = `      if (canManageSettings) {
        fetchSettings();
      }`;
  if (!content.includes(targetFetch)) {
    throw new Error('Target fetchSettings not found in feedback/page.tsx');
  }
  content = content.replace(targetFetch, replacementFetch);

  const targetDeps = `  }, [isAllowed, fetchFeedbacks, fetchSettings, isAgencyOwner]);`;
  const replacementDeps = `  }, [isAllowed, fetchFeedbacks, fetchSettings, canManageSettings]);`;
  if (!content.includes(targetDeps)) {
    throw new Error('Target deps not found in feedback/page.tsx');
  }
  content = content.replace(targetDeps, replacementDeps);

  return content;
});

// 4. Update src/lib/services/staff-permission-service.ts
updateFile('src/lib/services/staff-permission-service.ts', (content) => {
  const targetHas = `    const grants = await this.getStaffPermissions(agencyId, userId, prismaClient);
    return evaluateStaffPermission(role, grants, moduleKey, actionKey);`;
  const replacementHas = `    try {
      const grants = await this.getStaffPermissions(agencyId, userId, prismaClient);
      return evaluateStaffPermission(role, grants, moduleKey, actionKey);
    } catch {
      return false;
    }`;
  if (!content.includes(targetHas)) {
    throw new Error('Target hasStaffPermission not found in staff-permission-service.ts');
  }
  return content.replace(targetHas, replacementHas);
});

// 5. Update src/lib/services/invitation-service.ts
updateFile('src/lib/services/invitation-service.ts', (content) => {
  // Import staffPermissionService if not present
  if (!content.includes('staffPermissionService')) {
    const targetImport = `import { entitlementService } from "./entitlement-service";`;
    const replacementImport = `import { entitlementService } from "./entitlement-service";\nimport { staffPermissionService } from "./staff-permission-service";`;
    if (!content.includes(targetImport)) {
      throw new Error('Target import not found in invitation-service.ts');
    }
    content = content.replace(targetImport, replacementImport);
  }

  // Replace createInvitation owner check
  const targetCreate = `    if (actor.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can invite new team members.");
    }`;
  const replacementCreate = `    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "create",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can invite new team members.");
      }
    }`;
  if (!content.includes(targetCreate)) {
    throw new Error('Target createInvitation guard not found in invitation-service.ts');
  }
  content = content.replace(targetCreate, replacementCreate);

  // Replace revokeInvitation owner check
  const targetRevoke = `    if (actor.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can revoke invitations.");
    }`;
  const replacementRevoke = `    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "delete",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can revoke invitations.");
      }
    }`;
  if (!content.includes(targetRevoke)) {
    throw new Error('Target revokeInvitation guard not found in invitation-service.ts');
  }
  content = content.replace(targetRevoke, replacementRevoke);

  // Replace resendInvitation owner check
  const targetResend = `    if (actor.role !== "AGENCY_OWNER") {
      throw new ForbiddenError("Only Agency Owners can resend invitations.");
    }`;
  const replacementResend = `    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "update",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can resend invitations.");
      }
    }`;
  if (!content.includes(targetResend)) {
    throw new Error('Target resendInvitation guard not found in invitation-service.ts');
  }
  content = content.replace(targetResend, replacementResend);

  return content;
});

console.log('All 5 fixes applied successfully!');

