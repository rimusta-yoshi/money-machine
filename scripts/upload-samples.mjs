// Uploads the builder's sample stock photos (reference/sample-photos) to R2 under samples/,
// where the API serves them at https://api.<domain>/samples/<file>. Needs CLOUDFLARE_API_TOKEN
// (see server/README.md). Run once: npm run cf:samples
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'reference', 'sample-photos')
for (const file of readdirSync(dir).filter(f => f.endsWith('.jpg'))) {
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `siteblocks/samples/${file}`, '--file', join(dir, file), '--content-type', 'image/jpeg', '--remote'], { stdio: 'inherit', shell: true })
}
console.log('Uploaded the sample photos to R2 (siteblocks/samples/).')
