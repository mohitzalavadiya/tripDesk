/**
 * Focused verification suite for hiding Activities, Suppliers, and Invoices UI pages.
 * Runs completely DB-free with mocked Supabase middleware auth state.
 */

import assert from "node:assert/strict";
import Module from "node:module";
import { NextRequest } from "next/server";
import { adminNavigationConfig, agencyNavigationConfig, secondaryNavigation } from "../src/lib/navigation";
import { PAGE_PERMISSIONS_REGISTRY } from "../src/lib/auth/permissions";

let mockUser: { id: string; email: string } | null = null;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === "@supabase/ssr") {
    return {
      createServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: mockUser }, error: null }),
        },
      }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-test-key";

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { updateSession, isHiddenPagePath } = require("../src/lib/supabase/middleware");

  let passed = 0;
  async function test(name: string, fn: () => Promise<void> | void) {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  }

  console.log("\n=== Hidden Pages Navigation & Route Guard Verification ===");

  await test("Navigation configs omit /activities, /suppliers, and /invoices across agency/admin/secondary menus", () => {
    const agencyHrefs = agencyNavigationConfig.flatMap((s) => s.items.map((i) => i.href));
    const adminHrefs = adminNavigationConfig.flatMap((s) => s.items.map((i) => i.href));
    const secondaryHrefs = secondaryNavigation.map((i) => i.href);
    const allHrefs = [...agencyHrefs, ...adminHrefs, ...secondaryHrefs];

    assert.equal(agencyHrefs.includes("/activities"), false);
    assert.equal(agencyHrefs.includes("/suppliers"), false);
    assert.equal(agencyHrefs.includes("/invoices"), false);
    assert.equal(allHrefs.includes("/activities"), false);
    assert.equal(allHrefs.includes("/suppliers"), false);
    assert.equal(allHrefs.includes("/invoices"), false);

    // Unrelated core routes and referrals remain untouched
    assert.equal(agencyHrefs.includes("/dashboard"), true);
    assert.equal(agencyHrefs.includes("/trips"), true);
    assert.equal(agencyHrefs.includes("/bookings"), true);
    assert.equal(agencyHrefs.includes("/finance"), true);
    assert.equal(agencyHrefs.includes("/payments"), true);
    assert.equal(agencyHrefs.includes("/referrals"), true);
  });

  await test("Internal PAGE_PERMISSIONS_REGISTRY still preserves ACTIVITIES, SUPPLIERS, INVOICES definitions", () => {
    const keys = PAGE_PERMISSIONS_REGISTRY.map((p) => p.moduleKey);
    assert.equal(keys.includes("ACTIVITIES"), true);
    assert.equal(keys.includes("SUPPLIERS"), true);
    assert.equal(keys.includes("INVOICES"), true);
  });

  await test("isHiddenPagePath accurately matches root, trailing slash, and nested paths without false positives", () => {
    for (const p of [
      "/activities",
      "/activities/",
      "/activities/new",
      "/activities/act_123",
      "/suppliers",
      "/suppliers/",
      "/suppliers/new",
      "/suppliers/sup_456",
      "/invoices",
      "/invoices/",
      "/invoices/inv_789",
    ]) {
      assert.equal(isHiddenPagePath(p), true, `Expected hidden match for ${p}`);
    }

    for (const p of [
      "/dashboard",
      "/trips/123",
      "/bookings/bk_1",
      "/finance",
      "/payments",
      "/referrals",
      "/api/activities",
      "/api/activities/act_123",
      "/api/suppliers",
      "/api/suppliers/sup_456",
      "/api/invoices",
      "/api/invoices/inv_789/pdf",
      "/api/operations/op_1/activities",
      "/api/trips/t_1/activities",
      "/activities-preview",
      "/suppliers-portal",
      "/invoices-test",
    ]) {
      assert.equal(isHiddenPagePath(p), false, `Expected pass-through for ${p}`);
    }
  });

  await test("Unauthenticated requests to hidden pages still redirect to /login?redirectTo=...", async () => {
    mockUser = null;
    for (const path of ["/activities", "/suppliers/new", "/invoices/inv_1"]) {
      const req = new NextRequest(`http://localhost:3001${path}`);
      const res = await updateSession(req);
      assert.equal(res.status, 307);
      const location = new URL(res.headers.get("location")!);
      assert.equal(location.pathname, "/login");
      assert.equal(location.searchParams.get("redirectTo"), path);
    }
  });

  await test("Authenticated direct requests (including query strings & nested routes) redirect to /dashboard", async () => {
    mockUser = { id: "user-1", email: "user@example.com" };
    for (const fullPath of [
      "/activities",
      "/activities/",
      "/activities/new",
      "/activities/act_123?tab=details",
      "/suppliers",
      "/suppliers/new",
      "/suppliers/sup_456?tab=payables",
      "/invoices",
      "/invoices/inv_789?print=1",
    ]) {
      const req = new NextRequest(`http://localhost:3001${fullPath}`);
      const res = await updateSession(req);
      assert.equal(res.status, 307, `Expected redirect for ${fullPath}`);
      const location = new URL(res.headers.get("location")!);
      assert.equal(location.pathname, "/dashboard");
      assert.equal(location.search, "");
    }
  });

  await test("Authenticated requests to API endpoints & unrelated pages pass through cleanly", async () => {
    mockUser = { id: "user-1", email: "user@example.com" };
    for (const fullPath of [
      "/dashboard",
      "/bookings/bk_1",
      "/trips/tr_1",
      "/referrals",
      "/api/activities",
      "/api/suppliers",
      "/api/invoices/inv_1/pdf",
      "/admin/agencies",
    ]) {
      const req = new NextRequest(`http://localhost:3001${fullPath}`);
      const res = await updateSession(req);
      assert.equal(res.status, 200, `Expected pass-through for ${fullPath}`);
      assert.equal(res.headers.get("location"), null);
    }
  });

  console.log(`\nAll ${passed} hidden-pages guard checks passed.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
