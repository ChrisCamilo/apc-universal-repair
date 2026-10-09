import { useState } from 'react';
import { Pressable, Text as NativeText, ScrollView, TextInput, View } from 'react-native';
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons';
import { capitalizeFirst, findOption, matchingOptions } from '@apc/shared/items';
import { CHEVRON_HIT_SLOP, useStyles } from './Combobox.styles';
import { Icon } from './Icon';
import { useTheme } from './theme';
import { Label, Text } from './Typography';

// A text field with a list of options that filters as the user types, the same as the web: case and accents
// don't matter, and when the text names no option the list ends with "+ Criar <noun> “<text>”", which creates
// it without leaving the field. The chevron opens the full list. On a phone the list opens right under the
// field and pushes what follows down; tapping an option keeps the keyboard and the focus in the field. On
// blur the list closes, a text that names an option takes that option's spelling, and any other text starts with
// a capital letter.

type ComboboxProps = {
  label: string;
  /** The text in the field. */
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  /** Creates a new option, called with the typed text starting with a capital letter; the field then holds it. */
  onCreate: (value: string) => void;
  /** What an option is, for the create row, e.g. "categoria" in "+ Criar categoria “Freios”". */
  noun: string;
  /** Accessible name of the chevron, e.g. "Mostrar categorias". */
  toggleLabel: string;
  /** Shown in the list when there are no options at all, e.g. "Nenhuma categoria cadastrada". */
  emptyLabel: string;
  placeholder?: string;
  /** Hint shown under the field while there is no error. */
  helper?: string;
  /** Error shown under the field in the danger color; marks the field invalid. */
  error?: string;
  disabled?: boolean;
};
type Entry = { kind: 'option' | 'create'; value: string };

export function Combobox({
  label,
  value,
  onValueChange,
  options,
  onCreate,
  noun,
  toggleLabel,
  emptyLabel,
  placeholder,
  helper,
  error,
  disabled = false,
}: ComboboxProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const typed = value.trim().replace(/\s+/g, ' ');
  const current = findOption(options, value);
  const entries: Entry[] = [
    ...(showAll ? options : matchingOptions(options, value)).map((option) => ({ kind: 'option' as const, value: option })),
    ...(typed && !current ? [{ kind: 'create' as const, value: capitalizeFirst(typed) }] : []),
  ];

  /** Opens the list, the full list when the chevron asks for it, or closes it. */
  const show = (next: boolean, all = false) => {
    setOpen(next);
    setShowAll(next && all);
  };

  /** Picks an entry: an option fills the field, the create row creates the option first; the list closes. */
  const pick = (entry: Entry) => {
    if (entry.kind === 'create') {
      onCreate(entry.value);
    }
    onValueChange(entry.value);
    show(false);
  };

  return (
    <View style={[styles.field, disabled && styles.fieldDisabled]} testID={ids.field}>
      <Label>{label}</Label>
      <View style={[styles.fieldRing, focused && (error ? styles.fieldRingError : styles.fieldRingFocused)]} testID={ids.fieldRing}>
        <View style={[styles.fieldFrame, focused && styles.fieldFrameFocused, !!error && styles.fieldFrameError]} testID={ids.fieldFrame}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              onValueChange(text);
              show(true);
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            editable={!disabled}
            autoCorrect={false}
            accessibilityRole="combobox"
            accessibilityLabel={label}
            accessibilityHint={error ?? helper}
            accessibilityState={{ expanded: open, disabled }}
            onFocus={() => {
              setFocused(true);
              show(true);
            }}
            onBlur={() => {
              setFocused(false);
              show(false);
              const written = current ?? (typed ? capitalizeFirst(typed) : value);
              if (written !== value) {
                onValueChange(written);
              }
            }}
            style={styles.fieldInput}
            testID={ids.fieldInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            disabled={disabled}
            hitSlop={CHEVRON_HIT_SLOP}
            onPress={() => show(!open, true)}
            style={styles.toggle}
            testID={ids.toggle}
          >
            <View style={[styles.chevron, open && styles.chevronOpen]} testID={ids.chevron}>
              <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>
      {open && (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={styles.fieldList}
          contentContainerStyle={styles.fieldListContent}
          testID={ids.fieldList}
        >
          {entries.length === 0 && <Text tone="muted">{emptyLabel}</Text>}
          {entries.map((entry, index) => (
            <Pressable
              key={`${entry.kind}-${entry.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: entry.kind === 'option' && entry.value === current }}
              onPress={() => pick(entry)}
              style={({ pressed }) => [styles.option, entry.kind === 'create' && index > 0 && styles.optionBelow, pressed && styles.optionPressed]}
              testID={ids.option}
            >
              <NativeText
                numberOfLines={1}
                style={[styles.optionText, entry.value === current && styles.optionTextChosen, entry.kind === 'create' && styles.optionTextCreate]}
                testID={ids.optionText}
              >
                {entry.kind === 'create' ? `+ Criar ${noun} “${entry.value}”` : entry.value}
              </NativeText>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {error ? (
        <NativeText accessibilityLiveRegion="polite" style={styles.fieldError} testID={ids.fieldError}>
          {error}
        </NativeText>
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
