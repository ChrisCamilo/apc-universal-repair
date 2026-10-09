import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { DialogSize } from '@apc/shared/dialog';
import { CloseButton } from './CloseButton';
import { useStyles, windowBox } from './Dialog.styles';
import { ToastLayer } from './Toast';
import { TourLayer } from './Tour';
import { Heading } from './Typography';

// A modal window for forms and confirmations, the same as the web: it sits on top of the screen behind a
// dimmed backdrop, and the back button and the owner's Cancel close it (the owner holds `open`). The content
// scrolls inside while the action bar stays pinned at the bottom, so the main action is visible without
// scrolling at 360×780. A `dismissible` dialog, one with nothing to lose such as a notice, also closes on a tap
// outside it, on the backdrop. A `closable` dialog has the round × at the right of its title, the same as the photo
// viewer's, which closes it like the back button.

type DialogProps = {
  open: boolean;
  /** Called on the back button (and a tap outside when dismissible); the owner closes the dialog by setting `open` to false. */
  onClose: () => void;
  title: string;
  /** "form" for forms such as the item form, "confirm" for short confirmations. */
  size?: DialogSize;
  /** Buttons of the action bar, e.g. Cancel and Save. */
  actions: ReactNode;
  /** Shows the × at the right of the title, which asks the owner to close the dialog like the back button does. */
  closable?: boolean;
  /** Also closes on a tap outside, for dialogs with nothing to lose, such as a notice; off for forms. */
  dismissible?: boolean;
  children: ReactNode;
};

export function Dialog({ open, onClose, title, size = 'form', actions, closable = false, dismissible = false, children }: DialogProps) {
  const { styles, ids } = useStyles();
  const screen = useWindowDimensions();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop} testID={ids.backdrop}>
        {dismissible && <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.outside} testID={ids.outside} />}
        <View accessibilityViewIsModal accessibilityLabel={title} style={[styles.window, windowBox(size, screen)]} testID={ids.window}>
          <ScrollView contentContainerStyle={styles.body} testID={ids.body}>
            {closable ? (
              <View style={styles.header} testID={ids.header}>
                <View style={styles.title} testID={ids.title}>
                  <Heading level={3}>{title}</Heading>
                </View>
                <CloseButton onPress={onClose} />
              </View>
            ) : (
              <Heading level={3}>{title}</Heading>
            )}
            {children}
          </ScrollView>
          <View style={styles.actions} testID={ids.actions}>
            {actions}
          </View>
        </View>
      </View>
      {/* A toast and a guided tour draw here while the dialog is open, the only place above the Modal. */}
      <ToastLayer />
      <TourLayer />
    </Modal>
  );
}
