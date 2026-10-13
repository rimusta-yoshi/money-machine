/**
 * Just enough Markdown for our own plain pages (content/*.md): headings, paragraphs, lists,
 * tables, notes, bold, italic, links and pictures. Everything is escaped; links may only go
 * to our own pages (/…, #…), https, mailto or tel. Tables come out ready to stack on phones:
 * each cell carries its column's name (data-label) and explicit roles, so screen readers
 * still read a table when CSS turns the rows into cards.
 */

const esc = (s: string): string => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

const SAFE_URL = /^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/

function safeHref(url: string): string {
  const u = url.trim()
  if (!SAFE_URL.test(u)) throw new Error(`Link not allowed in page text: ${url}`)
  return u
}

/** "What we collect and why" -> "what-we-collect-and-why" (heading anchors). */
export const slugify = (s: string): string =>
  s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&#\d+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const external = (href: string) => /^https:\/\//.test(href)

/** Inline marks: pictures, links, bold, italic and code, in that order. */
export function inline(text: string): string {
  const parts: string[] = []
  const re = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g
  let last = 0
  for (const m of text.matchAll(re)) {
    parts.push(esc(text.slice(last, m.index)))
    last = m.index + m[0].length
    if (m[2] !== undefined) parts.push(`<img src="${esc(safeHref(m[2]))}" alt="${esc(m[1])}" loading="lazy">`)
    else if (m[4] !== undefined) {
      const href = safeHref(m[4])
      const away = external(href) ? ' rel="noopener"' : ''
      parts.push(`<a href="${esc(href)}"${away}>${inline(m[3])}</a>`)
    } else if (m[5] !== undefined) parts.push(`<strong>${inline(m[5])}</strong>`)
    else if (m[6] !== undefined) parts.push(`<em>${inline(m[6])}</em>`)
    else parts.push(`<code>${esc(m[7])}</code>`)
  }
  parts.push(esc(text.slice(last)))
  return parts.join('')
}

const cells = (row: string): string[] => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

function table(rows: string[]): string {
  const [head, , ...body] = rows
  const names = cells(head)
  const th = names.map(n => `<th role="columnheader" scope="col">${inline(n)}</th>`).join('')
  const trs = body.map(r => `<tr role="row">${cells(r).map((c, i) => `<td role="cell" data-label="${esc(names[i] ?? '')}">${inline(c)}</td>`).join('')}</tr>`).join('')
  return `<div class="pg-table"><table role="table"><thead role="rowgroup"><tr role="row">${th}</tr></thead><tbody role="rowgroup">${trs}</tbody></table></div>`
}

type Block = { kind: 'p' | 'ul' | 'ol' | 'table' | 'note'; lines: string[] }

const LIST = { ul: /^[-*] +/, ol: /^\d+\. +/ }
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/

function kindOf(line: string, next: string | undefined): Block['kind'] {
  if (LIST.ul.test(line)) return 'ul'
  if (LIST.ol.test(line)) return 'ol'
  if (line.startsWith('|') && next !== undefined && TABLE_RULE.test(next.trim())) return 'table'
  if (line.startsWith('>')) return 'note'
  return 'p'
}

function renderBlock(b: Block): string {
  switch (b.kind) {
    case 'ul':
    case 'ol':
      return `<${b.kind}>${b.lines.map(l => `<li>${inline(l.replace(LIST[b.kind as 'ul' | 'ol'], ''))}</li>`).join('')}</${b.kind}>`
    case 'table':
      return table(b.lines)
    case 'note':
      return `<aside class="pg-note">${render(b.lines.map(l => l.replace(/^> ?/, '')).join('\n'))}</aside>`
    default:
      return `<p>${inline(b.lines.join(' '))}</p>`
  }
}

/** Markdown to HTML. A '---' line is dropped (sections are already split by headings). */
export function render(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let block: Block | null = null
  const flush = () => { if (block) out.push(renderBlock(block)); block = null }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    const heading = /^(#{1,3}) +(.+)$/.exec(line)
    if (!line.trim() || /^-{3,}$/.test(line.trim())) { flush(); continue }
    if (heading) {
      flush()
      const level = heading[1].length
      const text = inline(heading[2])
      out.push(level === 1 ? `<h1>${text}</h1>` : `<h${level} id="${slugify(text)}">${text}</h${level}>`)
      continue
    }
    const kind = kindOf(line, lines[i + 1])
    const current = block as Block | null
    // A table runs until a line that isn't a row; lists until a line that isn't an item.
    const continues = current && (current.kind === kind || (current.kind === 'table' && line.startsWith('|')) || (current.kind === 'note' && line.startsWith('>')) || (current.kind === 'p' && kind === 'p'))
    if (!continues) { flush(); block = { kind, lines: [] } }
    block!.lines.push(line)
  }
  flush()
  return out.join('\n')
}
