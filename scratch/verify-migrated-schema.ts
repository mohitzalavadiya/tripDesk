import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== VERIFYING MIGRATED SCHEMA ===');

  // 1. Check _prisma_migrations
  const migrations: any[] = await prisma.$queryRaw`
    SELECT id, migration_name, started_at, finished_at, rolled_back_at 
    FROM _prisma_migrations 
    WHERE migration_name = '20261027150000_phase_f_staff_permissions';
  `;
  console.log('Migration record in _prisma_migrations:', migrations);

  // 2. Check staff_permission_profiles columns
  const staffProfileCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'staff_permission_profiles'
    ORDER BY ordinal_position;
  `;
  console.log('staff_permission_profiles columns:', staffProfileCols);

  // 3. Check agency_audit_logs columns
  const auditLogsCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'agency_audit_logs'
    ORDER BY ordinal_position;
  `;
  console.log('agency_audit_logs columns:', auditLogsCols);

  // 4. Check payments new columns
  const paymentCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name IN ('verifiedById', 'verifiedAt');
  `;
  console.log('payments columns (verifiedById, verifiedAt):', paymentCols);

  // 5. Check agency_invitations new column
  const invitationCols: any[] = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'agency_invitations' AND column_name = 'initialPermissions';
  `;
  console.log('agency_invitations columns (initialPermissions):', invitationCols);

  // 6. Check foreign key constraints
  const fkeys: any[] = await prisma.$queryRaw`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_name IN ('staff_permission_profiles', 'agency_audit_logs', 'payments')
      AND kcu.column_name IN ('agencyId', 'userId', 'actorId', 'verifiedById')
    ORDER BY tc.table_name, kcu.column_name;
  `;
  console.log('Foreign key constraints:', fkeys);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

