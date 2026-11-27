import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function backup() {
  const outputPath = path.join(__dirname, 'backup_pre_phase_f.sql');
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });

  stream.write(`-- PRE-PHASE-F MIGRATION BACKUP\n-- Generated at: ${new Date().toISOString()}\n\n`);

  // 1. Get all public tables
  const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  console.log(`Found ${tables.length} tables in public schema:`, tables.map(t => t.table_name).join(', '));
  stream.write(`-- Found ${tables.length} tables\n\n`);

  for (const { table_name } of tables) {
    stream.write(`\n-- ========================================================\n`);
    stream.write(`-- TABLE: ${table_name}\n`);
    stream.write(`-- ========================================================\n`);

    // Get column info
    const cols: Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string }> = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table_name}'
      ORDER BY ordinal_position;
    `);

    stream.write(`-- Columns: ${cols.map(c => `${c.column_name} (${c.udt_name})`).join(', ')}\n`);

    // Fetch all rows
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "public"."${table_name}";`);
      stream.write(`-- Row count: ${rows.length}\n`);

      if (rows.length > 0) {
        const colNames = cols.map(c => `"${c.column_name}"`).join(', ');
        for (const row of rows) {
          const values = cols.map(c => {
            const val = row[c.column_name];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number' || typeof val === 'bigint') return String(val);
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') {
              return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');

          stream.write(`INSERT INTO "public"."${table_name}" (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`);
        }
      }
    } catch (err: any) {
      console.warn(`Could not dump data for ${table_name}: ${err.message}`);
      stream.write(`-- Warning: Error reading data: ${err.message}\n`);
    }
  }

  stream.end();
  await new Promise<void>((resolve) => {
    stream.on('finish', () => resolve());
  });

  const stats = fs.statSync(outputPath);
  console.log(`Backup completed successfully to ${outputPath} (${stats.size} bytes).`);
}

backup()
  .catch((e) => {
    console.error('Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
