import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../src/lib/services/payment-service.ts');
let content = fs.readFileSync(file, 'utf-8');

const target1 = `      // Audit log (resilient to unmigrated agency_audit_logs table)
      const hasAuditLogsTable = await checkHasAgencyAuditLogsTable(tx);
      if (hasAuditLogsTable && tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VERIFIED",
            entityType: "Payment",
            entityId: payment.id,
            details: { amount: Number(payment.amount), bookingId: payment.bookingId },
          },
        });
      }`;

const replace1 = `      // Audit log (resilient to unmigrated agency_audit_logs table)
      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId: ownerUserId,
          action: "PAYMENT_RECEIPT_VERIFIED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { amount: Number(payment.amount), bookingId: payment.bookingId },
        },
        tx
      );`;

const target2 = `      // Audit log (resilient to unmigrated agency_audit_logs table)
      const hasAuditLogsTable = await checkHasAgencyAuditLogsTable(tx);
      if (hasAuditLogsTable && tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VOIDED",
            entityType: "Payment",
            entityId: payment.id,
            details: { voidReason: voidReason.trim(), amount: Number(payment.amount) },
          },
        });
      }`;

const replace2 = `      // Audit log (resilient to unmigrated agency_audit_logs table)
      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId: ownerUserId,
          action: "PAYMENT_RECEIPT_VOIDED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { voidReason: voidReason.trim(), amount: Number(payment.amount) },
        },
        tx
      );`;

// Normalize CRLF to LF for replacement, then write
const normalized = content.replace(/\r\n/g, '\n');
if (!normalized.includes(target1)) {
  console.error('Target 1 not found in normalized content!');
  process.exit(1);
}
if (!normalized.includes(target2)) {
  console.error('Target 2 not found in normalized content!');
  process.exit(1);
}

const updated = normalized.replace(target1, replace1).replace(target2, replace2);
// Preserve CRLF if original had CRLF
const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated payment-service.ts!');

