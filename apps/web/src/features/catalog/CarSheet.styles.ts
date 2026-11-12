import { DISPLAY_LABEL } from '../../styles/shared.ts'
import { recipe, tv } from '../../styles/tv.ts'
import { SECTION_HEADING } from './CatalogTab.styles.ts'

// The look of a model's or a version's sheet in the Catalog: its facts one under another, each named small and muted in
// the display face over its value; a generation's years in the mono face in the accent, its versions muted under its
// name; the engines one per line, as links a finger's height on a phone. The engines' links only take its class, and
// keep the Button's id. The parts under it have a section heading, as a phone screen's, over the Inventory's
// rows, which keep their own look, and "Ver todas as peças".

/** The sheet, its facts with their names and values, the generations and engines, and the parts with their heading. */
export const carSheet = recipe(
  'catalog.car-sheet',
  tv({
    slots: {
      base: 'grid gap-3',
      facts: 'm-0 grid gap-3',
      fact: 'grid gap-1',
      term: `text-xs text-text-muted ${DISPLAY_LABEL}`,
      value: 'm-0 font-body text-sm text-text',
      list: 'm-0 grid list-none gap-1.5 p-0',
      generation: 'grid gap-0.5',
      years: 'font-mono text-xs text-accent',
      versions: 'text-xs text-text-muted',
      engine: 'text-left max-card:min-h-11',
      parts: 'grid content-start gap-3',
      heading: SECTION_HEADING,
    },
  }),
  {
    base: '',
    facts: 'facts',
    fact: 'facts.fact',
    term: 'facts.fact.term',
    value: 'facts.fact.value',
    list: 'facts.fact.value.list',
    generation: 'facts.fact.value.list.generation',
    years: 'facts.fact.value.list.generation.years',
    versions: 'facts.fact.value.list.generation.versions',
    engine: 'facts.fact.value.list.engine',
    parts: 'parts',
    heading: 'parts.heading',
  },
)
