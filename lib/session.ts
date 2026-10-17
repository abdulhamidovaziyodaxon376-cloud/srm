export const USER_ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type SessionClaims = {
  sub: string;
  role: UserRole;
  exp: number;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function signSession(
  claims: Pick<SessionClaims, "sub" | "role">,
  secret: string,
  maxAgeSeconds = 8 * 60 * 60,
): Promise<string> {
  if (encoder.encode(secret).byteLength < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  }

  const payload: SessionClaims = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importSigningKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));

  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string | undefined,
): Promise<SessionClaims | null> {
  if (!token || !secret || encoder.encode(secret).byteLength < 32) return null;

  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;

    const key = await importSigningKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(encodedSignature).buffer as ArrayBuffer,
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const claims = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as Partial<SessionClaims>;

    if (
      typeof claims.sub !== "string" ||
      !claims.sub ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000) ||
      !USER_ROLES.includes(claims.role as UserRole)
    ) {
      return null;
    }

    return claims as SessionClaims;
  } catch {
    return null;
  }
}