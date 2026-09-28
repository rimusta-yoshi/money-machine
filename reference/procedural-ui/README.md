# Procedural UI — working notes

Exploration of procedurally generated (not AI-generated) website sections for a
section-based site builder for tradespeople, and groundwork for a research paper.

## What's in here

- **page-builder.html** — latest prototype. Open in any browser (needs internet for fonts).
  Locked site style, a carousel per section, and a derived "rhythm" layer that re-solves
  when any pick changes.
- **hero-generator.html** — first prototype. Generates batches of heroes, rejects any that
  break hard rules, shows the most distinct survivors, with a full trace per candidate.
- **hero-vocabulary/** — source for the eight hero archetype wireframes (Claude Design canvas
  files). The live canvas is in your Claude artifacts as "Hero Vocabulary — Procedural UI".

## Core model

1. **Content model** — what a section must say. Mission slots (headline, primary CTA, phone)
   are required; others are optional. Content gates archetypes (no photo → no Overlay;
   fewer than 3 reviews → no Proof-first).
2. **Archetypes + parameters** — hand-authored structures ("rooms", like Spelunky's room
   templates) with knobs the generator rolls.
3. **Theme as a vector** — ranges and options (radius, density, type scale, button style,
   palette), not a label. Themes can be blended.
4. **Hard constraints** (reject) vs **soft scores** (rank). Contrast, tap targets, headline
   length, overflow, CTA above the mobile fold.
5. **Distinctness filter** — pick the most different valid candidates (the "10,000 bowls of
   oatmeal" problem).

## Three tiers for a whole site

- **Site DNA (the biome)** — resolved once: brand colour, fonts, buttons, corners, spacing.
- **Section structure (the rooms)** — chosen by the user via carousel. Never changed by the system.
- **Derived rhythm** — computed from the whole sequence on every change: zig-zag image sides,
  one loud section per page, background alternation. Going back and changing a section only
  re-solves this layer.

Stable carousels: store a batch seed per section so revisiting shows the same options.
Store the resolved spec (JSON), not just the seed, so generator updates don't change saved sites.

## Open questions / next steps

- Reject vs repair (e.g. shrink a headline to fit vs discard the candidate).
- Log carousel picks as a fitness signal (human-in-the-loop selection, cf. Picbreeder).
- Level 2 generation: carve layouts by recursive splitting (BSP, like dungeon rooms) and test
  whether it rediscovers the hand-made archetypes.
- Mobile view in the page builder; more sequence rules; variable section order.
- Map existing hand-made sections onto the archetype vocabulary (gap analysis = first data).

## Paper plan

1. **Position paper** — procedural UI via game PCG rather than generative AI; framework above.
   Candidate venues: PCG Workshop (FDG), EXAG, CHI Late-Breaking Work / workshops, DIS.
2. **Empirical paper** — mix generated and hand-made sections in the live carousel and compare
   selection rates. Candidate venues: IUI, UIST.

Draft research question: *Can a constraint-based procedural generator, seeded from
hand-authored sections, produce website sections that non-designer users choose as often as
hand-designed ones?*

## Reading list

- Karl Gerstner, *Designing Programmes* (1964)
- Krzysztof Gajos et al., SUPPLE (automatic, personalised UI generation)
- Antti Oulasvirta et al., combinatorial optimisation for UI layout
- Gillian Smith & Jim Whitehead, expressive range analysis of level generators (2010)
- Joris Dormans, mission/space grammars (Unexplored)
- Derek Yu, *Spelunky* (Boss Fight Books) — room-template generation
- Kate Compton, "So you want to build a generator" (the oatmeal problem)
- Maxim Gumin, Wave Function Collapse
- Secretan & Stanley et al., Picbreeder (interactive evolution)

## Practical notes

- UK: GA and Clarity need opt-in consent before loading (PECR). Mask form fields in Clarity.
  Cover anonymised research use of carousel choices in the privacy policy.
