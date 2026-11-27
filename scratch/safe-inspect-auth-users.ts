import { getAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = getAdminClient();
  if (!admin) {
    console.log("No admin client available");
    return;
  }

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 10 });
  if (error) {
    console.error("List users error:", error.message);
    return;
  }

  console.log("Supabase Auth Users count:", data.users.length);
  for (const u of data.users) {
    console.log({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata,
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
