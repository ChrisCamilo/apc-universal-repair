import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Text as RNText, TextInput, View } from 'react-native';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CodeScanner, type Barcode, type TargetBarcodeFormat } from 'react-native-vision-camera-barcode-scanner';
import { waitForDevice, type AuthService, type SessionUser } from '@apc/domain/auth';
import { pencilIcon, qrIcon } from '@apc/tokens/icons';
import { readEntryCode, readFingerprint, readPairingLink, readServerAddress, type Pairing, type PairingInvite } from '@apc/domain/pairing';
import { applyServer, currentServer, saveServer } from '../../app/api';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { FieldScrollView } from '../../components/FieldScrollView';
import { TextField } from '../../components/TextField';
import { Heading, Text } from '../../components/Typography';
import { useStyles } from './ConnectScreen.styles';
import { DevicePending } from './DevicePending';

// Conectar ao servidor: how the phone pairs with the home server (see @apc/domain/pairing), before the login of a
// phone with no server yet, and from the login or the user menu to pair again, as after the computer's address
// changes. The camera reads the QR code of the desktop app's Servidor dialog. "Digitar manualmente", under it, puts the
// camera away for the address and the code shown beside the QR code, the code with or without its spaces, and "Ler QR
// Code" brings the camera back. Either way the phone asks the server's /health, trusting only the certificate with
// that fingerprint (see ServerPin.kt), and keeps the server once it answers; when it doesn't, the server in use before
// stays, and the screen says what to check. A code that isn't the APC's says so. The camera asks for its permission at
// a tap; once refused for good, the screen says to allow it in Android's settings, and a phone without a camera opens
// on the fields alone. The ← beside the title, or Android's back button, leaves the server as it was, when one is
// paired.
// Given the AuthService, as while the phone's password login is set aside (PASSWORD_LOGIN), pairing is also the login:
// the QR code carries an entry code for the account open on the computer, typed in as a third field otherwise, and
// once the server answers the phone logs in with it (POST /sessions/pairing), keeping the server only then. A phone
// the server's computer hasn't authorized shows "Aguardando autorização" with its short code (see DevicePending.tsx),
// in place of the camera or the fields, and waits as a login does (waitForDevice), logging in with the same code once
// authorized, or saying it was refused; "Cancelar", or the back button, stops waiting. A code the server refused,
// used or ended, says so, and the camera doesn't send that same QR code again, which the computer replaces with a new
// one.

/** The codes the camera reads: the QR code alone. */
const QR_CODE: TargetBarcodeFormat[] = ['qr-code'];
/** How long the server has to answer before the phone gives up, in ms. */
const ANSWER_TIMEOUT_MS = 8_000;
/** What the screen says under its title, reading the QR code or typing, when pairing also logs in or not. */
const INTRO = {
  scan: 'No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, aponte a câmera para o código que aparece lá.',
  scanLogin:
    'No computador, entre na sua conta, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, aponte a câmera para o código que aparece lá.',
  type: 'No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, digite o endereço e o código que aparecem lá.',
  typeLogin:
    'No computador, entre na sua conta, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, digite o endereço e os códigos que aparecem lá.',
} as const;
/** What the screen says, in Portuguese. */
const MESSAGES = {
  address: 'Digite o endereço que aparece no computador, como 192.168.0.10:3000.',
  blocked: 'A câmera está bloqueada para o APC. Libere-a nas configurações do Android, ou toque em Digitar manualmente.',
  cameraFailed: 'A câmera não abriu. Toque em Digitar manualmente para digitar o endereço e o código.',
  code: 'O código tem 43 letras, números, - e _, como aparece no computador.',
  deviceRefused: 'Este celular não foi autorizado no computador. Leia o código de novo para pedir outra vez.',
  entry: 'O código de entrada tem 8 letras e números, como aparece no computador.',
  noEntry: 'Esse código não traz o código de entrada. Atualize o APC no computador e leia o código de novo.',
  notApc: 'Esse código não é o do APC. Use o que aparece em Servidor e banco de dados, no computador.',
  unreachable:
    'O servidor não respondeu. Confira se o celular está no Wi-Fi de casa, se o Acesso pelo celular está ligado no computador e se o código é o que aparece lá agora.',
} as const;

type ConnectScreenProps = {
  /** Called with the server once it answered, kept on the phone and in use, and the user when pairing logged in. */
  onConnected: (pairing: Pairing, user?: SessionUser) => void;
  /** Goes back with the server as it was, when one is paired already. */
  onCancel?: () => void;
  /** Logs in with the computer's entry code once the server answers; without it, the screen only pairs. */
  auth?: AuthService;
  /** Said above the camera or the fields until a code is read, e.g. that the session expired. */
  notice?: string;
};
/** What the fields hold that isn't right, by field. */
type FieldErrors = { address?: string; code?: string; entry?: string };
/**
 * An entry the server's computer hasn't authorized yet: the phone's short code, the entry code to send again, the
 * server, and the one in use before, to go back to.
 */
type Waiting = { code: string; entry: string; pairing: Pairing; before: Pairing | null };

/**
 * Asks a server's /health, as the pinning trusts it.
 * @param url The server's address.
 * @returns True when it answers with a success before ANSWER_TIMEOUT_MS.
 */
async function answers(url: string): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ANSWER_TIMEOUT_MS);
  try {
    return (await fetch(`${url}/health`, { signal: abort.signal })).ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function ConnectScreen({ onConnected, onCancel, auth, notice }: ConnectScreenProps) {
  const camera = useCameraPermission();
  const device = useCameraDevice('back');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [entry, setEntry] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [refused, setRefused] = useState<string>();
  // Whether a code was read or sent, which puts the notice away.
  const [tried, setTried] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // The entry the server's computer hasn't authorized yet, which the screen waits on.
  const [waiting, setWaiting] = useState<Waiting>();
  // The latest owner's callback, so a new one doesn't start the wait over.
  const connected = useRef(onConnected);
  useEffect(() => {
    connected.current = onConnected;
  });
  // Whether the address and the code are typed in, in place of the camera; always, on a phone without one.
  const [typing, setTyping] = useState(false);
  const manual = typing || !device;
  // Whether a server is being asked, so the camera, which reads the code on every frame, asks it once.
  const asking = useRef(false);
  // The QR code the server refused, or that isn't the APC's, which the camera doesn't send again.
  const refusedLink = useRef<string>(undefined);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const entryInput = useRef<ComponentRef<typeof TextInput>>(null);
  const { styles, ids } = useStyles();

  // Wait for the server's computer to authorize the phone, then log in with the same entry code; or say it was refused,
  // going back to the server in use before.
  useEffect(() => {
    if (!waiting || !auth) {
      return;
    }
    const stop = new AbortController();
    waitForDevice(auth, () => auth.pair(waiting.entry), stop.signal).then(async (user) => {
      if (user) {
        await saveServer(waiting.pairing);
        connected.current(waiting.pairing, user);
      } else if (user === null) {
        applyServer(waiting.before);
        setWaiting(undefined);
        setRefused(MESSAGES.deviceRefused);
      }
    });
    return () => stop.abort();
  }, [auth, waiting]);

  /** Stops waiting for the authorization, going back to the server in use before. */
  const stopWaiting = () => {
    if (waiting) {
      applyServer(waiting.before);
      setWaiting(undefined);
    }
  };

  /** Leaves the screen with the server as it was. */
  const leave = () => {
    stopWaiting();
    onCancel?.();
  };

  // Android's back button stops a wait for the authorization, or goes back with the server as it was, when there is
  // one to go back to.
  useEffect(() => {
    if (!waiting && !onCancel) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (waiting) {
        applyServer(waiting.before);
        setWaiting(undefined);
      } else {
        onCancel?.();
      }
      return true;
    });
    return () => subscription.remove();
  }, [onCancel, waiting]);

  /**
   * Uses a server once it answers, and logs in with the entry code when the screen logs in; or goes back to the server
   * in use before, saying why.
   * @param invite The server read from the code or typed in, and its entry code.
   * @param link The QR code read, which the camera doesn't send again once refused.
   */
  const connect = async ({ entry: entryCode, ...pairing }: PairingInvite, link?: string) => {
    if (asking.current) {
      return;
    }
    asking.current = true;
    setConnecting(true);
    setRefused(undefined);
    setTried(true);
    const before = currentServer();
    applyServer(pairing);
    const user = !(await answers(pairing.url))
      ? undefined
      : auth && entryCode
        ? await auth.pair(entryCode).catch(() => undefined)
        : null;
    if (user && 'pending' in user) {
      setWaiting({ code: user.pending, entry: entryCode!, pairing, before });
    } else if (user === undefined || (user && 'refused' in user)) {
      applyServer(before);
      setRefused(user?.refused ?? MESSAGES.unreachable);
      refusedLink.current = user ? link : undefined;
    } else {
      await saveServer(pairing);
      if (user) {
        onConnected(pairing, user);
      } else {
        onConnected(pairing);
      }
    }
    asking.current = false;
    setConnecting(false);
  };

  /**
   * Takes the codes the camera read, leaving out the one refused last.
   * @param barcodes The codes in the frame.
   */
  const scanned = (barcodes: Barcode[]) => {
    const text = barcodes[0]?.rawValue;
    if (text === undefined || asking.current || text === refusedLink.current) {
      return;
    }
    const invite = readPairingLink(text);
    if (invite && (!auth || invite.entry)) {
      void connect(invite, text);
    } else {
      refusedLink.current = text;
      setTried(true);
      setRefused(invite ? MESSAGES.noEntry : MESSAGES.notApc);
    }
  };

  /** Connects to the address and codes typed in, or says which one isn't right. */
  const submit = () => {
    const url = readServerAddress(address);
    const fingerprint = readFingerprint(code);
    const entryCode = auth ? readEntryCode(entry) : undefined;
    setErrors({
      address: url ? undefined : MESSAGES.address,
      code: fingerprint ? undefined : MESSAGES.code,
      entry: entryCode === null ? MESSAGES.entry : undefined,
    });
    if (url && fingerprint && entryCode !== null) {
      void connect({ url, fingerprint, entry: entryCode });
    }
  };

  /**
   * Swaps the camera for the fields, or back, dropping what the other one said.
   * @param manually Whether the address and the code are typed in.
   */
  const showTyping = (manually: boolean) => {
    setTyping(manually);
    setRefused(undefined);
  };

  /** What the camera's square shows: the camera reading, or what lets it on, or why it can't. */
  const cameraView = () => {
    if (cameraFailed) {
      return <Text tone="muted" align="center">{MESSAGES.cameraFailed}</Text>;
    }
    if (camera.hasPermission) {
      return (
        <CodeScanner
          style={styles.scanner}
          isActive={!connecting}
          barcodeFormats={QR_CODE}
          onBarcodeScanned={scanned}
          onError={() => setCameraFailed(true)}
        />
      );
    }
    if (camera.canRequestPermission) {
      return (
        <Button variant="secondary" align="stretch" onPress={() => void camera.requestPermission()}>
          Ler o código com a câmera
        </Button>
      );
    }
    return <Text tone="muted" align="center">{MESSAGES.blocked}</Text>;
  };

  return (
    <FieldScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID={ids.page}>
      <View style={styles.heading} testID={ids.heading}>
        <View style={[styles.title, onCancel && styles.titleWithBack]} testID={ids.title}>
          {onCancel && <BackButton label="Voltar" onPress={leave} />}
          <RNText accessibilityRole="header" style={styles.titleText} testID={ids.titleText}>
            Conectar ao servidor
          </RNText>
        </View>
        {!waiting && <Text tone="muted">{manual ? (auth ? INTRO.typeLogin : INTRO.type) : auth ? INTRO.scanLogin : INTRO.scan}</Text>}
      </View>
      {notice && !tried && (
        <View accessibilityLiveRegion="polite" style={styles.notice} testID={ids.notice}>
          <Text size="sm">{notice}</Text>
        </View>
      )}
      {waiting ? (
        <View style={styles.waiting} testID={ids.waiting}>
          <Heading level={3}>Aguardando autorização</Heading>
          <DevicePending code={waiting.code} />
        </View>
      ) : manual ? (
        <View style={styles.form} testID={ids.form}>
          <TextField
            label="Endereço"
            kind="code"
            value={address}
            onValueChange={(typed) => {
              setAddress(typed);
              setErrors((shown) => ({ ...shown, address: undefined }));
            }}
            error={errors.address}
            returnKeyType="next"
            onSubmitEditing={() => codeInput.current?.focus()}
          />
          <TextField
            ref={codeInput}
            label="Código"
            kind="code"
            value={code}
            onValueChange={(typed) => {
              setCode(typed);
              setErrors((shown) => ({ ...shown, code: undefined }));
            }}
            error={errors.code}
            returnKeyType={auth ? 'next' : 'go'}
            onSubmitEditing={auth ? () => entryInput.current?.focus() : submit}
          />
          {auth && (
            <TextField
              ref={entryInput}
              label="Código de entrada"
              kind="code"
              value={entry}
              onValueChange={(typed) => {
                setEntry(typed);
                setErrors((shown) => ({ ...shown, entry: undefined }));
              }}
              error={errors.entry}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
        </View>
      ) : (
        <View style={styles.camera} testID={ids.camera}>
          {cameraView()}
        </View>
      )}
      {refused && (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert} testID={ids.alert}>
          <Text size="sm" tone="danger">
            {refused}
          </Text>
        </View>
      )}
      <View style={styles.actions} testID={ids.actions}>
        {waiting && (
          <Button variant="secondary" align="stretch" onPress={stopWaiting}>
            Cancelar
          </Button>
        )}
        {!waiting && manual && (
          <Button align="stretch" onPress={submit} loading={connecting}>
            Conectar
          </Button>
        )}
        {!waiting && !manual && (
          <Button variant="secondary" align="stretch" icon={pencilIcon} onPress={() => showTyping(true)}>
            Digitar manualmente
          </Button>
        )}
        {!waiting && manual && device && (
          <Button variant="secondary" align="stretch" icon={qrIcon} onPress={() => showTyping(false)}>
            Ler QR Code
          </Button>
        )}
      </View>
    </FieldScrollView>
  );
}
