// Everything for trying the builder with payments locally, in one terminal:
//
//   npm run dev:pay
//
// Starts the server (npm run dev:stack), the builder (npm run dev:api) and, when Stripe keys are
// in server/.dev.vars, the Stripe CLI forwarding payment events (stripe listen). Each line is
// labelled with where it came from. Ctrl+C stops all three.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stripeListenArgs } from './stripe-events.mjs'

const PORT = 8787
const WINDOWS = process.platform === 'win32'
const DEV_VARS = join(process.cwd(), 'server', '.dev.vars')

const colours = { server: 36, builder: 35, stripe: 33 }
const label = name => `\x1b[${colours[name]}m[${name}]\x1b[0m`

/** Prints a process's output line by line, each line labelled. */
function pipe(name, stream, out) {
  let rest = ''
  stream.on('data', chunk => {
    const lines = (rest + chunk.toString()).split(/\r?\n/)
    rest = lines.pop() ?? ''
    for (const line of lines) out.write(`${label(name)} ${line}\n`)
  })
  stream.on('end', () => { if (rest) out.write(`${label(name)} ${rest}\n`) })
}

const children = []

/** Runs a command line (one string: our own fixed commands, nothing typed in). */
function start(name, commandLine) {
  const child = spawn(commandLine, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } })
  pipe(name, child.stdout, process.stdout)
  pipe(name, child.stderr, process.stderr)
  child.on('exit', code => {
    console.log(`${label(name)} stopped${code ? ` (exit code ${code})` : ''}`)
    if (!stopping) stopAll(code ?? 0)
  })
  children.push(child)
}

let stopping = false
function stopAll(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue
    // On Windows the commands run in a shell: stop the whole tree, not just the shell.
    if (WINDOWS) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGINT')
  }
  setTimeout(() => process.exit(code), 500)
}
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

const hasStripeKey = existsSync(DEV_VARS) && /^\s*STRIPE_SECRET_KEY\s*=\s*\S+/m.test(readFileSync(DEV_VARS, 'utf8'))
/**
 * The Stripe CLI: on the PATH, or (Windows, just installed with winget, in a terminal opened
 * before) in winget's own folder.
 */
function stripeCli() {
  if (spawnSync(WINDOWS ? 'where stripe' : 'command -v stripe', { stdio: 'ignore', shell: true }).status === 0) return 'stripe'
  const packages = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages')
  if (!WINDOWS || !existsSync(packages)) return null
  const dir = readdirSync(packages).find(d => d.startsWith('Stripe.StripeCli'))
  const exe = dir && join(packages, dir, 'stripe.exe')
  return exe && existsSync(exe) ? `"${exe}"` : null
}
const stripe = stripeCli()

start('server', 'npm run dev:stack')
start('builder', 'npm run dev:api')
if (!hasStripeKey) {
  console.log(`${label('stripe')} not started: no STRIPE_SECRET_KEY in server/.dev.vars (payments stay off)`)
} else if (!stripe) {
  console.log(`${label('stripe')} not started: the Stripe CLI isn't installed (winget install Stripe.StripeCli)`)
} else {
  start('stripe', [stripe, ...stripeListenArgs(PORT)].join(' '))
}
console.log('Builder: http://localhost:5173/build/   Stop everything: Ctrl+C')
