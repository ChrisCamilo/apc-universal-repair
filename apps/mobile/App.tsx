/**
 * APC Universal Repair - Mobile
 *
 * @format
 */

import { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth } from './src/auth/auth';
import { LoginScreen } from './src/auth/LoginScreen';
import { Dashboard } from './src/dashboard/Dashboard';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/Toast';
import { TourProvider } from './src/Tour';

const SCREEN_STYLE = { flex: 1 };

// Opens on the login and goes on to the Dashboard once the AuthService accepts it.
function Screen() {
  const theme = useTheme();
  const [signedIn, setSignedIn] = useState(false);
  return (
    <SafeAreaView style={[SCREEN_STYLE, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      {signedIn ? <Dashboard /> : <LoginScreen auth={auth} onLoggedIn={() => setSignedIn(true)} />}
    </SafeAreaView>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <TourProvider>
            <Screen />
          </TourProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
