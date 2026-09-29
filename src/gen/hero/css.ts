/**
 * Hero structure, on top of the base section CSS. The theme skins draw the components;
 * theme-only heroes (bigphone, floatcard, editorial, sticker) add their own rules here.
 * Phone layouts use container queries, so a hero lays out by the width it is given.
 */
export const HERO_CSS = `
.sb-hero{overflow:hidden}
.sb-hero .sb-wrap{min-height:640px;justify-content:center;padding-top:calc(var(--sb-py) * 0.7);padding-bottom:calc(var(--sb-py) * 0.8)}
.sb-hero-text{position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:calc(var(--sb-gap) * 1.6);min-width:0}
.sb-hero-text .sb-lead{max-width:32em}
.sb-hero .sb-photo{max-height:560px}
.sb-hero .sb-ctas{margin-top:calc(var(--sb-gap) * 0.25)}
.sb-hero-text.sb-center{align-items:center;text-align:center;margin:0 auto}
.sb-hero-text.sb-center .sb-ctas,.sb-hero-text.sb-center .sb-rating,.sb-hero-text.sb-center .sb-ticks{justify-content:center}
.sb-hero .sb-rating{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:16px;font-weight:600}
.sb-hero .sb-trust{display:flex;flex-wrap:wrap;gap:8px 28px;font-size:15px;font-weight:600;padding-top:var(--sb-gap);border-top:1px solid var(--sb-hair)}
.sb-hero .sb-ticks{display:flex;flex-wrap:wrap;gap:10px 26px;font-size:15px;color:var(--sb-mu)}
.sb-hero .sb-ticks>li{display:flex;align-items:center;gap:8px}
.sb-hero .sb-ticks>li::before{content:"";flex:none;width:18px;height:18px;background:var(--sb-link);-webkit-mask:var(--sb-tick) center/contain no-repeat;mask:var(--sb-tick) center/contain no-repeat}
.sb-hero-strip{display:flex;flex-wrap:wrap;align-items:center;gap:10px 32px;padding-top:calc(var(--sb-gap) * 1.2);border-top:1px solid var(--sb-hair);font-size:15px;font-weight:600}

/* split, floatcard and sticker: text beside a framed photo */
.sb-hero .sb-cols{flex:1}
.sb-hero.sb-va--end .sb-cols{align-items:end}
.sb-hero .sb-media{align-self:center}
.sb-hero .sb-bleed--edge .sb-photo{border-radius:0;max-height:none;min-height:560px}
.sb-hero.sb-img--right .sb-bleed--edge{margin-right:calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2))}
.sb-hero.sb-img--left .sb-bleed--edge{margin-left:calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2))}

/* overlay: text over the photo, under a scrim */
.sb-hero-bg{position:absolute;inset:0;z-index:0}
.sb-hero-bg .sb-media,.sb-hero-bg .sb-photo{height:100%;max-height:none;border-radius:0}
.sb-hero-scrim{position:absolute;inset:0;z-index:1;background:rgba(0,0,0,var(--sb-scrim))}
.sb-hero--overlay .sb-wrap{min-height:680px}
.sb-hero--overlay .sb-hero-text{max-width:780px}
.sb-hero--overlay.sb-anchor--bottom .sb-wrap{justify-content:flex-end}
.sb-hero--overlay.sb-anchor--center .sb-hero-text{align-items:center;text-align:center;margin:0 auto;max-width:900px}
.sb-hero--overlay.sb-anchor--center .sb-ctas{justify-content:center}
.sb-tone--photo .sb-btn--ghost{color:#FFFFFF}

/* stacked: headline first, a wide photo under it */
.sb-hero--stacked .sb-wrap{justify-content:flex-start}
.sb-hero--stacked.sb-image--none .sb-wrap{justify-content:center}
.sb-hero--stacked .sb-hero-text{max-width:980px}
.sb-hero--stacked .sb-media .sb-photo{aspect-ratio:auto;height:300px;max-height:none}
.sb-hero--stacked.sb-image--bleed .sb-media{margin:0 calc(-1 * (var(--sb-pad) + (100cqw - min(100cqw, 1200px)) / 2)) calc(var(--sb-py) * -0.8)}
.sb-hero--stacked.sb-image--bleed .sb-photo{border-radius:0}

/* type-led: the headline is the picture */
.sb-hero--typeled .sb-h1{max-width:14em}
.sb-hero--typeled .sb-hero-foot{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:calc(var(--sb-gap) * 2) calc(var(--sb-gap) * 4);width:100%}
.sb-hero--typeled .sb-hero-foot .sb-lead{flex:1 1 320px}
.sb-hero--typeled .sb-hero-foot .sb-ctas{margin:0}

/* proof-first and contact: a second column of reviews or a form */
.sb-hero .sb-proof{display:flex;flex-direction:column;gap:var(--sb-gap)}
.sb-hero .sb-review{padding:22px 24px;font-size:16px;line-height:1.5}
.sb-hero .sb-review figcaption{margin-top:8px;font-size:14px;color:var(--sb-mu)}
.sb-hero .sb-sum{display:flex;align-items:center;gap:16px}
.sb-hero .sb-sum-n{font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-xl);line-height:1}
.sb-hero .sb-form-h{margin:0;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:26px;line-height:1.15;letter-spacing:var(--sb-dtr);text-transform:var(--sb-dup)}
.sb-hero .sb-form.sb-card{padding:28px}

/* offset: the headline reaches across the photo on a highlight */
.sb-hero--offset .sb-offset-photo{position:absolute;right:var(--sb-pad);top:var(--sb-drop);bottom:calc(var(--sb-py) * 0.8);width:46%;z-index:0}
.sb-hero--offset .sb-offset-photo .sb-media,.sb-hero--offset .sb-offset-photo .sb-photo{height:100%;max-height:none}
.sb-hero--offset .sb-hero-text{width:calc(54% * var(--sb-k))}
.sb-hero--offset .sb-hl{background:var(--sb-bg);-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:0 0.12em}
.sb-hero--offset .sb-rest{display:flex;flex-direction:column;align-items:flex-start;gap:calc(var(--sb-gap) * 1.4);max-width:calc(100% / var(--sb-k) - var(--sb-gap))}

/* bigphone (Workwear): a giant number is the call button */
.sb-hero--bigphone .sb-h1{font-size:var(--sb-h2)}
.sb-bigphone{display:inline-flex;align-items:center;gap:0.2em;min-height:44px;font-family:var(--sb-fd);font-weight:var(--sb-dw);font-size:var(--sb-h1);line-height:0.9;letter-spacing:var(--sb-dtr);color:var(--sb-link);text-decoration:none;white-space:nowrap}
.sb-bigphone:hover{text-decoration:underline;text-decoration-thickness:0.06em}
.sb-bigphone-l{font-family:var(--sb-fl);font-weight:var(--sb-lw);font-size:18px;letter-spacing:var(--sb-ltr);text-transform:var(--sb-lup);color:var(--sb-mu)}

/* editorial (Craft Heritage): centred masthead, then a captioned figure */
.sb-hero--editorial .sb-wrap{align-items:center}
.sb-hero--editorial .sb-hero-text{max-width:960px}
.sb-hero--editorial .sb-media{width:100%}
.sb-hero--editorial .sb-media .sb-photo{aspect-ratio:auto;height:440px;max-height:none}
.sb-hero--editorial.sb-image--none .sb-hero-text::after{content:"";display:block;width:160px;height:5px;margin:calc(var(--sb-gap) * 1.2) auto 0;border-top:1px solid var(--sb-fg);border-bottom:1px solid var(--sb-fg)}

/* sticker (Friendly Local): photo on a blob with stickers */
.sb-hero--sticker .sb-media{padding:4% 5%}

@container (max-width: 719px){
  .sb-hero .sb-wrap{min-height:0;padding-top:24px;padding-bottom:40px}
  .sb-hero-text{gap:calc(var(--sb-gap) * 1.1)}
  .sb-hero .sb-photo,.sb-hero .sb-bleed--edge .sb-photo{max-height:240px;min-height:0}
  .sb-hero.sb-img--right .sb-bleed--edge,.sb-hero.sb-img--left .sb-bleed--edge{margin:0 -20px}
  .sb-hero .sb-hero-strip{gap:8px 20px}
  .sb-hero--overlay .sb-wrap{min-height:0;padding-top:150px}
  .sb-hero--stacked .sb-media .sb-photo,.sb-hero--editorial .sb-media .sb-photo{height:200px}
  .sb-hero--stacked.sb-image--bleed .sb-media{margin:0 -20px -40px}
  .sb-hero--typeled .sb-hero-foot{flex-direction:column;align-items:stretch;gap:calc(var(--sb-gap) * 1.1)}
  .sb-hero--typeled .sb-hero-foot .sb-lead{flex:none}
  .sb-hero--offset .sb-offset-photo{position:relative;inset:auto;width:100%;height:220px;order:-1}
  .sb-hero--offset .sb-hero-text,.sb-hero--offset .sb-rest{width:auto;max-width:none}
  .sb-hero .sb-review~.sb-review{display:none}
  .sb-hero .sb-sum{order:-1}
  .sb-bigphone{font-size:var(--sb-xlm)}
  .sb-hero--bigphone .sb-h1{font-size:var(--sb-h2m)}
  .sb-hero--sticker .sb-media{padding:0 12px}
}
`
