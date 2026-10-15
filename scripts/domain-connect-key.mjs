// Makes the key pair that signs our Domain Connect (one-click domain) requests.
// See docs/domain-connect.md. Run once: node scripts/domain-connect-key.mjs
//
// The private key goes straight into the API worker's DC_PRIVATE_KEY secret (through wrangler,
// never into a file or this terminal). The public key is printed as the TXT records to add at
// _dck1.<our domain>. Lost or leaked? Run it again: the new key replaces the old one, and the
// new TXT records replace the old ones. With --print the private key is printed instead of stored.
import { execFileSync } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'

const KEY_HOST = '_dck1'
const DOMAIN = 'localblocks.co.uk'
/** A TXT string holds 255 characters; the key is split across numbered records. */
const CHUNK = 200

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'der' },
})
const pub = publicKey.toString('base64')
const priv = privateKey.toString('base64')

if (process.argv.includes('--print')) {
  console.log('\nPrivate key (paste it into: npx wrangler secret put DC_PRIVATE_KEY -c server/wrangler.api.jsonc; never anywhere else):\n')
  console.log(priv)
} else {
  execFileSync('npx', ['wrangler', 'secret', 'put', 'DC_PRIVATE_KEY', '-c', 'server/wrangler.api.jsonc'], { input: priv, stdio: ['pipe', 'inherit', 'inherit'], shell: true })
  console.log('\nStored the private key as the DC_PRIVATE_KEY secret of the API worker.')
}

const parts = pub.match(new RegExp(`.{1,${CHUNK}}`, 'g'))
console.log(`\nAdd these TXT records in Cloudflare (${DOMAIN} → DNS → Records → Add record), each with name ${KEY_HOST}, TTL Auto.`)
console.log(`Delete any older ${KEY_HOST} TXT records first. Content, one record per line:\n`)
parts.forEach((d, i) => console.log(`p=${i + 1},a=RS256,d=${d}`))
console.log('')
