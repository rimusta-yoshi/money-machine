// Both workers locally, as on Cloudflare, for trying the whole flow in a browser:
//
//   npm run dev:stack          (then, in another terminal: npm run dev:api)
//
// Serves https://api.siteblocks.localhost:8787, https://preview.siteblocks.localhost:8787 and
// https://<slug>.siteblocks.localhost:8787 (Chrome sends *.localhost to this machine). The
// certificate is self-signed: open https://api.siteblocks.localhost:8787/health once and
// accept it (and the same for preview. and each site address). Data is kept in .wrangler/dev-stack.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STOCK_PHOTO_FILES } from '../src/sample/stockPhotoFiles.ts'
import { startStack } from '../server/test/stack.ts'

const PORT = 8787
const BASE = `siteblocks.localhost:${PORT}`
/** Local only. The real one is a wrangler secret. */
const ADMIN = 'local-admin-key-0123456789abcdef'

const stack = await startStack({
  baseDomain: BASE, port: PORT, https: true, adminToken: ADMIN, builderOrigins: 'http://localhost:5173',
  persistTo: join(process.cwd(), '.wrangler', 'dev-stack'),
})
const bucket = await stack.mf.getR2Bucket('BUCKET', 'api')
for (const file of STOCK_PHOTO_FILES) {
  await bucket.put(`samples/${file}`, readFileSync(join(process.cwd(), 'reference', 'sample-photos', file)), { httpMetadata: { contentType: 'image/jpeg' } })
}
console.log(`API      https://api.${BASE}
Previews https://preview.${BASE}/<token>/
Sites    https://<slug>.${BASE}/
Admin key for publishing: ${ADMIN}
Builder: npm run dev:api  (Vite with VITE_API_URL=https://api.${BASE})`)
