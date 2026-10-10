import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export const RECOVERY_COOKIE_NAME = "tripdesk_recovery_proof";
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60; // 15 minutes validity

export interface RecoveryProofPayload {
  userId: string;
  email: string;
  timestamp: number;
}

/**
 * Resolves the server-side signing secret.
 * Prefers the dedicated RECOVERY_SIGNING_SECRET, falling back to SUPABASE_SERVICE_ROLE_KEY.
 * Fails closed if neither is configured with adequate entropy (minimum 32 characters).
 */
export function getRecoverySigningSecret(): string {
  const secret =
    process.env.RECOVERY_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error("Missing or invalid server signing secret for password recovery proof.");
  }
  return secret.trim();
}

/**
 * Pure cryptographic signing function decoupled from Next.js request headers.
 * Creates an HMAC-SHA256 signed base64url token.
 */
export function createRecoveryProofToken(
  payload: RecoveryProofPayload,
  signingSecret?: string
): string {
  const secret =
    signingSecret !== undefined ? signingSecret : getRecoverySigningSecret();

  if (!secret || typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error("Missing or invalid server signing secret for password recovery proof.");
  }

  const serialized = JSON.stringify(payload);
  const signature = createHmac("sha256", secret.trim()).update(serialized).digest("hex");
  return Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");
}

/**
 * Pure cryptographic verification function decoupled from Next.js request headers.
 * Validates token structure, signature (constant time), expiration, and clock skew.
 * Returns the verified payload or null if invalid, expired, or tampered.
 */
export function verifyRecoveryProofToken(
  token: string,
  signingSecret?: string,
  maxAgeSeconds: number = RECOVERY_MAX_AGE_SECONDS,
  nowTimestamp: number = Date.now()
): RecoveryProofPayload | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const secret =
      signingSecret !== undefined ? signingSecret : getRecoverySigningSecret();

    if (!secret || typeof secret !== "string" || secret.trim().length < 32) {
      return null;
    }

    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    const { payload, signature } = parsed || {};

    if (
      !payload ||
      typeof payload.userId !== "string" ||
      !payload.userId.trim() ||
      typeof payload.email !== "string" ||
      !payload.email.trim() ||
      typeof payload.timestamp !== "number" ||
      typeof signature !== "string"
    ) {
      return null;
    }

    // Enforce maximum lifetime and reject future timestamps (clock skew > 60s)
    const elapsed = nowTimestamp - payload.timestamp;
    if (elapsed < -60000 || elapsed > maxAgeSeconds * 1000) {
      return null;
    }

    // Verify HMAC signature in constant time
    const serialized = JSON.stringify(payload);
    const expectedSignature = createHmac("sha256", secret.trim()).update(serialized).digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates an HMAC-signed recovery proof cookie bound to the verified user ID and email.
 * This cookie can only be issued after successful Supabase Auth recovery OTP verification.
 */
export async function setRecoveryProofCookie(userId: string, email: string): Promise<void> {
  const cookieStore = await cookies();
  const payload: RecoveryProofPayload = {
    userId,
    email: email.trim().toLowerCase(),
    timestamp: Date.now(),
  };

  const token = createRecoveryProofToken(payload);

  cookieStore.set(RECOVERY_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_MAX_AGE_SECONDS,
  });
}

/**
 * Validates the HMAC signature, expiration, and payload of the recovery proof cookie.
 * Returns the verified payload or null if missing, forged, or expired.
 */
export async function getVerifiedRecoveryProof(): Promise<RecoveryProofPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return verifyRecoveryProofToken(token);
  } catch {
    return null;
  }
}

/**
 * Clears the recovery proof cookie upon successful password update or session termination.
 */
export async function clearRecoveryProofCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(RECOVERY_COOKIE_NAME);
  } catch {
    // Non-blocking in headless contexts
  }
}
