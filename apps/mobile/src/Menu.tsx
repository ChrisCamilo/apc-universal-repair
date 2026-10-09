import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { chevronIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import {
  MENU_INSET,
  MENU_MAX_WIDTH,
  MENU_OFFSET,
  NAME_MIN_WIDTH,
  useBadgeStyles,
  useHeaderStyles,
  useItemStyles,
  useLabelStyles,
  useStyles,
} from './Menu.styles';
import { MenuContext, useMenu } from './menuContext';
import { useTheme } from './theme';

// A dropdown menu, the same as the web (see Menu.styles.ts), such as the Dashboard's user menu: a trigger and a
// popover anchored under it. Checkbox and radio items (Switch, Segmented) keep the menu open when chosen, and only
// plain action items (MenuItem) close it. A tap outside, the back button or the trigger closes the menu. UserBadge is
// the user menu's trigger content, as on the web: the initials on the accent, then the username, which phones leave
// out.

type Anchor = { top: number; right: number };
type MenuItemProps = {
  /** Runs the action; the menu closes afterwards. */
  onSelect: () => void;
  /** Short explanation under the label. */
  description?: string;
  /** Icon at the end of the item. */
  icon?: IconShape[];
  children: string;
};
type MenuProps = {
  /** Accessible name of the trigger and the menu, e.g. "Menu do usuário". */
  label: string;
  /** Content of the trigger, e.g. the avatar and the user name. */
  trigger: ReactNode;
  children: ReactNode;
};

export function Menu({ label, trigger, children }: MenuProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: scales.space.s8, right: scales.space.s4 });
  const button = useRef<ComponentRef<typeof View>>(null);

  /** Opens the menu under the trigger, measured on the screen. */
  const show = () => {
    button.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + MENU_OFFSET, right: width - x - w }));
    setOpen(true);
  };

  return (
    <>
      <Pressable
        ref={button}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => (open ? setOpen(false) : show())}
        style={[styles.trigger, open && styles.triggerOpen]}
        testID={ids.trigger}
      >
        {trigger}
        <View style={[styles.chevron, open && styles.chevronOpen]} testID={ids.chevron}>
          <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={colors.textMuted} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={() => setOpen(false)}
          style={styles.backdrop}
          testID={ids.backdrop}
        />
        <View
          accessibilityRole="menu"
          accessibilityLabel={label}
          style={[styles.popover, { top: anchor.top, right: anchor.right, width: Math.min(MENU_MAX_WIDTH, width - MENU_INSET) }]}
          testID={ids.popover}
        >
          <MenuContext.Provider value={{ close: () => setOpen(false) }}>{children}</MenuContext.Provider>
        </View>
      </Modal>
    </>
  );
}

export function MenuHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { styles, ids } = useHeaderStyles();
  return (
    <View style={styles.header} testID={ids.header}>
      <Text style={styles.title} testID={ids.title}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.menuItemDescription} testID={ids.menuItemDescription}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function MenuItem({ onSelect, description, icon, children }: MenuItemProps) {
  const { colors } = useTheme();
  const { styles, ids } = useItemStyles();
  const menu = useMenu();
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={children}
      accessibilityHint={description}
      onPress={() => {
        onSelect();
        menu?.close();
      }}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      testID={ids.menuItem}
    >
      <View style={styles.text} testID={ids.text}>
        <Text style={styles.menuItemLabel} testID={ids.menuItemLabel}>
          {children}
        </Text>
        {description && (
          <Text style={styles.menuItemDescription} testID={ids.menuItemDescription}>
            {description}
          </Text>
        )}
      </View>
      {icon && <Icon icon={icon} size={ICON_SIZES.prominent} color={colors.accent} />}
    </Pressable>
  );
}

export function MenuLabel({ children }: { children: string }) {
  const { styles, ids } = useLabelStyles();
  return (
    <Text accessibilityRole="header" style={styles.label} testID={ids.label}>
      {children}
    </Text>
  );
}

export function UserBadge({ initials, name }: { initials: string; name: string }) {
  const { styles, ids } = useBadgeStyles();
  const { width } = useWindowDimensions();
  return (
    <>
      <View style={styles.avatar} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden testID={ids.avatar}>
        <Text style={styles.initials} testID={ids.initials}>
          {initials}
        </Text>
      </View>
      {width >= NAME_MIN_WIDTH && (
        <Text style={styles.name} testID={ids.name}>
          {name}
        </Text>
      )}
    </>
  );
}
