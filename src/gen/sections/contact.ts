import { z } from 'zod'
import { esc } from '../html'
import { pick } from '../rng'
import type { PageContent } from '../content'
import { defineSection, specSchema } from '../core/define'
import { button, head, icon, link, solidish } from '../core/markup'
import type { ButtonStyle } from '../schema'

export interface ContactView {
  title: string
  lead: string
  phone: { label: string; href: string } | null
  email: string
  hours: readonly { day: string; time: string }[]
  areas: readonly string[]
  emergency: boolean
  quoteForm: boolean
}

export const contactView = (c: PageContent): ContactView => ({
  title: c.trade.ctaText,
  lead: `${c.trade.ctaSubtext}. Serving ${c.business.location || 'your area'}.`,
  phone: c.business.tel ? { label: c.business.phone, href: c.business.tel } : null,
  email: c.business.email,
  hours: c.hours,
  areas: c.areas,
  emergency: c.emergency,
  quoteForm: c.quoteForm,
})

const reachable = (v: ContactView) => v.phone !== null || v.email !== ''

export const contactSchema = specSchema('contact', {
  band: { align: z.enum(['left', 'center']) },
  details: { style: z.enum(['card', 'plain']) },
  hours: { side: z.enum(['left', 'right']) },
  form: { fields: z.union([z.literal(3), z.literal(4)]) },
  inline: { email: z.boolean() },
})
export type ContactSpec = z.infer<typeof contactSchema>

function ctas(style: ButtonStyle, v: ContactView, withEmail = true): string {
  const call = v.phone ? button(style, `Call ${v.phone.label}`, v.phone.href, ' data-call') : ''
  const mail = withEmail && v.email ? link(`Email ${v.email}`, `mailto:${v.email}`) : ''
  return `<div class="sb-row sb-ctas">${call}${mail}</div>`
}

const hoursTable = (v: ContactView) =>
  `<dl class="sb-hours">${v.hours.map(h => `<div><dt>${esc(h.day)}</dt><dd>${esc(h.time)}</dd></div>`).join('')}</dl>${v.emergency ? `<p class="sb-emerg">${icon('clock', 18)}<span>Emergency call-outs: call any time</span></p>` : ''}`

const FIELDS = [
  ['name', 'Your name', 'type="text" autocomplete="name" required maxlength="80"'],
  ['phone', 'Phone', 'type="tel" autocomplete="tel" required maxlength="30"'],
  ['postcode', 'Postcode', 'type="text" autocomplete="postal-code" maxlength="12"'],
  ['job', 'What needs doing?', ''],
] as const

function form(style: ButtonStyle, fields: number): string {
  const f = FIELDS.slice(0, fields).map(([id, label, attrs]) => {
    const fid = `sb-c-${id}`
    const control = attrs ? `<input id="${fid}" name="${id}" ${attrs}>` : `<textarea id="${fid}" name="${id}" rows="3" maxlength="1000"></textarea>`
    return `<div class="sb-field"><label for="${fid}">${label}</label>${control}</div>`
  }).join('')
  return `<form class="sb-card sb-form" aria-label="Request a quote" method="post">${f}<button type="submit" class="sb-btn sb-btn--${solidish(style)}">Send request</button></form>`
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
      params: r => ({ align: pick(r, ['left', 'center'] as const) }),
      features: p => [p.align === 'center' ? 1 : 0],
      loud: true,
    },
    details: {
      label: 'Contact details', why: 'needs a phone number or email',
      gate: reachable,
      params: r => ({ style: pick(r, ['card', 'plain'] as const) }),
      features: p => [p.style === 'card' ? 1 : 0],
    },
    hours: {
      label: 'Hours and call', why: 'needs your opening hours',
      gate: v => reachable(v) && v.hours.length >= 1,
      params: r => ({ side: pick(r, ['left', 'right'] as const) }),
      features: p => [p.side === 'right' ? 1 : 0],
    },
    form: {
      label: 'Quote form', why: 'needs enquiry forms to be switched on',
      gate: v => v.quoteForm && v.phone !== null,
      params: r => ({ fields: pick(r, [3, 4] as const) }),
      features: p => [p.fields === 4 ? 1 : 0],
    },
    inline: {
      label: 'Inline', why: 'needs a phone number',
      gate: v => v.phone !== null,
      params: (r, v) => ({ email: v.email !== '' && r() < 0.6 }),
      features: p => [p.email ? 1 : 0],
      loud: true,
    },
  },
  weights: {
    professional: { band: 2, details: 3, hours: 2, form: 2, inline: 1 },
    luxury: { band: 3, details: 1.5, hours: 1.5, form: 1, inline: 2 },
    family: { band: 2.5, details: 2, hours: 2, form: 2.5, inline: 1 },
    brutalism: { band: 3, details: 1.5, hours: 1, form: 1, inline: 2.5 },
  },
  fallback: { v: 1, section: 'contact', archetype: 'details', params: { style: 'plain' } },
  cards: s => (s.archetype === 'details' && s.params.style === 'card') || s.archetype === 'form',
  button: (_s, style) => style.button,
  body: (s, style, v) => {
    const h = (center = false) => head('contact', { eyebrow: 'Get in touch', title: v.title, lead: v.lead, cls: center ? 'sb-head--center' : undefined })
    switch (s.archetype) {
      case 'band': {
        const center = s.params.align === 'center'
        return { cls: center ? 'sb-center' : '', inner: `${h(center)}${ctas(style.button, v)}` }
      }
      case 'details': {
        const cls = s.params.style === 'card' ? 'sb-card' : 'sb-rule'
        const items = [
          v.phone ? `<li class="${cls}"><p class="sb-detail-l">${icon('phone', 18)} Phone</p>${link(v.phone.label, v.phone.href)}</li>` : '',
          v.email ? `<li class="${cls}"><p class="sb-detail-l">${icon('mail', 18)} Email</p>${link(v.email, `mailto:${v.email}`)}</li>` : '',
          v.hours.length ? `<li class="${cls}"><p class="sb-detail-l">${icon('clock', 18)} Hours</p>${hoursTable(v)}</li>` : '',
          v.areas.length ? `<li class="${cls}"><p class="sb-detail-l">${icon('pin', 18)} Areas</p><p>${esc(v.areas.slice(0, 6).join(', '))}${v.areas.length > 6 ? ' and more' : ''}</p></li>` : '',
        ].filter(Boolean)
        return { vars: `--sb-cols:${Math.min(items.length, 4)};--sb-cols-m:1;`, inner: `${h()}${ctas(style.button, v, false)}<ul class="sb-grid sb-details">${items.join('')}</ul>` }
      }
      case 'hours':
        return { cls: `sb-hours-side--${s.params.side}`, inner: `<div class="sb-split sb-split--top"><div class="sb-stack">${h()}${ctas(style.button, v)}</div><div class="sb-card sb-hours-card"><h3 class="sb-h3">Opening hours</h3>${hoursTable(v)}</div></div>` }
      case 'form':
        return { inner: `<div class="sb-split sb-split--top"><div class="sb-stack">${h()}${ctas(style.button, v)}</div>${form(style.button, s.params.fields)}</div>` }
      case 'inline':
        return { inner: `<div class="sb-inline">${h()}${ctas(style.button, v, s.params.email)}</div>` }
    }
  },
  // Emails wrap anywhere (overflow-wrap), so they never widen the page; leave them out.
  words: (_s, v) => ({ title: v.title, texts: [v.lead, ...(v.phone ? [`Call ${v.phone.label}`] : [])] }),
})

export const CONTACT_CSS = `
.sb-center .sb-ctas{justify-content:center}
.sb-detail-l{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;color:var(--sb-mu);margin-bottom:8px}
.sb-details .sb-link{font-size:18px}
.sb-hours{display:grid;gap:6px;margin:0}
.sb-hours div{display:flex;justify-content:space-between;gap:16px}
.sb-hours dt{font-weight:600}
.sb-hours dd{margin:0;color:var(--sb-mu)}
.sb-emerg{display:flex;align-items:center;gap:8px;margin-top:12px;font-weight:600}
.sb-hours-card{display:flex;flex-direction:column;gap:14px}
.sb-hours-side--left .sb-split>.sb-hours-card{order:-1}
.sb-inline{display:flex;align-items:flex-end;justify-content:space-between;gap:calc(var(--sb-gap) * 2);flex-wrap:wrap}
.sb-form{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 0.75)}
.sb-field{display:flex;flex-direction:column;gap:6px;font-size:15px;font-weight:600}
.sb-field input,.sb-field textarea{min-height:48px;padding:10px 12px;border:1px solid var(--sb-muted);border-radius:calc(var(--sb-r) * 0.6);background:var(--sb-ground);color:var(--sb-ink);font:inherit;font-weight:400}
@container (max-width: 719px){
  .sb-ctas{flex-direction:column;align-items:stretch}
  .sb-hours-side--left .sb-split>.sb-hours-card{order:0}
}
`
