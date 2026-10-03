import type { ReactNode } from 'react';
import { Modal, ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { DIALOG_HEIGHT_INSET, DIALOG_SCREEN_INSET, DIALOG_WIDTHS, type DialogSize } from '@apc/shared/dialog';
import { popShadow, scales, sheenGradient } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { useTheme, withAlpha, type ActiveTheme } from './theme';
import { Heading } from './Typography';

// A modal window for forms and confirmations, the same as the web: it sits on top of the screen behind a
// dimmed backdrop, and the back button and the owner's Cancel close it (the owner holds `open`). The content
// scrolls inside while the action bar stays pinned at the bottom, so the main action is visible without
// scrolling at 360×780.

const BODY_STYLE: ViewStyle = { gap: scales.space.s4, padding: scales.space.s5 };

type DialogProps = {
  open: boolean;
  /** Called on the back button; the owner closes the dialog by setting `open` to false. */
  onClose: () => void;
  title: string;
  /** "form" for forms such as the item form, "confirm" for short confirmations. */
  size?: DialogSize;
  /** Buttons of the action bar, e.g. Cancel and Save. */
  actions: ReactNode;
  children: ReactNode;
};

/**
 * Styles the action bar: buttons at the end, over a soft hairline.
 * @param theme Active theme.
 * @returns Style for the action bar View.
 */
function actionsStyle(theme: ActiveTheme): ViewStyle {
  return {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: scales.space.s2,
    borderTopWidth: scales.hairline,
    borderTopColor: softHairline(theme),
    paddingHorizontal: scales.space.s5,
    paddingTop: scales.space.s3,
    paddingBottom: scales.space.s5,
  };
}

/**
 * Styles the backdrop: the canvas at the backdrop opacity, centering the window.
 * @param theme Active theme.
 * @returns Style for the backdrop View.
 */
function backdropStyle(theme: ActiveTheme): ViewStyle {
  return {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(theme.colors.canvas, scales.backdrop.opacity),
  };
}

/**
 * Styles the window: the panel with its sheen and hairline frame, as wide as its size allows on the screen.
 * @param theme Active theme.
 * @param size Dialog size.
 * @param screen Window width and height.
 * @returns Style for the window View.
 */
function windowStyle(theme: ActiveTheme, size: DialogSize, screen: { width: number; height: number }): ViewStyle {
  return {
    width: Math.min(DIALOG_WIDTHS[size], screen.width - DIALOG_SCREEN_INSET),
    maxHeight: screen.height - DIALOG_HEIGHT_INSET,
    overflow: 'hidden',
    borderWidth: scales.hairline,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radiusPanel,
    backgroundColor: theme.colors.panel,
    backgroundImage: sheenGradient(theme.sheen, theme.mode),
    boxShadow: popShadow(),
  };
}

export function Dialog({ open, onClose, title, size = 'form', actions, children }: DialogProps) {
  const theme = useTheme();
  const screen = useWindowDimensions();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={backdropStyle(theme)} testID="dialog-backdrop">
        <View accessibilityViewIsModal accessibilityLabel={title} style={windowStyle(theme, size, screen)} testID="dialog-window">
          <ScrollView contentContainerStyle={BODY_STYLE}>
            <Heading level={3}>{title}</Heading>
            {children}
          </ScrollView>
          <View style={actionsStyle(theme)}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
}
