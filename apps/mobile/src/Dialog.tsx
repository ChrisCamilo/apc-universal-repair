import { useContext, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Animated, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import type { DialogSize } from '@apc/shared/dialog';
import { CloseButton } from './CloseButton';
import { fillEdges, useStyles, windowBox } from './Dialog.styles';
import { useOverlayMotion } from './motion';
import { ToastLayer } from './Toast';
import { TourLayer } from './Tour';
import { Heading } from './Typography';

const NO_INSETS = { top: 0, bottom: 0 };

// A modal window for forms and confirmations, the same as the web: it sits on top of the screen behind a
// dimmed backdrop, and the back button and the owner's Cancel close it (the owner holds `open`). A form fills the
// screen, as the web does on a phone: its title row stays on top, the × at its left, the content scrolls under it, and
// the actions sit at the bottom, clear of the home indicator; it slides up from the bottom edge. A confirmation is a
// window centered on the backdrop, its content scrolling inside while the action bar stays pinned at the bottom; it
// grows in. A `dismissible` dialog, one with nothing to lose such as a notice, also closes on a tap outside it, on the
// backdrop. A `closable` dialog has the round ×, the same as the photo viewer's, which closes it like the back button.
// The owner may hold the content's scroll (scrollRef), to open it further down. It fades in with its backdrop, and back
// out, as on the web (see motion.ts).

type DialogProps = {
  open: boolean;
  /** Called on the back button (and a tap outside when dismissible); the owner closes the dialog by setting `open` to false. */
  onClose: () => void;
  title: string;
  /** "form" for forms such as the item form, which fill the screen; "confirm" for short confirmations. */
  size?: DialogSize;
  /** Buttons of the action bar, e.g. Cancel and Save. */
  actions: ReactNode;
  /** Shows the × beside the title, which asks the owner to close the dialog like the back button does. */
  closable?: boolean;
  /** Also closes on a tap outside, for dialogs with nothing to lose, such as a notice; off for forms. */
  dismissible?: boolean;
  /** The content's scroll, for the owner to move it, e.g. to a section. */
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
  children: ReactNode;
};

export function Dialog({ open, onClose, title, size = 'form', actions, closable = false, dismissible = false, scrollRef, children }: DialogProps) {
  const { styles, ids } = useStyles();
  const screen = useWindowDimensions();
  // The app's SafeAreaProvider gives the insets; a screen rendered without one, as in a test, has none.
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const fill = size === 'form';
  const motion = useOverlayMotion(open, fill ? 'rise' : 'scale');
  const edges = fillEdges(insets);
  const header = (
    <View style={[styles.header, fill && styles.headerFill, fill && edges.header]} testID={ids.header}>
      <View style={styles.title} testID={ids.title}>
        <Heading level={3}>{title}</Heading>
      </View>
      {closable && <CloseButton onPress={onClose} />}
    </View>
  );
  return (
    <Modal visible={motion.shown} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, motion.fade]} testID={ids.backdrop}>
        {dismissible && <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.outside} testID={ids.outside} />}
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.window, fill ? styles.windowFill : windowBox(size, screen), motion.moved]}
          testID={ids.window}
        >
          {fill && header}
          <ScrollView
            ref={scrollRef}
            style={fill && styles.bodyFill}
            contentContainerStyle={[styles.body, fill && styles.bodyContentFill]}
            testID={ids.body}
          >
            {!fill && header}
            {children}
          </ScrollView>
          <View style={[styles.actions, fill && edges.actions]} testID={ids.actions}>
            {actions}
          </View>
        </Animated.View>
      </Animated.View>
      {/* A toast and a guided tour draw here while the dialog is open, the only place above the Modal. */}
      <ToastLayer />
      <TourLayer />
    </Modal>
  );
}
