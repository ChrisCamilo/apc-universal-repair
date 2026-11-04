import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, TextInput, View } from 'react-native';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { CodeScanner, type Barcode, type TargetBarcodeFormat } from 'react-native-vision-camera-barcode-scanner';
import { readFingerprint, readPairingLink, readServerAddress, type Pairing } from '@apc/shared/pairing';
import { applyServer, currentServer, saveServer } from '../api';
import { Button } from '../Button';
import { FieldScrollView } from '../FieldScrollView';
import { TextField } from '../TextField';
import { Heading, Text } from '../Typography';
import { useStyles } from './ConnectScreen.styles';

// Conectar ao servidor: how the phone pairs with the home server (see @apc/shared/pairing), before the login of a
// phone with no server yet, and from the login or the user menu to pair again, as after the computer's address
// changes. The camera reads the QR code of the desktop app's Servidor dialog; or the address and the code shown beside
// it are typed in, the code with or without its spaces. Either way the phone asks the server's /health, trusting only
// the certificate with that fingerprint (see ServerPin.kt), and keeps the server once it answers; when it doesn't,
// the server in use before stays, and the screen says what to check. A code that isn't the APC's says so. The camera
// asks for its permission at a tap; once refused for good, the screen says to allow it in Android's settings, and a
// phone without a camera only types. "Voltar", or the back button, leaves the server as it was, when one is paired.

/** The codes the camera reads: the QR code alone. */
const QR_CODE: TargetBarcodeFormat[] = ['qr-code'];
/** How long the server has to answer before the phone gives up, in ms. */
const ANSWER_TIMEOUT_MS = 8_000;
/** What the screen says, in Portuguese. */
const MESSAGES = {
  address: 'Digite o endereço que aparece no computador, como 192.168.0.10:3000.',
  blocked: 'A câmera está bloqueada para o APC. Libere-a nas configurações do Android, ou digite abaixo.',
  cameraFailed: 'A câmera não abriu. Digite o endereço e o código abaixo.',
  code: 'O código tem 43 letras, números, - e _, como aparece no computador.',
  noCamera: 'Este celular não tem câmera: digite o endereço e o código abaixo.',
  notApc: 'Esse código não é o do APC. Use o que aparece em Servidor e banco de dados, no computador.',
  unreachable:
    'O servidor não respondeu. Confira se o celular está no Wi-Fi de casa, se o Acesso pelo celular está ligado no computador e se o código é o que aparece lá agora.',
} as const;

type ConnectScreenProps = {
  /** Called with the server once it answered, kept on the phone and in use. */
  onConnected: (pairing: Pairing) => void;
  /** Goes back with the server as it was, when one is paired already. */
  onCancel?: () => void;
};

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

export function ConnectScreen({ onConnected, onCancel }: ConnectScreenProps) {
  const camera = useCameraPermission();
  const device = useCameraDevice('back');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ address?: string; code?: string }>({});
  const [refused, setRefused] = useState<string>();
  const [cameraFailed, setCameraFailed] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Whether a server is being asked, so the camera, which reads the code on every frame, asks it once.
  const asking = useRef(false);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const { styles, ids } = useStyles();

  // Android's back button goes back with the server as it was, when there is one to go back to.
  useEffect(() => {
    if (!onCancel) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [onCancel]);

  /**
   * Uses a server once it answers, or goes back to the one in use before.
   * @param pairing The server read from the code or typed in.
   */
  const connect = async (pairing: Pairing) => {
    if (asking.current) {
      return;
    }
    asking.current = true;
    setConnecting(true);
    setRefused(undefined);
    const before = currentServer();
    applyServer(pairing);
    if (await answers(pairing.url)) {
      await saveServer(pairing);
      onConnected(pairing);
    } else {
      applyServer(before);
      setRefused(MESSAGES.unreachable);
    }
    asking.current = false;
    setConnecting(false);
  };

  /**
   * Takes the codes the camera read.
   * @param barcodes The codes in the frame.
   */
  const scanned = (barcodes: Barcode[]) => {
    const text = barcodes[0]?.rawValue;
    if (text === undefined || asking.current) {
      return;
    }
    const pairing = readPairingLink(text);
    if (pairing) {
      void connect(pairing);
    } else {
      setRefused(MESSAGES.notApc);
    }
  };

  /** Connects to the address and code typed in, or says which one isn't right. */
  const submit = () => {
    const url = readServerAddress(address);
    const fingerprint = readFingerprint(code);
    setErrors({ address: url ? undefined : MESSAGES.address, code: fingerprint ? undefined : MESSAGES.code });
    if (url && fingerprint) {
      void connect({ url, fingerprint });
    }
  };

  /** What the camera's square shows: the camera reading, or what lets it on, or why it can't. */
  const cameraView = () => {
    if (!device) {
      return <Text tone="muted" align="center">{MESSAGES.noCamera}</Text>;
    }
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
        <Heading level={1}>Conectar ao servidor</Heading>
        <Text tone="muted">
          No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, aponte a câmera para o
          código que aparece lá.
        </Text>
      </View>
      <View style={styles.camera} testID={ids.camera}>
        {cameraView()}
      </View>
      {refused && (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert} testID={ids.alert}>
          <Text size="sm" tone="danger">
            {refused}
          </Text>
        </View>
      )}
      <View style={styles.form} testID={ids.form}>
        <Text tone="muted">Ou digite o endereço e o código que aparecem no computador:</Text>
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
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <View style={styles.actions} testID={ids.actions}>
          <Button align="stretch" onPress={submit} loading={connecting}>
            Conectar
          </Button>
          {onCancel && (
            <Button variant="secondary" align="stretch" onPress={onCancel}>
              Voltar
            </Button>
          )}
        </View>
      </View>
    </FieldScrollView>
  );
}
