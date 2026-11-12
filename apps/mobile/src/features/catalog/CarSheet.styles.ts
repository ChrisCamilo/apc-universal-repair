import { scales } from '@apc/tokens/theme';
import { createStyles } from '../../styles/createStyles';
import { displayLabel } from '../../styles/shared';
import { fontFamily } from '../../app/theme';

// The look of a model's or a version's sheet in the Catalog, the same as the web on a phone: its facts one under
// another, each named small and muted in the display face over its value; a generation's years in the mono face in the
// accent, its versions muted under its name; the engines one per line, as links a finger's height. The parts under it
// have a section heading, as a screen's, over the Inventory's cards, which keep their own look, and "Ver todas as
// peças". The ids are the web's, with the levels of its lists, which a phone draws as lines, left out.

/** The sheet, its facts with their names and values, the generations and engines, and the parts with their heading. */
export const useStyles = createStyles(
  'catalog.car-sheet',
  {
    sheet: '',
    fact: 'facts.fact',
    term: 'facts.fact.term',
    value: 'facts.fact.value',
    generation: 'facts.fact.value.list.generation',
    years: 'facts.fact.value.list.generation.years',
    versions: 'facts.fact.value.list.generation.versions',
    engine: 'facts.fact.value.list.engine',
    parts: 'parts',
    heading: 'parts.heading',
  },
  (theme) => {
    const { colors } = theme;
    return {
      sheet: { gap: scales.space.s3 },
      fact: { gap: scales.space.s1 },
      term: { ...displayLabel(theme, 'xs'), color: colors.textMuted },
      value: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.sm, color: colors.text },
      generation: { gap: scales.space.s1 / 2, paddingVertical: scales.space.s1 / 2 },
      years: { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: colors.accent },
      versions: { fontFamily: fontFamily(scales.bodyFont), fontSize: scales.fontSize.xs, color: colors.textMuted },
      engine: { minHeight: scales.touch.icon, alignItems: 'flex-start', justifyContent: 'center' },
      parts: { gap: scales.space.s3 },
      heading: { ...displayLabel(theme, 'sm'), color: colors.textMuted },
    };
  },
);
