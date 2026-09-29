/**
 * Base stylesheet for generated sections: structure only. Each theme's skin (themes/*.ts)
 * draws the components (buttons, cards, eyebrows, lists, frames, motifs). Per-site values
 * arrive as custom properties on each section; band colours come from the rhythm through
 * the .sb-tone--* classes. Phone layouts use container queries.
 */
export const BASE_CSS = `
.sb-sec{
  --sb-bg:var(--sb-ground);--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);--sb-accent:var(--sb-accent-c);
  --sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);--sb-btn-edge:var(--sb-brand-edge);--sb-card-bg:var(--sb-surface);
  --sb-hair:color-mix(in srgb,var(--sb-fg) 22%,transparent);--sb-ghost:color-mix(in srgb,var(--sb-fg) 17%,transparent);
  --sb-tick:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 12.5l5 5L20 7' fill='none' stroke='%23000' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  container-type:inline-size;position:relative;background:var(--sb-bg);color:var(--sb-fg);
  font-family:var(--sb-fb);font-weight:var(--sb-bw);font-size:17px;line-height:1.55;text-align:left;
}
/* Bands from the rhythm layer. Mirrors bandSurface() in contrast.ts, which the checks use. */
.sb-sec.sb-tone--surface{--sb-bg:var(--sb-surface);--sb-card-bg:var(--sb-ground)}
.sb-sec.sb-tone--brand{--sb-bg:var(--sb-brand-fill);--sb-fg:var(--sb-brand-ink);--sb-mu:var(--sb-brand-ink);--sb-link:var(--sb-brand-ink);--sb-accent:var(--sb-brand-ink);--sb-btn-bg:var(--sb-brand-ink);--sb-btn-fg:var(--sb-brand-fill);--sb-btn-edge:var(--sb-brand-ink);--sb-card-bg:var(--sb-ground)}
.sb-sec.sb-tone--ink{--sb-bg:var(--sb-ink);--sb-fg:var(--sb-ground);--sb-mu:var(--sb-ground);--sb-link:var(--sb-ground);--sb-accent:var(--sb-ink-accent);--sb-btn-bg:var(--sb-ink-btn-bg);--sb-btn-fg:var(--sb-ink-btn-fg);--sb-btn-edge:var(--sb-ink-btn-bg);--sb-card-bg:var(--sb-ground)}
.sb-sec.sb-tone--photo{--sb-fg:#FFFFFF;--sb-mu:#FFFFFF;--sb-link:#FFFFFF;--sb-accent:#FFFFFF;--sb-hair:rgba(255,255,255,0.4)}
.sb-sec *,.sb-sec *::before,.sb-sec *::after{box-sizing:border-box}
.sb-sec .sb-wrap{position:relative;max-width:1200px;margin:0 auto;padding:var(--sb-py) var(--sb-pad);display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 2.75)}
/* Breaks: an inset panel on the page ground, or a rule line along the top (drawn by the skin). */
.sb-sec.sb-brk--panel{background:var(--sb-ground);padding:calc(var(--sb-py) * 0.3) var(--sb-pad)}
.sb-sec.sb-brk--panel>.sb-wrap{background:var(--sb-bg);border-radius:var(--sb-pr);max-width:calc(1200px - 2 * var(--sb-pad));padding:calc(var(--sb-py) * 0.72) calc(var(--sb-pad) * 1.15)}
.sb-sec .sb-rule-top{position:absolute;left:var(--sb-pad);right:var(--sb-pad);top:0;height:0;pointer-events:none}

.sb-sec p,.sb-sec blockquote,.sb-sec figure,.sb-sec dl,.sb-sec dd{margin:0}
.sb-sec ul,.sb-sec ol{margin:0;padding:0;list-style:none}
.sb-sec .sb-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.sb-sec .sb-icon{flex:none;color:var(--sb-link)}

/* Type */
.sb-sec .sb-head{display:flex;flex-direction:column;align-items:flex-start;gap:calc(var(--sb-gap) * 0.8);max-width:820px}
.sb-sec .sb-head--center{align-self:center;align-items:center;text-align:center}
.sb-sec .sb-head--row{max-width:none;flex-direction:row;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;column-gap:calc(var(--sb-gap) * 4)}
.sb-sec .sb-head--row>.sb-lead{max-width:38ch}
.sb-sec .sb-head--row>div{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 0.8)}
.sb-sec .sb-eyebrow{margin:0;font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:14px;line-height:1.3;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup);color:var(--sb-link)}
.sb-sec .sb-h1,.sb-sec .sb-h2{margin:0;color:inherit;font-family:var(--sb-fd);font-weight:var(--sb-dw);line-height:var(--sb-dlh);letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup);text-wrap:balance;overflow-wrap:break-word}
.sb-sec .sb-h1{font-size:var(--sb-h1)}
.sb-sec .sb-h2{font-size:var(--sb-h2)}
.sb-sec .sb-xl{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-xl);line-height:var(--sb-dlh);letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup);overflow-wrap:anywhere}
.sb-sec .sb-h3{margin:0;font-family:var(--sb-fh3);font-weight:var(--sb-h3w);font-size:var(--sb-h3);line-height:1.2;letter-spacing:var(--sb-h3tr);text-transform:var(--sb-h3up);overflow-wrap:break-word}
.sb-sec .sb-lead{margin:0;font-size:var(--sb-lead);line-height:1.55;color:var(--sb-mu);max-width:56ch}
.sb-sec .sb-body{font-size:18px;line-height:1.65;color:var(--sb-mu);max-width:60ch}
.sb-sec .sb-mu{color:var(--sb-mu)}
.sb-sec .sb-em{color:var(--sb-link)}

/* Actions */
.sb-sec .sb-ctas{display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px}
.sb-sec .sb-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:10px 28px;border:2px solid transparent;border-radius:var(--sb-br);font:inherit;font-weight:700;font-size:17px;line-height:1.2;text-decoration:none;text-align:center;cursor:pointer}
/* Filled buttons use the exact brand colour; the edge is a same-hue shade when the fill alone is under 3:1 against the band. */
.sb-sec .sb-btn--solid,.sb-sec .sb-btn--pill,.sb-sec .sb-btn--offset{background:var(--sb-btn-bg);color:var(--sb-btn-fg);border-color:var(--sb-btn-edge)}
.sb-sec .sb-btn--pill{border-radius:999px}
.sb-sec .sb-btn--outline{background:transparent;color:var(--sb-link);border-color:var(--sb-link)}
.sb-sec .sb-btn--offset{box-shadow:6px 6px 0 var(--sb-fg)}
.sb-sec .sb-btn--ghost{background:transparent;color:var(--sb-fg);border-color:currentColor}
.sb-sec .sb-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--sb-fg);font-weight:600;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px;overflow-wrap:anywhere}
.sb-sec :focus-visible{outline:3px solid var(--sb-fg);outline-offset:3px}

/* Layout */
.sb-sec .sb-cols{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:calc(var(--sb-gap) * 2.5);row-gap:calc(var(--sb-gap) * 2);align-items:center}
.sb-sec .sb-cols--top{align-items:start}
.sb-sec .sb-cols>.sb-main{grid-column:span var(--sb-ta,6);min-width:0}
.sb-sec .sb-cols>.sb-aside{grid-column:span calc(12 - var(--sb-ta,6));min-width:0}
.sb-sec.sb-img--left .sb-cols>.sb-media,.sb-sec .sb-cols--flip>.sb-aside{order:-1}
.sb-sec .sb-grid{display:grid;gap:calc(var(--sb-gap) * 1.5);grid-template-columns:repeat(var(--sb-cols,3),minmax(0,1fr))}
.sb-sec .sb-stack{display:flex;flex-direction:column;align-items:flex-start;gap:calc(var(--sb-gap) * 1.2)}
.sb-sec .sb-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.sb-sec .sb-center{align-items:center;text-align:center}

/* Lists: numbered, ticked, dotted leaders. The skin draws the markers. */
.sb-sec .sb-list{display:flex;flex-direction:column;counter-reset:sb-n}
.sb-sec .sb-list>li{counter-increment:sb-n;display:flex;align-items:baseline;gap:18px;padding:18px 0;border-top:1px solid var(--sb-hair)}
.sb-sec .sb-list>li:last-child{border-bottom:1px solid var(--sb-hair)}
.sb-sec .sb-list--bare>li{border:0;padding:10px 0}
.sb-sec .sb-list--num>li::before{content:counter(sb-n,decimal-leading-zero);flex:none;min-width:2ch;font-family:var(--sb-fd);font-weight:var(--sb-dw);color:var(--sb-link)}
.sb-sec .sb-list--tick>li::before{content:"";flex:none;width:20px;height:20px;transform:translateY(3px);background:var(--sb-link);-webkit-mask:var(--sb-tick) center/contain no-repeat;mask:var(--sb-tick) center/contain no-repeat}
.sb-sec .sb-grid.sb-list--num,.sb-sec .sb-grid.sb-list--tick{counter-reset:sb-n}
.sb-sec .sb-grid>li{counter-increment:sb-n}
.sb-sec .sb-dots{flex:1 1 24px;min-width:24px;border-bottom:2px dotted var(--sb-hair);transform:translateY(-0.35em)}
.sb-sec .sb-leaders>li{align-items:baseline}
.sb-sec .sb-leaders>li>.sb-end{flex:none;color:var(--sb-mu);font-size:15px;letter-spacing:0.08em;text-transform:uppercase}

/* Cards and chips (the skin decides filled or open) */
.sb-sec .sb-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:14px;min-width:0}
.sb-sec .sb-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 18px;border-radius:999px;font-weight:600;font-size:16px;border:1px solid var(--sb-hair)}
.sb-sec .sb-stat-n{display:block;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-xl);line-height:1;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup)}
.sb-sec .sb-stat-l{display:block;margin-top:10px;font-size:16px;font-weight:600;color:var(--sb-mu)}
.sb-sec .sb-stars{color:var(--sb-link);font-size:18px;letter-spacing:2px;line-height:1}

/* Photos and the decorations around them */
.sb-sec .sb-media{position:relative;min-width:0;align-self:stretch;display:flex;flex-direction:column;gap:12px}
.sb-sec .sb-photo{position:relative;z-index:1;overflow:hidden;width:100%;border-radius:var(--sb-r);background:var(--sb-ghost)}
.sb-sec .sb-photo img{display:block;width:100%;height:100%;object-fit:cover}
.sb-sec .sb-crop--4x5 .sb-photo{aspect-ratio:4/5}
.sb-sec .sb-crop--1x1 .sb-photo{aspect-ratio:1/1}
.sb-sec .sb-crop--4x3 .sb-photo{aspect-ratio:4/3}
.sb-sec .sb-crop--3x2 .sb-photo{aspect-ratio:3/2}
.sb-sec .sb-crop--fill .sb-photo{flex:1;min-height:360px}
.sb-sec .sb-media>[data-over]{position:absolute;z-index:3;pointer-events:none}
.sb-sec .sb-stripe{height:24px;width:min(220px,44%)}
.sb-sec .sb-at--bl{left:-24px;bottom:-24px}
.sb-sec .sb-at--br{right:-24px;bottom:-24px}
.sb-sec .sb-at--tl{left:-24px;top:-24px}
.sb-sec .sb-at--tr{right:-24px;top:-24px}
.sb-sec .sb-blob{position:absolute;z-index:0;inset:-5% -6% -7% -5%;pointer-events:none}
.sb-sec .sb-sticker{max-width:min(260px,70%);transform:rotate(var(--sb-rot,0deg))}
.sb-sec .sb-float{max-width:min(300px,78%)}
.sb-sec .sb-cap{font-size:15px;color:var(--sb-mu)}

/* Scrolling rows (reviews, photos) */
.sb-sec [data-scroll]{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,32%);gap:var(--sb-gap);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
.sb-sec [data-scroll]>*{scroll-snap-align:start}

/* Forms */
.sb-sec .sb-form{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 0.9)}
.sb-sec .sb-field{display:flex;flex-direction:column;gap:8px;font-size:15px;font-weight:600}
.sb-sec .sb-field input,.sb-sec .sb-field textarea{min-height:52px;padding:12px 14px;border:1.5px solid var(--sb-mu);border-radius:var(--sb-fr);background:var(--sb-ground);color:var(--sb-ink);font:inherit;font-size:17px;font-weight:400}
.sb-sec .sb-form .sb-btn{align-self:flex-start}

@container (max-width: 719px){
  .sb-sec .sb-wrap{padding:calc(var(--sb-py) * 0.62) 20px;gap:calc(var(--sb-gap) * 1.8)}
  .sb-sec.sb-brk--panel{padding:10px}
  .sb-sec.sb-brk--panel>.sb-wrap{padding:36px 20px}
  .sb-sec .sb-h1{font-size:var(--sb-h1m)}
  .sb-sec .sb-h2{font-size:var(--sb-h2m)}
  .sb-sec .sb-xl,.sb-sec .sb-stat-n{font-size:var(--sb-xlm)}
  .sb-sec .sb-lead{font-size:17px}
  .sb-sec .sb-body{font-size:17px}
  .sb-sec .sb-head--row{flex-direction:column;align-items:flex-start;gap:calc(var(--sb-gap) * 0.8)}
  .sb-sec .sb-cols{grid-template-columns:1fr;row-gap:calc(var(--sb-gap) * 1.8)}
  .sb-sec .sb-cols>.sb-main,.sb-sec .sb-cols>.sb-aside{grid-column:auto}
  .sb-sec .sb-cols>.sb-media{order:-1}
  .sb-sec .sb-cols--media-last>.sb-media{order:1}
  .sb-sec .sb-grid{grid-template-columns:repeat(var(--sb-cols-m,1),minmax(0,1fr))}
  .sb-sec .sb-ctas{flex-direction:column;align-items:stretch;width:100%}
  .sb-sec .sb-btn{width:100%}
  .sb-sec .sb-form .sb-btn{align-self:stretch}
  .sb-sec .sb-crop--fill .sb-photo{min-height:0;aspect-ratio:4/3}
  .sb-sec .sb-at--bl,.sb-sec .sb-at--tl{left:0}
  .sb-sec .sb-at--br,.sb-sec .sb-at--tr{right:0}
  .sb-sec .sb-at--bl,.sb-sec .sb-at--br{bottom:-12px}
  .sb-sec .sb-at--tl,.sb-sec .sb-at--tr{top:-12px}
  .sb-sec [data-scroll]{grid-auto-columns:84%}
}
@media (prefers-reduced-motion: no-preference){
  .sb-sec .sb-btn{transition:filter 0.15s ease,transform 0.15s ease}
  .sb-sec [data-scroll]{scroll-behavior:smooth}
}
.sb-sec .sb-btn:hover{filter:brightness(1.07)}
@media (prefers-reduced-motion: reduce){
  .sb-sec *{animation:none !important;transition:none !important;scroll-behavior:auto !important}
}
`
