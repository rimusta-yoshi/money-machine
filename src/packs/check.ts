import { packSchema } from './schema'
import type { Pack } from './schema'
import { isBuilt, SWITCHABLE_SECTIONS } from './sections'
import type { PlannedSection, SectionName } from './sections'
import { MAX_SIMILARITY, overlaps } from './similarity'
import type { Wording } from './similarity'

/**
 * Everything `npm run pack:check` checks, as plain functions over what it reads from disk
 * (scripts/pack-check.mjs), so the tests run the same checks. Errors stop a pack going live;
 * warnings are worth a look; "blocked" lists packs waiting on a section that isn't built yet.
 */

export interface CheckInput {
  /** PACKS: the business types the builder offers. */
  live: readonly unknown[]
  /** WAITING_PACKS: written, but waiting on a section. */
  waiting: readonly unknown[]
  /** The pack files in src/packs/business, without ".ts". */
  packFiles: readonly string[]
  /** The photos in reference/sample-photos. */
  photoFiles: ReadonlySet<string>
  /** reference/sample-photos/LICENCE.md */
  licence: string
  /** Files under public/ (forward slashes), to find each page's preview image and example shots. */
  publicFiles: ReadonlySet<string>
}

export interface Report {
  errors: string[]
  warnings: string[]
  blocked: { pack: string; sections: PlannedSection[] }[]
  /** Planned sections by how many packs they'd unlock, most first. */
  unlocks: { section: PlannedSection; packs: string[] }[]
  /** The most alike pairs of packs and their score (0 to 1), most alike first. */
  alike: { a: string; b: string; score: number }[]
}

/** Where pack:images puts each pack's images (under public/). */
export const packImages = (slug: string) => ({
  og: `og/${slug}.png`,
  examples: [1, 2, 3].map(n => `websites-for/${slug}/example-${n}.jpg`),
})

/** Words that mean a pack still has template text in it. */
const UNFINISHED = /\b(TODO|TBC|FIXME|lorem ipsum|xxx)\b|\[[A-Z ]+\]|<[a-z]+>/i

const label = (p: Pack) => p.id

function schemaErrors(raw: unknown, where: string): { pack: Pack | null; errors: string[] } {
  const parsed = packSchema.safeParse(raw)
  if (parsed.success) return { pack: parsed.data, errors: [] }
  return { pack: null, errors: parsed.error.issues.map(i => `${where}: ${i.path.join('.') || '(pack)'}: ${i.message}`) }
}

function sectionProblems(p: Pack): { errors: string[]; blockedOn: PlannedSection[]; laterOn: PlannedSection[] } {
  const names: SectionName[] = p.sections.map(s => s.type)
  const errors: string[] = []
  if (names[0] !== 'hero') errors.push(`${label(p)}: the first section must be "hero"`)
  if (!names.includes('contact')) errors.push(`${label(p)}: every site needs a "contact" section`)
  if (names.includes('footer')) errors.push(`${label(p)}: don't list "footer": every site gets one`)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length) errors.push(`${label(p)}: sections listed twice: ${[...new Set(dupes)].join(', ')}`)
  for (const s of p.sections) {
    if (s.optional && isBuilt(s.type) && !SWITCHABLE_SECTIONS.includes(s.type)) {
      errors.push(`${label(p)}: "${s.type}" can't be optional (only ${SWITCHABLE_SECTIONS.join(', ')} can be switched on and off)`)
    }
  }
  const planned = p.sections.filter(s => !isBuilt(s.type))
  return {
    errors,
    blockedOn: planned.filter(s => !s.optional).map(s => s.type as PlannedSection),
    laterOn: planned.filter(s => s.optional).map(s => s.type as PlannedSection),
  }
}

/** The Pexels page LICENCE.md records for each file. */
export function licencedPages(licence: string): Map<string, string> {
  const rows = [...licence.matchAll(/^\| *([a-z0-9-]+\.jpg) *\|.*?\| *(https:\/\/www\.pexels\.com\/photo\/[^ |]+) *\|/gm)]
  return new Map(rows.map(m => [m[1], m[2]]))
}

function photoProblems(p: Pack, input: CheckInput, pages: Map<string, string>): string[] {
  const errors: string[] = []
  const files = p.photos.map(ph => ph.file)
  const dupes = files.filter((f, i) => files.indexOf(f) !== i)
  if (dupes.length) errors.push(`${label(p)}: photos listed twice: ${dupes.join(', ')}`)
  if (!p.photos.some(ph => ph.hero)) errors.push(`${label(p)}: mark at least one photo as hero: true`)
  for (const ph of p.photos) {
    if (!input.photoFiles.has(ph.file)) errors.push(`${label(p)}: photo ${ph.file} isn't in reference/sample-photos`)
    const page = pages.get(ph.file)
    if (!page) errors.push(`${label(p)}: photo ${ph.file} isn't listed in reference/sample-photos/LICENCE.md`)
    else if (page !== ph.credit.page) errors.push(`${label(p)}: photo ${ph.file}'s Pexels page doesn't match LICENCE.md (${page})`)
  }
  return errors
}

/** Every piece of text a pack's landing page says in its own words. */
export function landingText(p: Pack): string[] {
  const l = p.landing
  return [
    l.headline, l.description, ...l.intro,
    ...l.needs.flatMap(n => [n.title, n.text]),
    ...l.faqs.flatMap(f => [f.q, f.a]),
    ...p.services.map(s => s.description),
    ...l.examples.map(e => e.about),
  ]
}

function copyProblems(p: Pack): string[] {
  const errors: string[] = []
  const all = [p.name, p.plural, ...Object.values(p.copy), ...p.badges, ...p.services.map(s => s.name), ...landingText(p), p.landing.title]
  for (const t of all) if (UNFINISHED.test(t)) errors.push(`${label(p)}: unfinished text: "${t.slice(0, 80)}"`)
  const same = (xs: string[], what: string) => {
    const lower = xs.map(x => x.toLowerCase())
    const dupes = lower.filter((x, i) => lower.indexOf(x) !== i)
    if (dupes.length) errors.push(`${label(p)}: ${what} listed twice: ${[...new Set(dupes)].join(', ')}`)
  }
  same(p.services.map(s => s.name), 'services')
  same(p.badges, 'badges')
  same(p.landing.faqs.map(f => f.q), 'FAQ questions')
  same(p.landing.examples.map(e => e.name), 'example names')
  const themes = p.landing.examples.map(e => e.theme)
  if (new Set(themes).size !== themes.length) errors.push(`${label(p)}: the three examples must each use a different theme`)
  if (!themes.includes(p.look.theme)) errors.push(`${label(p)}: one example should use the pack's own starting theme (${p.look.theme})`)
  return errors
}

/** Names and synonyms must point at one pack only, or "My business isn't listed" can't choose. */
function nameClashes(packs: readonly Pack[]): string[] {
  const owner = new Map<string, string>()
  const errors: string[] = []
  for (const p of packs) {
    for (const n of new Set([p.name.toLowerCase(), p.plural.toLowerCase(), ...p.synonyms])) {
      const other = owner.get(n)
      if (other && other !== p.id) errors.push(`"${n}" is used by both ${other} and ${p.id}: give it to one of them`)
      else owner.set(n, p.id)
    }
  }
  for (const key of ['id', 'slug'] as const) {
    const seen = packs.map(p => p[key])
    const dupes = seen.filter((v, i) => seen.indexOf(v) !== i)
    if (dupes.length) errors.push(`two packs share the ${key} ${[...new Set(dupes)].join(', ')}`)
  }
  return errors
}

function fileProblems(packs: readonly Pack[], packFiles: readonly string[]): string[] {
  const ids = new Set(packs.map(p => p.id))
  const files = packFiles.filter(f => !f.startsWith('_'))
  return [
    ...files.filter(f => !ids.has(f)).map(f => `src/packs/business/${f}.ts isn't in PACKS or WAITING_PACKS (src/packs/index.ts), or its id isn't "${f}"`),
    ...[...ids].filter(id => !files.includes(id)).map(id => `pack ${id} should live in src/packs/business/${id}.ts`),
  ]
}

function imageWarnings(p: Pack, publicFiles: ReadonlySet<string>): string[] {
  const want = packImages(p.slug)
  const missing = [want.og, ...want.examples].filter(f => !publicFiles.has(f))
  return missing.length ? [`${label(p)}: no ${missing.join(', ')} yet: run npm run pack:images`] : []
}

function wordingProblems(packs: readonly Pack[]): { errors: string[]; warnings: string[]; alike: Report['alike'] } {
  const wordings: Wording[] = packs.map(p => ({ id: p.id, text: landingText(p), names: [p.name, p.plural, ...p.synonyms] }))
  const pairs = overlaps(wordings)
  return {
    errors: pairs.filter(o => o.score > MAX_SIMILARITY)
      .map(o => `${o.a} and ${o.b} read too alike (${Math.round(o.score * 100)}% of five-word runs shared, limit ${Math.round(MAX_SIMILARITY * 100)}%): rewrite one in its own words`),
    warnings: pairs.flatMap(o => o.phrases.map(ph => `${o.a} and ${o.b} both say "${ph}"`)),
    alike: pairs.slice(0, 3).map(({ a, b, score }) => ({ a, b, score })),
  }
}

export function checkPacks(input: CheckInput): Report {
  const parsed = [
    ...input.live.map((raw, i) => ({ ...schemaErrors(raw, `PACKS[${i}]${idOf(raw)}`), live: true })),
    ...input.waiting.map((raw, i) => ({ ...schemaErrors(raw, `WAITING_PACKS[${i}]${idOf(raw)}`), live: false })),
  ]
  const errors = parsed.flatMap(p => p.errors)
  const warnings: string[] = []
  const blocked: Report['blocked'] = []
  const unlock = new Map<PlannedSection, string[]>()
  const pages = licencedPages(input.licence)
  const packs = parsed.flatMap(p => (p.pack ? [p.pack] : []))

  for (const { pack, live } of parsed) {
    if (!pack) continue
    const s = sectionProblems(pack)
    errors.push(...s.errors, ...photoProblems(pack, input, pages), ...copyProblems(pack))
    if (s.blockedOn.length) {
      if (live) errors.push(`${pack.id}: needs ${s.blockedOn.join(', ')}, which isn't built yet: move it to WAITING_PACKS`)
      blocked.push({ pack: pack.id, sections: s.blockedOn })
    }
    for (const sec of [...s.blockedOn, ...s.laterOn]) unlock.set(sec, [...(unlock.get(sec) ?? []), pack.id])
    if (s.laterOn.length) warnings.push(`${pack.id}: will use ${s.laterOn.join(', ')} once built`)
    if (live) warnings.push(...imageWarnings(pack, input.publicFiles))
  }
  errors.push(...nameClashes(packs), ...fileProblems(packs, input.packFiles))
  const wording = wordingProblems(packs)
  errors.push(...wording.errors)
  warnings.push(...wording.warnings)
  const unlocks = [...unlock].map(([section, ids]) => ({ section, packs: ids })).sort((a, b) => b.packs.length - a.packs.length)
  return { errors, warnings, blocked, unlocks, alike: wording.alike }
}

function idOf(raw: unknown): string {
  const id = typeof raw === 'object' && raw !== null && 'id' in raw ? (raw as { id: unknown }).id : null
  return typeof id === 'string' ? ` (${id})` : ''
}

/** The report as lines for the terminal. */
export function formatReport(r: Report, packCount: number): string {
  const out: string[] = []
  if (r.errors.length) out.push(`${r.errors.length} error(s):`, ...r.errors.map(e => `  ✗ ${e}`))
  if (r.warnings.length) out.push(`${r.warnings.length} warning(s):`, ...r.warnings.map(w => `  ! ${w}`))
  if (r.blocked.length) out.push('Blocked on sections not built yet:', ...r.blocked.map(b => `  ${b.pack}: blocked on section ${b.sections.join(', ')}`))
  if (r.unlocks.length) out.push('Sections that would unlock the most packs:', ...r.unlocks.map(u => `  ${u.section}: ${u.packs.length} (${u.packs.join(', ')})`))
  if (r.alike.length) out.push(`Most alike: ${r.alike.map(x => `${x.a}/${x.b} ${Math.round(x.score * 100)}%`).join(', ')}`)
  out.push(r.errors.length ? `pack:check failed (${packCount} packs).` : `pack:check passed (${packCount} packs).`)
  return out.join('\n')
}
