import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Photo } from '../../site/schema'
import type { Shown } from '../../site/resolve'
import { telHref } from '../../site/phone'

/** Visible marker on placeholder content. Only ever rendered in the builder. */
export function ExampleTag() {
  return <span className="ff-example">Example</span>
}

interface SectionShellProps {
  className: string
  title: ReactNode
  eyebrow?: string
  sub?: ReactNode
  /** Keep the heading for screen readers but hide it visually. */
  hiddenTitle?: boolean
  headingClassName?: string
  example?: boolean
  id?: string
  children: ReactNode
}

/** A section landmark named by its own h2, so screen-reader users can jump between sections. */
export function SectionShell({ className, title, eyebrow, sub, hiddenTitle, headingClassName, example, id, children }: SectionShellProps) {
  const headingId = useId()
  return (
    <section id={id} className={className} aria-labelledby={headingId}>
      <div className={hiddenTitle ? 'ff-sr-only' : 'ff-section-head'}>
        {eyebrow && <span className="ff-eyebrow">{eyebrow}</span>}
        <h2 id={headingId} className={headingClassName}>{title}</h2>
        {example && <ExampleTag />}
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </section>
  )
}

/** Star rating that screen readers announce as "Rated 4.8 out of 5". */
export function Stars({ score }: { score: number }) {
  const full = Math.round(score)
  return (
    <span className="ff-stars" role="img" aria-label={`Rated ${score} out of 5`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

interface PhoneLinkProps {
  phone: string
  className?: string
  children: ReactNode
}

export function PhoneLink({ phone, className, children }: PhoneLinkProps) {
  const href = telHref(phone)
  if (!href) return null
  return <a className={className} href={href}>{children}</a>
}

interface PhotoSlotProps {
  photo: Shown<Photo | null>
  className: string
  placeholder: string
}

/** A customer photo, a labelled placeholder in the builder, or nothing on a live site. */
export function PhotoSlot({ photo, className, placeholder }: PhotoSlotProps) {
  if (!photo) return null
  return (
    <div className={className}>
      {photo.value
        ? <img className="ff-photo-img" src={photo.value.url} alt={photo.value.alt} loading="lazy" />
        : <span className="cap" aria-hidden="true">PHOTO · {placeholder}</span>}
      {photo.example && <ExampleTag />}
    </div>
  )
}
