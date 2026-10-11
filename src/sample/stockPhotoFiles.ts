import type { TradeId } from '../types'

/**
 * The builder's stock photos (reference/sample-photos, see its LICENCE.md): file, alt text,
 * the trade each shows, and whether it works as a hero. Its own module so the API worker
 * can list the files without any browser code.
 */
export interface StockPhoto {
  file: string
  alt: string
  /** The trade whose work it shows; 'any' for photos that suit every trade. */
  trade: TradeId | 'any'
  /** Landscape and uncluttered enough for a hero. */
  hero?: true
}

export const STOCK_PHOTOS: readonly StockPhoto[] = [
  // Plumber
  { file: 'bathroom.jpg', alt: 'Sample photo: a finished bathroom with a glass shower', trade: 'plumber', hero: true },
  { file: 'plumber-bathroom-bath.jpg', alt: 'Sample photo: a tiled bathroom with a corner bath', trade: 'plumber', hero: true },
  { file: 'plumber-shower-room.jpg', alt: 'Sample photo: a shower room with a freestanding bath', trade: 'plumber', hero: true },
  { file: 'plumber-bathroom-vanity.jpg', alt: 'Sample photo: a bathroom with a double basin and freestanding bath', trade: 'plumber', hero: true },
  { file: 'plumber-kitchen-tap.jpg', alt: 'Sample photo: a chrome kitchen tap over a round sink', trade: 'plumber', hero: true },
  { file: 'plumber-radiator.jpg', alt: 'Sample photo: a white column radiator on a pale wall', trade: 'plumber', hero: true },
  { file: 'plumber-copper-fittings.jpg', alt: 'Sample photo: copper pipe fittings in a row', trade: 'plumber' },
  { file: 'plumber-pipe-fitting.jpg', alt: 'Sample photo: hands tightening a pipe fitting', trade: 'plumber' },
  { file: 'plumber-radiator-fitting.jpg', alt: 'Sample photo: gloved hands fitting a radiator valve', trade: 'plumber' },
  { file: 'kitchen.jpg', alt: 'Sample photo: a fitted kitchen with wood cabinets', trade: 'plumber', hero: true },
  // Painter
  { file: 'painting-wall.jpg', alt: 'Sample photo: painting a ceiling with a roller', trade: 'painter' },
  { file: 'painter-roller-grey-wall.jpg', alt: 'Sample photo: a roller on a freshly painted grey wall', trade: 'painter', hero: true },
  { file: 'painter-roller-white-wall.jpg', alt: 'Sample photo: a roller on a clean white wall', trade: 'painter', hero: true },
  { file: 'painter-roller-cream-wall.jpg', alt: 'Sample photo: a yellow roller on a cream wall', trade: 'painter', hero: true },
  { file: 'painter-finished-room.jpg', alt: 'Sample photo: a freshly decorated empty room', trade: 'painter', hero: true },
  { file: 'painter-rollers.jpg', alt: 'Sample photo: two paint rollers on a wooden floor', trade: 'painter', hero: true },
  { file: 'painter-rollers-brushes.jpg', alt: 'Sample photo: rollers and brushes laid out ready', trade: 'painter' },
  { file: 'painter-stepladder-room.jpg', alt: 'Sample photo: a stepladder and dust sheets in a room being painted', trade: 'painter' },
  { file: 'painter-roller-wall.jpg', alt: 'Sample photo: a roller on a white wall, close up', trade: 'painter' },
  // Roofer
  { file: 'roof-tiles.jpg', alt: 'Sample photo: clay roof tiles going onto battens', trade: 'roofer', hero: true },
  { file: 'roofer-clay-tile-roofs.jpg', alt: 'Sample photo: clay tile roofs against a blue sky', trade: 'roofer', hero: true },
  { file: 'roofer-slate-dormers.jpg', alt: 'Sample photo: a slate roof with two dormer windows', trade: 'roofer', hero: true },
  { file: 'roofer-chimney.jpg', alt: 'Sample photo: a brick chimney on a tiled roof', trade: 'roofer', hero: true },
  { file: 'roofer-slate-close-up.jpg', alt: 'Sample photo: old slates on a roof, close up', trade: 'roofer', hero: true },
  { file: 'roofer-gutter.jpg', alt: 'Sample photo: a white downpipe on a red wall', trade: 'roofer' },
  { file: 'roofer-roof-renovation.jpg', alt: 'Sample photo: a roof being stripped, with a ladder by the chimney', trade: 'roofer' },
  { file: 'roofer-tiling-in-progress.jpg', alt: 'Sample photo: a roof part way through re-tiling', trade: 'roofer' },
  { file: 'roofer-slate-roof-house.jpg', alt: 'Sample photo: a house with a slate roof and window box', trade: 'roofer' },
  // Electrician
  { file: 'electrician-light-switches.jpg', alt: 'Sample photo: white light switches on a stone wall', trade: 'electrician', hero: true },
  { file: 'electrician-kitchen-lights.jpg', alt: 'Sample photo: pendant lights over a kitchen island', trade: 'electrician', hero: true },
  { file: 'electrician-socket-boxes.jpg', alt: 'Sample photo: new socket boxes with wiring ready to fit', trade: 'electrician', hero: true },
  { file: 'electrician-junction-wiring.jpg', alt: 'Sample photo: wiring in a junction box', trade: 'electrician', hero: true },
  { file: 'electrician-junction-box.jpg', alt: 'Sample photo: an open junction box during rewiring', trade: 'electrician' },
  { file: 'electrician-fitting-sockets.jpg', alt: 'Sample photo: hands wiring a new socket', trade: 'electrician' },
  { file: 'electrician-socket-wiring.jpg', alt: 'Sample photo: an open socket box with wires', trade: 'electrician' },
  { file: 'electrician-consumer-unit.jpg', alt: 'Sample photo: an open consumer unit on a wall', trade: 'electrician' },
  // Landscaper
  { file: 'garden-patio.jpg', alt: 'Sample photo: a garden patio with seating', trade: 'landscaper', hero: true },
  { file: 'landscaper-lawn-hedges.jpg', alt: 'Sample photo: a striped lawn with clipped hedges', trade: 'landscaper', hero: true },
  { file: 'landscaper-garden-path.jpg', alt: 'Sample photo: a garden path through planting by a gazebo', trade: 'landscaper', hero: true },
  { file: 'landscaper-decking.jpg', alt: 'Sample photo: new timber decking with a dining set', trade: 'landscaper', hero: true },
  { file: 'landscaper-lawn-wall.jpg', alt: 'Sample photo: a fresh lawn beside a timber wall', trade: 'landscaper', hero: true },
  { file: 'landscaper-tulip-border.jpg', alt: 'Sample photo: a tulip border by a lawn', trade: 'landscaper', hero: true },
  { file: 'garden-path.jpg', alt: 'Sample photo: a paved side path by a fence', trade: 'landscaper' },
  { file: 'landscaper-hedge-trimming.jpg', alt: 'Sample photo: trimming a hedge with shears', trade: 'landscaper' },
  { file: 'landscaper-lawn-mower.jpg', alt: 'Sample photo: a mower on a freshly cut lawn', trade: 'landscaper' },
  { file: 'landscaper-stone-path.jpg', alt: 'Sample photo: a stone path between clipped hedges', trade: 'landscaper' },
  { file: 'landscaper-brick-path.jpg', alt: 'Sample photo: a brick path through a garden', trade: 'landscaper' },
  { file: 'landscaper-hydrangeas.jpg', alt: 'Sample photo: hydrangeas in a raised bed', trade: 'landscaper' },
  // Any trade
  { file: 'worker-hi-vis.jpg', alt: 'Sample photo: a worker in a hard hat and hi-vis jacket', trade: 'any', hero: true },
  { file: 'workshop-tools.jpg', alt: 'Sample photo: hand tools on a workbench', trade: 'any' },
]

/** The files to upload to storage (see server/README.md). */
export const STOCK_PHOTO_FILES: readonly string[] = STOCK_PHOTOS.map(p => p.file)

/** How many sample photos a builder shows: a hero, an about photo and a gallery. */
export const SAMPLE_SET_SIZE = 8

/**
 * One builder's sample photos: hero, about, then the gallery, all matching its trade
 * (topped up with photos that suit any trade). `seed` picks the hero and the order, so two
 * builders of the same trade rarely look alike, while one builder keeps the same set.
 */
export function stockSetFor(trade: TradeId, seed: number): StockPhoto[] {
  const own = STOCK_PHOTOS.filter(p => p.trade === trade)
  const pool = [...own, ...STOCK_PHOTOS.filter(p => p.trade === 'any')].slice(0, Math.max(SAMPLE_SET_SIZE, own.length))
  const s = Math.abs(Math.floor(seed)) >>> 0
  const heroes = pool.filter(p => p.hero)
  const hero = heroes.length ? heroes[s % heroes.length] : pool[0]
  const rest = pool.filter(p => p !== hero)
  const turn = rest.length ? (s >>> 3) % rest.length : 0
  return [hero, ...rest.slice(turn), ...rest.slice(0, turn)].slice(0, Math.max(SAMPLE_SET_SIZE, own.length))
}
