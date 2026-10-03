/**
 * APC Universal Repair - Mobile
 *
 * @format
 */

import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Dashboard } from './src/dashboard/Dashboard';
import { ThemeProvider, useTheme } from './src/theme';

const SCREEN_STYLE = { flex: 1 };

function Screen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[SCREEN_STYLE, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      <Dashboard />
    </SafeAreaView>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Screen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
