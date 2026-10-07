/** Random ids and secrets, and their hashes. The database only ever stores hashes of secrets. */

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const hex = (bytes: Uint8Array): string => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n))

/** The key a browser holds for its draft (256 bits). Whoever has it can edit the draft. */
export const newDraftKey = (): string => base64url(random(32))
/** A preview link's token (192 bits). Read-only. */
export const newPreviewToken = (): string => base64url(random(24))
/** A draft's storage id. */
export const newRef = (): string => hex(random(16))

export const DRAFT_KEY = /^[A-Za-z0-9_-]{43}$/
export const PREVIEW_TOKEN = /^[A-Za-z0-9_-]{32}$/
export const REF = /^[0-9a-f]{32}$/

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

/** Compares secrets without leaking how much matched (both sides hashed to equal length first). */
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

/** What a signed link lets its holder do. */
export type LinkPurpose = 'edit' | 'refund'

const hmacKey = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

/**
 * Link tokens, signed with LINK_SECRET: refund.<ref>.<signature>, and edit.<ref>.<n>.<signature>
 * where n numbers the site's edit links in the order they were issued (0 is the welcome email's).
 */
export const LINK_TOKEN = /^(?:(refund)\.([0-9a-f]{32})|(edit)\.([0-9a-f]{32})\.(\d{1,9}))\.([A-Za-z0-9_-]{43})$/

export interface LinkClaim { purpose: LinkPurpose; ref: string; n: number }

/** What a token claims to be (not yet checked), or null if it isn't one. */
export function parseLink(token: string): LinkClaim | null {
  const m = LINK_TOKEN.exec(token)
  if (!m) return null
  return m[1] ? { purpose: 'refund', ref: m[2], n: 0 } : { purpose: 'edit', ref: m[4], n: Number(m[5]) }
}

export async function signLink(secret: string, purpose: LinkPurpose, ref: string, n = 0): Promise<string> {
  const body = purpose === 'edit' ? `edit.${ref}.${n}` : `refund.${ref}`
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(body))
  return `${body}.${base64url(new Uint8Array(sig))}`
}

/** The token's claim if it's genuine and for this purpose; null otherwise. */
export async function verifyLink(secret: string, purpose: LinkPurpose, token: string): Promise<LinkClaim | null> {
  const claim = parseLink(token)
  if (!claim || claim.purpose !== purpose) return null
  // Compared as the exact signed string, so no other spelling of the signature passes.
  return (await sameSecret(token, await signLink(secret, purpose, claim.ref, claim.n))) ? claim : null
}
