import { parseInline, parseMarkdown, type MarkdownBlock, type MarkdownInline, type MarkdownList } from './markdownParser.ts'
import { markdown } from './Markdown.styles.ts'
import { Heading, Text } from './Typography.tsx'

// Shows text written in Markdown, such as a release's notes, as the app's own elements (see markdownParser.ts for
// what it reads): its headings one level under a dialog's title, its paragraphs as small body text, and its links
// opening in a new window, which the desktop app sends to the computer's browser. Nothing in the text becomes HTML.

type MarkdownProps = {
  /** The text, e.g. a release's notes. */
  children: string
}

export function Markdown({ children }: MarkdownProps) {
  const { classes, ids } = markdown()
  return (
    <div className={classes.base()} data-testid={ids.base}>
      {parseMarkdown(children).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  )
}

/** One block: a heading, a paragraph or a list. */
function Block({ block }: { block: MarkdownBlock }) {
  if (block.kind === 'heading') {
    return (
      <Heading level={4}>
        <Runs text={block.text} />
      </Heading>
    )
  }
  if (block.kind === 'paragraph') {
    return (
      <Text size="sm">
        <Runs text={block.text} />
      </Text>
    )
  }
  return <List list={block} />
}

/** A list, bulleted or numbered, with the lists nested in its items. */
function List({ list }: { list: MarkdownList }) {
  const { classes, ids } = markdown({ ordered: list.ordered })
  const Tag = list.ordered ? 'ol' : 'ul'
  return (
    <Tag className={classes.list()} data-testid={ids.list}>
      {list.items.map((item, index) => (
        <li key={index} className={classes.item()} data-testid={ids.item}>
          <Runs text={item.text} />
          {item.lists.map((nested, at) => (
            <List key={at} list={nested} />
          ))}
        </li>
      ))}
    </Tag>
  )
}

/** The runs of a block's text. */
function Runs({ text }: { text: string }) {
  return parseInline(text).map((run, index) => <Run key={index} run={run} />)
}

/** One run, and the runs inside it. */
function Run({ run }: { run: MarkdownInline }) {
  const { classes, ids } = markdown()
  if (run.kind === 'text') {
    return run.text
  }
  if (run.kind === 'code') {
    return (
      <code className={classes.code()} data-testid={ids.code}>
        {run.text}
      </code>
    )
  }
  const children = run.children.map((child, index) => <Run key={index} run={child} />)
  if (run.kind === 'link') {
    return (
      <a className={classes.link()} data-testid={ids.link} href={run.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return run.kind === 'strong' ? <strong>{children}</strong> : <em>{children}</em>
}
