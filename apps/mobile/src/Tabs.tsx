import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { gripIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { dropTab, initialTab, moveTab, type DropSide } from '@apc/shared/tabs';
import { Icon } from './Icon';
import { useStyles } from './Tabs.styles';
import { save, themeStorage, useTheme } from './theme';

// Top-level navigation of the Dashboard, the same as the web: the selected tab takes the accent with an
// underline, which glows where the style has a glow; pressing shows what hover shows on the web. Pair it
// with useStoredTab to reopen on the last tab used, and render the selected tab's content below it.
// With `reorderable` on (off by default), each tab shows a grip: a long press picks the tab up, and sliding the
// finger over the others shows an accent line on the side where it will land. Screen readers get "move left"
// and "move right" actions instead, and the new position is announced. The new order goes to onReorder; the
// owner keeps it.

const ACTIONS = [
  { name: 'moveLeft', label: 'Mover para a esquerda' },
  { name: 'moveRight', label: 'Mover para a direita' },
];
type TabItem<T extends string> = {
  id: T;
  label: string;
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[];
  /** Badge after the label, e.g. the number of items in stock. */
  count?: number;
};
type TabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. "Seções do Dashboard". */
  label: string;
  tabs: TabItem<T>[];
  selected: T;
  onSelect: (id: T) => void;
  /** Lets the user pick a tab up with a long press and slide it, or move it with a screen reader action. */
  reorderable?: boolean;
  /** Called with the tab ids in their new order; the owner keeps it and passes the tabs back in that order. */
  onReorder?: (ids: T[]) => void;
};

/**
 * Holds the selected tab and remembers it on the device, so the app reopens on the last tab used.
 * Storage is read once, on the first render.
 * @param storageKey AsyncStorage key, e.g. DASHBOARD_TAB_STORAGE_KEY from @apc/shared/tabs.
 * @param ids Tab ids in display order; the first opens when nothing valid was saved.
 * @returns The selected tab id (null until storage is read, so render nothing yet) and the setter that
 * also saves it.
 */
export function useStoredTab<T extends string>(storageKey: string, ids: readonly T[]): [T | null, (id: T) => void] {
  const [tab, setTab] = useState<T | null>(null);

  useEffect(() => {
    themeStorage
      .getItem(storageKey)
      .catch(() => null)
      .then((saved) => setTab((current) => current ?? initialTab(ids, saved)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tabs are read once, with the stored tab
  }, [storageKey]);

  const select = (id: T) => {
    setTab(id);
    save(storageKey, id);
  };
  return [tab, select];
}

export function Tabs<T extends string>({ label, tabs, selected, onSelect, reorderable = false, onReorder }: TabsProps<T>) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  // Where each tab sits in the list, and where the list starts on screen while a tab is being dragged.
  const layouts = useRef(new Map<T, { x: number; width: number }>());
  const origin = useRef(0);
  const [dragging, setDragging] = useState<T | null>(null);
  const [drop, setDrop] = useState<{ id: T; side: DropSide } | null>(null);
  const order = tabs.map((tab) => tab.id);

  /** Hands the new order to the owner and says where the tab went. */
  const reorder = (next: T[] | null, id: T) => {
    if (!next) {
      return;
    }
    onReorder?.(next);
    const tab = tabs.find((t) => t.id === id)!;
    AccessibilityInfo.announceForAccessibility(`Aba ${tab.label} na posição ${next.indexOf(id) + 1} de ${next.length}`);
  };

  /** Picks a tab up after a long press, noting where the list starts on screen. */
  const pickUp = (id: T, event: GestureResponderEvent) => {
    const { pageX, locationX } = event.nativeEvent;
    origin.current = pageX - locationX - (layouts.current.get(id)?.x ?? 0);
    setDragging(id);
  };

  /** Marks the side of the tab under the finger where the dragged tab will land. */
  const slide = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.pageX - origin.current;
    const over = order.find((id) => {
      const box = layouts.current.get(id);
      return box !== undefined && x >= box.x && x < box.x + box.width;
    });
    const box = over && layouts.current.get(over);
    setDrop(over && box && over !== dragging ? { id: over, side: x > box.x + box.width / 2 ? 'after' : 'before' } : null);
  };

  /** Puts the dragged tab down on the marked side, if any. */
  const putDown = () => {
    if (dragging !== null && drop) {
      reorder(dropTab(order, dragging, drop.id, drop.side), dragging);
    }
    setDragging(null);
    setDrop(null);
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={styles.list}
      testID={ids.list}
      // Once a tab is picked up, the list follows the finger, and the tab doesn't take the touch back.
      onMoveShouldSetResponderCapture={() => dragging !== null}
      onResponderMove={slide}
      onResponderRelease={putDown}
      onResponderTerminate={putDown}
      onResponderTerminationRequest={() => false}
    >
      {tabs.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityActions={reorderable ? ACTIONS : undefined}
            onAccessibilityAction={(event) =>
              reorder(moveTab(order, tab.id, event.nativeEvent.actionName === 'moveLeft' ? -1 : 1), tab.id)
            }
            onPress={() => onSelect(tab.id)}
            onLongPress={reorderable ? (event) => pickUp(tab.id, event) : undefined}
            onPressOut={() => {
              // A long press let go without sliding puts the tab back where it was.
              if (dragging === tab.id && !drop) {
                setDragging(null);
              }
            }}
            onLayout={(event) => layouts.current.set(tab.id, event.nativeEvent.layout)}
            style={[styles.tab, dragging === tab.id && styles.tabDragging]}
            testID={ids.tab}
          >
            {({ pressed }) => (
              <>
                {reorderable && <Icon icon={gripIcon} size={ICON_SIZES.inline} color={colors.textMuted} />}
                {tab.icon && <Icon icon={tab.icon} size={ICON_SIZES.label} color={isSelected ? colors.accent : pressed ? colors.text : colors.textMuted} />}
                <Text style={[styles.label, pressed && styles.labelPressed, isSelected && styles.labelSelected]} testID={ids.label}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <Text style={[styles.count, isSelected && styles.countSelected]} testID={ids.count}>
                    {tab.count}
                  </Text>
                )}
                <View style={[styles.underline, isSelected && styles.underlineSelected]} testID={ids.underline} />
                {drop?.id === tab.id && (
                  <View style={[styles.drop, drop.side === 'before' ? styles.dropBefore : styles.dropAfter]} testID={ids.drop} />
                )}
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
