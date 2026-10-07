import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, ScrollView, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { chevronIcon } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { ancestors, canOpen, isLeaf, type TreeNode } from '@apc/shared/tree';
import { Icon } from './Icon';
import { useReducedMotion } from './motion';
import { Divider, softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';

// The model tree of the Catalog tab, the same as the web: model → generation → version → year → engine. A
// press opens or closes a branch, its chevron turning and its children sliding in; an empty branch (data still
// to come) shows no chevron. A press on a leaf selects it and hands it to onSelect, and the selected leaf takes
// the accent with a rule on its left, glowing where the style has a glow; pressing a row shows what hover shows
// on the web. Each level hangs from a hairline guide, and a divider stands between the top-level models. With
// reduced motion, branches open and the chevron turns at once. The tree scrolls inside its own height, set
// through style, and long labels are cut short on one line. A row can also be pointed out, such as the model of a
// part found by its code: it takes the accent like the selected leaf, and screen readers say it is "em destaque".

const CHEVRON_SIZE = 12;
const LABEL_STYLE: TextStyle = { flexShrink: 1 };
// Opens and closes a branch's children: their rows fade in or out while the rows below slide.
const OPEN_ANIMATION = LayoutAnimation.create(scales.motion.durationMs, 'easeInEaseOut', 'opacity');
const SPACER_STYLE: ViewStyle = { width: CHEVRON_SIZE };

type TreeItemProps = { node: TreeNode; level: number; tree: TreeState };
// What every item needs from the tree around it.
type TreeState = { expanded: ReadonlySet<string>; selected?: string; highlighted?: string; activate: (node: TreeNode) => void };
type TreeViewProps = {
  /** Accessible name of the tree, e.g. "Modelos Chevrolet". */
  label: string;
  nodes: TreeNode[];
  /** Id of the selected leaf. */
  selected?: string;
  /** Called with the leaf chosen with a press; the owner keeps it, e.g. for the detail panel. */
  onSelect: (id: string) => void;
  /** Id of a row to point out in the accent, e.g. the model of a part found by its code. */
  highlighted?: string;
  /** Branches open at first; defaults to the ones above the selected leaf. */
  defaultExpanded?: string[];
  /** Height of the tree, which scrolls inside it, e.g. { maxHeight: 380 }. */
  style?: ViewStyle;
};

/**
 * Styles the muted text after a label, e.g. the years of a generation: small mono digits.
 * @param theme Active theme.
 * @returns Style for the detail Text.
 */
function detailStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: theme.colors.textMuted };
}

/**
 * Styles a branch's children: a soft hairline guide hanging under the chevron's center (the row's padding and
 * left rule plus half the chevron), with the children a little to its right.
 * @param theme Active theme.
 * @returns Style for the group View.
 */
function groupStyle(theme: ActiveTheme): ViewStyle {
  return {
    marginLeft: scales.space.s2 + scales.hairline * 2 + CHEVRON_SIZE / 2,
    paddingLeft: scales.space.s2,
    borderLeftWidth: scales.hairline,
    borderLeftColor: softHairline(theme),
  };
}

/**
 * Styles a row's label by its level: the display face in uppercase for the top-level models, the mono face for
 * the leaves (the engines, read like a spec) and the body face in between; the accent when selected.
 * @param theme Active theme.
 * @param node The row's node.
 * @param level Its depth; 1 for the top level.
 * @param selected Whether it is the selected leaf, or a pointed-out row.
 * @returns Style for the label Text.
 */
function labelStyle(theme: ActiveTheme, node: TreeNode, level: number, selected: boolean): TextStyle {
  const fontSize = scales.fontSize.sm;
  const color = selected ? theme.colors.accent : theme.colors.text;
  if (level === 1) {
    return {
      ...LABEL_STYLE,
      fontFamily: fontFamily(theme.displayFont, 600),
      fontSize,
      letterSpacing: theme.displayTracking * fontSize,
      textTransform: 'uppercase',
      color,
    };
  }
  const face = isLeaf(node) ? fontFamily(scales.monoFont, selected ? 500 : 400) : fontFamily(scales.bodyFont);
  return { ...LABEL_STYLE, fontFamily: face, fontSize, color };
}

/**
 * Styles a row: clear at rest, the raised fill while pressed; selected, the tinted fill with the accent rule
 * on its left and the glow.
 * @param theme Active theme.
 * @param selected Whether it is the selected leaf, or a pointed-out row.
 * @param pressed Whether the row is being pressed.
 * @returns Style for the row Pressable.
 */
function rowStyle(theme: ActiveTheme, selected: boolean, pressed: boolean): ViewStyle {
  const { colors } = theme;
  const glow: ViewStyle =
    selected && theme.glow
      ? {
          shadowColor: colors.accent,
          shadowOpacity: theme.glow.opacity,
          shadowRadius: theme.glow.blur / 2,
          shadowOffset: { width: 0, height: 0 },
        }
      : {};
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scales.space.s2,
    paddingHorizontal: scales.space.s2,
    paddingVertical: scales.space.s2,
    borderLeftWidth: scales.hairline * 2,
    borderLeftColor: selected ? colors.accent : 'transparent',
    borderRadius: theme.radiusTile,
    backgroundColor: selected ? withAlpha(colors.accent, scales.accentSoft) : pressed ? colors.panelRaised : 'transparent',
    ...glow,
  };
}

export function TreeView({ label, nodes, selected, onSelect, highlighted, defaultExpanded, style }: TreeViewProps) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded ?? (selected ? ancestors(nodes, selected) : [])),
  );

  /** Selects a leaf, or opens or closes a branch, sliding its children in or out unless motion is reduced. */
  const activate = (node: TreeNode) => {
    if (isLeaf(node)) {
      onSelect(node.id);
      return;
    }
    if (!canOpen(node)) {
      return;
    }
    if (!reduced) {
      LayoutAnimation.configureNext(OPEN_ANIMATION);
    }
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(node.id)) {
        next.add(node.id);
      }
      return next;
    });
  };

  const tree: TreeState = { expanded, selected, highlighted, activate };
  return (
    <ScrollView role="tree" accessibilityLabel={label} nestedScrollEnabled style={style}>
      {nodes.map((node, index) => (
        <View key={node.id}>
          {index > 0 && <Divider />}
          <TreeItem node={node} level={1} tree={tree} />
        </View>
      ))}
    </ScrollView>
  );
}

function TreeItem({ node, level, tree }: TreeItemProps) {
  const theme = useTheme();
  const branch = canOpen(node);
  const leaf = isLeaf(node);
  const open = branch && tree.expanded.has(node.id);
  const selected = leaf && node.id === tree.selected;
  // A pointed-out row looks like the selected leaf.
  const accent = selected || node.id === tree.highlighted;
  return (
    <View>
      <Pressable
        role="treeitem"
        accessibilityLabel={node.detail ? `${node.label} ${node.detail}` : node.label}
        accessibilityState={{ expanded: branch ? open : undefined, selected: leaf ? selected : undefined }}
        accessibilityValue={node.id === tree.highlighted ? { text: 'em destaque' } : undefined}
        disabled={!branch && !leaf}
        onPress={() => tree.activate(node)}
        style={({ pressed }) => rowStyle(theme, accent, pressed)}
      >
        {branch ? <Chevron open={open} /> : <View style={SPACER_STYLE} />}
        <Text numberOfLines={1} style={labelStyle(theme, node, level, accent)}>
          {node.label}
        </Text>
        {node.detail && (
          <Text style={detailStyle(theme)}>{node.detail}</Text>
        )}
      </Pressable>
      {open && (
        <View role="group" style={groupStyle(theme)}>
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} level={level + 1} tree={tree} />
          ))}
        </View>
      )}
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current;
  // Whether the chevron last pointed open, so it only turns when the branch opens or closes.
  const shown = useRef(open);

  // Turn toward the new state, or jump there with reduced motion (or when only the motion setting changed).
  useEffect(() => {
    const changed = shown.current !== open;
    shown.current = open;
    if (reduced || !changed) {
      turn.setValue(open ? 1 : 0);
      return;
    }
    const animation = Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: scales.motion.durationMs,
      easing: Easing.bezier(...scales.motion.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [open, reduced, turn]);

  const rotation = { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] };
  return (
    <Animated.View testID="tree-chevron" style={rotation}>
      <Icon icon={chevronIcon} size={CHEVRON_SIZE} color={theme.colors.textMuted} />
    </Animated.View>
  );
}
