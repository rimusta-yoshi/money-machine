import { BRAND } from '../brand/config'
import { money } from '../brand/money'

/**
 * The {{words}} in our page text (content/*.md), filled from the brand config and the price.
 * Values still reading like "[FULL NAME]" are placeholders: shown highlighted until filled in,
 * and refused by a launch build (see launchProblems).
 */
export type PageWords = Record<string, string>

export function pageWords(pricePence: number): PageWords {
  return {
    brand: BRAND.name,
    domain: BRAND.domain,
    email: BRAND.email,
    abuseEmail: BRAND.abuseEmail,
    owner: BRAND.legal.owner,
    address: BRAND.legal.address,
    ico: BRAND.legal.icoNumber,
    updated: BRAND.legal.updated,
    price: money(pricePence),
    guaranteeDays: String(BRAND.guarantee.days),
  }
}

/** "[FULL NAME]", "[ICO REGISTRATION NUMBER]": square brackets around capitals. */
export const PLACEHOLDER = /\[[A-Z][A-Z0-9 ]*[A-Z0-9]\]/g

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

/**
 * Fills {{words}} in rendered HTML (escaped). A placeholder value is marked so it stands out;
 * an unknown word stops the build rather than reaching a page.
 */
export function fillWords(html: string, words: PageWords): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    const value = words[name]
    if (value === undefined) throw new Error(`Unknown word {{${name}}} in page text. Known: ${Object.keys(words).join(', ')}`)
    const safe = esc(value)
    return value.match(PLACEHOLDER) ? `<mark class="pg-todo">${safe}</mark>` : safe
  })
}

/** The placeholders left in a page, e.g. ["[FULL NAME]"]: a launch build must have none. */
export function placeholdersIn(html: string): string[] {
  return [...new Set(html.match(PLACEHOLDER) ?? [])]
}

/** Why a build can't go out: placeholders left while orders are open. */
export function launchProblems(pages: { path: string; html: string }[], launched: boolean): string[] {
  if (!launched) return []
  return pages.flatMap(p => placeholdersIn(p.html).map(ph => `${p.path} still says ${ph}: fill it in under "legal" in src/brand/config.ts`))
}
