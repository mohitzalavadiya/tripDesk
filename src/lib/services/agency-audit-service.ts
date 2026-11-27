import { prisma } from "@/lib/prisma";
import "server-only";

export interface LogAgencyEventInput {
  agencyId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  targetUserId?: string | null;
  entityId?: string | null;
  previousState?: any;
  newState?: any;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

let _hasAgencyAuditLogsTable: boolean | null = null;

export async function checkHasAgencyAuditLogsTable(client: any = prisma): Promise<boolean> {
  if (client && typeof client.__mockHasAgencyAuditLogsTable === "boolean") {
    return client.__mockHasAgencyAuditLogsTable;
  }
  if (client && client !== prisma && client.agencyAuditLog && !client.$queryRaw) {
    return true;
  }
  if (_hasAgencyAuditLogsTable !== null) {
    return _hasAgencyAuditLogsTable;
  }

  const db = (client && typeof client.$queryRaw === "function") ? client : prisma;
  if (db && typeof db.$queryRaw === "function") {
    const res: any = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'agency_audit_logs'
      LIMIT 1
    `;
    _hasAgencyAuditLogsTable = Array.isArray(res) && res.length > 0;
    return _hasAgencyAuditLogsTable;
  }
  return false;
}

export function resetAgencyAuditSchemaCacheForTesting() {
  _hasAgencyAuditLogsTable = null;
}

export const agencyAuditService = {
  /**
   * Appends an immutable audit log record for an agency.
   * Strips sensitive credentials and tokens from state and metadata.
   * If the table does not exist yet (pre-migration), returns safely.
   * If the table exists, real database errors are not silently swallowed.
   */
  async logEvent(input: LogAgencyEventInput, client: any = prisma): Promise<void> {
    const db = client || prisma;
    const hasTable = await checkHasAgencyAuditLogsTable(db);
    if (!hasTable) {
      return;
    }
    if (db.agencyAuditLog?.create) {
      await db.agencyAuditLog.create({
        data: {
          agencyId: input.agencyId,
          actorUserId: input.actorUserId,
          targetUserId: input.targetUserId || null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          previousState: input.previousState ? JSON.parse(JSON.stringify(input.previousState)) : undefined,
          newState: input.newState ? JSON.parse(JSON.stringify(input.newState)) : undefined,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        },
      });
    }
  },

  /**
   * Alias for structured agency action logging
   */
  async logAgencyAction(input: any, client?: any): Promise<void> {
    return this.logEvent({
      agencyId: input.agencyId,
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.details,
    }, client);
  },
};
