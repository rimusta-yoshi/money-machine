# Brand tokens (working name "siteblocks", always lowercase)

## Colour
| Token | Hex | Use | Text on it |
|---|---|---|---|
| night | #1C1A24 | text, dark tiles, selected states | white |
| white | #FFFFFF | page ground | night |
| mist | #F2F2F4 | neutral tiles, panels, inputs areas | night |
| line | #D6D6DC / #E2E2E7 | input borders / unselected borders | — |
| muted text | #57526A (#4E4A59 on mist) | secondary text | — |
| brick | #FF5A36 | THE main action (one per screen) | night |
| hard-hat | #FFCE3A | highlights, price | night |
| pipe-blue | #2F64E0 | links, focus ring, info | white |
| lawn | #2DBE8A | success / done | night |

Rules: mostly white + mist + night. One brick button per screen. Other colours as tiles, never as large text. Focus ring: 3px pipe-blue, 2–3px offset.

## Type
- Unbounded 800/900: headlines and buttons only. Sentence case. Tracking −0.03em. Sizes 72 / 48 / 28 / 18.
- DM Sans 400/500/700: everything else. Lead 20, body 17, small 15 (never below 15 on phones).

## Shape and motion
- Radius 28 tiles, 20 buttons, 14 inputs, 10 small blocks. 12px gaps between tiles (bento grids).
- Main button: hard shadow `0 7px 0 night`; presses down on :active.
- Logo: 2×2 block mark (brick, hard-hat, pipe-blue, night) + "siteblocks" in Unbounded 900.
- Motion is subtle: blocks drop in, tiles rise in, tiles lift 4px on hover. Respect prefers-reduced-motion.

## Voice
Upbeat, short, on your side. "Nice, that's your services sorted." Plain prices: "£99 once. That's it." Never jargon, never blame, never "starting from".

## Calm vs loud
Homepage can be loud (bento tiles in colour). The builder is calm: white and mist, night for selected, one brick button.
