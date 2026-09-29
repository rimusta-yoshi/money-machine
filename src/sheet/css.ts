/** The contact sheet's own chrome: a neutral grey desk so every theme's ground reads. */
export const SHEET_CSS = `
body{margin:0;background:#E7E7E4;color:#1A1A1A;font-family:Inter,system-ui,sans-serif}
#sheet{padding:0 24px 80px}
.cs-top{position:relative;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 24px;margin:0 -24px;padding:14px 24px;background:#1A1A1A;color:#F2F2F0}
.cs-top h1{margin:0;font-size:18px}
.cs-top p{margin:0;font-size:13px;color:#C9C9C4;flex:1 1 400px}
.cs-nav{display:flex;gap:16px}
.cs-nav a{color:#FFFFFF;font-weight:600;font-size:14px}
.cs-status{font-size:13px;color:#555;margin:12px 0}
.cs-theme{margin-top:40px}
.cs-theme-h{padding:26px 0 8px;border-top:4px solid #1A1A1A}
.cs-theme-h h2{margin:0;font-size:34px;letter-spacing:-0.02em}
.cs-theme-h p{margin:6px 0 0;font-size:15px}
.cs-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:#444;font-size:13px}
.cs-meta .sw{display:inline-block;width:16px;height:16px;border-radius:3px;border:1px solid rgba(0,0,0,0.25)}
.cs-section,.cs-page{margin-top:34px}
.cs-section-h{margin:0 0 12px;font-size:20px}
.cs-section-h span{font-size:13px;font-weight:500;color:#555}
.cs-opt{margin:0 0 26px}
.cs-tag{margin:0 0 6px;font-size:13px;color:#333}
.cs-tag code{font-size:13px;font-weight:700;background:#fff;padding:1px 5px;border-radius:4px}
.cs-params{display:block;color:#777;font:11px/1.4 'JetBrains Mono',monospace;margin-top:2px;word-break:break-all}
.cs-views{display:flex;align-items:flex-start;gap:20px}
.cs-desk{flex:none;width:744px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.cs-desk-in{width:1200px;zoom:0.62}
.cs-phone{flex:none;width:375px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);zoom:0.75}
.cs-phone-in{width:375px}
.cs-desk--page .cs-desk-in{zoom:0.62}
@media (max-width: 1200px){.cs-views{flex-wrap:wrap}}
`
