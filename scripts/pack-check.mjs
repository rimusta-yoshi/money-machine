// Checks every business-type pack (src/packs): the schema, photos and their licences, copy
// left unfinished, names two packs share, near-duplicate wording between packs, and which packs
// wait on a section that isn't built yet. Exits non-zero on any error.
//
//   npm run pack:check
//
// See docs/adding-a-business-type.md. The same checks run in npm test (src/packs/check.test.ts).
import { packCheckInput, withSrc } from './packs.mjs'

await withSrc(async load => {
  const { WAITING_PACKS } = await load('/src/packs/index.ts')
  const { PAGE_PACKS } = await load('/src/packs/pages.ts')
  const { checkPacks, formatReport } = await load('/src/packs/check.ts')
  const report = checkPacks(packCheckInput(PAGE_PACKS, WAITING_PACKS))
  console.log(formatReport(report, PAGE_PACKS.length + WAITING_PACKS.length))
  if (report.errors.length) process.exitCode = 1
})
