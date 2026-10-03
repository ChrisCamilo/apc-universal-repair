import type { ReactNode } from 'react';
import { Pressable, Text as NativeText, View, type TextStyle, type ViewStyle } from 'react-native';
import { chevronIcon } from '@apc/shared/icons';
import { pageCount, pageForSize, pageRange, pageSlots } from '@apc/shared/pagination';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { softHairline } from './Panel';
import { Segmented } from './Segmented';
import { fontFamily, useTheme, type ActiveTheme } from './theme';
import { Label, NumericReadout } from './Typography';

// Page navigation for long lists, the same as the web: the page size selector, the range shown ("1–25 de
// 64", announced as it changes) and the page buttons, with the first page, the last page and the neighbors
// of the current one, and an ellipsis for skipped ranges, in at most seven slots. The current page fills with
// the accent. Previous and next are disabled at the ends. Changing the page size keeps the first item in
// view. The parts wrap onto more lines on a phone. An empty list shows no pagination.

const DISABLED_OPACITY = 0.5;
const ELLIPSIS_STYLE: ViewStyle = { justifyContent: 'center', paddingHorizontal: scales.space.s1 / 2 };
// The chevron points right; turned around, it points to the previous page.
const FLIP_STYLE: ViewStyle = { transform: [{ rotate: '180deg' }] };
const NAV_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s1 };
const ROW_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 };

type PaginationProps = {
  /** Accessible name of the page buttons, e.g. "Páginas do estoque". */
  label: string;
  /** Current page, from 1. */
  page: number;
  pageSize: number;
  /** Number of items in the whole list. */
  total: number;
  /** Sizes the selector offers, e.g. PAGE_SIZES. */
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  /** Called with the new size; onPageChange then moves to the page holding the first item that was showing. */
  onPageSizeChange: (pageSize: number) => void;
};
type PageButtonProps = {
  /** Page the button goes to. */
  target: number;
  /** Accessible name, e.g. "Página 3" or "Próxima página". */
  label: string;
  current?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  children: (color: string) => ReactNode;
};

/**
 * Styles the row the parts sit in: a soft hairline above, the parts wrapping onto more lines.
 * @param theme Active theme.
 * @returns Style for the outer View.
 */
function barStyle(theme: ActiveTheme): ViewStyle {
  return {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: scales.space.s4,
    rowGap: scales.space.s2,
    paddingTop: scales.space.s3,
    borderTopWidth: scales.hairline,
    borderTopColor: softHairline(theme),
  };
}

/**
 * Styles a page button: a tile framed in the soft hairline, filled with the accent and glowing on the current
 * page, framed in the accent while pressed, dimmed when disabled.
 * @param theme Active theme.
 * @param current Whether it is the current page.
 * @param pressed Whether it is being pressed.
 * @param disabled Whether it is disabled.
 * @returns Style for the button Pressable.
 */
function buttonStyle(theme: ActiveTheme, current: boolean, pressed: boolean, disabled: boolean): ViewStyle {
  const { colors } = theme;
  const glow: ViewStyle =
    current && theme.glow
      ? {
          shadowColor: colors.accent,
          shadowOpacity: theme.glow.opacity,
          shadowRadius: theme.glow.blur / 2,
          shadowOffset: { width: 0, height: 0 },
        }
      : {};
  return {
    minWidth: scales.space.s6,
    height: scales.space.s6,
    paddingHorizontal: scales.space.s2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scales.hairline,
    borderColor: current ? 'transparent' : pressed ? colors.accent : softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: current ? colors.accent : 'transparent',
    opacity: disabled ? DISABLED_OPACITY : 1,
    ...glow,
  };
}

/**
 * Styles the number on a page button, or the ellipsis: mono face with tabular figures.
 * @param color Text color.
 * @returns Style for the Text.
 */
function numberStyle(color: string): TextStyle {
  return {
    fontFamily: fontFamily(scales.monoFont),
    fontSize: scales.fontSize.xs,
    fontVariant: ['tabular-nums'],
    color,
  };
}

export function Pagination({ label, page, pageSize, total, pageSizes, onPageChange, onPageSizeChange }: PaginationProps) {
  const theme = useTheme();
  if (total === 0) {
    return null;
  }
  const pages = pageCount(total, pageSize);

  return (
    <View style={barStyle(theme)}>
      <View style={ROW_STYLE}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Label>Itens por página</Label>
        </View>
        {/* The group aligns itself to the top of its parent; wrapped, the row centers it on the label. */}
        <View>
          <Segmented
            label="Itens por página"
            options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(pageForSize(page, pageSize, Number(value)));
            }}
          />
        </View>
      </View>
      <View accessibilityLiveRegion="polite">
        <NumericReadout tone="muted">{pageRange(page, pageSize, total)}</NumericReadout>
      </View>
      <View accessibilityLabel={label} style={NAV_STYLE}>
        <PageButton target={page - 1} disabled={page === 1} label="Página anterior" onPageChange={onPageChange}>
          {(color) => (
            <View style={FLIP_STYLE}>
              <Icon icon={chevronIcon} size={12} color={color} />
            </View>
          )}
        </PageButton>
        {pageSlots(page, pages).map((slot, index) =>
          slot === null ? (
            <View
              key={index < 2 ? 'gap-start' : 'gap-end'}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={ELLIPSIS_STYLE}
            >
              <NativeText style={numberStyle(theme.colors.textMuted)}>…</NativeText>
            </View>
          ) : (
            <PageButton key={slot} target={slot} current={slot === page} label={`Página ${slot}`} onPageChange={onPageChange}>
              {(color) => <NativeText style={numberStyle(color)}>{slot}</NativeText>}
            </PageButton>
          ),
        )}
        <PageButton target={page + 1} disabled={page === pages} label="Próxima página" onPageChange={onPageChange}>
          {(color) => <Icon icon={chevronIcon} size={12} color={color} />}
        </PageButton>
      </View>
    </View>
  );
}

function PageButton({ target, label, current = false, disabled = false, onPageChange, children }: PageButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: current, disabled }}
      disabled={disabled || current}
      hitSlop={scales.space.s1}
      onPress={() => onPageChange(target)}
      style={({ pressed }) => buttonStyle(theme, current, pressed, disabled)}
    >
      {({ pressed }) => children(current ? colors.onAccent : pressed ? colors.accent : colors.text)}
    </Pressable>
  );
}
