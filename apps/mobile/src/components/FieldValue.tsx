import { Text, View } from 'react-native';
import { useStyles } from './FieldValue.styles';
import { Label } from './Typography';

// A field's value shown for reading, the same as the web: the label on top and the value in a frame the size and
// shape of a TextField, so a details view keeps its form's layout. The frame has the soft hairline and no fill, so
// it reads as text and not as a disabled input. A value too long for the frame ends in an ellipsis. Screen readers
// read the label and the value together.

type FieldValueProps = {
  label: string;
  value: string;
};

export function FieldValue({ label, value }: FieldValueProps) {
  const { styles, ids } = useStyles();
  return (
    <View style={styles.field} accessible accessibilityLabel={`${label}: ${value}`} testID={ids.field}>
      <Label>{label}</Label>
      <View style={styles.fieldRing} testID={ids.fieldRing}>
        <View style={styles.frame} testID={ids.frame}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.fieldInput} testID={ids.fieldInput}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}
