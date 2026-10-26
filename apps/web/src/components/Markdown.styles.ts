import { recipe, tv } from '../styles/tv.ts'

// The look of text written in Markdown, such as a release's notes: body text with room between its blocks, lists with
// their bullets or numbers and the nested ones a little below their item, inline code in mono in the accent, as a
// part's code, and links in the accent, underlined. Headings and paragraphs are the Typography ones.

/** Markdown text: its blocks, its lists and their items, inline code and links. */
export const markdown = recipe(
  'common.markdown',
  tv({
    slots: {
      base: 'grid gap-3 font-body text-sm text-text',
      list: 'm-0 grid gap-1 pl-5 [li>&]:mt-1',
      item: 'pl-1 leading-relaxed',
      code: 'font-mono text-xs text-accent',
      link: 'text-accent underline underline-offset-4 hover:text-text',
    },
    variants: { ordered: { true: { list: 'list-decimal' }, false: { list: 'list-disc' } } },
  }),
  { base: '', list: 'list', item: 'list.item', code: 'code', link: 'link' },
)
