import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, BackHandler, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOGIN_BRAND } from '@apc/domain/auth';
import { BrandMark } from '../../components/BrandMark';
import { Button } from '../../components/Button';
import { Heading, Text } from '../../components/Typography';
import { lockCopy, unlockCopy, type UnlockResult } from '../sync/inventoryCopy';
import { useStyles } from './AppLock.styles';
import { useMessages } from '../../app/locale';
import { PHONE_TEXTS } from '../../app/phoneTexts';

// The phone's copy of the inventory behind the phone's own lock (see InventoryCopyModule.kt): the app opens only once
// the copy does, which asks for the fingerprint, the face or the screen lock when the phone has one, and asks nothing
// when it hasn't; the password never reaches the phone, which logs in with the computer's QR code. Back from
// LOCK_AWAY_MS or more away from the app, the copy's key is dropped and the lock asked for again, over the app as it
// was, which stays as it was under it. While the lock shows, a screen on the canvas covers the app, so nothing of the
// inventory shows behind the prompt; refused, it says the inventory is locked, with Desbloquear to ask again, and the
// back button leaves the app.

/** How long away from the app asks for the phone's lock again, in ms. */
export const LOCK_AWAY_MS = 5 * 60_000;

/** Where the lock stands: asking, refused, or open. */
type LockState = 'asking' | 'locked' | 'open';

export function AppLock({ children }: { children: ReactNode }) {
  const { styles, ids } = useStyles();
  // What the lock says: the prompt's title and text, the screen's title and text, and its button.
  const texts = useMessages(PHONE_TEXTS).appLock;
  const [state, setState] = useState<LockState>('asking');
  // Whether the app opened once: it shows from then on, under the lock when asked again.
  const [opened, setOpened] = useState(false);
  // When the app went to the background, while it is there.
  const away = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    setState('asking');
    const result: UnlockResult = await unlockCopy(texts).catch(() => 'cancelled' as const);
    setState(result === 'open' ? 'open' : 'locked');
    if (result === 'open') {
      setOpened(true);
    }
  }, [texts]);

  useEffect(() => {
    unlock();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        away.current = Date.now();
      } else if (next === 'active' && away.current !== null) {
        const long = Date.now() - away.current >= LOCK_AWAY_MS;
        away.current = null;
        if (long) {
          setState('asking');
          lockCopy().then(unlock, unlock);
        }
      }
    });
    return () => subscription.remove();
  }, [unlock]);

  return (
    <>
      {opened && children}
      <Modal visible={state !== 'open'} animationType="none" statusBarTranslucent onRequestClose={() => BackHandler.exitApp()}>
        <SafeAreaView style={styles.base} testID={ids.base}>
          {state === 'locked' && (
            <View style={styles.column} testID={ids.column}>
              <BrandMark variant="compact" size={LOGIN_BRAND.mark} />
              <Heading align="center">{texts.locked}</Heading>
              <Text tone="muted" align="center">
                {texts.why}
              </Text>
              <Button align="stretch" onPress={unlock}>
                {texts.unlock}
              </Button>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
