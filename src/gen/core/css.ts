/**
 * Base stylesheet for generated sections (the hero has its own in hero/css.ts). Per-site
 * values arrive as custom properties on each section; band colours come from the rhythm
 * through the .sb-tone--* classes. Phone layouts use container queries.
 */
export const BASE_CSS = `
.sb-sec{
  --sb-bg:var(--sb-ground);--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);
  --sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);--sb-card-bg:var(--sb-surface);
  container-type:inline-size;position:relative;background:var(--sb-bg);color:var(--sb-fg);
  font-family:var(--sb-fb);font-weight:var(--sb-bw);font-size:17px;line-height:1.55;text-align:left;
}
/* Bands from the rhythm layer. Mirrors bandSurface() in contrast.ts, which the checks use. */
.sb-sec.sb-tone--surface{--sb-bg:var(--sb-surface);--sb-card-bg:var(--sb-ground)}
.sb-sec.sb-tone--brand{--sb-bg:var(--sb-brand-fill);--sb-fg:var(--sb-brand-ink);--sb-mu:var(--sb-brand-ink);--sb-link:var(--sb-brand-ink);--sb-btn-bg:var(--sb-brand-ink);--sb-btn-fg:var(--sb-brand-fill);--sb-card-bg:var(--sb-ground)}
.sb-sec.sb-tone--ink{--sb-bg:var(--sb-ink);--sb-fg:var(--sb-ground);--sb-mu:var(--sb-ground);--sb-link:var(--sb-ground);--sb-btn-bg:var(--sb-ground);--sb-btn-fg:var(--sb-ink);--sb-card-bg:var(--sb-ground)}
.sb-sec *,.sb-sec *::before,.sb-sec *::after{box-sizing:border-box}
.sb-sec .sb-wrap{max-width:1200px;margin:0 auto;padding:var(--sb-py) var(--sb-pad);display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 2.5)}
.sb-sec .sb-head{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 0.6);max-width:760px}
.sb-sec .sb-head--center{align-self:center;align-items:center;text-align:center}
.sb-sec .sb-eyebrow{margin:0;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--sb-link)}
.sb-sec .sb-h2{margin:0;color:inherit;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-h2);line-height:1.1;letter-spacing:var(--sb-tr);text-transform:var(--sb-up);text-wrap:balance;overflow-wrap:break-word}
.sb-sec .sb-h3{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:20px;line-height:1.25;letter-spacing:var(--sb-tr);text-transform:var(--sb-up);overflow-wrap:break-word}
.sb-sec .sb-lead{margin:0;font-size:18px;color:var(--sb-mu);max-width:60ch}
.sb-sec p{margin:0}
.sb-sec .sb-mu{color:var(--sb-mu)}
.sb-sec ul,.sb-sec ol{margin:0;padding:0;list-style:none}
.sb-sec .sb-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.sb-sec .sb-icon{flex:none;color:var(--sb-link)}
.sb-sec .sb-card{--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);--sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);
  background:var(--sb-card-bg);color:var(--sb-ink);border:var(--sb-bd) solid color-mix(in srgb,var(--sb-ink) 12%,transparent);border-radius:var(--sb-r);padding:calc(var(--sb-gap) * 1.4)}
.sb-sec .sb-rule{border-top:var(--sb-bd) solid color-mix(in srgb,var(--sb-fg) 22%,transparent);padding-top:var(--sb-gap)}
.sb-sec .sb-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:var(--sb-bh);padding:8px 26px;border:var(--sb-bd) solid transparent;border-radius:var(--sb-r);font:inherit;font-weight:700;font-size:17px;line-height:1.2;text-decoration:none;text-align:center;text-transform:var(--sb-bup);letter-spacing:var(--sb-btr);cursor:pointer}
.sb-sec .sb-btn--solid,.sb-sec .sb-btn--pill,.sb-sec .sb-btn--offset{background:var(--sb-btn-bg);color:var(--sb-btn-fg)}
.sb-sec .sb-btn--pill{border-radius:999px}
.sb-sec .sb-btn--outline{background:transparent;color:var(--sb-link);border-color:var(--sb-link)}
.sb-sec .sb-btn--underline{background:transparent;color:var(--sb-link);border-width:0 0 var(--sb-bd);border-bottom-color:var(--sb-link);border-radius:0;padding:0 2px}
.sb-sec .sb-btn--offset{border-color:var(--sb-fg);box-shadow:5px 5px 0 var(--sb-fg)}
.sb-sec .sb-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--sb-fg);font-weight:600;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px;overflow-wrap:anywhere}
.sb-sec :focus-visible{outline:3px solid var(--sb-fg);outline-offset:3px}
.sb-sec .sb-stars{color:var(--sb-link);font-size:18px;letter-spacing:2px;line-height:1}
.sb-sec .sb-photo{position:relative;overflow:hidden;border-radius:var(--sb-r);background:var(--sb-surface)}
.sb-sec .sb-photo img{display:block;width:100%;height:100%;object-fit:cover}
.sb-sec .sb-split{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--sb-gap) * 3.5);align-items:center}
.sb-sec.sb-img--left .sb-split>.sb-photo,.sb-sec.sb-img--left .sb-split>.sb-side-media{order:-1}
.sb-sec .sb-grid{display:grid;gap:calc(var(--sb-gap) * 1.25);grid-template-columns:repeat(var(--sb-cols,3),minmax(0,1fr))}
.sb-sec .sb-stack{display:flex;flex-direction:column;gap:var(--sb-gap)}
.sb-sec .sb-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.sb-sec .sb-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 16px;border-radius:999px;background:var(--sb-card-bg);color:var(--sb-ink);font-weight:600;font-size:15px;border:1px solid color-mix(in srgb,var(--sb-ink) 14%,transparent)}
.sb-sec .sb-chip .sb-icon{color:var(--sb-brand-text)}
.sb-sec .sb-stat-n{display:block;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:calc(var(--sb-h2) * 1.1);line-height:1;letter-spacing:var(--sb-tr)}
.sb-sec .sb-stat-l{display:block;margin-top:6px;font-size:15px;font-weight:600;color:var(--sb-mu)}
.sb-sec blockquote{margin:0}
.sb-sec figure{margin:0}
.sb-sec .sb-quote p{font-size:17px;line-height:1.5}
.sb-sec .sb-who{margin-top:10px;font-size:15px;color:var(--sb-mu)}
.sb-sec .sb-who b{color:var(--sb-fg);font-weight:700}
.sb-sec [data-scroll]{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,32%);gap:var(--sb-gap);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
.sb-sec [data-scroll]>*{scroll-snap-align:start}
@container (max-width: 719px){
  .sb-sec .sb-wrap{padding:calc(var(--sb-py) * 0.6) 20px;gap:calc(var(--sb-gap) * 1.6)}
  .sb-sec .sb-h2{font-size:var(--sb-h2-m)}
  .sb-sec .sb-lead{font-size:16px}
  .sb-sec .sb-split{grid-template-columns:1fr;gap:calc(var(--sb-gap) * 1.6)}
  .sb-sec.sb-img--left .sb-split>.sb-photo,.sb-sec.sb-img--left .sb-split>.sb-side-media,.sb-sec .sb-split>.sb-photo,.sb-sec .sb-split>.sb-side-media{order:-1}
  .sb-sec .sb-grid{grid-template-columns:repeat(var(--sb-cols-m,1),minmax(0,1fr))}
  .sb-sec .sb-btn{width:100%}
  .sb-sec [data-scroll]{grid-auto-columns:82%}
}
@media (prefers-reduced-motion: no-preference){
  .sb-sec .sb-btn{transition:filter 0.15s ease}
  .sb-sec [data-scroll]{scroll-behavior:smooth}
}
.sb-sec .sb-btn:hover{filter:brightness(1.06)}
@media (prefers-reduced-motion: reduce){
  .sb-sec *{animation:none !important;transition:none !important;scroll-behavior:auto !important}
}
`
