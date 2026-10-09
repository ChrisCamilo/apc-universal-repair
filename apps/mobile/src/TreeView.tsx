import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons';
import { scales } from '@apc/shared/theme';
import { ancestors, canOpen, isLeaf, type TreeNode } from '@apc/shared/tree';
import { Icon } from './Icon';
import { useReducedMotion } from './motion';
import { Divider } from './Panel';
import { useTheme } from './theme';
import { useStyles } from './TreeView.styles';

// Opens and closes a branch's children: their rows fade in or out while the rows below slide.
const OPEN_ANIMATION = LayoutAnimation.create(scales.motion.durationMs, 'easeInEaseOut', 'opacity');

// The model tree of the Catalog tab, the same as the web: model → generation → version → year → engine. A
// press opens or closes a branch, its chevron turning and its children sliding in; an empty branch (data still
// to come) shows no chevron. A press on a leaf selects it and hands it to onSelect, and the selected leaf takes
// the accent with a rule on its left, glowing where the style has a glow; pressing a row shows what hover shows
// on the web. Each level hangs from a hairline guide, and a divider stands between the top-level models. With
// reduced motion, branches open and the chevron turns at once. The tree scrolls inside its own height, set
// through style, and long labels are cut short on one line. A row can also be pointed out, such as the model of a
// part found by its code: it takes the accent like the selected leaf, and screen readers say it is "em destaque".

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
  const { styles, ids } = useStyles();
  return (
    <ScrollView role="tree" accessibilityLabel={label} nestedScrollEnabled style={[styles.tree, style]} testID={ids.tree}>
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
  const { styles, ids } = useStyles();
  const branch = canOpen(node);
  const leaf = isLeaf(node);
  const open = branch && tree.expanded.has(node.id);
  const selected = leaf && node.id === tree.selected;
  // A pointed-out row looks like the selected leaf.
  const accent = selected || node.id === tree.highlighted;
  return (
    <View style={styles.item} testID={ids.item}>
      <Pressable
        role="treeitem"
        accessibilityLabel={node.detail ? `${node.label} ${node.detail}` : node.label}
        accessibilityState={{ expanded: branch ? open : undefined, selected: leaf ? selected : undefined }}
        accessibilityValue={node.id === tree.highlighted ? { text: 'em destaque' } : undefined}
        disabled={!branch && !leaf}
        onPress={() => tree.activate(node)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed, accent && styles.rowActive]}
        testID={ids.row}
      >
        {branch ? <Chevron open={open} /> : <View style={styles.spacer} testID={ids.spacer} />}
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            level === 1 && styles.labelDisplay,
            level > 1 && leaf && (accent ? styles.labelMonoActive : styles.labelMono),
            accent && styles.labelActive,
          ]}
          testID={ids.label}
        >
          {node.label}
        </Text>
        {node.detail && (
          <Text style={styles.detail} testID={ids.detail}>
            {node.detail}
          </Text>
        )}
      </Pressable>
      {open && (
        <View role="group" style={styles.group} testID={ids.group}>
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} level={level + 1} tree={tree} />
          ))}
        </View>
      )}
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
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
    <Animated.View style={[styles.chevron, rotation]} testID={ids.chevron}>
      <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={colors.textMuted} />
    </Animated.View>
  );
}
