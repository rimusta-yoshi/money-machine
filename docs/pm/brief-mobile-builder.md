# Brief: mobile builder flow (pre-launch)

Start from main (packs PR #30 and own domains PR #36 merged). New branch, PR when done. Don't merge or deploy: the PM merges, rob approves deploys. Test mode, tester gate and noindex stay as they are.

## Why
Most ad traffic will be phones. Today on a phone: section pills cover the site (worst on thin strips), the bottom sheet (`src/builder/MobileSheet.tsx`) takes a quarter to half the screen and, with the keyboard open, hides the site, and choosing and editing on one screen is too much. rob agreed the direction on 13–14 Oct (docs/pm/mobile-direction.md) with a clickable prototype: https://claude.ai/artifact/Y1RxThgephzTk114jTce3y (read it with the Artifact tool's read action, and follow it closely; where it and this brief disagree, this brief wins). Desktop stays as it is unless a shared component has to change.

## Flow (phone widths, per section, in section order)
1. **Swipe layouts.** Slim bar: `‹  Edit <section>  ›`, a line like "Hero · Photo on top · 1 of 6 · swipe to change", and a brick-coloured "Next: <section>" button. Whatever layout is showing is the choice: no "use this layout" confirmation. Swiping and the ‹ › buttons both work; keyboard and screen-reader users get the buttons and live announcements.
2. **Edit <section>** opens just that section's fields. Only that section stays visible above them, updating live as you type. The sheet never hides the section; with the keyboard open, the preview scrolls so the edited part stays visible (visualViewport).
3. **Done** moves straight on to the next section. **Next** skips editing when the pre-filled content is fine.
4. Tapping an earlier section returns to it with the slim bar (swipe + Edit), not the form.
5. **No pills on the site.** The section name lives in the bar; the selected section only gets an outline.
Keep everything the builder does today working: layout locks, fit checks and repair, sample tags, grid rules, autosave, the Go live step, paid-site "Publish changes".

## Content details
- **Hero headline:** 3 suggested headlines (varied per site, including trade and town, from the pack) plus "Write your own" (max ~60 characters). Page title, meta and LocalBusiness data stay generated from Basics, so edits can't hurt SEO. Generator output for existing seeds must not change unless the customer picks a headline.
- **Photos:** "Add your photo" is prominent; no "keep sample" button; the line "No photo to hand? Carry on. We'll remind you before you go live." The go-live nudge and the no-photo layout fallback stay.
- **After upload:** tap the important part (focal point), stored with the photo and used for crops (object-position) everywhere, including the published site and the download. A Phone / Computer preview toggle on the edit screen. The generator prefers portrait-friendly hero layouts for tall photos (only when a customer photo is tall; sample photos and existing output unchanged).
- **Banned-word check** (e.g. bank, login, verify your account, password, crypto; keep the list in config) flags a site for rob's review on the admin dashboard at publish/payment time. It never blocks the customer and never says "banned". Sites have no forms that collect credentials or payments (keep it that way).
- **"Email me a link to finish on my computer":** saves the build (seed, picks, content, photo refs) server-side and emails a resume link (Resend adapter, existing email style, signed link like the edit links). Covered by the 30-day unpaid-copy cleanup. Optional single reminder only if they tick "remind me" (one email, a few days later). This needs a privacy policy line: draft it in the PR description for rob's legal check, don't publish silently. Note the PM docs said "no server-side resume drafts"; this replaces that decision.

## Rules
- Accessibility first (axe on every new state, phone and desktop; touch targets 44px; focus management when the sheet opens and closes; reduced motion respected).
- Tests: unit tests for the new flow logic, and e2e on a phone viewport for the full loop (swipe → edit → done → next → go live), the keyboard-open case, focal point, the resume-link email (faked), and the banned-word flag. Keep the stress test green.
- Migrations as normal files in server/migrations (adds only; next free number), called out in the report. Don't run against production.
- No secrets. Don't widen tool permissions in .claude/settings*.json. Don't change pricing or payments.
- Commit as you go so progress survives interruptions.

## Done when
The phone builder follows the flow above end to end, desktop is unaffected, all tests + the quick stress test + e2e pass, CI green. Report: a 5-line summary, what differs from the brief and prototype, open questions (technical vs product/legal), the PR URL, and phone screenshots of each step (bar, edit with keyboard, headline suggestions, focal point, resume-link screen) in docs/pm/screenshots/.
