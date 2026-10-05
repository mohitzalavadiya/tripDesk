import "server-only";
import { entitlementService } from "@/lib/services/entitlement-service";

export interface ResolveLogoOptions {
  agencyId?: string | null;
  logoUrl?: string | null;
  checkEntitlement?: boolean;
}

/**
 * Validates whether a Buffer matches supported image magic bytes (PNG, JPEG, WEBP).
 * Disallows SVG and non-image content.
 */
function isValidImageBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;

  const isPng =
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  const isJpeg =
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff;

  const isWebp =
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";

  return isPng || isJpeg || isWebp;
}

export const pdfBrandingHelper = {
  /**
   * Resolves an agency's stored logo URL into a PDFKit-compatible Buffer.
   * Performs entitlement checks, bounded HTTP fetch, and binary magic-byte validation.
   * Strictly fail-open: returns null on any error, timeout, or missing entitlement so PDF generation never fails.
   */
  async resolveLogoBuffer(options: ResolveLogoOptions): Promise<Buffer | null> {
    const { agencyId, logoUrl, checkEntitlement = true } = options;

    if (!logoUrl || typeof logoUrl !== "string" || logoUrl.trim().length === 0) {
      return null;
    }

    // 1. Entitlement check (if agencyId provided and checkEntitlement requested)
    if (agencyId && checkEntitlement) {
      try {
        const isAllowed = await entitlementService.isFeatureAllowed(agencyId, "CUSTOM_AGENCY_LOGO");
        if (!isAllowed) {
          return null;
        }
      } catch (err) {
        console.warn("[pdfBrandingHelper] Entitlement check warning:", err);
        return null;
      }
    }

    const trimmedUrl = logoUrl.trim();

    // 2. Data URL handling (e.g. data:image/png;base64,...)
    if (trimmedUrl.startsWith("data:")) {
      try {
        const base64Index = trimmedUrl.indexOf("base64,");
        if (base64Index !== -1) {
          const base64Data = trimmedUrl.substring(base64Index + 7);
          const buf = Buffer.from(base64Data, "base64");
          return isValidImageBuffer(buf) ? buf : null;
        }
      } catch (err) {
        console.warn("[pdfBrandingHelper] Data URL parsing warning:", err);
        return null;
      }
    }

    // 3. Remote HTTP / HTTPS URL fetching
    if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
      try {
        const response = await fetch(trimmedUrl, {
          signal: AbortSignal.timeout(3000), // 3-second bounded timeout
          headers: {
            Accept: "image/png,image/jpeg,image/webp,*/*",
          },
        });

        if (!response.ok) {
          console.warn(`[pdfBrandingHelper] Logo fetch failed with HTTP ${response.status} for ${trimmedUrl}`);
          return null;
        }

        const arrayBuf = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuf);

        // Max 3MB buffer safety ceiling
        if (buf.length === 0 || buf.length > 3 * 1024 * 1024) {
          return null;
        }

        return isValidImageBuffer(buf) ? buf : null;
      } catch (fetchErr: any) {
        console.warn(`[pdfBrandingHelper] Remote logo fetch error: ${fetchErr?.message || fetchErr}`);
        return null;
      }
    }

    return null;
  },
};
