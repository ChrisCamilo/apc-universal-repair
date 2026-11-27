import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'

// The look of the accordion: each section a header in the display face with a muted note after its title, a soft
// hairline between sections, the same as Divider, the chevron turning a quarter as the section opens, and its content
// sliding open under it the way a tree's branch does: it shows at once when it opens, so the keyboard can move into it
// straight away, and hides only once it has closed. On a phone (below `card:`) a header is 48px tall, a finger's reach.

/** An accordion: the list, a section, its heading and header with chevron, title and note, and its sliding content. */
export const accordion = recipe(
  'common.accordion',
  tv({
    slots: {
      base: 'grid',
      section: '',
      heading: 'm-0',
      header: [
        `flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-tile px-2 py-2 text-left text-sm text-text ${DISPLAY_LABEL}`,
        'outline-none transition-[background-color,box-shadow] hover:bg-panel-raised focus-visible:shadow-ring max-card:min-h-12',
      ],
      chevron: 'shrink-0 text-text-muted transition-transform motion-reduce:transition-none',
      title: 'min-w-0 flex-1 truncate',
      detail: 'shrink-0 font-body text-xs font-normal tracking-normal normal-case text-text-muted',
      panel: 'grid motion-reduce:transition-none',
      // The box that cuts the content off while it opens; the content's padding leaves room for a focus ring inside.
      clip: 'min-h-0 overflow-hidden',
      content: 'px-2 pt-1 pb-3',
    },
    variants: {
      separated: { true: { section: 'border-t border-hairline-soft' } },
      open: {
        true: { chevron: 'rotate-90', panel: 'visible grid-rows-[1fr] transition-[grid-template-rows]' },
        false: { panel: 'invisible grid-rows-[0fr] transition-[grid-template-rows,visibility]' },
      },
    },
    defaultVariants: { separated: false, open: false },
  }),
  {
    base: '',
    section: 'section',
    heading: 'section.heading',
    header: 'section.header',
    chevron: 'section.header.chevron',
    title: 'section.header.title',
    detail: 'section.header.detail',
    panel: 'section.open',
    clip: 'section.clip',
    content: 'section.content',
  },
)
