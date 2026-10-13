import { NotFoundError } from "./errors";

/**
 * Attaches the trusted authenticated agencyId to database query filter criteria.
 * Guarantees all multi-tenant queries are scoped to the active agency.
 */
export function scopeTenant<T extends Record<string, any>>(
  agencyId: string,
  criteria?: T
): T & { agencyId: string } {
  return {
    ...criteria,
    agencyId,
  } as T & { agencyId: string };
}

/**
 * Asserts that a queried resource belongs to the currently authenticated agency.
 * Throws 404 NotFoundError (instead of 403) to prevent leaking existence of other agencies' records.
 */
export function assertTenantOwnership(
  resourceAgencyId: string | null | undefined,
  authenticatedAgencyId: string,
  resourceName = "Record"
): void {
  if (!resourceAgencyId || resourceAgencyId !== authenticatedAgencyId) {
    throw new NotFoundError(resourceName);
  }
}
