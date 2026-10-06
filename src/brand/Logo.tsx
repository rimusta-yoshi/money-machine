import { BRAND } from './config'

interface Props {
  /** Where the logo goes; without it the logo is just a picture of the name. */
  href?: string
  size?: 'md' | 'lg'
  /** The homepage drops the four blocks in, one after another. */
  animate?: boolean
  /** Just the 2×2 mark, e.g. on a phone's top bar (the name is then read from aria-label). */
  markOnly?: boolean
}

/** The siteblocks logo: a 2×2 block mark (brick, hard hat, pipe blue, night) and the wordmark. */
export function Logo({ href, size = 'md', animate = false, markOnly = false }: Props) {
  const inner = (
    <>
      <span className={`sb-logo-mark${animate ? ' sb-logo-mark--drop' : ''}`} aria-hidden="true">
        <span /><span /><span /><span />
      </span>
      {!markOnly && <span className="sb-logo-word">{BRAND.name}</span>}
    </>
  )
  const className = `sb-logo${size === 'lg' ? ' sb-logo--lg' : ''}`
  if (href) return <a href={href} className={className} aria-label={`${BRAND.name} home`}>{inner}</a>
  return <span className={className} role={markOnly ? 'img' : undefined} aria-label={markOnly ? BRAND.name : undefined}>{inner}</span>
}
