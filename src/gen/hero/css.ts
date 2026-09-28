/**
 * Stylesheet for generated heroes. Include once per page. Per-site values arrive as
 * custom properties on each section (see styleVars). Phone layouts use container
 * queries, so a hero lays out by the width it is given, not the window.
 */
export const HERO_CSS = `
.sb-hero{
  --sb-bg:var(--sb-ground);--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);
  --sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);--sb-card-bg:var(--sb-surface);
  container-type:inline-size;position:relative;overflow:hidden;background:var(--sb-bg);color:var(--sb-fg);
  font-family:var(--sb-fb);font-weight:var(--sb-bw);font-size:17px;line-height:1.5;text-align:left;
}
.sb-tone--surface{--sb-bg:var(--sb-surface);--sb-card-bg:var(--sb-ground)}
.sb-tone--brand{--sb-bg:var(--sb-brand-fill);--sb-fg:var(--sb-brand-ink);--sb-mu:var(--sb-brand-ink);--sb-link:var(--sb-brand-ink);--sb-btn-bg:var(--sb-brand-ink);--sb-btn-fg:var(--sb-brand-fill);--sb-card-bg:var(--sb-ground)}
.sb-tone--photo{--sb-fg:#FFFFFF;--sb-mu:#FFFFFF;--sb-link:#FFFFFF}
.sb-hero *,.sb-hero *::before,.sb-hero *::after{box-sizing:border-box}
.sb-hero .sb-in{position:relative;min-height:640px;padding:var(--sb-pad);display:flex;flex-direction:column;justify-content:center;gap:calc(var(--sb-gap) * 2)}
.sb-hero .sb-text{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;gap:var(--sb-gap);min-width:0}
.sb-hero .sb-h1{margin:0;color:inherit;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-hs);line-height:1.06;letter-spacing:var(--sb-tr);text-transform:var(--sb-up);text-wrap:balance;overflow-wrap:break-word}
.sb-hero .sb-sub{margin:0;max-width:58ch;font-size:18px;color:var(--sb-mu)}
.sb-hero .sb-ctas{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;margin-top:calc(var(--sb-gap) * 0.5)}
.sb-hero .sb-btn{display:inline-flex;align-items:center;justify-content:center;min-height:var(--sb-bh);padding:0 26px;border:var(--sb-bd) solid transparent;border-radius:var(--sb-r);font:inherit;font-weight:700;font-size:17px;line-height:1.2;text-decoration:none;text-transform:var(--sb-bup);letter-spacing:var(--sb-btr);white-space:nowrap;cursor:pointer}
.sb-hero .sb-btn--solid,.sb-hero .sb-btn--pill,.sb-hero .sb-btn--offset{background:var(--sb-btn-bg);color:var(--sb-btn-fg)}
.sb-hero .sb-btn--pill{border-radius:999px}
.sb-hero .sb-btn--outline{background:transparent;color:var(--sb-link);border-color:var(--sb-link)}
.sb-hero .sb-btn--underline{background:transparent;color:var(--sb-link);border-width:0 0 var(--sb-bd);border-bottom-color:var(--sb-link);border-radius:0;padding:0 2px}
.sb-hero .sb-btn--offset{border-color:var(--sb-fg);box-shadow:5px 5px 0 var(--sb-fg)}
.sb-hero .sb-link{display:inline-flex;align-items:center;min-height:44px;color:var(--sb-fg);font-weight:600;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}
.sb-hero :focus-visible{outline:3px solid var(--sb-fg);outline-offset:3px}
.sb-hero .sb-rating{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:0;font-size:15px;font-weight:600}
.sb-hero .sb-stars{color:var(--sb-link);font-size:18px;letter-spacing:2px;line-height:1}
.sb-hero .sb-trust{display:flex;flex-wrap:wrap;gap:8px 28px;margin:0;padding:var(--sb-gap) 0 0;list-style:none;border-top:var(--sb-bd) solid var(--sb-fg);font-size:15px;font-weight:600}
.sb-hero .sb-trust--plain{padding:0;border:0}
.sb-hero .sb-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;padding-top:var(--sb-gap);border-top:1px solid var(--sb-fg)}
.sb-hero .sb-photo{position:relative;overflow:hidden;min-height:0;border-radius:var(--sb-r);background:var(--sb-surface)}
.sb-hero .sb-photo img,.sb-hero .sb-bgimg img{display:block;width:100%;height:100%;object-fit:cover}
.sb-hero .sb-bg{position:absolute;inset:0;z-index:0}
.sb-hero .sb-bgimg{position:absolute;inset:0;background:var(--sb-surface)}
.sb-hero .sb-scrim{position:absolute;inset:0;background:rgba(0,0,0,var(--sb-scrim))}
.sb-hero .sb-card{--sb-fg:var(--sb-ink);--sb-mu:var(--sb-muted);--sb-link:var(--sb-brand-text);--sb-btn-bg:var(--sb-brand-fill);--sb-btn-fg:var(--sb-brand-ink);
  background:var(--sb-card-bg);color:var(--sb-ink);border:var(--sb-bd) solid color-mix(in srgb,var(--sb-ink) 14%,transparent);border-radius:var(--sb-r)}
.sb-hero .sb-card--ground{--sb-card-bg:var(--sb-ground)}
.sb-hero .sb-card--surface{--sb-card-bg:var(--sb-surface)}
.sb-hero .sb-grid{flex:1;display:grid;gap:calc(var(--sb-gap) * 2.5);min-height:0}

/* A1 split */
.sb-hero--split .sb-in{justify-content:stretch}
.sb-hero--split .sb-grid{grid-template-columns:var(--sb-cols)}
.sb-hero--split .sb-text{justify-content:center}
.sb-hero--split.sb-valign--top .sb-text{justify-content:flex-start;padding-top:calc(var(--sb-gap) * 2)}
.sb-hero--split .sb-photo{min-height:420px}
.sb-hero--split.sb-side--left .sb-photo{order:-1}

/* A2 overlay */
.sb-hero--overlay .sb-text{max-width:720px}
.sb-hero--overlay.sb-anchor--bottom-left .sb-in{justify-content:flex-end}
.sb-hero--overlay.sb-anchor--center .sb-in{align-items:center;text-align:center}
.sb-hero--overlay.sb-anchor--center .sb-text{align-items:center;max-width:860px}
.sb-hero--overlay.sb-anchor--center .sb-ctas{justify-content:center}

/* A3 stacked */
.sb-hero--stacked .sb-in{justify-content:flex-start}
.sb-hero--stacked.sb-image--none .sb-in{justify-content:center}
.sb-hero--stacked .sb-text{max-width:880px}
.sb-hero--stacked.sb-align--center .sb-in{align-items:center;text-align:center}
.sb-hero--stacked.sb-align--center .sb-text{align-items:center}
.sb-hero--stacked.sb-align--center .sb-ctas,.sb-hero--stacked.sb-align--center .sb-rating{justify-content:center}
.sb-hero--stacked .sb-photo{flex:1;min-height:160px;align-self:stretch}
.sb-hero--stacked.sb-image--bleed .sb-photo{margin:0 calc(var(--sb-pad) * -1) calc(var(--sb-pad) * -1);border-radius:0}

/* A4 card on image */
.sb-hero--card .sb-herocard{position:relative;z-index:1;width:min(560px,100%);padding:calc(var(--sb-gap) * 2);display:flex;flex-direction:column;align-items:flex-start;gap:var(--sb-gap)}
.sb-hero--card .sb-herocard .sb-h1{font-size:calc(var(--sb-hs) * 0.8)}
.sb-hero--card.sb-pos--center .sb-in{align-items:center}
.sb-hero--card.sb-pos--right .sb-in{align-items:flex-end}

/* A5 offset: the photo takes the right half; the headline reaches into it by the overlap */
.sb-hero--offset .sb-photo{position:absolute;right:var(--sb-pad);top:var(--sb-drop);bottom:var(--sb-pad);width:50cqw;z-index:0}
.sb-hero--offset .sb-text{z-index:2;width:calc((50cqw - 2 * var(--sb-pad)) * var(--sb-k))}
.sb-hero--offset .sb-rest{display:flex;flex-direction:column;align-items:flex-start;gap:var(--sb-gap);max-width:calc(50cqw - 2 * var(--sb-pad) - var(--sb-gap))}
.sb-hero .sb-hl{background:var(--sb-bg);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 0.14em}

/* A6 type-led */
.sb-hero--typeled .sb-in{justify-content:space-between}
.sb-hero--typeled .sb-h1{font-size:var(--sb-hs-t)}
.sb-hero .sb-row{display:flex;align-items:flex-end;justify-content:space-between;gap:calc(var(--sb-gap) * 3)}
.sb-hero .sb-row .sb-sub{flex:1;max-width:52ch}
.sb-hero .sb-row .sb-ctas{flex:none;margin:0}

/* A7 proof-first */
.sb-hero .sb-grid--proof{grid-template-columns:1.1fr 1fr;align-items:center}
.sb-hero .sb-proof{display:flex;flex-direction:column;gap:var(--sb-gap)}
.sb-hero .sb-review{margin:0;padding:calc(var(--sb-gap) * 1.1) calc(var(--sb-gap) * 1.3)}
.sb-hero .sb-review blockquote{margin:0;font-size:16px;line-height:1.45}
.sb-hero .sb-review p{margin:0}
.sb-hero .sb-review figcaption{margin-top:8px;font-size:14px;color:var(--sb-mu)}
.sb-hero .sb-sum{display:flex;align-items:center;gap:16px}
.sb-hero .sb-sum-n{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:56px;line-height:1}
.sb-hero .sb-sum-c{margin:4px 0 0;font-size:15px;color:var(--sb-mu)}
.sb-hero .sb-team{width:220px;height:110px;flex:none}

/* A8 contact panel */
.sb-hero .sb-grid--contact{grid-template-columns:1.25fr 0.75fr;align-items:center}
.sb-hero--contact.sb-side--left .sb-grid--contact{grid-template-columns:0.75fr 1.25fr}
.sb-hero--contact.sb-side--left .sb-form{order:-1}
.sb-hero .sb-form{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 0.75);padding:calc(var(--sb-gap) * 1.5)}
.sb-hero .sb-form-h{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:24px;line-height:1.15;text-transform:var(--sb-up);letter-spacing:var(--sb-tr)}
.sb-hero .sb-field{display:flex;flex-direction:column;gap:6px;font-size:15px;font-weight:600}
.sb-hero .sb-field input,.sb-hero .sb-field textarea{min-height:48px;padding:10px 12px;border:1px solid var(--sb-muted);border-radius:calc(var(--sb-r) * 0.6);background:var(--sb-ground);color:var(--sb-ink);font:inherit;font-weight:400}
.sb-hero .sb-form .sb-btn{width:100%}

/* Phones */
@container (max-width: 719px){
  .sb-hero .sb-in{min-height:0;padding:28px 20px 36px;gap:calc(var(--sb-gap) * 1.4);justify-content:flex-start}
  .sb-hero .sb-h1,.sb-hero--card .sb-herocard .sb-h1{font-size:var(--sb-hs-m)}
  .sb-hero .sb-sub{font-size:16px}
  .sb-hero .sb-ctas{flex-direction:column;align-items:stretch;width:100%}
  .sb-hero .sb-ctas .sb-btn{width:100%;padding:8px 20px;white-space:normal;text-align:center}
  .sb-hero .sb-grid{display:flex;flex-direction:column;gap:calc(var(--sb-gap) * 1.4)}
  .sb-hero .sb-photo{flex:none;width:100%;height:220px;min-height:0}
  .sb-hero--split.sb-mphoto--top .sb-photo{order:-1}
  .sb-hero--split.sb-mphoto--bottom .sb-photo{order:1}
  .sb-hero--overlay .sb-in{padding-top:140px;justify-content:flex-end}
  .sb-hero--stacked.sb-image--bleed .sb-photo{width:auto;margin:0 -20px -36px}
  .sb-hero--card .sb-bg{position:relative;inset:auto;height:220px;margin:-28px -20px 0}
  .sb-hero--card .sb-bgimg{position:absolute}
  .sb-hero--card .sb-herocard{width:100%;margin-top:-56px;padding:22px}
  .sb-hero--card.sb-pos--center .sb-in,.sb-hero--card.sb-pos--right .sb-in{align-items:stretch}
  .sb-hero--offset .sb-photo{position:relative;inset:auto;width:100%;order:-1}
  .sb-hero--offset .sb-text,.sb-hero--offset .sb-rest{width:auto;max-width:none}
  .sb-hero--typeled .sb-h1{font-size:var(--sb-hs-tm)}
  .sb-hero .sb-row{flex-direction:column;align-items:stretch;gap:var(--sb-gap)}
  .sb-hero .sb-review~.sb-review,.sb-hero .sb-team{display:none}
  .sb-hero .sb-sum{order:-1}
  .sb-hero--contact.sb-side--left .sb-form{order:1}
}

@media (prefers-reduced-motion: no-preference){
  .sb-hero .sb-btn{transition:filter 0.15s ease}
}
.sb-hero .sb-btn:hover{filter:brightness(1.06)}
@media (prefers-reduced-motion: reduce){
  .sb-hero *{animation:none !important;transition:none !important}
}
`
