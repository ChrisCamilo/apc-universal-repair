import { recipe, tv } from '../../styles/tv.ts'

// The look of "Tutoriais", inside its Dialog: a muted line saying what each kind of tutorial is, then each tutorial a
// button the width of its section, its title over its one-line description and, last, its kind and its steps in the
// mono face; pointing at one raises it, the same as a menu item, and on a phone (below `card:`) each is a finger tall.

/** The tutorials dialog: its heading on a phone, the intro, a section's list, and a tutorial with its texts. */
export const tutorialsDialog = recipe(
  'dashboard.tutorials-dialog',
  tv({
    slots: {
      base: '',
      intro: 'mb-3',
      list: 'grid gap-1',
      tutorial: [
        'grid w-full min-h-11 cursor-pointer gap-0.5 rounded-tile px-2 py-2 text-left outline-none',
        'transition-[background-color,box-shadow] hover:bg-panel-raised focus-visible:shadow-ring max-card:min-h-12',
      ],
      title: 'font-body text-sm font-medium text-text',
      description: 'font-body text-xs text-text-muted',
      meta: 'font-mono text-xs text-text-muted',
    },
  }),
  { base: '', intro: 'intro', list: 'list', tutorial: 'list.tutorial', title: 'list.tutorial.title', description: 'list.tutorial.description', meta: 'list.tutorial.meta' },
)
