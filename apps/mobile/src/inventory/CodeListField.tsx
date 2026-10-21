import { useState } from 'react';
import { Pressable, Text as NativeText, TextInput, View } from 'react-native';
import { closeIcon, ICON_SIZES } from '@apc/shared/icons';
import { addCodes, codesInput } from '@apc/shared/item-form';
import { Icon } from '../Icon';
import { useTheme } from '../theme';
import { Label, Text } from '../Typography';
import { REMOVE_HIT_SLOP, useStyles } from './CodeListField.styles';

// A field of codes typed as chips, the same as the web, such as an item's original codes: a code typed joins the list
// as a chip with the keyboard's return key, a comma or a semicolon, or on leaving the field, and several pasted at once
// all join it; a code the list already has is left out (see addCodes). Each chip's × takes its code out, and so does
// Backspace in the empty field, the last one. A code with a message, such as one another item uses, is shown in the
// danger color, its message under the field, which is read out when it appears.

type CodeListFieldProps = {
  label: string;
  codes: readonly string[];
  onCodesChange: (codes: string[]) => void;
  /** Each code's message, in the codes' order; a code without one is fine. */
  messages?: readonly (string | undefined)[];
  /** Hint shown under the field while no code has a message. */
  helper?: string;
};

export function CodeListField({ label, codes, onCodesChange, messages = [], helper }: CodeListFieldProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const notes = codes.flatMap((code, index) => (messages[index] ? [{ code, message: messages[index] }] : []));

  /** Adds what is typed as a code, and empties the field. */
  const commit = () => {
    if (text.trim()) {
      onCodesChange(addCodes(codes, [text]));
    }
    setText('');
  };

  /** Takes a code out of the list. */
  const remove = (index: number) => onCodesChange(codes.filter((_, at) => at !== index));

  return (
    <View style={styles.field} testID={ids.field}>
      <Label>{label}</Label>
      <View style={[styles.fieldRing, focused && (notes.length > 0 ? styles.fieldRingError : styles.fieldRingFocused)]} testID={ids.fieldRing}>
        <View style={[styles.fieldFrame, focused && styles.fieldFrameFocused]} testID={ids.fieldFrame}>
          {codes.map((code, index) => (
            <View key={code} style={[styles.chip, !!messages[index] && styles.chipInvalid]} testID={ids.chip}>
              <NativeText style={[styles.code, !!messages[index] && styles.codeInvalid]} testID={ids.code}>
                {code}
              </NativeText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover ${code}`}
                hitSlop={REMOVE_HIT_SLOP}
                onPress={() => remove(index)}
                style={styles.remove}
                testID={ids.remove}
              >
                <Icon icon={closeIcon} size={ICON_SIZES.mark} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <TextInput
            value={text}
            onChangeText={(typed) => {
              const read = codesInput(codes, text, typed);
              if (read.codes.length !== codes.length) {
                onCodesChange(read.codes);
              }
              setText(read.text);
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !text && codes.length > 0) {
                remove(codes.length - 1);
              }
            }}
            onSubmitEditing={commit}
            submitBehavior="submit"
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={label}
            accessibilityHint={notes.length > 0 ? notes.map((note) => `${note.code}: ${note.message}`).join(' ') : helper}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            style={styles.fieldInput}
            testID={ids.fieldInput}
          />
        </View>
      </View>
      {notes.length > 0 ? (
        <View accessibilityLiveRegion="polite" style={styles.messages} testID={ids.messages}>
          {notes.map((note) => (
            <NativeText key={note.code} style={styles.message} testID={ids.message}>
              {`${note.code}: ${note.message}`}
            </NativeText>
          ))}
        </View>
      ) : (
        helper && (
          <Text size="sm" tone="muted">
            {helper}
          </Text>
        )
      )}
    </View>
  );
}
