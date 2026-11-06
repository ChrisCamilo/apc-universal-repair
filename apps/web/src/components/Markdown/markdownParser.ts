// Reads the Markdown the release notes are written in, as the Markdown component shows it: headings, paragraphs and
// lists, bulleted or numbered and nested by their indent, and inside them bold, italic, inline code and links. A line
// of "---" only parts sections, and anything else is kept as plain text, so nothing in the text becomes HTML.

/** A line that only parts sections, such as the one between a release's notes in English and in Portuguese. */
const BREAK = /^\s*-{3,}\s*$/
/** A heading, of any level, and its text. */
const HEADING = /^#{1,6}\s+(.*)$/
/** A list's item: its indent, its marker ("-", "*" or a number) and its text. */
const ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/
/** The runs that open with a mark, longest marks first, so "***" is read before "**" and "*". */
const RUNS: { pattern: RegExp; read: (match: RegExpExecArray) => MarkdownInline }[] = [
  { pattern: /^`([^`]+)`/, read: (match) => ({ kind: 'code', text: match[1] }) },
  { pattern: /^\[([^\]]+)\]\(([^)\s]+)\)/, read: (match) => link(match[1], match[2]) },
  { pattern: /^\*\*\*(\S.*?)\*\*\*/, read: (match) => ({ kind: 'strong', children: [{ kind: 'em', children: parseInline(match[1]) }] }) },
  { pattern: /^\*\*(\S.*?)\*\*/, read: (match) => ({ kind: 'strong', children: parseInline(match[1]) }) },
  { pattern: /^\*(\S.*?)\*/, read: (match) => ({ kind: 'em', children: parseInline(match[1]) }) },
]
/** A link's address the app opens: a web one, never "javascript:" or a file. */
const WEB_ADDRESS = /^https?:\/\//

/** A run of text inside a block: plain, inline code, bold or italic around more runs, or a link around its text. */
export type MarkdownInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'em'; children: MarkdownInline[] }
  | { kind: 'link'; href: string; children: MarkdownInline[] }

/** A list, bulleted or numbered, with its items. */
export type MarkdownList = { kind: 'list'; ordered: boolean; items: MarkdownItem[] }

/** A list's item: its text and the lists nested under it. */
export type MarkdownItem = { text: string; lists: MarkdownList[] }

/** A block of the text: a heading, a paragraph or a list. */
export type MarkdownBlock = { kind: 'heading'; text: string } | { kind: 'paragraph'; text: string } | MarkdownList

/**
 * Builds a link run, or plain text in its place when its address isn't a web one.
 * @param text The link's text, e.g. "guia".
 * @param href Its address, e.g. "https://github.com/…".
 * @returns The link, or its text with the address after it.
 */
function link(text: string, href: string): MarkdownInline {
  return WEB_ADDRESS.test(href)
    ? { kind: 'link', href, children: parseInline(text) }
    : { kind: 'text', text: `[${text}](${href})` }
}

/**
 * Reads the runs of a block's text: inline code, links, bold and italic, and plain text between them. A mark with
 * nothing to close it stays as written.
 * @param text The block's text, e.g. "**Novo:** o *Sobre*".
 * @returns Its runs.
 */
export function parseInline(text: string): MarkdownInline[] {
  const runs: MarkdownInline[] = []
  let plain = ''
  let rest = text
  while (rest) {
    const [match, read] = RUNS.map(({ pattern, read }) => [pattern.exec(rest), read] as const).find(([found]) => found) ?? []
    // A run read as plain text, such as a link that isn't a web one, joins the text around it.
    const run = match && read ? read(match) : { kind: 'text' as const, text: rest[0] }
    if (run.kind === 'text') {
      plain += run.text
    } else {
      if (plain) {
        runs.push({ kind: 'text', text: plain })
        plain = ''
      }
      runs.push(run)
    }
    rest = rest.slice(match ? match[0].length : 1)
  }
  if (plain) {
    runs.push({ kind: 'text', text: plain })
  }
  return runs
}

/**
 * Reads the lines of a list into the list and the ones nested in its items: an item indented past the one before it
 * opens a list under it, and a line with no marker goes on the item before it.
 * @param lines The list's lines, the first one an item.
 * @returns The list.
 */
function parseList(lines: string[]): MarkdownList {
  const first = ITEM.exec(lines[0])!
  const top: MarkdownList = { kind: 'list', ordered: /\d/.test(first[2]), items: [] }
  const open = [{ indent: first[1].length, list: top }]
  for (const line of lines) {
    const item = ITEM.exec(line)
    if (!item) {
      const last = open.at(-1)!.list.items.at(-1)!
      last.text = `${last.text} ${line.trim()}`
      continue
    }
    const indent = item[1].length
    while (open.length > 1 && indent < open.at(-1)!.indent) {
      open.pop()
    }
    const parent = open.at(-1)!.list.items.at(-1)
    if (indent > open.at(-1)!.indent && parent) {
      const nested: MarkdownList = { kind: 'list', ordered: /\d/.test(item[2]), items: [] }
      parent.lists.push(nested)
      open.push({ indent, list: nested })
    }
    open.at(-1)!.list.items.push({ text: item[3], lists: [] })
  }
  return top
}

/**
 * Reads a Markdown text into its blocks: a heading per "#" line, a list per run of item lines (and the indented lines
 * under them), and a paragraph per run of other lines, up to a blank line.
 * @param markdown The text, e.g. a release's notes.
 * @returns Its blocks, in order.
 */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []
  const endParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const endList = () => {
    if (list.length > 0) {
      blocks.push(parseList(list))
      list = []
    }
  }
  for (const line of markdown.split(/\r?\n/)) {
    if (!BREAK.test(line) && (ITEM.test(line) || (list.length > 0 && /^\s+\S/.test(line)))) {
      endParagraph()
      list.push(line)
      continue
    }
    endList()
    const heading = HEADING.exec(line)
    if (heading || BREAK.test(line) || !line.trim()) {
      endParagraph()
      if (heading) {
        blocks.push({ kind: 'heading', text: heading[1] })
      }
    } else {
      paragraph.push(line.trim())
    }
  }
  endParagraph()
  endList()
  return blocks
}
