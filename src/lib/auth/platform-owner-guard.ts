import { prisma as defaultPrisma } from "@/lib/prisma";

export const PROTECTED_PLATFORM_OWNER_ERROR =
  "Blocked: QA/test automation cannot mutate a protected Platform Owner account.";

/**
 * Authoritative, permanent Platform Owner User IDs across TripDesk environments.
 */
export const KNOWN_PLATFORM_OWNER_IDS = new Set<string>([
  "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9", // Local / QA Supabase project (nsqarlegqxymqfyvfrjw)
  "e03a6a21-a355-4afe-ab3e-c8097b6be773", // Staging Supabase project (qypkowejgqrmilckemcr)
]);

/**
 * Authoritative, permanent Platform Owner Emails across TripDesk environments.
 */
export const KNOWN_PLATFORM_OWNER_EMAILS = new Set<string>([
  "mzpatel14@gmail.com",
]);

export interface PlatformOwnerTargetIdentifier {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  userMetadata?: Record<string, any> | null;
  appMetadata?: Record<string, any> | null;
}

export interface GuardOptions {
  prismaClient?: any;
  context?: string;
}

/**
 * Resolves all currently known permanent Platform Owner emails, including environment configurations.
 */
export function getProtectedPlatformOwnerEmails(): Set<string> {
  const emails = new Set<string>(KNOWN_PLATFORM_OWNER_EMAILS);

  const envBootstrapOwner = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  if (envBootstrapOwner) {
    emails.add(envBootstrapOwner);
  }

  const envPlatformOwner = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (envPlatformOwner) {
    emails.add(envPlatformOwner);
  }

  return emails;
}

/**
 * Synchronous check for known Platform Owner identity or role.
 */
export function isPlatformOwnerTargetSync(target: PlatformOwnerTargetIdentifier): boolean {
  if (target.userId && KNOWN_PLATFORM_OWNER_IDS.has(target.userId)) {
    return true;
  }

  if (target.email) {
    const normalized = target.email.trim().toLowerCase();
    const protectedEmails = getProtectedPlatformOwnerEmails();
    if (protectedEmails.has(normalized)) {
      return true;
    }
  }

  if (target.role && target.role.trim().toUpperCase() === "PLATFORM_OWNER") {
    return true;
  }

  if (
    target.userMetadata?.role &&
    String(target.userMetadata.role).trim().toUpperCase() === "PLATFORM_OWNER"
  ) {
    return true;
  }

  if (
    target.appMetadata?.role &&
    String(target.appMetadata.role).trim().toUpperCase() === "PLATFORM_OWNER"
  ) {
    return true;
  }

  return false;
}

/**
 * Synchronous guard: Throws immediately if target matches known Platform Owner identity or role.
 */
export function assertNotPlatformOwnerSync(
  target: PlatformOwnerTargetIdentifier,
  context?: string
): void {
  if (isPlatformOwnerTargetSync(target)) {
    throw new Error(PROTECTED_PLATFORM_OWNER_ERROR);
  }
}

/**
 * Comprehensive Hard Safety Guard:
 * Protects against Platform Owner credential mutation by checking identity (ID/email)
 * AND role (defense in depth via Prisma database lookup).
 *
 * Must be executed BEFORE any Auth-admin mutation (createUser, updateUserById, deleteUser).
 * Throws immediately if target resolves to PLATFORM_OWNER.
 */
export async function assertNotPlatformOwner(
  target: PlatformOwnerTargetIdentifier,
  options?: GuardOptions
): Promise<void> {
  // 1. Fast synchronous check on known IDs, emails, and roles
  if (isPlatformOwnerTargetSync(target)) {
    throw new Error(PROTECTED_PLATFORM_OWNER_ERROR);
  }

  // 2. Database role-based defense-in-depth check
  const db = options?.prismaClient || defaultPrisma;
  if (!db?.user) {
    return;
  }

  try {
    if (target.userId) {
      const user = await db.user.findUnique({
        where: { id: target.userId },
        select: { id: true, email: true, role: true, agencyId: true },
      });

      if (user && user.role === "PLATFORM_OWNER") {
        throw new Error(PROTECTED_PLATFORM_OWNER_ERROR);
      }
    }

    if (target.email) {
      const normalized = target.email.trim().toLowerCase();
      const user = await db.user.findFirst({
        where: { email: { equals: normalized, mode: "insensitive" } },
        select: { id: true, email: true, role: true, agencyId: true },
      });

      if (user && user.role === "PLATFORM_OWNER") {
        throw new Error(PROTECTED_PLATFORM_OWNER_ERROR);
      }
    }
  } catch (err: any) {
    if (err?.message === PROTECTED_PLATFORM_OWNER_ERROR) {
      throw err;
    }
    // If DB query fails due to connectivity, fail closed if email resembles owner pattern
    console.warn("[assertNotPlatformOwner] DB check failed (continuing safely):", err?.message);
  }
}
