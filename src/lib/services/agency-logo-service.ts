import "server-only";
import { prisma } from "@/lib/prisma";
import { getAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const BUCKET_NAME = "agency-assets";

/**
 * Validates binary image signatures and content.
 * Disallows SVG to prevent script injection / active content risks.
 */
export function validateLogoFile(
  fileBuffer: Buffer,
  _fileName: string,
  mimeType: string
): { ext: string; sanitizedMime: string } {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new ApiError(400, "EMPTY_FILE", "Logo file cannot be empty.");
  }

  if (fileBuffer.length > MAX_LOGO_SIZE_BYTES) {
    throw new ApiError(
      400,
      "FILE_TOO_LARGE",
      "Logo file exceeds the 2MB maximum limit."
    );
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new ApiError(
      400,
      "INVALID_FILE_TYPE",
      "Unsupported file format. Please upload a PNG, JPEG, or WEBP image."
    );
  }

  // Magic bytes / signature check
  let detectedExt = "";
  let validatedMime = "";

  const isPng =
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47 &&
    fileBuffer[4] === 0x0d &&
    fileBuffer[5] === 0x0a &&
    fileBuffer[6] === 0x1a &&
    fileBuffer[7] === 0x0a;

  const isJpeg =
    fileBuffer.length >= 3 &&
    fileBuffer[0] === 0xff &&
    fileBuffer[1] === 0xd8 &&
    fileBuffer[2] === 0xff;

  const isWebp =
    fileBuffer.length >= 12 &&
    fileBuffer.toString("ascii", 0, 4) === "RIFF" &&
    fileBuffer.toString("ascii", 8, 12) === "WEBP";

  if (isPng) {
    detectedExt = "png";
    validatedMime = "image/png";
  } else if (isJpeg) {
    detectedExt = "jpg";
    validatedMime = "image/jpeg";
  } else if (isWebp) {
    detectedExt = "webp";
    validatedMime = "image/webp";
  } else {
    throw new ApiError(
      400,
      "CORRUPTED_IMAGE",
      "File content does not match a valid PNG, JPEG, or WEBP image signature."
    );
  }

  return { ext: detectedExt, sanitizedMime: validatedMime };
}

/**
 * Extracts the storage object path from a Supabase Storage public URL.
 */
export function extractAgencyLogoStoragePath(
  url: string | null | undefined,
  agencyId: string
): string | null {
  if (!url || typeof url !== "string") return null;

  const expectedPrefix = `agencies/${agencyId}/logo/`;
  const bucketSegment = `/${BUCKET_NAME}/`;

  if (url.includes(bucketSegment)) {
    const parts = url.split(bucketSegment);
    if (parts.length > 1) {
      const candidatePath = parts[1].split("?")[0];
      if (candidatePath.startsWith(expectedPrefix)) {
        return candidatePath;
      }
    }
  }

  if (url.startsWith(expectedPrefix)) {
    return url.split("?")[0];
  }

  return null;
}

export const agencyLogoService = {
  /**
   * Uploads or replaces an agency logo with safe ordering:
   * 1. Validate file.
   * 2. Upload new object to storage.
   * 3. Update PostgreSQL Agency.logo.
   * 4. If old logo was in storage, delete old object (non-fatal cleanup).
   */
  async uploadLogo(
    agencyId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ) {
    const { ext, sanitizedMime } = validateLogoFile(
      fileBuffer,
      fileName,
      mimeType
    );

    const storagePath = `agencies/${agencyId}/logo/logo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    let logoUrl: string;
    const adminClient = getAdminClient();

    if (adminClient) {
      try {
        // Ensure bucket exists
        const { data: buckets } = await adminClient.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
        if (!bucketExists) {
          await adminClient.storage.createBucket(BUCKET_NAME, { public: true });
        }
      } catch (bucketErr) {
        console.warn("Bucket check warning:", bucketErr);
      }

      const { error: uploadError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: sanitizedMime,
          upsert: true,
        });

      if (uploadError) {
        throw new ApiError(
          500,
          "STORAGE_UPLOAD_FAILED",
          `Failed to upload logo image to storage: ${uploadError.message}`
        );
      }

      const { data: publicUrlData } = adminClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      logoUrl = publicUrlData.publicUrl;
    } else {
      // Local / test fallback if service role key is not configured
      logoUrl = `data:${sanitizedMime};base64,${fileBuffer.toString("base64")}`;
    }

    // Retrieve current agency logo to prepare cleanup
    const currentAgency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { logo: true },
    });
    const oldLogoUrl = currentAgency?.logo;

    // Update DB with the new logo
    let updatedAgency;
    try {
      updatedAgency = await prisma.agency.update({
        where: { id: agencyId },
        data: { logo: logoUrl },
        select: { id: true, name: true, logo: true },
      });
    } catch (dbErr: any) {
      // If DB update fails, cleanup newly uploaded orphan object if applicable
      if (adminClient) {
        try {
          await adminClient.storage.from(BUCKET_NAME).remove([storagePath]);
        } catch (cleanupErr) {
          console.warn("Failed to cleanup orphan object after DB error:", cleanupErr);
        }
      }
      throw dbErr;
    }

    // Clean up previous storage object only after successful DB update
    if (adminClient && oldLogoUrl) {
      const oldStoragePath = extractAgencyLogoStoragePath(oldLogoUrl, agencyId);
      if (oldStoragePath && oldStoragePath !== storagePath) {
        try {
          await adminClient.storage.from(BUCKET_NAME).remove([oldStoragePath]);
        } catch (cleanupErr) {
          console.warn("Non-fatal: Failed to delete previous logo from storage:", cleanupErr);
        }
      }
    }

    return updatedAgency;
  },

  /**
   * Removes an agency logo safely:
   * 1. Updates PostgreSQL Agency.logo to null.
   * 2. Cleans up existing storage object if present (non-fatal).
   */
  async deleteLogo(agencyId: string) {
    const currentAgency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { logo: true },
    });
    const oldLogoUrl = currentAgency?.logo;

    const updatedAgency = await prisma.agency.update({
      where: { id: agencyId },
      data: { logo: null },
      select: { id: true, name: true, logo: true },
    });

    if (oldLogoUrl) {
      const adminClient = getAdminClient();
      if (adminClient) {
        const oldStoragePath = extractAgencyLogoStoragePath(oldLogoUrl, agencyId);
        if (oldStoragePath) {
          try {
            await adminClient.storage.from(BUCKET_NAME).remove([oldStoragePath]);
          } catch (cleanupErr) {
            console.warn("Non-fatal: Failed to delete logo from storage:", cleanupErr);
          }
        }
      }
    }

    return updatedAgency;
  },
};
