import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Canonical Supabase project references across TripDesk environments:
 * - PRODUCTION_TARGET_SUPABASE_PROJECT_REF: The production-target project (qypkowejgqrmilckemcr)
 * - LOCAL_QA_SUPABASE_PROJECT_REF: The protected local/QA project (nsqarlegqxymqfyvfrjw)
 */
export const PRODUCTION_TARGET_SUPABASE_PROJECT_REF = "qypkowejgqrmilckemcr";
export const LOCAL_QA_SUPABASE_PROJECT_REF = "nsqarlegqxymqfyvfrjw";

export interface BootstrapOwnerOptions {
  email?: string;
  password?: string;
  name?: string;
  allowReplacement?: boolean;
  targetMode?: string;
  expectedProjectRef?: string;
  supabaseUrl?: string;
  databaseUrl?: string;
  serviceRoleKey?: string;
  prismaClient?: any;
  supabaseClient?: any;
}

export interface BootstrapEnvironmentValidationOptions {
  supabaseUrl?: string | null;
  databaseUrl?: string | null;
  targetMode?: string | null;
  expectedProjectRef?: string | null;
  targetEmail?: string | null;
}

export interface ValidatedBootstrapEnvironment {
  projectRef: string;
  dbProjectRef: string;
  targetMode: string;
}

/**
 * Structurally extracts the Supabase project reference from a given URL.
 * Requires a valid URL whose hostname matches `<project-ref>.supabase.co`.
 * Returns null if the URL is missing, malformed, or does not match standard Supabase host structure.
 */
export function extractSupabaseProjectRef(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const urlToParse = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlToParse);
    const hostname = parsed.hostname.toLowerCase();

    // Hostname must strictly be <project-ref>.supabase.co
    const parts = hostname.split(".");
    if (parts.length === 3 && parts[1] === "supabase" && parts[2] === "co") {
      const ref = parts[0].trim().toLowerCase();
      if (/^[a-z0-9_-]+$/.test(ref)) {
        return ref;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Structurally extracts the Supabase project reference from a PostgreSQL connection string.
 * Supports:
 * 1. Supabase Connection Pooler: `postgresql://postgres.<project-ref>:<password>@...pooler.supabase.com:.../postgres`
 * 2. Supabase Direct Host: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:.../postgres`
 *
 * Returns null if the URL is missing, malformed, hostile/spoofed, or does not match standard Supabase host structure.
 */
export function extractDatabaseProjectRef(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const urlToParse = trimmed.includes("://") ? trimmed : `postgresql://${trimmed}`;
    const parsed = new URL(urlToParse);

    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    const rawUsername = decodeURIComponent(parsed.username || "");
    const hostParts = hostname.split(".");

    // 1. Supabase Connection Pooler:
    // Hostname must strictly end with .pooler.supabase.com (e.g. aws-0-ap-northeast-1.pooler.supabase.com or pooler.supabase.com)
    if (
      hostParts.length >= 3 &&
      hostParts.slice(-3).join(".") === "pooler.supabase.com" &&
      hostParts.slice(0, -3).every((part) => /^[a-z0-9-]+$/.test(part))
    ) {
      // In pooler mode, username must strictly be postgres.<project-ref>
      if (rawUsername.startsWith("postgres.")) {
        const ref = rawUsername.slice("postgres.".length).trim().toLowerCase();
        if (/^[a-z0-9_-]+$/.test(ref)) {
          return ref;
        }
      }
      return null;
    }

    // 2. Supabase Direct Host:
    // Hostname must strictly be db.<project-ref>.supabase.co
    if (
      hostParts.length === 4 &&
      hostParts[0] === "db" &&
      hostParts[2] === "supabase" &&
      hostParts[3] === "co"
    ) {
      const ref = hostParts[1].trim().toLowerCase();
      if (/^[a-z0-9_-]+$/.test(ref)) {
        return ref;
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fail-Closed Environment Target Validator.
 *
 * Enforces:
 * 1. Target mode authorization: Provisioning the production Platform Owner requires explicit
 *    BOOTSTRAP_TARGET_MODE="production" (or options.targetMode === "production").
 *    NODE_ENV=production alone is NOT accepted.
 * 2. Structural Supabase URL validation: Hostname must match `<project-ref>.supabase.co`.
 * 3. Structural Database URL validation: Connection string must structurally match Supabase pooler
 *    (*.pooler.supabase.com with postgres.<ref> username) or direct host (db.<ref>.supabase.co).
 * 4. Cross-target matching: Confirms detected Supabase Auth project ref matches detected Database URL project ref.
 * 5. Local/QA protection: Fails closed immediately if either URL targets the Local/QA project (nsqarlegqxymqfyvfrjw) for production.
 * 6. Target project matching: Confirms detected project ref matches the intended target ref.
 */
export function validateBootstrapEnvironment(
  options?: BootstrapEnvironmentValidationOptions
): ValidatedBootstrapEnvironment {
  const targetEmail = (options?.targetEmail || "").trim().toLowerCase();
  const explicitTargetMode = (options?.targetMode || process.env.BOOTSTRAP_TARGET_MODE || "").trim().toLowerCase();

  const isProductionTarget =
    targetEmail === "supportyourtraveldesk@gmail.com" ||
    explicitTargetMode === "production";

  // 1. Target mode validation
  // NOTE: NODE_ENV=production alone is NEVER accepted as target authorization.
  if (isProductionTarget && explicitTargetMode !== "production") {
    console.error(
      "❌ Target Mode Authorization Required: Provisioning the production Platform Owner requires explicit target authorization."
    );
    console.error("   Set BOOTSTRAP_TARGET_MODE=production in your environment or pass targetMode: 'production'.");
    console.error("   Note: NODE_ENV=production alone does NOT prove target authorization.");
    throw new Error(
      "Target Mode Authorization Required: Missing explicit BOOTSTRAP_TARGET_MODE='production'."
    );
  }

  // 2. Supabase URL structural validation
  const rawUrl =
    options?.supabaseUrl !== undefined
      ? options.supabaseUrl
      : process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    console.error("❌ Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL is not configured.");
    throw new Error("Invalid Supabase URL: Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  const detectedRef = extractSupabaseProjectRef(rawUrl);
  if (!detectedRef) {
    console.error("❌ Malformed Supabase URL: Hostname must structurally match '<project-ref>.supabase.co'.");
    throw new Error("Invalid Supabase URL: Malformed URL structure.");
  }

  // 3. Database URL structural validation
  const rawDbUrl =
    options?.databaseUrl !== undefined
      ? options.databaseUrl
      : process.env.DATABASE_URL;
  if (!rawDbUrl || typeof rawDbUrl !== "string" || !rawDbUrl.trim()) {
    console.error("❌ Missing Database URL: DATABASE_URL is not configured.");
    throw new Error("Invalid Database URL: Missing DATABASE_URL.");
  }

  const detectedDbRef = extractDatabaseProjectRef(rawDbUrl);
  if (!detectedDbRef) {
    console.error(
      "❌ Malformed Database URL: Connection string must structurally match Supabase pooler (*.pooler.supabase.com with postgres.<ref> username) or direct host (db.<ref>.supabase.co)."
    );
    throw new Error("Invalid Database URL: Malformed or unsupported connection string structure.");
  }

  // 4. Cross-target matching: Supabase Auth URL vs. Database URL
  if (detectedRef !== detectedDbRef) {
    console.error(
      `❌ Target Project Mismatch: Supabase Auth project ref ('${detectedRef}') does not match Database URL project ref ('${detectedDbRef}').`
    );
    throw new Error(
      `Target Project Mismatch: Auth URL project ref '${detectedRef}' != Database project ref '${detectedDbRef}'.`
    );
  }

  // 5. Reject Local/QA project targeting for production owner
  if (isProductionTarget && (detectedRef === LOCAL_QA_SUPABASE_PROJECT_REF || detectedDbRef === LOCAL_QA_SUPABASE_PROJECT_REF)) {
    console.error(
      `❌ Environment Lock: Supabase URL or Database URL points to protected Local/QA project ref ('${LOCAL_QA_SUPABASE_PROJECT_REF}').`
    );
    console.error("   Production Platform Owner provisioning is strictly forbidden from targeting Local/QA.");
    throw new Error(
      `Environment Lock: Cannot target Local/QA project ref '${LOCAL_QA_SUPABASE_PROJECT_REF}'.`
    );
  }

  // 6. Validate against expected project reference
  const expectedRef = (
    options?.expectedProjectRef ||
    process.env.EXPECTED_SUPABASE_PROJECT_REF ||
    (isProductionTarget ? PRODUCTION_TARGET_SUPABASE_PROJECT_REF : null)
  )?.trim().toLowerCase();

  if (expectedRef && (detectedRef !== expectedRef || detectedDbRef !== expectedRef)) {
    console.error(
      `❌ Target Project Mismatch: Detected project ref '${detectedRef}' does not match expected project ref '${expectedRef}'.`
    );
    throw new Error(
      `Target Project Mismatch: Detected project ref '${detectedRef}' != expected '${expectedRef}'.`
    );
  }

  return { projectRef: detectedRef, dbProjectRef: detectedDbRef, targetMode: explicitTargetMode || "custom" };
}

export interface BootstrapOwnerResult {
  success: boolean;
  action: "verified_existing" | "linked_auth_user" | "created_new";
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    agencyId: string | null;
  };
}

/**
 * Paginates through all Supabase Auth users to safely locate an account by email.
 * Avoids the default single-page limitation of listUsers().
 */
export async function findAuthUserByEmail(
  supabase: any,
  targetEmail: string
): Promise<any | null> {
  const normalized = targetEmail.trim().toLowerCase();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to query Supabase Auth users: ${error.message}`);
    }

    if (!data || !data.users || data.users.length === 0) {
      return null;
    }

    const match = data.users.find(
      (u: any) => u.email?.trim().toLowerCase() === normalized
    );
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }
    page++;
  }
}

/**
 * Hardened, safe Platform Owner bootstrap routine.
 * Supports singleton verification and explicit, controlled replacement transitions.
 */
export async function bootstrapPlatformOwner(
  options?: BootstrapOwnerOptions
): Promise<BootstrapOwnerResult> {
  const rawEmail = options?.email || process.env.BOOTSTRAP_OWNER_EMAIL || "supportyourtraveldesk@gmail.com";
  const email = rawEmail.trim().toLowerCase();
  const password = options?.password || process.env.BOOTSTRAP_OWNER_PASSWORD;
  const name = options?.name || process.env.BOOTSTRAP_OWNER_NAME || "Your Travel Desk Platform Owner";
  const allowReplacement = options?.allowReplacement !== undefined
    ? options.allowReplacement
    : process.env.ALLOW_PLATFORM_OWNER_REPLACEMENT === "true";

  console.log(`🔐 Bootstrapping Platform Owner: ${email}`);

  // 1. Target email format validation
  if (!email || !EMAIL_REGEX.test(email)) {
    console.error(`❌ Invalid or missing target email: "${email}".`);
    throw new Error(`Invalid target email format: ${email}`);
  }

  // 2. Fail-Closed Environment Target Safety Lock
  // Validates target mode, Supabase Auth URL, and Database URL matching
  // BEFORE any database connection, Supabase Auth call, or Prisma query can occur.
  const validatedEnv = validateBootstrapEnvironment({
    supabaseUrl: options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL,
    databaseUrl: options?.databaseUrl || process.env.DATABASE_URL,
    targetMode: options?.targetMode,
    expectedProjectRef: options?.expectedProjectRef,
    targetEmail: email,
  });

  console.log(`🎯 Environment Lock Verified: Project ref [${validatedEnv.projectRef}], Target mode [${validatedEnv.targetMode}]`);

  // 3. Resolve database and Auth clients
  let prisma = options?.prismaClient;
  let pool: Pool | null = null;

  if (!prisma) {
    const connectionString = options?.databaseUrl || process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("❌ Missing DATABASE_URL in environment.");
      throw new Error("Missing DATABASE_URL");
    }
    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  let supabase: SupabaseClient = options?.supabaseClient;
  if (!supabase) {
    const supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = (
      options?.serviceRoleKey !== undefined
        ? options.serviceRoleKey
        : process.env.SUPABASE_SERVICE_ROLE_KEY
    )?.trim();

    if (!supabaseUrl) {
      console.error("❌ Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL is not configured.");
      throw new Error("Missing Supabase configuration: Missing NEXT_PUBLIC_SUPABASE_URL");
    }

    if (!serviceRoleKey) {
      console.error(
        "❌ Missing Supabase Service Role Key: SUPABASE_SERVICE_ROLE_KEY is required for administrative Auth provisioning."
      );
      console.error("   Note: NEXT_PUBLIC_SUPABASE_ANON_KEY cannot be used for administrative operations.");
      throw new Error(
        "Missing Supabase configuration: SUPABASE_SERVICE_ROLE_KEY is required for Auth administration."
      );
    }

    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  try {
    // 3. Inspect existing database records
    const targetDbUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    const otherDbOwner = await prisma.user.findFirst({
      where: {
        role: "PLATFORM_OWNER",
        email: { not: email, mode: "insensitive" },
      },
    });

    // 4. Safe Singleton Protection: Prevent accidental duplicate owners
    if (otherDbOwner && !allowReplacement) {
      console.error(`❌ Safe Singleton Protection: An existing Platform Owner (${otherDbOwner.email}, ID: ${otherDbOwner.id}) is already present in the database.`);
      console.error("   To prevent unintended duplicate-owner creation, bootstrap will not proceed without explicit replacement authorization.");
      console.error("   Set ALLOW_PLATFORM_OWNER_REPLACEMENT=true in your environment to permit a controlled replacement transition.");
      throw new Error(`Controlled replacement not authorized: Existing Platform Owner ${otherDbOwner.email} detected.`);
    }

    if (otherDbOwner && allowReplacement) {
      console.log(`⚠️ Controlled Replacement Mode Active: Existing Platform Owner ${otherDbOwner.email} (${otherDbOwner.id}) detected.`);
      console.log(`   Provisioning target Platform Owner ${email} alongside existing owner for the authorized verification window.`);
    }

    // 5. Inspect Supabase Auth for target email
    const existingAuthUser = await findAuthUserByEmail(supabase, email);

    // 6. Handle All Distinct Identity States
    // ───────────────────────────────────────────────────────────────────────────
    // CASE A: Both DB record and Supabase Auth account exist
    // ───────────────────────────────────────────────────────────────────────────
    if (targetDbUser && existingAuthUser) {
      // Identity alignment check
      if (targetDbUser.id !== existingAuthUser.id) {
        console.error(`❌ Identity Mismatch: Supabase Auth User ID (${existingAuthUser.id}) does not match TripDesk DB ID (${targetDbUser.id}) for ${email}.`);
        console.error("   Automatic repair is disabled to prevent security corruption. Manual reconciliation required.");
        throw new Error(`Identity Mismatch: Auth ID (${existingAuthUser.id}) != DB ID (${targetDbUser.id})`);
      }

      // Role integrity check
      if (targetDbUser.role !== "PLATFORM_OWNER") {
        console.error(`❌ Role Conflict: Database user ${email} has role "${targetDbUser.role}". Cannot silently convert non-platform accounts to PLATFORM_OWNER.`);
        throw new Error(`Role Conflict: User ${email} has role ${targetDbUser.role}`);
      }

      console.log(`ℹ️ Platform Owner already exists and is aligned: ${targetDbUser.email} (ID: ${targetDbUser.id})`);
      // Ensure email confirmation and metadata without mutating password
      const { error: updateError } = await supabase.auth.admin.updateUserById(targetDbUser.id, {
        email_confirm: true,
        user_metadata: {
          name: targetDbUser.name || name,
          role: "PLATFORM_OWNER",
        },
      });
      if (updateError) {
        console.warn("⚠️ Warning: Failed to ensure email confirmation in Supabase Auth:", updateError.message);
      }

      return {
        success: true,
        action: "verified_existing",
        user: {
          id: targetDbUser.id,
          email: targetDbUser.email,
          name: targetDbUser.name,
          role: targetDbUser.role,
          agencyId: targetDbUser.agencyId,
        },
      };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CASE B: Database record exists, but Supabase Auth user is missing (Ambiguous)
    // ───────────────────────────────────────────────────────────────────────────
    if (targetDbUser && !existingAuthUser) {
      console.error(`❌ Ambiguous State: TripDesk DB record exists for ${email} (ID: ${targetDbUser.id}, role: ${targetDbUser.role}), but no matching user was found in Supabase Auth.`);
      console.error("   Automatic repair is disabled to prevent data corruption. Manual reconciliation required.");
      throw new Error(`Ambiguous State: Database record exists for ${email} without matching Supabase Auth user.`);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CASE C: Supabase Auth user exists, but TripDesk DB record is missing
    // ───────────────────────────────────────────────────────────────────────────
    if (!targetDbUser && existingAuthUser) {
      console.log(`ℹ️ Supabase Auth account found for ${email} (ID: ${existingAuthUser.id}). Linking to TripDesk database...`);

      const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        email_confirm: true,
        user_metadata: {
          name,
          role: "PLATFORM_OWNER",
        },
      });
      if (updateError) {
        console.warn("⚠️ Warning: Failed to update metadata for Auth user:", updateError.message);
      }

      const owner = await prisma.user.create({
        data: {
          id: existingAuthUser.id,
          agencyId: null,
          name,
          email,
          role: "PLATFORM_OWNER",
          emailVerified: new Date(),
        },
      });

      console.log(`✅ Successfully linked Platform Owner to TripDesk database!`);
      console.log(`   User ID: ${owner.id}`);
      console.log(`   Role: ${owner.role}`);

      return {
        success: true,
        action: "linked_auth_user",
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: owner.role,
          agencyId: owner.agencyId,
        },
      };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CASE D: Neither exists — Create fresh Platform Owner in Auth and Database
    // ───────────────────────────────────────────────────────────────────────────
    if (!password) {
      console.error("❌ Missing BOOTSTRAP_OWNER_PASSWORD in environment for new Platform Owner creation.");
      throw new Error("Missing BOOTSTRAP_OWNER_PASSWORD for new account creation");
    }

    if (password.length < 8) {
      console.error("❌ BOOTSTRAP_OWNER_PASSWORD must be at least 8 characters long.");
      throw new Error("BOOTSTRAP_OWNER_PASSWORD too short (minimum 8 characters)");
    }

    console.log(`✨ Creating new Supabase Auth user for ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "PLATFORM_OWNER",
      },
    });

    if (createError || !createData.user) {
      console.error("❌ Failed to create Supabase Auth user for Platform Owner:", createError?.message);
      throw new Error(`Failed to create Supabase Auth user: ${createError?.message}`);
    }

    const supabaseUserId = createData.user.id;

    const owner = await prisma.user.create({
      data: {
        id: supabaseUserId,
        agencyId: null,
        name,
        email,
        role: "PLATFORM_OWNER",
        emailVerified: new Date(),
      },
    });

    console.log(`✅ Successfully bootstrapped Platform Owner in TripDesk database!`);
    console.log(`   User ID: ${owner.id}`);
    console.log(`   Role: ${owner.role}`);
    console.log(`   Agency ID: null (Platform Level)`);

    return {
      success: true,
      action: "created_new",
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
        agencyId: owner.agencyId,
      },
    };
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Direct CLI invocation
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, "/").endsWith("prisma/bootstrap-owner.ts") ||
    process.argv[1].replace(/\\/g, "/").endsWith("prisma/bootstrap-owner.js"));

if (isDirectExecution) {
  bootstrapPlatformOwner()
    .catch((e) => {
      console.error("❌ Bootstrap error:", e.message || e);
      process.exit(1);
    });
}
