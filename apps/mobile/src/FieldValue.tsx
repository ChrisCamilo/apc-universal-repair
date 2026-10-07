import { Text, View, type ViewStyle } from 'react-native';
import { fieldStyle, frameStyles, inputStyle } from './fieldStyles';
import { softHairline } from './Panel';
import { useTheme, type ActiveTheme } from './theme';
import { Label } from './Typography';

// A field's value shown for reading, the same as the web: the label on top and the value in a frame the size and
// shape of a TextField, so a details view keeps its form's layout. The frame has the soft hairline and no fill, so
// it reads as text and not as a disabled input. A value too long for the frame ends in an ellipsis. Screen readers
// read the label and the value together.

type FieldValueProps = {
  label: string;
  value: string;
};

/**
 * Styles the value's frame: a field's pill frame with the soft hairline and no fill.
 * @param theme Active theme.
 * @returns Style for the frame View.
 */
function valueFrameStyle(theme: ActiveTheme): ViewStyle {
  return { ...frameStyles(theme, false, false).frame, borderColor: softHairline(theme), backgroundColor: 'transparent' };
}

export function FieldValue({ label, value }: FieldValueProps) {
  const theme = useTheme();
  const { ring } = frameStyles(theme, false, false);
  return (
    <View style={fieldStyle(false)} accessible accessibilityLabel={`${label}: ${value}`}>
      <Label>{label}</Label>
      <View style={ring}>
        <View style={valueFrameStyle(theme)} testID="field-value-frame">
          <Text numberOfLines={1} ellipsizeMode="tail" style={inputStyle(theme)}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}
