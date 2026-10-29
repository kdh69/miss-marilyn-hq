/**
 * Family view: one shared password (FAMILY_PASSWORD) opens a read-only panel without a Google
 * account. The cookie holds an HMAC of the password keyed by AUTH_SECRET, so changing either
 * signs every family browser out. Web Crypto only, so the middleware can check it too.
 */
export const FAMILY_COOKIE = "mm_family";
export const FAMILY_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const familyEnabled = () => !!(process.env.FAMILY_PASSWORD && process.env.AUTH_SECRET);

async function hmac(text: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.AUTH_SECRET!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time compare of two hex strings of equal length. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function familyToken(): Promise<string> {
  return hmac(`family:${process.env.FAMILY_PASSWORD}`);
}

export async function isFamilyCookie(value?: string): Promise<boolean> {
  return !!value && familyEnabled() && same(value, await familyToken());
}

export async function checkFamilyPassword(attempt: string): Promise<boolean> {
  return familyEnabled() && same(await hmac(`family:${attempt}`), await familyToken());
}
