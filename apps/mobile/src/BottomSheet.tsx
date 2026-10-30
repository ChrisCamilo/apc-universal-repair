import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHEET_CLOSE_DRAG } from '@apc/shared/dialog';
import { sheetBox, sheetEnd, useStyles } from './BottomSheet.styles';
import { FieldScrollView } from './FieldScrollView';
import { useOverlayMotion } from './motion';
import { TourLayer } from './Tour';
import { Heading } from './Typography';

// A list of choices, such as the filters or a menu of actions, in a sheet that rises from the bottom of the screen,
// the same as the web. It sits on top of the screen behind the dimmed backdrop; the back button, a tap on the backdrop
// and a drag down from the handle, past SHEET_CLOSE_DRAG, ask the owner to close it (the owner holds `open`); an owner
// with a list open inside the sheet may take the back button to go back from it. It grows with its content, and its
// body scrolls once it is as tall as it gets. It rises and fades in with its backdrop, and goes back down, as on the
// web (see motion.ts). A guided tour draws over it, as over a Dialog.

type BottomSheetProps = {
  open: boolean;
  /** Called on the back button, a tap on the backdrop or a drag down; the owner closes the sheet by setting `open` to false. */
  onClose: () => void;
  /** Called on the back button in place of onClose, e.g. to go back from a list opened inside the sheet. */
  onBack?: () => void;
  title: string;
  /** A control at the right of the title, such as "Limpar". */
  action?: ReactNode;
  /** Pinned under the content, such as "Ver 3 itens". */
  footer?: ReactNode;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, onBack, title, action, footer, children }: BottomSheetProps) {
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
    <Modal visible={motion.shown} transparent animationType="none" onRequestClose={onBack ?? onClose}>
      <Animated.View style={[styles.backdrop, motion.fade]} testID={ids.backdrop}>
        {/* Out of a screen reader's reach, which closes the sheet with the back gesture: it starts on the sheet itself. */}
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.outside}
          testID={ids.outside}
        />
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
          <FieldScrollView style={styles.body} contentContainerStyle={footer ? undefined : sheetEnd(insets.bottom)} testID={ids.body}>
            {children}
          </FieldScrollView>
          {footer && (
            <View style={[styles.footer, sheetEnd(insets.bottom)]} testID={ids.footer}>
              {footer}
            </View>
          )}
        </Animated.View>
      </Animated.View>
      {/* A guided tour draws here while the sheet is open, the only place above the Modal. */}
      <TourLayer />
    </Modal>
  );
}
