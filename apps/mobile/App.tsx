/**
 * APC Universal Repair - Mobile
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LOGIN_MESSAGES, onSessionExpired, type SessionUser } from '@apc/shared/auth';
import type { Pairing } from '@apc/shared/pairing';
import { loadServer } from './src/api';
import { auth } from './src/auth/auth';
import { ConnectScreen } from './src/auth/ConnectScreen';
import { LoginScreen } from './src/auth/LoginScreen';
import { RegisterScreen } from './src/auth/RegisterScreen';
import { Dashboard } from './src/dashboard/Dashboard';
import { UserMenu } from './src/dashboard/UserMenu';
import { NotificationsMenu } from './src/notifications/NotificationsMenu';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/Toast';
import { TourProvider } from './src/Tour';
import { UpdatePrompt } from './src/updates/UpdatePrompt';

const SCREEN_STYLE = { flex: 1 };

// Starts on the Dashboard when a session is saved on the device and on the login otherwise, going on to the
// Dashboard once the AuthService accepts the login or a sign-up, and back to the login after "Sair". The login and
// the sign-up lead to each other. Nothing but the canvas shows while the saved session is read, so neither screen
// flashes before the right one. When the API refuses the session's token, the session is cleared and the login says
// it expired, until someone logs in again. A release with no server paired starts on Conectar ao servidor, which the
// login and the user menu also open to pair again, as after the computer's address changes; a development build talks
// to the computer's development API until it pairs. The screen ends where the keyboard starts, so a form under it
// scrolls to every field: Android 15 and later draw the app edge to edge, under the keyboard, and no longer resize it.
// A release says, over any screen, when a newer version is out (see UpdatePrompt).
function Screen() {
  const theme = useTheme();
  // The logged user: undefined while the saved session is read, null when nobody is logged in.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  // Whether the sign-up shows in place of the login.
  const [registering, setRegistering] = useState(false);
  // Whether the API refused the last session's token.
  const [expired, setExpired] = useState(false);
  // The paired server: undefined while it is read, null when the phone hasn't paired with one.
  const [server, setServer] = useState<Pairing | null | undefined>(undefined);
  // Whether Conectar ao servidor shows, to pair again.
  const [pairing, setPairing] = useState(false);

  // Read the saved session, unless a login already set the user meanwhile.
  useEffect(() => {
    let live = true;
    auth.currentUser().then((saved) => live && setUser((current) => (current === undefined ? saved : current)));
    return () => {
      live = false;
    };
  }, []);

  // Read the paired server, which the API goes to.
  useEffect(() => {
    let live = true;
    loadServer().then((saved) => live && setServer(saved));
    return () => {
      live = false;
    };
  }, []);

  // End the session when the API refuses its token.
  useEffect(
    () =>
      onSessionExpired(() => {
        auth.logout().catch(() => {});
        setRegistering(false);
        setUser(null);
        setExpired(true);
      }),
    [],
  );

  /** Takes the user who just logged in or signed up, dropping the expired notice. */
  const logIn = (loggedIn: SessionUser) => {
    setUser(loggedIn);
    setExpired(false);
  };

  /** Marks the Inventory tutorial seen on the logged user, at once, then on the device and the API. */
  const markTutorialSeen = () => {
    if (user) {
      setUser({ ...user, inventoryTutorialSeen: true });
      auth.markInventoryTutorialSeen(user).catch(() => {});
    }
  };

  /**
   * Takes the server the phone just paired with, and goes back to the screen it was on.
   * @param paired The server.
   */
  const connected = (paired: Pairing) => {
    setServer(paired);
    setPairing(false);
  };

  /** Ends the session and goes back to the login. */
  const logout = async () => {
    await auth.logout();
    setRegistering(false);
    setUser(null);
  };

  return (
    <SafeAreaView style={[SCREEN_STYLE, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar barStyle={theme.mode === 'night' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior="padding" style={SCREEN_STYLE}>
        {user === undefined || server === undefined ? null : pairing || (!server && !__DEV__) ? (
          <ConnectScreen onConnected={connected} onCancel={server || __DEV__ ? () => setPairing(false) : undefined} />
        ) : user ? (
          <Dashboard
            userMenu={
              <>
                <NotificationsMenu key={user.id} userId={user.id} />
                <UserMenu user={user} onLogout={logout} onConnect={() => setPairing(true)} />
              </>
            }
            tutorialSeen={user.inventoryTutorialSeen}
            userId={user.id}
            onTutorialSeen={markTutorialSeen}
          />
        ) : registering ? (
          <RegisterScreen auth={auth} onRegistered={logIn} onLogin={() => setRegistering(false)} />
        ) : (
          <LoginScreen
            auth={auth}
            notice={expired ? LOGIN_MESSAGES.expired : undefined}
            onLoggedIn={logIn}
            onRegister={() => setRegistering(true)}
            onConnect={() => setPairing(true)}
          />
        )}
      </KeyboardAvoidingView>
      <UpdatePrompt enabled={!__DEV__} />
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
