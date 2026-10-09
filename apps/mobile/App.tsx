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
import { RegisterScreen } from './src/auth/RegisterScreen';
import { Dashboard } from './src/dashboard/Dashboard';
import { UserMenu } from './src/dashboard/UserMenu';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/Toast';
import { TourProvider } from './src/Tour';

const SCREEN_STYLE = { flex: 1 };

// Starts on the Dashboard when a session is saved on the device and on the login otherwise, going on to the
// Dashboard once the AuthService accepts the login or a sign-up, and back to the login after "Sair". The login and
// the sign-up lead to each other. Nothing but the canvas shows while the saved session is read, so neither screen
// flashes before the right one.
function Screen() {
  const theme = useTheme();
  // The logged user: undefined while the saved session is read, null when nobody is logged in.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  // Whether the sign-up shows in place of the login.
  const [registering, setRegistering] = useState(false);

  // Read the saved session, unless a login already set the user meanwhile.
  useEffect(() => {
    let live = true;
    auth.currentUser().then((saved) => live && setUser((current) => (current === undefined ? saved : current)));
    return () => {
      live = false;
    };
  }, []);

  /** Ends the session and goes back to the login. */
  const logout = async () => {
    await auth.logout();
    setRegistering(false);
    setUser(null);
  };

  return (
    <SafeAreaView style={[SCREEN_STYLE, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      {user === undefined ? null : user ? (
        <Dashboard userMenu={<UserMenu user={user} onLogout={logout} />} />
      ) : registering ? (
        <RegisterScreen auth={auth} onRegistered={setUser} onLogin={() => setRegistering(false)} />
      ) : (
        <LoginScreen auth={auth} onLoggedIn={setUser} onRegister={() => setRegistering(true)} />
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
