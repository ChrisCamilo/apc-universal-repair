import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type Ref } from 'react';
import { Keyboard, ScrollView, StyleSheet, type HostInstance, type ScrollViewProps } from 'react-native';
import { scales } from '@apc/shared/theme';

// A ScrollView that keeps the focused field clear of the keyboard. A field in it calls useRevealField()'s function with
// its outer view when it gets focus, and the view scrolls until the whole field, its label and its message included,
// sits FIELD_CLEARANCE above the keyboard and below the view's top; a field taller than the room left shows its top.
// When the keyboard covers the view's bottom, as in a dialog, whose window Android doesn't resize for it, the content
// grows by that much, so the last field can rise above it. It measures again once the keyboard is up and whenever the
// view or its content changes size, as the screen shrinks for the keyboard.

/** How far above the keyboard, and below the view's top, a focused field stays, in px. */
export const FIELD_CLEARANCE = scales.space.s4;

/** Scrolls a field's outer view into sight, once the keyboard is up. */
type RevealField = (field: HostInstance | null) => void;

const RevealFieldContext = createContext<RevealField>(() => {});

/**
 * Gives the function a field calls with its outer view when it gets focus; outside a FieldScrollView it does nothing.
 * @returns The function that scrolls the field into sight.
 */
export function useRevealField(): RevealField {
  return useContext(RevealFieldContext);
}

type FieldScrollViewProps = ScrollViewProps & {
  /** The ScrollView, for the owner to move it, e.g. to a section. */
  ref?: Ref<ComponentRef<typeof ScrollView>>;
};

export function FieldScrollView({ ref, onScroll, onLayout, onContentSizeChange, contentContainerStyle, children, ...rest }: FieldScrollViewProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const offset = useRef(0);
  const field = useRef<HostInstance | null>(null);
  // How much of the view the keyboard covers, which the content grows by.
  const [covered, setCovered] = useState(0);

  /** Measures the view against the keyboard, grows the content past it and scrolls the focused field into sight. */
  const fit = useCallback(() => {
    const view = scroll.current?.getNativeScrollRef();
    const keyboard = Keyboard.metrics();
    if (!view || !keyboard || !Keyboard.isVisible()) {
      return;
    }
    view.measureInWindow((_x, top, _width, height) => {
      const bottom = Math.min(top + height, keyboard.screenY);
      setCovered(Math.max(0, top + height - keyboard.screenY));
      field.current?.measureInWindow((_fieldX, fieldTop, _fieldWidth, fieldHeight) => {
        const above = fieldTop - top - FIELD_CLEARANCE;
        const below = fieldTop + fieldHeight + FIELD_CLEARANCE - bottom;
        const by = below > 0 ? Math.min(below, above) : Math.min(above, 0);
        if (by !== 0) {
          scroll.current?.scrollTo({ y: offset.current + by, animated: true });
        }
      });
    });
  }, []);

  const reveal = useCallback(
    (target: HostInstance | null) => {
      field.current = target;
      fit();
    },
    [fit],
  );

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', fit);
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      field.current = null;
      setCovered(0);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [fit]);

  const padding = StyleSheet.flatten(contentContainerStyle) ?? {};
  const end = padding.paddingBottom ?? padding.paddingVertical ?? padding.padding;
  const grown = covered > 0 && { paddingBottom: (typeof end === 'number' ? end : 0) + covered };

  return (
    <RevealFieldContext.Provider value={reveal}>
      <ScrollView
        scrollEventThrottle={16}
        {...rest}
        ref={(view) => {
          scroll.current = view;
          if (typeof ref === 'function') {
            ref(view);
          } else if (ref) {
            ref.current = view;
          }
        }}
        contentContainerStyle={[contentContainerStyle, grown]}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={(event) => {
          fit();
          onLayout?.(event);
        }}
        onContentSizeChange={(width, height) => {
          fit();
          onContentSizeChange?.(width, height);
        }}
      >
        {children}
      </ScrollView>
    </RevealFieldContext.Provider>
  );
}
