/**
 * The builder's stock photos (reference/sample-photos, see its LICENCE.md): file and alt text.
 * Its own module so the API worker can list the files without any browser code.
 */
export const STOCK_PHOTOS: readonly [string, string][] = [
  ['bathroom.jpg', 'Sample photo: a finished bathroom with a glass shower'],
  ['worker-hi-vis.jpg', 'Sample photo: a worker in a hard hat and hi-vis jacket'],
  ['kitchen.jpg', 'Sample photo: a fitted kitchen with wood cabinets'],
  ['roof-tiles.jpg', 'Sample photo: clay roof tiles going onto battens'],
  ['painting-wall.jpg', 'Sample photo: painting a ceiling with a roller'],
  ['garden-patio.jpg', 'Sample photo: a garden patio with seating'],
  ['garden-path.jpg', 'Sample photo: a paved side path by a fence'],
  ['workshop-tools.jpg', 'Sample photo: hand tools on a workbench'],
]

/** The files to upload to storage (see server/README.md). */
export const STOCK_PHOTO_FILES: readonly string[] = STOCK_PHOTOS.map(([file]) => file)
