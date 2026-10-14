import type { PackPhoto } from './schema'

/** Sample photos that suit any business type: they top up a pack's own set in the builder. */
export const SHARED_PHOTOS: readonly PackPhoto[] = [
  { file: 'worker-hi-vis.jpg', alt: 'Sample photo: a worker in a hard hat and hi-vis jacket', hero: true, credit: { licence: 'Pexels License', photographer: 'Jan Zakelj', page: 'https://www.pexels.com/photo/back-view-of-a-person-wearing-white-hard-hat-and-reflectorize-jacket-13182107/' } },
  { file: 'workshop-tools.jpg', alt: 'Sample photo: hand tools on a workbench', credit: { licence: 'Pexels License', photographer: 'Ahimsa - OM', page: 'https://www.pexels.com/photo/organized-workshop-with-hand-tools-and-clamps-34471533/' } },
]
