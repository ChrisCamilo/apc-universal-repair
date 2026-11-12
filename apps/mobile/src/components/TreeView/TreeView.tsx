import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { chevronIcon, ICON_SIZES } from '@apc/tokens/icons';
import { scales } from '@apc/tokens/theme';
import { ancestors, canOpen, isLeaf, type TreeNode } from '@apc/ui-spec/tree';
import { Icon } from '../Icon/Icon';
import { useReducedMotion } from '../../app/motion';
import { Divider } from '../Panel/Panel';
import { useTheme } from '../../app/theme';
import { useStyles } from './TreeView.styles';

// Opens and closes a branch's children: their rows fade in or out while the rows below slide.
const OPEN_ANIMATION = LayoutAnimation.create(scales.motion.durationMs, 'easeInEaseOut', 'opacity');

// The model tree of the Catalog tab, the same as the web: model → generation → version → year → engine. A
// press opens or closes a branch, its chevron turning and its children sliding in; an empty branch (data still
// to come) shows no chevron. A press on a leaf selects it and hands it to onSelect, and the selected leaf takes
// the accent with a rule on its left, glowing where the style has a glow; pressing a row shows what hover shows
// on the web. A divider stands between the top-level models. With
// reduced motion, branches open and the chevron turns at once. The tree scrolls inside its own height, set
// through style, and long labels are cut short on one line. A row can also be pointed out, such as the model of a
// part found by its code: it takes the accent like the selected leaf, and screen readers say it is "em destaque".
// As on the web's phone layout, the rows are 48px tall, a finger's height, and each level is indented 16px with no
// guide; a tag at the right of each leaf, such as "Ver ficha", can say what pressing it does, filled in the accent on
// the selected one.
// The owner can edit the tree from it, as on the web: a row can end with its own buttons (rowActions), always in view,
// since a phone has no pointer to hover with; a branch can end with one more line under its children (after), such as
// a button adding one more, which an empty branch shows though it has nothing to open; and a branch can be opened from
// outside (reveal), e.g. the one something is being added to.
// The owner can also let some branches be selected (selectable), as on the web, such as a model whose sheet it shows: a
// press on one hands it to onSelect as well as opening or closing it, and once selected it looks like a selected leaf.
// A press on its chevron, a finger wide, only opens or closes it, so it still opens in place where choosing it leads to
// another screen; screen readers find the chevron as a button, "Abrir" or "Fechar" and the branch's name.

type TreeItemProps = { node: TreeNode; level: number; tree: TreeState };
// What every item needs from the tree around it.
type TreeState = {
  expanded: ReadonlySet<string>;
  selected?: string;
  highlighted?: string;
  leafTag?: string;
  selectable?: (id: string) => boolean;
  rowActions?: (id: string) => ReactNode;
  after?: (id: string) => ReactNode;
  activate: (node: TreeNode) => void;
  toggle: (id: string) => void;
};
type TreeViewProps = {
  /** Accessible name of the tree, e.g. "Modelos Chevrolet". */
  label: string;
  nodes: TreeNode[];
  /** Id of the selected leaf, or of a selectable branch. */
  selected?: string;
  /** Called with the leaf, or selectable branch, chosen with a press; the owner keeps it, e.g. for the detail panel. */
  onSelect: (id: string) => void;
  /** Whether a branch, by its id, is selected too when pressed, e.g. a model whose sheet the owner shows; none when left out. */
  selectable?: (id: string) => boolean;
  /** Id of a row to point out in the accent, e.g. the model of a part found by its code. */
  highlighted?: string;
  /** Branches open at first; defaults to the ones above the selected leaf. */
  defaultExpanded?: string[];
  /** A tag at the right of each leaf that says what pressing it does, e.g. "Ver ficha". */
  leafTag?: string;
  /** Height of the tree, which scrolls inside it, e.g. { maxHeight: 380 }. */
  style?: ViewStyle;
  /** The buttons at the end of a row, e.g. its "⋯"; none when it gives nothing. */
  rowActions?: (id: string) => ReactNode;
  /** One more line under a branch's children, e.g. a button adding one more; none when it gives nothing. */
  after?: (id: string) => ReactNode;
  /** A branch to open, with the ones above it, each time it changes. */
  reveal?: string;
};

export function TreeView({
  label,
  nodes,
  selected,
  onSelect,
  selectable,
  highlighted,
  defaultExpanded,
  leafTag,
  style,
  rowActions,
  after,
  reveal,
}: TreeViewProps) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpanded ?? (selected ? ancestors(nodes, selected) : [])),
  );

  // A branch the owner reveals opens, with the ones above it.
  useEffect(() => {
    if (reveal) {
      setExpanded((open) => new Set([...open, ...ancestors(nodes, reveal), reveal]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new branch to reveal opens it: the nodes change on every edit
  }, [reveal]);

  /** Opens a closed branch or closes an open one, sliding its children in or out unless motion is reduced. */
  const toggle = (id: string) => {
    if (!reduced) {
      LayoutAnimation.configureNext(OPEN_ANIMATION);
    }
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  };

  /** Selects a leaf, or opens or closes a branch, selecting it too when it is selectable. */
  const activate = (node: TreeNode) => {
    if (isLeaf(node)) {
      onSelect(node.id);
      return;
    }
    if (selectable?.(node.id)) {
      onSelect(node.id);
    }
    if (canOpen(node)) {
      toggle(node.id);
    }
  };

  const tree: TreeState = { expanded, selected, highlighted, leafTag, selectable, rowActions, after, activate, toggle };
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
  const extra = node.children && tree.after?.(node.id);
  // An empty branch with a line after it shows it, though it has nothing to open.
  const open = (branch && tree.expanded.has(node.id)) || (!branch && Boolean(extra));
  const actions = tree.rowActions?.(node.id);
  const choosable = leaf || Boolean(tree.selectable?.(node.id));
  const selected = choosable && node.id === tree.selected;
  // A pointed-out row looks like the selected leaf.
  const accent = selected || node.id === tree.highlighted;
  return (
    <View style={styles.item} testID={ids.item}>
      <View style={styles.line} testID={ids.line}>
        <Pressable
          role="treeitem"
          accessibilityLabel={node.detail ? `${node.label} ${node.detail}` : node.label}
          accessibilityState={{ expanded: branch ? open : undefined, selected: choosable ? selected : undefined }}
          accessibilityValue={node.id === tree.highlighted ? { text: 'em destaque' } : undefined}
          disabled={!branch && !choosable}
          onPress={() => tree.activate(node)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed, accent && styles.rowActive]}
          testID={ids.row}
        >
          {branch && choosable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${open ? 'Fechar' : 'Abrir'} ${node.label}`}
              onPress={() => tree.toggle(node.id)}
              style={styles.toggle}
              testID={ids.toggle}
            >
              <Chevron open={open} />
            </Pressable>
          ) : branch ? (
            <Chevron open={open} />
          ) : (
            <View style={styles.spacer} testID={ids.spacer} />
          )}
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
          {leaf && tree.leafTag && (
            <Text style={[styles.tag, selected && styles.tagActive]} testID={ids.tag}>
              {tree.leafTag}
            </Text>
          )}
        </Pressable>
        {actions && (
          <View style={styles.actions} testID={ids.actions}>
            {actions}
          </View>
        )}
      </View>
      {open && (
        <View role="group" style={styles.group} testID={ids.group}>
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} level={level + 1} tree={tree} />
          ))}
          {extra && (
            <View style={styles.after} testID={ids.after}>
              {extra}
            </View>
          )}
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
