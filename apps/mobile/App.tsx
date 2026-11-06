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
import { loadServer } from './src/app/api';
import { auth } from './src/features/auth/auth';
import { ConnectScreen } from './src/features/auth/ConnectScreen';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { PASSWORD_LOGIN } from './src/features/auth/passwordLogin';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { Dashboard } from './src/features/dashboard/Dashboard';
import { UserMenu } from './src/features/dashboard/UserMenu';
import { NotificationsMenu } from './src/features/notifications/NotificationsMenu';
import { ThemeProvider, useTheme } from './src/app/theme';
import { ToastProvider } from './src/components/Toast';
import { TourProvider } from './src/components/Tour';
import { UpdatePrompt } from './src/features/updates/UpdatePrompt';

/** What Conectar ao servidor says when the API refused the session's token, while pairing is the login. */
const PAIR_AGAIN = 'Sua sessão expirou. Leia o código do computador de novo.';
const SCREEN_STYLE = { flex: 1 };

// While pairing is the login (PASSWORD_LOGIN off, see passwordLogin.ts), starts on the Dashboard when a session is
// saved on the device and on Conectar ao servidor otherwise, whose QR code from the computer pairs the phone and logs it
// into the account open there; "Sair" and an expired session, which it says, go back to it, and the user menu opens it
// to pair again, as the account open on the computer. The rest of this comment is the flow with PASSWORD_LOGIN on:
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
   * Takes the server the phone just paired with, and the user when pairing logged in, and goes back to the screen it
   * was on, or to the Dashboard.
   * @param paired The server.
   * @param loggedIn The user, when pairing logged in.
   */
  const connected = (paired: Pairing, loggedIn?: SessionUser) => {
    setServer(paired);
    setPairing(false);
    if (loggedIn) {
      logIn(loggedIn);
    }
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
        {user === undefined || server === undefined ? null : !PASSWORD_LOGIN && (!user || pairing) ? (
          <ConnectScreen
            auth={auth}
            notice={!user && expired ? PAIR_AGAIN : undefined}
            onConnected={connected}
            onCancel={user ? () => setPairing(false) : undefined}
          />
        ) : pairing || (!server && !__DEV__) ? (
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
