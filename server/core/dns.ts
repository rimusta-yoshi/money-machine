import type { Dns } from './ports'

/**
 * Public DNS lookups over HTTPS (Cloudflare's resolver, JSON form), for checking a domain
 * exists, telling which company runs its DNS, finding Domain Connect and seeing the
 * customer's record. Answers are only ever hints: Cloudflare's own check decides "live".
 */

const RESOLVER = 'https://cloudflare-dns.com/dns-query'
const TYPES = { NS: 2, TXT: 16, CNAME: 5 } as const
const TIMEOUT_MS = 4000

interface DohAnswer { Status?: number; Answer?: { type?: number; data?: string }[] }

/** A TXT record's text: its quoted strings joined (long records come in 255-character pieces). */
const txtText = (data: string): string => {
  const parts = [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\(.)/g, '$1'))
  return parts.length ? parts.join('') : data
}

export function dohDns(fetcher: typeof fetch = (...a) => fetch(...a)): Dns {
  return {
    async lookup(name, type) {
      try {
        const res = await fetcher(`${RESOLVER}?name=${encodeURIComponent(name)}&type=${type}`, {
          headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!res.ok) return { status: 'error', answers: [] }
        const body = await res.json() as DohAnswer
        // 3 is NXDOMAIN: no such name at all.
        if (body.Status === 3) return { status: 'nxdomain', answers: [] }
        if (body.Status !== 0) return { status: 'error', answers: [] }
        const answers = (body.Answer ?? []).filter(a => a.type === TYPES[type] && typeof a.data === 'string')
          .map(a => (type === 'TXT' ? txtText(a.data!) : a.data!.toLowerCase().replace(/\.$/, '')))
        return { status: 'ok', answers }
      } catch {
        return { status: 'error', answers: [] }
      }
    },
  }
}
