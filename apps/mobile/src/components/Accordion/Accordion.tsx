import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { chevronIcon, ICON_SIZES } from '@apc/tokens/icons';
import { scales } from '@apc/tokens/theme';
import { toggleSection, type AccordionSection } from '@apc/ui-spec/accordion';
import { Icon } from '../Icon/Icon';
import { useReducedMotion } from '../../app/motion';
import { useTheme } from '../../app/theme';
import { useStyles } from './Accordion.styles';

// Sections that open and close under their headers, any number at once, the same as the web: a press on a header opens
// or closes its section, its chevron turning (at once with reduced motion), and screen readers find the header as a
// button that says whether its section is open (see @apc/ui-spec/accordion). A closed section's content isn't drawn.

type AccordionProps = {
  /** The sections, each with what it holds. */
  sections: (AccordionSection & { content: ReactNode })[];
  /** Ids of the sections open at first; none by default. */
  defaultOpen?: string[];
};

export function Accordion({ sections, defaultOpen = [] }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { styles, ids } = useStyles();
  return (
    <View style={styles.accordion} testID={ids.accordion}>
      {sections.map((section, index) => {
        const isOpen = open.includes(section.id);
        return (
          <View key={section.id} style={[styles.section, index > 0 && styles.sectionSeparated]} testID={ids.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.detail ? `${section.title}, ${section.detail}` : section.title}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setOpen((current) => toggleSection(current, section.id))}
              style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
              testID={ids.header}
            >
              <Chevron open={isOpen} />
              <Text numberOfLines={1} style={styles.title} testID={ids.title}>
                {section.title}
              </Text>
              {section.detail && (
                <Text style={styles.detail} testID={ids.detail}>
                  {section.detail}
                </Text>
              )}
            </Pressable>
            {isOpen && (
              <View style={styles.content} testID={ids.content}>
                {section.content}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current;
  // Whether the chevron last pointed open, so it only turns when the section opens or closes.
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
