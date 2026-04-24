import { SignJWT, jwtVerify } from 'jose';

/** Minimum secret length enforced at startup */
const MIN_SECRET_LENGTH = 32;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Set it in .env.local`,
    );
  }
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  username: string;
}

/**
 * Sign a JWT token with 8-hour expiry.
 * Algorithm: HS256 — symmetric, suitable for single-server deployment.
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verify a JWT token. Returns payload or null on any failure.
 * Never throws — all errors are caught and return null (OWASP A07).
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload.username !== 'string') return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

/**
 * Extract admin_token from Cookie header string.
 * Returns null if cookie is absent or malformed.
 */
export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : null;
}
