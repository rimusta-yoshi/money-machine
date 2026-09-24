/** Splits a tagline so the last part can be highlighted, e.g. "Local plumbers you can | actually rely on." */
export function splitTagline(tagline: string, ratio: number): [string, string] {
  const words = tagline.split(' ')
  const pivot = Math.floor(words.length * ratio)
  const before = words.slice(0, pivot).join(' ')
  return [before ? `${before} ` : '', words.slice(pivot).join(' ')]
}
