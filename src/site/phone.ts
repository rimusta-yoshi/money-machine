/** A tel: link for a phone number as typed, or null if it has no digits. */
export function telHref(phone: string): string | null {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`
}
