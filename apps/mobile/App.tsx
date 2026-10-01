/**
 * APC Universal Repair - Mobile
 *
 * @format
 */

import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { HealthResponse } from '@apc/shared';
import { scales } from '@apc/shared/theme';
import { fontFamily, ThemeProvider, useTheme, type ActiveTheme } from './src/theme';

const placeholderStatus: HealthResponse['status'] = 'ok';

function Home() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      <Text style={styles.title}>APC Universal Repair</Text>
      <Text style={styles.status}>API status: {placeholderStatus}</Text>
    </View>
  );
}

function makeStyles(theme: ActiveTheme) {
  const titleSize = scales.fontSize.xl;
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.canvas,
    },
    title: {
      fontFamily: fontFamily(theme.displayFont, 700),
      fontSize: titleSize,
      letterSpacing: theme.displayTracking * titleSize,
      textTransform: 'uppercase',
      color: theme.colors.text,
      marginBottom: scales.space.s2,
    },
    status: {
      fontFamily: fontFamily(scales.bodyFont),
      fontSize: scales.fontSize.base,
      color: theme.colors.textMuted,
    },
  });
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
