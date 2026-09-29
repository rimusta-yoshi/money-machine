import { z } from 'zod'
import { cx, esc, safeUrl } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import type { BodyContext } from '../core/define'
import { button, head, icon, link } from '../core/markup'
import { rollAlign, rollBreak, rollMotif } from '../core/punch'
import { THEMES } from '../themes'
import { ALIGNS, BREAKS, MOTIFS } from '../themes/types'

export interface ContactView {
  trade: string
  cta: string
  lead: string
  phone: { number: string; href: string } | null
  email: string
  hours: readonly { day: string; time: string }[]
  areas: readonly string[]
  emergency: boolean
  quoteForm: boolean
}

export const contactView = (c: PageContent): ContactView => ({
  trade: c.trade.name.toLowerCase(),
  cta: c.trade.ctaText,
  lead: `${c.trade.ctaSubtext}. Serving ${c.business.location || 'your area'}.`,
  phone: c.business.tel ? { number: c.business.phone, href: c.business.tel } : null,
  email: c.business.email,
  hours: c.hours,
  areas: c.areas,
  emergency: c.emergency,
  quoteForm: c.quoteForm,
})

const reachable = (v: ContactView) => v.phone !== null || v.email !== ''

export const contactSchema = specSchema('contact', {
  band: { align: z.enum(ALIGNS), brk: z.enum(BREAKS) },
  details: { brk: z.enum(BREAKS) },
  hours: { side: z.enum(['left', 'right']), motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
  form: { fields: z.union([z.literal(3), z.literal(4)]), brk: z.enum(BREAKS) },
  inline: { email: z.boolean(), brk: z.enum(BREAKS) },
  bigphone: { motif: z.enum(MOTIFS), brk: z.enum(BREAKS) },
})
export type ContactSpec = z.infer<typeof contactSchema>

const titleOf = (v: ContactView, ctx: Pick<BodyContext, 'biome'>) => ctx.biome.voice.titles.contact(v.trade, v.cta)

function ctas(v: ContactView, ctx: BodyContext, withEmail = true): string {
  const call = v.phone ? button(ctx.style, ctx.biome.voice.cta.call(v.phone.number), v.phone.href, ' data-call') : ''
  const mail = withEmail && v.email ? link(`Email ${v.email}`, `mailto:${v.email}`) : ''
  return `<div class="sb-ctas">${call}${mail}</div>`
}

const hoursLine = (v: ContactView) => (v.hours.length ? v.hours.map(h => `${h.day} ${h.time}`).join(' · ') : '')

function hoursTable(v: ContactView, leaders = false) {
  const rows = v.hours.map(h => `<div><dt>${esc(h.day)}</dt>${leaders ? '<span class="sb-dots" aria-hidden="true"></span>' : ''}<dd>${esc(h.time)}</dd></div>`).join('')
  const emerg = v.emergency ? `<p class="sb-emerg">${icon('clock', 18)}<span>Emergency call-outs: call any time</span></p>` : ''
  return `<dl class="${cx('sb-hours', leaders && 'sb-hours--leaders')}">${rows}</dl>${emerg}`
}

const FIELDS = [
  ['name', 'Your name', 'type="text" autocomplete="name" required maxlength="80"'],
  ['phone', 'Phone', 'type="tel" autocomplete="tel" required maxlength="30"'],
  ['postcode', 'Postcode', 'type="text" autocomplete="postal-code" maxlength="12"'],
  ['job', 'What needs doing?', ''],
] as const

function form(ctx: BodyContext, fields: number): string {
  const f = FIELDS.slice(0, fields).map(([id, label, attrs]) => {
    const fid = `sb-c-${id}`
    const control = attrs ? `<input id="${fid}" name="${id}" ${attrs}>` : `<textarea id="${fid}" name="${id}" rows="4" maxlength="1000"></textarea>`
    return `<div class="sb-field"><label for="${fid}">${label}</label>${control}</div>`
  }).join('')
  const btn = ctx.style.button === 'outline' ? 'solid' : ctx.style.button
  return `<form class="sb-card sb-form" aria-label="Request a quote" method="post">${f}<button type="submit" class="sb-btn sb-btn--${btn}">${esc(ctx.biome.voice.cta.send)}</button></form>`
}

export const contact = defineSection<ContactSpec, ContactView>({
  type: 'contact',
  label: 'Contact',
  view: contactView,
  schema: contactSchema,
  anchor: 'contact',
  archetypes: {
    band: {
      label: 'Call band', why: 'needs a phone number or email',
      gate: reachable,
      params: (r, { biome: t }) => ({ align: rollAlign(r, t, ['split', 'left', 'center']), brk: rollBreak(r, t, ['band', 'panel'], 0.45) }),
      features: p => [ALIGNS.indexOf(p.align) / 2, p.brk === 'panel' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: z.xl * 0.5 }),
      loud: true,
    },
    details: {
      label: 'Contact details', why: 'needs a phone number or email',
      gate: reachable,
      params: (r, { biome: t }) => ({ brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.brk === 'rule' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
    },
    hours: {
      label: 'Hours and call', why: 'needs your opening hours',
      gate: v => reachable(v) && v.hours.length >= 1,
      params: (r, { biome: t }) => ({ side: pick(r, ['left', 'right'] as const), motif: rollMotif(r, t, 'contact', ['leaders'], 0.2), brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.side === 'right' ? 1 : 0, p.motif === 'leaders' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: z.h3 }),
    },
    form: {
      label: 'Quote form', why: 'needs enquiry forms to be switched on',
      gate: v => v.quoteForm && v.phone !== null,
      params: (r, { biome: t }) => ({ fields: pick(r, [3, 4] as const), brk: rollBreak(r, t, ['band', 'panel']) }),
      features: p => [p.fields === 4 ? 1 : 0, p.brk === 'panel' ? 1 : 0],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
    },
    inline: {
      label: 'Inline', why: 'needs a phone number',
      gate: v => v.phone !== null,
      params: (r, { content: v, biome: t }) => ({ email: v.email !== '' && r() < 0.6, brk: rollBreak(r, t, ['band', 'rule']) }),
      features: p => [p.email ? 1 : 0, 0.5],
      focal: (_p, z) => ({ focal: z.h2, second: 18 }),
      loud: true,
    },
    bigphone: {
      label: 'Giant phone number', why: 'needs a phone number',
      gate: v => v.phone !== null,
      params: (r, { biome: t }) => ({ motif: rollMotif(r, t, 'contact', ['bigphone'], 0.05), brk: rollBreak(r, t, ['band', 'panel'], 0.4) }),
      features: p => [p.brk === 'panel' ? 1 : 0, 1, 1],
      focal: (_p, z) => ({ focal: z.xl, second: z.h2 * 0.7 }),
      loud: true,
    },
  },
  weights: {
    'workwear': { band: 3, details: 1.4, hours: 1.6, form: 1.4, inline: 1.4, bigphone: 3.2 },
    'clean-pro': { band: 2, details: 3, hours: 2, form: 3, inline: 1 },
    'craft-heritage': { band: 3.5, details: 1.6, hours: 2, form: 1.2, inline: 1.4 },
    'friendly-local': { band: 3.5, details: 2, hours: 2, form: 2, inline: 1 },
  },
  fallback: { v: 2, section: 'contact', archetype: 'details', step: 2, params: { brk: 'band' } },
  contrast: (_s, style) => ({ button: style.button }),
  body: (s, v, ctx) => {
    const t = ctx.biome
    const h = (align: 'left' | 'center' | 'row' = 'left', lead = true) => head('contact', { eyebrow: t.voice.eyebrows.contact, title: titleOf(v, ctx), lead: lead ? v.lead : undefined, align })
    switch (s.archetype) {
      case 'band': {
        const p = s.params
        const phone = v.phone ? `<a class="sb-btn sb-btn--${ctx.style.button === 'outline' ? 'outline' : ctx.style.button} sb-contact-phone" href="${esc(safeUrl(v.phone.href))}" data-call aria-label="${esc(t.voice.cta.call(v.phone.number))}">${esc(v.phone.number)}</a>` : ''
        const mail = v.email ? link(`Email ${v.email}`, `mailto:${v.email}`) : ''
        const note = hoursLine(v) ? `<p class="sb-contact-note">${esc(hoursLine(v))}</p>` : ''
        if (p.align === 'split') {
          return { cls: 'sb-contact-band', inner: `<div class="sb-contact-row"><div class="sb-stack">${h('left', false)}${note}</div><div class="sb-contact-act">${phone}${mail}</div></div>` }
        }
        const center = p.align === 'center'
        return { cls: cx('sb-contact-band', center && 'sb-center'), inner: `${h(center ? 'center' : 'left', false)}${note}<div class="sb-ctas">${phone}${mail}</div>` }
      }
      case 'details': {
        const items = [
          v.phone ? `<li class="sb-card"><p class="sb-detail-l">${icon('phone', 18)} Phone</p>${link(v.phone.number, v.phone.href)}</li>` : '',
          v.email ? `<li class="sb-card"><p class="sb-detail-l">${icon('mail', 18)} Email</p>${link(v.email, `mailto:${v.email}`)}</li>` : '',
          v.hours.length ? `<li class="sb-card"><p class="sb-detail-l">${icon('clock', 18)} Hours</p>${hoursTable(v)}</li>` : '',
          v.areas.length ? `<li class="sb-card"><p class="sb-detail-l">${icon('pin', 18)} Areas</p><p>${esc(v.areas.slice(0, 6).join(', '))}${v.areas.length > 6 ? ' and more' : ''}</p></li>` : '',
        ].filter(Boolean)
        return { vars: `--sb-cols:${Math.min(items.length, 4)};--sb-cols-m:1;`, inner: `${h('row')}${ctas(v, ctx, false)}<ul class="sb-grid sb-details">${items.join('')}</ul>` }
      }
      case 'hours': {
        const p = s.params
        const leaders = ctx.motif && p.motif === 'leaders'
        return {
          vars: '--sb-ta:6;',
          inner: `<div class="${cx('sb-cols sb-cols--top', p.side === 'left' && 'sb-cols--flip')}"><div class="sb-main sb-stack">${h()}${ctas(v, ctx)}</div><div class="sb-aside sb-card sb-hours-card"><h3 class="sb-h3">Opening hours</h3>${hoursTable(v, leaders)}</div></div>`,
        }
      }
      case 'form':
        return { vars: '--sb-ta:5;', inner: `<div class="sb-cols sb-cols--top"><div class="sb-main sb-stack">${h()}${ctas(v, ctx)}</div><div class="sb-aside">${form(ctx, s.params.fields)}</div></div>` }
      case 'inline':
        return { inner: `<div class="sb-contact-row">${h('left')}${ctas(v, ctx, s.params.email)}</div>` }
      case 'bigphone': {
        const call = v.phone!
        const big = `<a class="sb-contact-big" href="${esc(safeUrl(call.href))}" data-call aria-label="${esc(t.voice.cta.call(call.number))}">${esc(call.number)}</a>`
        const note = hoursLine(v) ? `<p class="sb-contact-note">${esc(hoursLine(v))}</p>` : ''
        const mail = v.email ? link(`Email ${v.email}`, `mailto:${v.email}`) : ''
        return { cls: cx('sb-contact-band', ctx.motif && 'sb-contact-bigphone'), inner: `${h('left', false)}<p class="sb-bigphone-l">${esc(t.voice.cta.callShort)}</p>${big}${note}${mail}` }
      }
    }
  },
  words: (s, v, style) => ({
    title: THEMES[style.theme].voice.titles.contact(v.trade, v.cta),
    texts: [v.lead, ...(v.phone ? [v.phone.number] : [])],
    col: s.archetype === 'form' ? 420 : s.archetype === 'hours' ? 520 : 760,
  }),
})

export const CONTACT_CSS = `
.sb-contact-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:calc(var(--sb-gap) * 2) calc(var(--sb-gap) * 4)}
.sb-contact-act{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.sb-contact-note{font-size:18px;font-weight:600;color:var(--sb-mu)}
.sb-contact-band .sb-wrap{gap:calc(var(--sb-gap) * 1.8)}
.sb-contact-phone{min-height:76px;padding:14px 34px;font-family:var(--sb-fd) !important;font-weight:var(--sb-dw) !important;font-size:calc(var(--sb-xl) * 0.52) !important;letter-spacing:0.01em !important;text-transform:none !important;white-space:nowrap}
.sb-contact-big{display:inline-block;min-height:44px;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-xl);line-height:0.95;letter-spacing:var(--sb-dtr);color:var(--sb-fg);text-decoration:none;white-space:nowrap}
.sb-contact-big:hover{text-decoration:underline;text-decoration-thickness:0.06em}
.sb-contact-bigphone .sb-contact-big{font-size:calc(var(--sb-xl) * 1.35)}
.sb-bigphone-l{font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:18px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup);color:var(--sb-mu)}
.sb-center .sb-ctas{justify-content:center}
.sb-center .sb-contact-note{text-align:center}
.sb-detail-l{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;color:var(--sb-mu);margin-bottom:8px}
.sb-details .sb-link{font-size:18px}
.sb-hours{display:grid;gap:8px;margin:0;width:100%}
.sb-hours div{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.sb-hours dt{font-weight:600}
.sb-hours dd{color:var(--sb-mu)}
.sb-hours--leaders div{justify-content:flex-start}
.sb-emerg{display:flex;align-items:center;gap:8px;margin-top:12px;font-weight:600}
.sb-hours-card{display:flex;flex-direction:column;gap:14px}
@container (max-width: 719px){
  .sb-contact-phone{font-size:calc(var(--sb-xlm) * 0.62) !important;min-height:64px;padding:12px 18px;white-space:normal}
  .sb-contact-big,.sb-contact-bigphone .sb-contact-big{font-size:var(--sb-xlm);white-space:normal}
  .sb-contact-act{align-items:stretch;width:100%}
}
`
