// Calls the API with the admin key, for the command-line scripts (test-sites.mjs, site.mjs).
//
// The admin key comes from ADMIN_KEY, else admin-key.local (gitignored). --api <url> points it
// elsewhere, e.g. --api https://api.localblocks.localhost:8787 for the local dev stack.
import { existsSync, readFileSync } from 'node:fs'
import { request } from 'node:https'
import { join } from 'node:path'

/** The --api option and the admin key; exits with a message if there's no key. */
export function adminApi(args) {
  const i = args.indexOf('--api')
  const api = ((i >= 0 ? args[i + 1] : undefined) ?? 'https://api.localblocks.co.uk').replace(/\/+$/, '')
  const keyFile = join(process.cwd(), 'admin-key.local')
  const key = process.env.ADMIN_KEY?.trim() || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8').trim() : '')
  if (!key) {
    console.error('No admin key: set ADMIN_KEY or put it in admin-key.local.')
    process.exit(1)
  }
  // The local dev stack: *.localhost names go to this computer, with its self-signed certificate.
  const local = new URL(api).hostname.endsWith('.localhost')
  const lookup = (_host, opts, done) => (opts?.all ? done(null, [{ address: '127.0.0.1', family: 4 }]) : done(null, '127.0.0.1', 4))

  /** GET (no body) or POST (a JSON body). Resolves to the JSON answer; any error status prints the server's message and exits. */
  function call(path, body) {
    const payload = body ? JSON.stringify(body) : undefined
    return new Promise((resolve, reject) => {
      const req = request(`${api}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'X-Admin-Key': key, ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}) },
        ...(local ? { lookup, rejectUnauthorized: false } : {}),
      }, res => {
        let text = ''
        res.setEncoding('utf8')
        res.on('data', chunk => { text += chunk })
        res.on('end', () => {
          let data = {}
          try { data = JSON.parse(text) } catch { /* not JSON */ }
          if (res.statusCode >= 400) {
            console.error(`${res.statusCode}: ${data.message ?? 'request failed'}`)
            process.exit(1)
          }
          resolve(data)
        })
      })
      req.on('error', reject)
      req.end(payload)
    })
  }
  return { api, call }
}
