const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/audit-results.json', 'utf8'));

// Classification categories:
// A: Unnecessary page-level restriction: must be replaced by relevant configurable staff permission.
// B: Legitimate sensitive-action restriction: must remain owner-only (destructive deletes, financial margins, role perms admin, billing checkout).
// C: Authentication, platform-owner, or other role protection: evaluate separately, do not remove blindly (UserRole enum, auth context, platform admin, tenant check).
// D: Dead code or unrelated match (comments, descriptions, badges, helper types, tests).

const classified = [];

for (const m of data.results) {
  const file = m.file;
  const line = m.line;
  const code = m.code;

  let classification = null;
  let rationale = '';

  // 1. Check for Category A (Unnecessary page-level restrictions)
  if (file === 'src/lib/navigation.ts' && line === 222) {
    classification = 'A';
    rationale = 'ownerOnly: true on Subscription in agencyNavigationConfig causes isLocked=true in sidebar/mobile-nav even when staff has SUBSCRIPTION:view granted.';
  } else if (file === 'src/app/(dashboard)/trips/[id]/page.tsx' && (line === 1440 || line === 2152)) {
    classification = 'A';
    rationale = 'Hides Costing tab and Costing studio launch button on trip detail page solely checking isAgencyOwner, blocking staff who have TRIP_COSTING:view permission.';
  }

  // 2. Check for Category D (Comments, text labels, descriptions, schema definitions)
  else if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) {
    classification = 'D';
    rationale = 'Comment line referencing Owner Only or role semantics.';
  } else if (code.includes('description:') || code.includes('badgeText:') || code.includes('featureName:') || code.includes('title:')) {
    classification = 'D';
    rationale = 'UI descriptor, badge text, or documentation string.';
  } else if (code.includes('interface ') || code.includes('type PlatformRole') || code.includes('export type')) {
    classification = 'D';
    rationale = 'TypeScript interface or type definition.';
  } else if (file.includes('schema') || file.includes('validation')) {
    classification = 'C';
    rationale = 'Validation schema invariant ensuring roles and invitations conform to domain rules.';
  }

  // 3. Platform Admin & Platform Chat (Category C)
  else if (file.startsWith('src/app/admin') || file.includes('platform-chat') || file.includes('admin-service') || (file === 'src/lib/navigation.ts' && line === 267)) {
    classification = 'C';
    rationale = 'Platform SaaS admin boundary or platform chat service routing between agency owners and platform administrators.';
  }

  // 4. Auth & User Provisioning / System Scoping (Category C)
  else if (file === 'src/lib/api/context.ts' || file === 'src/context/auth-context.tsx' || file === 'src/actions/auth-actions.ts' || file === 'src/lib/services/onboarding-service.ts' || file === 'src/lib/services/invitation-service.ts' || file === 'src/lib/services/internal-notification-service.ts') {
    classification = 'C';
    rationale = 'Core authentication, tenant resolution, or user provisioning establishing identity and role assignments.';
  }

  // 5. Dashboard pages with proper delegable checks (Category D or B)
  else if (file.startsWith('src/app/(dashboard)')) {
    // If it's importing OwnerRestrictedCard
    if (code.includes('import { OwnerRestrictedCard }')) {
      classification = 'D';
      rationale = 'Import statement of OwnerRestrictedCard component.';
    }
    // If it's rendering OwnerRestrictedCard when permission is denied
    else if (code.includes('<OwnerRestrictedCard')) {
      classification = 'D';
      rationale = 'Standard access-denial card rendered when staff lacks granted permission.';
    }
    // If it's evaluating delegable permissions: isAgencyOwner || (isAgencyStaff && hasStaffPermission(...))
    else if (code.includes('hasStaffPermission') || code.includes('useAuth()') || code.includes('isAgencyStaff')) {
      classification = 'D';
      rationale = 'Delegable permission guard: allows Agency Owner AND staff with granted permission.';
    }
    // If it protects sensitive actions on page:
    else if (file.includes('finance') && (code.includes('supplierPayables') || code.includes('isAgencyOwner ?') || code.includes('handleRecordSupplierPayment'))) {
      classification = 'B';
      rationale = 'Commercial margin secrecy & supplier payables: legitimate owner-only financial boundary.';
    } else if (file.includes('dashboard/page.tsx') && (code.includes('getFinance') || code.includes('isAgencyOwner &&'))) {
      classification = 'B';
      rationale = 'Financial KPI summary on CRM dashboard: legitimate owner-only commercial secrecy boundary.';
    } else if (file.includes('settings/page.tsx') && (code.includes('canAccessFinancialMargins') || code.includes('delete') || code.includes('isAgencyOwner ? ('))) {
      classification = 'B';
      rationale = 'Owner-only settings or financial management action.';
    } else if (file.includes('feedback/page.tsx') && code.includes('if (isAgencyOwner)')) {
      classification = 'B';
      rationale = 'Agency-wide feedback configuration settings reserved for Agency Owner.';
    } else {
      classification = 'D';
      rationale = 'Auxiliary UI state or role comparison.';
    }
  }

  // 6. Components
  else if (file.startsWith('src/components')) {
    if (file.includes('staff-permissions-modal.tsx')) {
      if (code.includes('IMMUTABLE_OWNER_ONLY_MODULES')) {
        classification = 'D';
        rationale = 'Import or reference to empty IMMUTABLE_OWNER_ONLY_MODULES set in permissions modal.';
      } else if (code.includes('isOwnerOnly') || code.includes('Owner Only')) {
        classification = 'B';
        rationale = 'Protective UI label in permission modal for non-delegable actions (e.g. plan upgrades, sensitive deletes).';
      } else {
        classification = 'D';
        rationale = 'Modal rendering logic.';
      }
    } else if (file.includes('team-management-panel.tsx')) {
      if (code.includes('isOwner && isAgencyOwner') || code.includes('canDelete') || code.includes('canUpdate')) {
        classification = 'B';
        rationale = 'Staff permissions editing button restricted to Agency Owner only.';
      } else {
        classification = 'D';
        rationale = 'Team member directory display.';
      }
    } else if (file.includes('revenue-chart.tsx')) {
      classification = 'B';
      rationale = 'Revenue and commercial charts restricted to Agency Owner for financial secrecy.';
    } else if (file.includes('owner-restricted-card.tsx')) {
      classification = 'D';
      rationale = 'Declaration of OwnerRestrictedCard component.';
    } else if (file.includes('sidebar.tsx') || file.includes('mobile-nav.tsx')) {
      classification = 'B';
      rationale = 'Navigation lock indicator logic.';
    } else {
      classification = 'D';
      rationale = 'Component rendering logic.';
    }
  }

  // 7. Lib & Auth
  else if (file.startsWith('src/lib')) {
    if (file.includes('permissions.ts')) {
      if (code.includes('IMMUTABLE_OWNER_ONLY_MODULES')) {
        classification = 'D';
        rationale = 'Declaration of IMMUTABLE_OWNER_ONLY_MODULES = new Set([]) allowing all pages to be delegated.';
      } else if (code.includes('ownerOnlyActions')) {
        classification = 'B';
        rationale = 'Explicit registration of legitimate sensitive actions (margins, plan upgrade, perm admin) as owner-only.';
      } else if (code.includes('normalizedRole === "AGENCY_OWNER"')) {
        classification = 'B';
        rationale = 'Role elevation: Agency Owner has full administrative access to all agency modules.';
      } else {
        classification = 'D';
        rationale = 'Permission registry metadata or normalization logic.';
      }
    } else if (file.includes('staff-permission-service.ts')) {
      classification = 'B';
      rationale = 'Owner bypass in permission evaluation: role === "AGENCY_OWNER" returns true.';
    } else {
      classification = 'C';
      rationale = 'Internal service boundary.';
    }
  }

  // 8. API Routes
  else if (file.startsWith('src/app/api')) {
    if (file.includes('team/members/[id]/permissions')) {
      classification = 'B';
      rationale = 'Staff permissions modification API: strictly restricted to Agency Owner.';
    } else if (file.includes('payments/[id]/verify') || file.includes('payments/[id]/void') || file.includes('payments/[id]')) {
      classification = 'B';
      rationale = 'Payment ledger verification, voiding, and destructive deletion: strictly Owner-only for financial audit integrity.';
    } else if (file.includes('auth/me')) {
      classification = 'C';
      rationale = 'Auth context serialization returning isAgencyOwner flag.';
    } else if (file.includes('invitations')) {
      classification = 'B';
      rationale = 'Invitation management permissions enforcement.';
    } else {
      classification = 'B';
      rationale = 'API route sensitive mutation enforcement.';
    }
  }

  classified.push({
    file,
    line,
    code,
    classification: classification || 'D',
    rationale
  });
}

const counts = { A: 0, B: 0, C: 0, D: 0 };
for (const c of classified) {
  counts[c.classification]++;
}

console.log('--- CLASSIFICATION COUNTS ---');
console.log(counts);

fs.writeFileSync('scratch/classified-results.json', JSON.stringify({
  counts,
  classified
}, null, 2));

console.log('Saved to scratch/classified-results.json');

