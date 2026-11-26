/**
 * Extracts the `iat` (issued-at) timestamp in milliseconds from a Supabase JWT access token.
 */
export function extractJwtIssuedAtMs(accessToken: string | null | undefined): number | null {
  if (!accessToken || typeof accessToken !== "string") return null;
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return typeof payload?.iat === "number" ? payload.iat * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Verifies that a database user is active and that the current Supabase session
 * was issued after any account session revocation timestamp (`sessionRevokedAt`).
 */
export async function isDbUserSessionValid(
  dbUser: {
    isActive?: boolean | null;
    deactivatedAt?: Date | string | null;
    sessionRevokedAt?: Date | string | null;
  },
  supabase: {
    auth: {
      getSession?: () => Promise<{ data?: { session?: { access_token?: string } | null } }>;
    };
  },
  supabaseUser?: { last_sign_in_at?: string | null } | null
): Promise<boolean> {
  if (dbUser.isActive === false || dbUser.deactivatedAt) {
    return false;
  }

  if (!dbUser.sessionRevokedAt) {
    return true;
  }

  const revokedAtMs = new Date(dbUser.sessionRevokedAt).getTime();
  if (!Number.isFinite(revokedAtMs)) {
    return true;
  }

  let tokenIssuedAtMs: number | null = null;
  if (typeof supabase?.auth?.getSession === "function") {
    try {
      const sessionRes = await supabase.auth.getSession();
      tokenIssuedAtMs = extractJwtIssuedAtMs(sessionRes?.data?.session?.access_token);
    } catch {
      // Fall back to last_sign_in_at check below
    }
  }

  if (tokenIssuedAtMs !== null) {
    return tokenIssuedAtMs >= revokedAtMs;
  }

  if (supabaseUser?.last_sign_in_at) {
    const lastSignInMs = new Date(supabaseUser.last_sign_in_at).getTime();
    if (Number.isFinite(lastSignInMs)) {
      return lastSignInMs >= revokedAtMs;
    }
  }

  return false;
}
