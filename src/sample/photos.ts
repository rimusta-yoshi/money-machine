import type { PagePhoto } from '../gen'

/**
 * Placeholder photos for previews, drawn on a canvas in the browser: a soft interior-ish
 * scene with a small "Sample photo" label, like the photo boxes in the theme mockups.
 * Builder-only (dev) and the contact sheet; never part of a site record.
 */

interface Scene { alt: string; label: string; sky: [string, string]; floor: string; shapes: string[] }

const SCENES: Scene[] = [
  { alt: 'A finished bathroom with new tiles', label: 'finished bathroom', sky: ['#D9DEE2', '#B9C2C9'], floor: '#8E969C', shapes: ['#F2F4F5', '#A7B3BC', '#6F7C86'] },
  { alt: 'The team outside a customer’s house with the van', label: 'the team with the van', sky: ['#CFE0EA', '#E9E2D6'], floor: '#7D7468', shapes: ['#F4F1EA', '#2F3A44', '#C9B79A'] },
  { alt: 'A new kitchen, fitted and tidied', label: 'new kitchen', sky: ['#EDE6DB', '#D6CBBB'], floor: '#9C8C77', shapes: ['#FBF8F2', '#5E6B63', '#B8A58B'] },
  { alt: 'A utility room after the work', label: 'utility room', sky: ['#E3E6E0', '#C7CDC3'], floor: '#7F8779', shapes: ['#F6F7F3', '#9FAE9B', '#56614F'] },
  { alt: 'Work in progress, dust sheets down', label: 'work in progress', sky: ['#E8E1D8', '#CDBFAE'], floor: '#8A7A66', shapes: ['#F7F2EA', '#B29C80', '#6B5A48'] },
  { alt: 'A garden path and new fencing', label: 'garden and fencing', sky: ['#D8E7EC', '#C3D8C5'], floor: '#6E8A5E', shapes: ['#EEF4EA', '#8FAF7E', '#4E6B45'] },
  { alt: 'A freshly painted hallway', label: 'painted hallway', sky: ['#EFE7E2', '#DCCFC7'], floor: '#9A8577', shapes: ['#FCF8F5', '#C7A99A', '#7E6457'] },
  { alt: 'The finished job, ready for handover', label: 'the finished job', sky: ['#DDE3EA', '#C6CFDA'], floor: '#7F8894', shapes: ['#F5F7FA', '#94A3B5', '#566273'] },
]

function seeded(n: number) {
  let a = n * 9301 + 49297
  return () => { a = (a * 9301 + 49297) % 233280; return a / 233280 }
}

function draw(scene: Scene, i: number, w = 1200, h = 900): string {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (!g) return ''
  const r = seeded(i + 3)
  const wall = g.createLinearGradient(0, 0, 0, h)
  wall.addColorStop(0, scene.sky[0])
  wall.addColorStop(1, scene.sky[1])
  g.fillStyle = wall
  g.fillRect(0, 0, w, h)
  const horizon = h * (0.62 + r() * 0.1)
  g.fillStyle = scene.floor
  g.fillRect(0, horizon, w, h - horizon)
  // A few soft blocks: a window, a unit, a doorway.
  scene.shapes.forEach((c, k) => {
    g.globalAlpha = 0.85
    g.fillStyle = c
    const bw = w * (0.18 + r() * 0.22)
    const bh = h * (0.25 + r() * 0.35)
    const x = w * (0.08 + k * 0.28 + r() * 0.06)
    g.beginPath()
    g.roundRect(x, horizon - bh + (k === 0 ? -h * 0.12 : 0), bw, bh, 10)
    g.fill()
  })
  g.globalAlpha = 1
  // Soft light from the top left, and a vignette.
  const light = g.createRadialGradient(w * 0.2, h * 0.1, 10, w * 0.2, h * 0.1, w * 0.9)
  light.addColorStop(0, 'rgba(255,255,255,0.35)')
  light.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = light
  g.fillRect(0, 0, w, h)
  const vig = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.75)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.28)')
  g.fillStyle = vig
  g.fillRect(0, 0, w, h)
  // Grain, so it reads as a photo rather than a flat block.
  const img = g.getImageData(0, 0, w, h)
  for (let p = 0; p < img.data.length; p += 4) {
    const n = (r() - 0.5) * 14
    img.data[p] += n
    img.data[p + 1] += n
    img.data[p + 2] += n
  }
  g.putImageData(img, 0, 0)
  g.font = '600 26px system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.fillText(`SAMPLE PHOTO · ${scene.label.toUpperCase()}`, 36, h - 36)
  return canvas.toDataURL('image/jpeg', 0.72)
}

let cache: PagePhoto[] | null = null

/** Eight placeholder photos: hero, about, then gallery shots. */
export function samplePhotos(): PagePhoto[] {
  cache ??= SCENES.map((s, i) => ({ url: draw(s, i), alt: s.alt }))
  return cache
}
