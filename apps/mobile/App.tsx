/**
 * APC Universal Repair - Mobile
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { SessionUser } from '@apc/shared/auth';
import { auth } from './src/auth/auth';
import { LoginScreen } from './src/auth/LoginScreen';
import { Dashboard } from './src/dashboard/Dashboard';
import { UserMenu } from './src/dashboard/UserMenu';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/Toast';
import { TourProvider } from './src/Tour';

const SCREEN_STYLE = { flex: 1 };

// Starts on the Dashboard when a session is saved on the device and on the login otherwise, going on to the
// Dashboard once the AuthService accepts the login. Nothing but the canvas shows while the saved session is read,
// so neither screen flashes before the right one.
function Screen() {
  const theme = useTheme();
  // The logged user: undefined while the saved session is read, null when nobody is logged in.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  // Read the saved session, unless a login already set the user meanwhile.
  useEffect(() => {
    let live = true;
    auth.currentUser().then((saved) => live && setUser((current) => (current === undefined ? saved : current)));
    return () => {
      live = false;
    };
  }, []);

  return (
    <SafeAreaView style={[SCREEN_STYLE, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      {user === undefined ? null : user ? (
        <Dashboard userMenu={<UserMenu user={user} />} />
      ) : (
        <LoginScreen auth={auth} onLoggedIn={setUser} />
      )}
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
