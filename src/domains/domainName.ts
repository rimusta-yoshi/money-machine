/**
 * A customer's own domain, as they type it: cleaned, turned into its plain-letters form
 * (punycode, for names like café.co.uk) and checked. Shared by the builder (instant feedback)
 * and the server (the real check, plus a DNS lookup that the domain exists).
 *
 * We serve www.<domain> (most UK domain companies can't point the bare domain anywhere but
 * their own forwarding), or the subdomain they typed, like shop.example.co.uk.
 */

/** Suffixes people register under that are two labels long. Enough for UK customers and a few neighbours. */
const TWO_LABEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'sch.uk', 'ac.uk', 'gov.uk', 'nhs.uk', 'police.uk', 'mod.uk',
  'co.im', 'co.je', 'co.gg', 'com.au', 'net.au', 'org.au', 'co.nz', 'org.nz', 'co.za', 'com.cy',
])

/** Endings that never reach the public internet. */
const PRIVATE_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local', 'internal', 'onion', 'arpa', 'home', 'corp', 'lan', 'intranet', 'private', 'localdomain'])

/** Hostnames are at most 253 characters; this leaves room for the www. we add. */
export const MAX_DOMAIN = 249
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

export type DomainProblem = 'empty' | 'too_long' | 'bad_characters' | 'ip_address' | 'not_public' | 'suffix_only' | 'ours'

export type DomainCheck =
  | {
    ok: true
    /** The registered domain, e.g. example.co.uk. */
    domain: string
    /** What visitors use and we serve, e.g. www.example.co.uk. */
    hostname: string
    /** The record's name at the domain company: www, or the subdomain's own part. */
    host: string
  }
  | { ok: false; problem: DomainProblem; message: string }

const MESSAGES: Record<DomainProblem, string> = {
  empty: 'Type the domain you own, like smithplumbing.co.uk.',
  too_long: 'That domain is too long. Check it’s just the domain, like smithplumbing.co.uk.',
  bad_characters: 'That doesn’t look like a domain. Use letters, numbers, dots and dashes, like smithplumbing.co.uk.',
  ip_address: 'Type a domain name, like smithplumbing.co.uk, not a number address.',
  not_public: 'That isn’t a public domain. Check the ending, like .co.uk or .com.',
  suffix_only: 'Add your name in front, like smithplumbing.co.uk.',
  ours: 'That’s one of our own addresses. Type a domain you’ve bought, like smithplumbing.co.uk.',
}

const bad = (problem: DomainProblem): DomainCheck => ({ ok: false, problem, message: MESSAGES[problem] })

/** Strips what people paste around a domain: https://, a path, a port, a trailing dot. */
export function cleanDomainInput(input: string): string {
  return input.trim().toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d*$/, '')
    .replace(/\.$/, '')
}

/** The plain-letters (punycode) form, as the browser and DNS use it. Null if it can't be one. */
function toAscii(host: string): string | null {
  if (!host || /[\s@%\\]/.test(host)) return null
  try {
    const out = new URL(`http://${host}/`).hostname
    return out.endsWith('.') ? out.slice(0, -1) : out
  } catch {
    return null
  }
}

/**
 * Checks a domain someone typed. `ours` are our own domains (and their subdomains), refused.
 * Accepts example.co.uk, www.example.co.uk, https://example.co.uk/ and café.co.uk.
 */
export function checkDomain(input: string, ours: readonly string[]): DomainCheck {
  const typed = cleanDomainInput(input)
  if (!typed) return bad('empty')
  if (typed.length > 300) return bad('too_long')
  if (/^\[?[0-9a-f:]+\]?$/.test(typed) && typed.includes(':')) return bad('ip_address')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(typed)) return bad('ip_address')
  const ascii = toAscii(typed)
  if (!ascii) return bad('bad_characters')
  if (ascii.length > MAX_DOMAIN) return bad('too_long')
  const labels = ascii.split('.')
  if (labels.length < 2 || !labels.every(l => LABEL.test(l))) return bad('bad_characters')
  const tld = labels.at(-1)!
  if (!TLD.test(tld) || PRIVATE_TLDS.has(tld)) return bad('not_public')
  const suffixLength = TWO_LABEL_SUFFIXES.has(labels.slice(-2).join('.')) ? 2 : 1
  if (labels.length <= suffixLength) return bad('suffix_only')
  const domain = labels.slice(-(suffixLength + 1)).join('.')
  if (ours.some(o => domain === o || ascii === o || ascii.endsWith(`.${o}`))) return bad('ours')
  const sub = labels.slice(0, -(suffixLength + 1)).join('.')
  const host = sub || 'www'
  return { ok: true, domain, hostname: `${host}.${domain}`, host }
}
