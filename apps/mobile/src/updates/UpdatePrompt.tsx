import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import app from '../../package.json';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { save, themeStorage } from '../theme';
import { Text } from '../components/Typography';
import {
  dayKey,
  DISMISSED_UPDATE_KEY,
  LATEST_RELEASE_URL,
  releaseUpdate,
  shouldOffer,
  type AppUpdate,
  type DismissedUpdate,
} from './appUpdate';

// Says when a newer version of the phone app is out (see appUpdate.ts). The app asks GitHub when it opens, and again
// when it comes back to the foreground on a later day; a failed check, such as one without internet, shows nothing.
// "Nova versão X disponível" offers "Atualizar", which opens the version's APK in the phone's browser, which downloads
// it (Chrome first warns that the file might be harmful, as it does for any APK); opening the downloaded file, Android
// asks to install it over the app, keeping the session and the preferences; and "Agora não", which
// puts that version off until the next day, as the back button does.

type UpdatePromptProps = {
  /** Whether to check: a release build does, development doesn't. */
  enabled: boolean;
  /** The version installed; the app's own by default. */
  installed?: string;
};

/**
 * Reads the version put off with "Agora não".
 * @returns The version and its day, or null when none was put off or it can't be read.
 */
async function readDismissed(): Promise<DismissedUpdate | null> {
  const saved = await themeStorage.getItem(DISMISSED_UPDATE_KEY).catch(() => null);
  try {
    return saved ? (JSON.parse(saved) as DismissedUpdate) : null;
  } catch {
    return null;
  }
}

export function UpdatePrompt({ enabled, installed = app.version }: UpdatePromptProps) {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [open, setOpen] = useState(false);
  // The day of the last check, so coming back to the app checks again only on another day.
  const checked = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let live = true;
    /** Asks GitHub for the latest release and offers it when it is newer and wasn't put off today. */
    const check = async () => {
      const today = dayKey(new Date());
      checked.current = today;
      try {
        const response = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } });
        const found = response.ok ? releaseUpdate(await response.json(), installed) : null;
        if (found && shouldOffer(found, await readDismissed(), today) && live) {
          setUpdate(found);
          setOpen(true);
        }
      } catch {
        // Offline or GitHub unreachable: the app stays on its version and checks again another day.
      }
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && checked.current !== dayKey(new Date())) {
        check();
      }
    });
    return () => {
      live = false;
      subscription.remove();
    };
  }, [enabled, installed]);

  /** Puts the version off until the next day. */
  const putOff = () => {
    setOpen(false);
    if (update) {
      save(DISMISSED_UPDATE_KEY, JSON.stringify({ version: update.version, day: dayKey(new Date()) }));
    }
  };

  /** Opens the version's APK in the phone's browser. */
  const install = () => {
    setOpen(false);
    if (update) {
      Linking.openURL(update.url).catch(() => {});
    }
  };

  if (!update) {
    return null;
  }
  return (
    <Dialog
      open={open}
      onClose={putOff}
      title={`Nova versão ${update.version} disponível`}
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={putOff}>
            Agora não
          </Button>
          <Button size="sm" onPress={install}>
            Atualizar
          </Button>
        </>
      }
    >
      <Text>Atualizar baixa a versão nova pelo navegador. Abra o arquivo baixado para instalá-la por cima deste app.</Text>
      <Text size="sm" tone="muted">
        Na primeira vez, o Android pede para permitir que o navegador instale apps desconhecidos.
      </Text>
    </Dialog>
  );
}
