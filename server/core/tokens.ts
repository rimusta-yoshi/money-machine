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

/** e.g. edit.<ref>.<signature>: a link token for one site and one purpose, signed with LINK_SECRET. */
export const LINK_TOKEN = /^(edit|refund)\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/

/**
 * Signs `purpose.ref.version`. The version is the site's link version: bumping it cuts off its
 * old edit links (a fresh one is sent by email). Refund links always use version 0.
 */
export async function signLink(secret: string, purpose: LinkPurpose, ref: string, version = 0): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(`${purpose}.${ref}.${version}`))
  return `${purpose}.${ref}.${base64url(new Uint8Array(sig))}`
}

/** The site a token names (not yet checked), if it has the right shape for this purpose. */
export const linkRef = (purpose: LinkPurpose, token: string): string | null => {
  const m = LINK_TOKEN.exec(token)
  return m && m[1] === purpose ? m[2] : null
}

/** True if the token is genuine for this purpose, site and link version. */
export async function verifyLink(secret: string, purpose: LinkPurpose, token: string, version = 0): Promise<boolean> {
  const ref = linkRef(purpose, token)
  // Compared as the exact signed string, so no other spelling of the signature passes.
  return !!ref && (await sameSecret(token, await signLink(secret, purpose, ref, version)))
}
