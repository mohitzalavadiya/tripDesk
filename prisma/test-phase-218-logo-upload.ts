import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { AgencyStatus, SubscriptionStatus, UserRole } from "@prisma/client";
import {
  validateLogoFile,
  extractAgencyLogoStoragePath,
  agencyLogoService,
} from "../src/lib/services/agency-logo-service";
import { entitlementService } from "../src/lib/services/entitlement-service";

async function main() {
  console.log("================================================================================");
  console.log("    PHASE 218 — CUSTOM AGENCY LOGO REAL FILE UPLOAD & REPLACEMENT QA SUITE      ");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // --- SECTION 1: Pure File Validation & Binary Signatures ---
  console.log("\n--- Section 1: Binary Image File Signature & Size Validation ---");

  // Valid PNG binary with magic bytes (\x89PNG\r\n\x1a\n)
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  ]);
  try {
    const result = validateLogoFile(validPngBuffer, "logo.png", "image/png");
    assert(
      result.ext === "png" && result.sanitizedMime === "image/png",
      "Valid PNG binary passes validation with correct extension and MIME"
    );
  } catch (err: any) {
    assert(false, "Valid PNG binary passes validation", err.message);
  }

  // Valid JPEG binary with magic bytes (\xff\xd8\xff)
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  try {
    const result = validateLogoFile(validJpegBuffer, "logo.jpg", "image/jpeg");
    assert(
      result.ext === "jpg" && result.sanitizedMime === "image/jpeg",
      "Valid JPEG binary passes validation with correct extension and MIME"
    );
  } catch (err: any) {
    assert(false, "Valid JPEG binary passes validation", err.message);
  }

  // Valid WEBP binary with magic bytes (RIFF....WEBP)
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20,
  ]);
  try {
    const result = validateLogoFile(validWebpBuffer, "logo.webp", "image/webp");
    assert(
      result.ext === "webp" && result.sanitizedMime === "image/webp",
      "Valid WEBP binary passes validation with correct extension and MIME"
    );
  } catch (err: any) {
    assert(false, "Valid WEBP binary passes validation", err.message);
  }

  // Corrupted / Spoofed file: text/html with image/png MIME
  const spoofedBuffer = Buffer.from("<html><script>alert(1)</script></html>", "utf-8");
  try {
    validateLogoFile(spoofedBuffer, "fake.png", "image/png");
    assert(false, "Spoofed HTML disguised as PNG should be rejected");
  } catch (err: any) {
    assert(
      err.code === "CORRUPTED_IMAGE",
      "Spoofed HTML file rejected with CORRUPTED_IMAGE error code"
    );
  }

  // SVG file: Must be rejected (disallowed due to active script / XSS risks)
  const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert('xss')</script></svg>", "utf-8");
  try {
    validateLogoFile(svgBuffer, "logo.svg", "image/svg+xml");
    assert(false, "SVG file upload should be rejected");
  } catch (err: any) {
    assert(
      err.code === "INVALID_FILE_TYPE",
      "SVG file rejected with INVALID_FILE_TYPE error code"
    );
  }

  // Oversized file (> 2MB)
  const oversizedBuffer = Buffer.alloc(2 * 1024 * 1024 + 1024, 0x89);
  try {
    validateLogoFile(oversizedBuffer, "large.png", "image/png");
    assert(false, "Oversized file (>2MB) should be rejected");
  } catch (err: any) {
    assert(
      err.code === "FILE_TOO_LARGE",
      "Oversized file (>2MB) rejected with FILE_TOO_LARGE error code"
    );
  }

  // Empty file (0 bytes)
  const emptyBuffer = Buffer.alloc(0);
  try {
    validateLogoFile(emptyBuffer, "empty.png", "image/png");
    assert(false, "Empty file should be rejected");
  } catch (err: any) {
    assert(
      err.code === "EMPTY_FILE",
      "Empty file rejected with EMPTY_FILE error code"
    );
  }

  // --- SECTION 2: Storage Path & Tenant Isolation ---
  console.log("\n--- Section 2: Storage Path Resolution & Tenant Isolation ---");

  const agencyA = "agency-uuid-1111-aaaa";
  const agencyB = "agency-uuid-2222-bbbb";
  const storageUrlA = `https://supabase.project.co/storage/v1/object/public/agency-assets/agencies/${agencyA}/logo/logo-1728000000000-xyz.png`;
  const storageUrlB = `https://supabase.project.co/storage/v1/object/public/agency-assets/agencies/${agencyB}/logo/logo-1728000000000-xyz.png`;
  const externalLegacyUrl = "https://images.unsplash.com/photo-123456789";

  const extractedPathA = extractAgencyLogoStoragePath(storageUrlA, agencyA);
  assert(
    extractedPathA === `agencies/${agencyA}/logo/logo-1728000000000-xyz.png`,
    "extractAgencyLogoStoragePath correctly extracts agency-scoped storage path"
  );

  const crossTenantAttempt = extractAgencyLogoStoragePath(storageUrlB, agencyA);
  assert(
    crossTenantAttempt === null,
    "Tenant Isolation: Agency A cannot extract or target Agency B's storage path"
  );

  const legacyUrlExtracted = extractAgencyLogoStoragePath(externalLegacyUrl, agencyA);
  assert(
    legacyUrlExtracted === null,
    "External legacy URLs return null (safe from storage deletion bugs)"
  );

  // --- SECTION 3: End-to-End Service Mutation Lifecycle with Temporary QA Agency ---
  console.log("\n--- Section 3: Service-Level Upload, Replace, and Remove Lifecycles ---");

  // Create isolated temporary test agency
  const tempAgency = await prisma.agency.create({
    data: {
      name: `QA Logo Test Agency ${Date.now()}`,
      phone: "+919999988888",
      email: `qa-logo-${Date.now()}@tripdesk.test`,
      status: AgencyStatus.ACTIVE,
      logo: null,
    },
  });

  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Professional" },
  });

  if (!proPlan) {
    throw new Error("Professional plan missing in database");
  }

  const tempSub = await prisma.subscription.create({
    data: {
      agencyId: tempAgency.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  try {
    // 1. Initial Logo Upload
    const uploadRes1 = await agencyLogoService.uploadLogo(
      tempAgency.id,
      validPngBuffer,
      "brand-logo.png",
      "image/png"
    );

    assert(
      !!uploadRes1 && !!uploadRes1.logo,
      "First logo upload returns updated agency with persisted logo URL"
    );

    const checkDb1 = await prisma.agency.findUnique({
      where: { id: tempAgency.id },
      select: { logo: true },
    });

    assert(
      checkDb1?.logo === uploadRes1.logo,
      "Database confirms Agency.logo matches upload response"
    );

    const initialLogoUrl = uploadRes1.logo;

    // 2. Logo Replacement Flow (Safe Ordering: new upload -> DB update -> old cleanup)
    const uploadRes2 = await agencyLogoService.uploadLogo(
      tempAgency.id,
      validWebpBuffer,
      "new-brand.webp",
      "image/webp"
    );

    assert(
      !!uploadRes2 && !!uploadRes2.logo && uploadRes2.logo !== initialLogoUrl,
      "Logo replacement successfully updates Agency.logo to new object reference"
    );

    const checkDb2 = await prisma.agency.findUnique({
      where: { id: tempAgency.id },
      select: { logo: true },
    });

    assert(
      checkDb2?.logo === uploadRes2.logo,
      "Database confirms updated Agency.logo following replacement"
    );

    // 3. Logo Removal Flow
    const deleteRes = await agencyLogoService.deleteLogo(tempAgency.id);
    assert(
      deleteRes.logo === null,
      "Logo removal returns Agency with logo = null"
    );

    const checkDb3 = await prisma.agency.findUnique({
      where: { id: tempAgency.id },
      select: { logo: true },
    });

    assert(
      checkDb3?.logo === null,
      "Database confirms Agency.logo is null after removal"
    );

    // 4. Repeated Remove (Idempotency)
    const repeatDeleteRes = await agencyLogoService.deleteLogo(tempAgency.id);
    assert(
      repeatDeleteRes.logo === null,
      "Repeated logo removal is safe and idempotent"
    );

    // --- SECTION 4: Entitlement & Read-Only Enforcement ---
    console.log("\n--- Section 4: Entitlement & Read-Only Hardening Checks ---");

    const starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: "Starter" },
    });

    if (starterPlan) {
      // Switch temp agency subscription to Starter plan
      await prisma.subscription.updateMany({
        where: { agencyId: tempAgency.id },
        data: { planId: starterPlan.id },
      });

      // Verify Starter plan blocks CUSTOM_AGENCY_LOGO
      try {
        await entitlementService.checkFeatureAllowed(tempAgency.id, "CUSTOM_AGENCY_LOGO");
        assert(false, "Starter plan should block CUSTOM_AGENCY_LOGO");
      } catch (err: any) {
        assert(
          err.statusCode === 403,
          "entitlementService blocks CUSTOM_AGENCY_LOGO on Starter plan (403 FeatureNotAllowedError)"
        );
      }

      const isAllowedOnStarter = await entitlementService.isFeatureAllowed(
        tempAgency.id,
        "CUSTOM_AGENCY_LOGO"
      );
      assert(
        isAllowedOnStarter === false,
        "isFeatureAllowed returns false for Starter plan"
      );

      // Switch back to Professional plan
      await prisma.subscription.updateMany({
        where: { agencyId: tempAgency.id },
        data: { planId: proPlan.id },
      });

      const isAllowedOnPro = await entitlementService.isFeatureAllowed(
        tempAgency.id,
        "CUSTOM_AGENCY_LOGO"
      );
      assert(
        isAllowedOnPro === true,
        "isFeatureAllowed returns true for Professional plan"
      );
    }

    // Expired Subscription check: Expired subscription throws ReadOnlyAccessError
    await prisma.subscription.updateMany({
      where: { agencyId: tempAgency.id },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    try {
      await entitlementService.checkFeatureAllowed(tempAgency.id, "CUSTOM_AGENCY_LOGO");
      assert(false, "Expired subscription should throw ReadOnlyAccessError");
    } catch (err: any) {
      assert(
        err.statusCode === 403,
        "entitlementService throws 403 ReadOnlyAccessError for expired subscription"
      );
    }

    // Suspension check: Suspended agency
    await prisma.agency.update({
      where: { id: tempAgency.id },
      data: { status: AgencyStatus.SUSPENDED },
    });

    const suspendedAgency = await prisma.agency.findUnique({
      where: { id: tempAgency.id },
    });
    assert(
      suspendedAgency?.status === AgencyStatus.SUSPENDED,
      "Agency successfully marked as SUSPENDED for read-only test"
    );

  } finally {
    // Clean up temporary QA test agency and sub
    await prisma.subscription.deleteMany({
      where: { agencyId: tempAgency.id },
    });
    await prisma.agency.delete({
      where: { id: tempAgency.id },
    });
    console.log("\n[CLEANUP] Temporary QA test agency cleaned up safely.");
  }

  // Summary
  console.log("\n================================================================================");
  console.log(`    PHASE 218 QA TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("FATAL QA TEST ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
