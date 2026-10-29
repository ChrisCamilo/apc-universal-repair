import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHEET_CLOSE_DRAG } from '@apc/shared/dialog';
import { sheetBox, sheetEnd, useStyles } from './BottomSheet.styles';
import { useOverlayMotion } from './motion';
import { Heading } from './Typography';

// A list of choices, such as the filters or a menu of actions, in a sheet that rises from the bottom of the screen,
// the same as the web. It sits on top of the screen behind the dimmed backdrop; the back button, a tap on the backdrop
// and a drag down from the handle, past SHEET_CLOSE_DRAG, ask the owner to close it (the owner holds `open`). It grows
// with its content, and its body scrolls once it is as tall as it gets. It rises and fades in with its backdrop, and
// goes back down, as on the web (see motion.ts).

type BottomSheetProps = {
  open: boolean;
  /** Called on the back button, a tap on the backdrop or a drag down; the owner closes the sheet by setting `open` to false. */
  onClose: () => void;
  title: string;
  /** A control at the right of the title, such as "Limpar". */
  action?: ReactNode;
  /** Pinned under the content, such as "Ver 3 itens". */
  footer?: ReactNode;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, action, footer, children }: BottomSheetProps) {
  const { styles, ids } = useStyles();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [drag] = useState(() => new Animated.Value(0));
  const motion = useOverlayMotion(open, 'rise', drag);
  // The handle follows the finger down, and on letting go closes the sheet past the threshold or goes back up.
  const handle = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => drag.setValue(0),
        onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > SHEET_CLOSE_DRAG) {
            onClose();
          } else {
            Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [drag, onClose],
  );
  // A sheet closed by a drag opens again in its place.
  useEffect(() => {
    if (open) {
      drag.setValue(0);
    }
  }, [open, drag]);

  return (
    <Modal visible={motion.shown} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, motion.fade]} testID={ids.backdrop}>
        <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.outside} testID={ids.outside} />
        <Animated.View accessibilityViewIsModal accessibilityLabel={title} style={[styles.window, sheetBox(screen), motion.moved]} testID={ids.window}>
          <View {...handle.panHandlers} style={styles.handle} testID={ids.handle}>
            <View style={styles.bar} testID={ids.bar} />
          </View>
          <View style={styles.header} testID={ids.header}>
            <View style={styles.title} testID={ids.title}>
              <Heading level={3}>{title}</Heading>
            </View>
            {action}
          </View>
          <ScrollView style={styles.body} contentContainerStyle={footer ? undefined : sheetEnd(insets.bottom)} testID={ids.body}>
            {children}
          </ScrollView>
          {footer && (
            <View style={[styles.footer, sheetEnd(insets.bottom)]} testID={ids.footer}>
              {footer}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
