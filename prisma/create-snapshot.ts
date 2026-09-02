import "dotenv/config";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";

async function createPreCleanupSnapshot() {
  console.log("📦 Creating pre-cleanup database logical snapshot...");
  const snapshotDir = path.join(process.cwd(), "prisma", "snapshots");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFilePath = path.join(snapshotDir, `pre-cleanup-snapshot-${timestamp}.json`);

  const models = Object.keys(Prisma.ModelName) as (keyof typeof Prisma.ModelName)[];
  const fullBackup: Record<string, any[]> = {};
  let totalRecordsExported = 0;

  for (const modelName of models) {
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const delegate = (prisma as any)[delegateName];
    if (delegate && typeof delegate.findMany === "function") {
      try {
        const records = await delegate.findMany();
        fullBackup[modelName] = records;
        totalRecordsExported += records.length;
        console.log(`  ✔ Exported ${records.length} records from ${modelName}`);
      } catch (err: any) {
        console.warn(`  ⚠️ Failed to export ${modelName}: ${err.message}`);
        fullBackup[modelName] = [];
      }
    }
  }

  fs.writeFileSync(snapshotFilePath, JSON.stringify(fullBackup, null, 2), "utf-8");
  const stats = fs.statSync(snapshotFilePath);

  console.log(`\n✅ Snapshot successfully created!`);
  console.log(`   File: ${snapshotFilePath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Total Records Exported: ${totalRecordsExported}`);

  await prisma.$disconnect();
}

createPreCleanupSnapshot().catch(async (e) => {
  console.error("FATAL ERROR creating snapshot:", e);
  await prisma.$disconnect();
  process.exit(1);
});
