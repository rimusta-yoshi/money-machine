/**
 * A .zip of files, stored as they are (no compression: photos and fonts are compressed
 * already, and the pages are small). Plain ZIP that every computer opens without extra
 * software. Runs in the browser, so building the download costs the server nothing.
 */
export interface ZipEntry {
  /** Forward slashes, no leading slash, e.g. "photos/a.webp". */
  path: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/** MS-DOS date and time, as ZIP stores them (local time, two-second steps). */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: (Math.max(d.getFullYear() - 1980, 0) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._/-]+$/

/** The zip file's bytes. */
export function zipFiles(entries: readonly ZipEntry[], when = new Date()): Uint8Array {
  const { time, date } = dosTime(when)
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    if (!SAFE_PATH.test(e.path)) throw new Error(`Not a safe path for a zip: ${e.path}`)
    const name = enc.encode(e.path)
    const crc = crc32(e.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034B50, true)
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // names are UTF-8
    lv.setUint16(8, 0, true) // stored
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014B50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local, e.data)
    centrals.push(central)
    offset += local.length + e.data.length
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054B50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + end.length)
  let at = 0
  for (const part of [...locals, ...centrals, end]) { out.set(part, at); at += part.length }
  return out
}

/** Reads a stored zip back (tests and checks): path -> bytes, checking every CRC. */
export function unzipStored(zip: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const out = new Map<string, Uint8Array>()
  let at = 0
  while (v.getUint32(at, true) === 0x04034B50) {
    if (v.getUint16(at + 8, true) !== 0) throw new Error('Only stored entries are read')
    const crc = v.getUint32(at + 14, true)
    const size = v.getUint32(at + 18, true)
    const nameLen = v.getUint16(at + 26, true)
    const extra = v.getUint16(at + 28, true)
    const name = new TextDecoder().decode(zip.subarray(at + 30, at + 30 + nameLen))
    const start = at + 30 + nameLen + extra
    const data = zip.slice(start, start + size)
    if (crc32(data) !== crc) throw new Error(`Bad CRC for ${name}`)
    out.set(name, data)
    at = start + size
  }
  return out
}
