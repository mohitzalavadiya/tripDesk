import "dotenv/config";
import * as readline from "readline";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/lib/prisma";

const TARGET_USER_ID = "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9";
const TARGET_EMAIL = "mzpatel14@gmail.com";

async function promptPassword(promptText: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Hide/mask input where possible in terminal
    process.stdout.write(promptText);
    
    // Readline hidden line reading
    const stdin = process.stdin;
    if (stdin.isTTY) {
      stdin.setRawMode(true);
      let password = "";
      stdin.resume();
      stdin.on("data", function onData(char) {
        const str = char.toString("utf8");
        if (str === "\n" || str === "\r" || str === "\u0004") {
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          rl.close();
          console.log();
          resolve(password);
        } else if (str === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.exit(1);
        } else if (str === "\u007f" || str === "\b") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          password += str;
          process.stdout.write("*");
        }
      });
    } else {
      rl.question("", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  console.log("=================================================================");
  console.log("  TRIPDESK — SECURE PLATFORM OWNER PASSWORD RESET");
  console.log("=================================================================\n");

  // Step 1: Pre-validation
  const pgUser = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
  });

  if (!pgUser || pgUser.email !== TARGET_EMAIL || pgUser.role !== "PLATFORM_OWNER" || pgUser.agencyId !== null) {
    console.error("❌ Identity mismatch in PostgreSQL. Aborting.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(TARGET_USER_ID);
  if (authErr || !authUser?.user || authUser.user.email !== TARGET_EMAIL) {
    console.error("❌ Identity mismatch in Supabase Auth. Aborting.");
    process.exit(1);
  }

  console.log(`✔ Verified Platform Owner Account: ${TARGET_EMAIL} (${TARGET_USER_ID})`);
  console.log("  Role: PLATFORM_OWNER | agencyId: null\n");

  // Step 2: Prompt for new password securely
  const newPassword = await promptPassword("Enter New Password: ");
  if (!newPassword || newPassword.length < 8) {
    console.error("\n❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  const confirmPassword = await promptPassword("Confirm New Password: ");
  if (newPassword !== confirmPassword) {
    console.error("\n❌ Passwords do not match. Aborting.");
    process.exit(1);
  }

  console.log("\n🔒 Updating Supabase Auth password credential...");

  // Step 3: Update ONLY password via Supabase Admin API
  const { data: updateRes, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    TARGET_USER_ID,
    { password: newPassword }
  );

  if (updateErr) {
    console.error("❌ Supabase Auth password update failed:", updateErr.message);
    process.exit(1);
  }

  console.log("✔ Supabase Auth password successfully updated!");

  // Step 4: Verification of PostgreSQL & Supabase Auth record integrity
  const verifyPg = await prisma.user.findUnique({
    where: { id: TARGET_USER_ID },
  });
  const { data: verifyAuth } = await supabaseAdmin.auth.admin.getUserById(TARGET_USER_ID);

  if (
    verifyPg?.id === TARGET_USER_ID &&
    verifyPg?.email === TARGET_EMAIL &&
    verifyPg?.role === "PLATFORM_OWNER" &&
    verifyPg?.agencyId === null &&
    verifyAuth?.user.id === TARGET_USER_ID &&
    verifyAuth?.user.email === TARGET_EMAIL
  ) {
    console.log("✔ Verification Successful: Identity, UUID, Role, and agencyId are 100% preserved.");
  } else {
    console.error("⚠️ Post-update verification anomaly detected.");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
