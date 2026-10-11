/**
 * The funnel from the homepage to paying, and its maths. Shared by the server (which counts)
 * and the admin dashboard (which shows it).
 */

/** Every step recorded, in funnel order, then what can happen after paying. */
export const STEPS = [
  'landed', 'started', 'basics_done', 'look_picked', 'build_done', 'preview_shared', 'checkout_started', 'paid',
  'refunded', 'disputed',
] as const
export type Step = typeof STEPS[number]

/** Steps the builder and homepage report. The rest are recorded by the server as they happen. */
export const CLIENT_STEPS = ['landed', 'started', 'basics_done', 'look_picked', 'build_done'] as const
export type ClientStep = typeof CLIENT_STEPS[number]

/** The funnel itself: landing to paying. */
export const FUNNEL_STEPS = ['landed', 'started', 'basics_done', 'look_picked', 'build_done', 'preview_shared', 'checkout_started', 'paid'] as const satisfies readonly Step[]

/** A side step: sharing a preview is optional, so the next step is measured from the one before it. */
export const OPTIONAL_STEPS: ReadonlySet<Step> = new Set(['preview_shared'])

export const STEP_LABELS: Record<Step, string> = {
  landed: 'Landed on homepage',
  started: 'Started builder',
  basics_done: 'Basics done',
  look_picked: 'Look picked',
  build_done: 'Build done (reached Go live)',
  preview_shared: 'Preview shared',
  checkout_started: 'Checkout started',
  paid: 'Paid',
  refunded: 'Refunded',
  disputed: 'Disputed',
}

export interface FunnelRow {
  step: Step
  label: string
  count: number
  optional: boolean
  /** Share of the step before (the last non-optional one), 0–1; null for the first step or when that was 0. */
  fromPrev: number | null
  /** Share of everyone who landed, 0–1; null when nobody landed. */
  fromLanded: number | null
  /** The step that loses the biggest share of people from the step before. */
  biggestDrop: boolean
}

export const ratio = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null)

/** The funnel rows from a count per step. */
export function funnel(counts: Partial<Record<Step, number>>): FunnelRow[] {
  const landed = counts.landed ?? 0
  let prev: number | null = null
  const rows = FUNNEL_STEPS.map(step => {
    const count = counts[step] ?? 0
    const optional = OPTIONAL_STEPS.has(step)
    const row = { step, label: STEP_LABELS[step], count, optional, fromPrev: prev === null ? null : ratio(count, prev), fromLanded: ratio(count, landed), biggestDrop: false }
    if (!optional) prev = count
    return row
  })
  // The lowest share kept from the step before, ignoring the optional side step. The first one wins a tie.
  const drop = rows.reduce<FunnelRow | null>((worst, r) =>
    !r.optional && r.fromPrev !== null && r.fromPrev < 1 && (worst === null || r.fromPrev < worst.fromPrev!) ? r : worst, null)
  return rows.map(r => (r === drop ? { ...r, biggestDrop: true } : r))
}
