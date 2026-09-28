import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function applyChatMigration() {
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("   TRIPDESK PHASE 189 — DDL & RLS CHAT MIGRATION");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  try {
    // 1. Add PLATFORM_CHAT_MESSAGE to UserNotificationType enum if not exists
    console.log("▶ 1. Updating UserNotificationType enum...");
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = 'public."UserNotificationType"'::regtype
          AND enumlabel = 'PLATFORM_CHAT_MESSAGE'
        ) THEN
          ALTER TYPE "UserNotificationType" ADD VALUE 'PLATFORM_CHAT_MESSAGE';
        END IF;
      END
      $$;
    `);
    console.log("✓ UserNotificationType enum updated.");

    // 2. Create platform_chat_conversations table if not exists
    console.log("▶ 2. Creating platform_chat_conversations table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "platform_chat_conversations" (
        "id" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "lastMessageAt" TIMESTAMP(3),
        "lastMessageSnippet" TEXT,
        "lastMessageSenderRole" "UserRole",
        "agencyLastReadAt" TIMESTAMP(3),
        "platformLastReadAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "platform_chat_conversations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "platform_chat_conversations_agencyId_key" UNIQUE ("agencyId"),
        CONSTRAINT "platform_chat_conversations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "platform_chat_conversations_agencyId_idx" ON "platform_chat_conversations"("agencyId");
      CREATE INDEX IF NOT EXISTS "platform_chat_conversations_lastMessageAt_idx" ON "platform_chat_conversations"("lastMessageAt");
    `);
    console.log("✓ platform_chat_conversations table ready.");

    // 3. Create platform_chat_messages table if not exists
    console.log("▶ 3. Creating platform_chat_messages table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "platform_chat_messages" (
        "id" TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "agencyId" TEXT NOT NULL,
        "senderUserId" TEXT NOT NULL,
        "senderRole" "UserRole" NOT NULL,
        "messageText" TEXT NOT NULL,
        "clientMessageId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "platform_chat_messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "platform_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "platform_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "platform_chat_messages_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "platform_chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "platform_chat_messages_conversationId_clientMessageId_key" ON "platform_chat_messages"("conversationId", "clientMessageId") WHERE "clientMessageId" IS NOT NULL;
      CREATE INDEX IF NOT EXISTS "platform_chat_messages_conversationId_createdAt_idx" ON "platform_chat_messages"("conversationId", "createdAt");
      CREATE INDEX IF NOT EXISTS "platform_chat_messages_agencyId_createdAt_idx" ON "platform_chat_messages"("agencyId", "createdAt");
      CREATE INDEX IF NOT EXISTS "platform_chat_messages_senderUserId_idx" ON "platform_chat_messages"("senderUserId");
    `);
    console.log("✓ platform_chat_messages table ready.");

    // 4. Enable Row Level Security (RLS)
    // 4. Create SECURITY DEFINER authorization helper function & Enable Row Level Security (RLS)
    console.log("▶ 4. Enabling Row Level Security (RLS) & Security Definer helper...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.is_chat_participant(message_agency_id text)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = (auth.uid())::text
          AND (
            users.role = 'PLATFORM_OWNER'
            OR (users.role = 'AGENCY_OWNER' AND users."agencyId" = message_agency_id)
          )
        );
      $$;
    `);

    // Grant SELECT to authenticated role for Realtime stream evaluation
    await prisma.$executeRawUnsafe(`
      GRANT SELECT ON "platform_chat_messages" TO authenticated;
      GRANT SELECT ON "platform_chat_conversations" TO authenticated;
      GRANT EXECUTE ON FUNCTION public.is_chat_participant(text) TO authenticated;
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "platform_chat_conversations" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "platform_chat_messages" ENABLE ROW LEVEL SECURITY;`);

    // Drop previous policies if re-running
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "platform_chat_conversations_tenant_isolation" ON "platform_chat_conversations";`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "platform_chat_messages_tenant_isolation" ON "platform_chat_messages";`);

    // RLS Policy for Conversations
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "platform_chat_conversations_tenant_isolation" ON "platform_chat_conversations"
      FOR SELECT
      TO authenticated
      USING (
        public.is_chat_participant("agencyId")
      );
    `);

    // RLS Policy for Messages
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "platform_chat_messages_tenant_isolation" ON "platform_chat_messages"
      FOR SELECT
      TO authenticated
      USING (
        public.is_chat_participant("agencyId")
      );
    `);
    console.log("✓ RLS Policies & Grants configured.");

    // 5. Add to Supabase Realtime publication
    console.log("▶ 5. Adding tables to supabase_realtime publication...");
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND tablename = 'platform_chat_messages'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE "platform_chat_messages";
        END IF;
      END
      $$;
    `);
    console.log("✓ supabase_realtime publication includes platform_chat_messages.");

    console.log("\n═════════════════════════════════════════════════════════════════════════");
    console.log("   ALL DDL, RLS & REALTIME MIGRATIONS APPLIED SUCCESSFULLY");
    console.log("═════════════════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Migration Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyChatMigration();
