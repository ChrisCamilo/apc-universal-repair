import { catalog } from '@apc/domain/locale';

// The texts only the phone writes, which the web has no screen for: connecting to the server and its local network
// access, the lock, the session that ended, the sync and its conflicts, the update prompt, the notifications' channel
// in Android's settings, a few screen-reader names of its own components, and what a phone's Inventory says its own
// way. The texts both apps write live in @apc/domain's catalogs.

/** The phone's own labels, messages and screen-reader names. */
export const PHONE_TEXTS = catalog(
  {
    appLock: {
      locked: 'Estoque bloqueado',
      subtitle: 'Use a digital, o rosto ou o bloqueio de tela do celular para abrir o estoque.',
      title: 'Desbloquear o APC',
      unlock: 'Desbloquear',
      why: 'O estoque deste celular fica protegido pelo bloqueio de tela dele.',
    },
    components: {
      closeFilters: 'Fechar filtros',
      closeMenu: 'Fechar menu',
      highlighted: 'em destaque',
      moveLeft: 'Mover para a esquerda',
      moveRight: 'Mover para a direita',
      toggleNode: (open: boolean, node: string) => `${open ? 'Fechar' : 'Abrir'} ${node}`,
    },
    conflicts: {
      none: 'Nenhum conflito para resolver.',
      onComputer: 'No computador',
      onPhone: 'No celular',
      text: 'Estas alterações feitas no celular conflitam com o que mudou no computador. Escolha o que manter em cada uma.',
      title: 'Conflitos com o computador',
    },
    connect: {
      back: 'Voltar',
      camera: 'Ler o código com a câmera',
      connect: 'Conectar',
      readQr: 'Ler QR Code',
      title: 'Conectar ao servidor',
      typeIn: 'Digitar manualmente',
      waiting: 'Aguardando autorização',
      intro: {
        scan: 'No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, aponte a câmera para o código que aparece lá.',
        scanLogin:
          'No computador, entre na sua conta, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, aponte a câmera para o código que aparece lá.',
        type: 'No computador, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, digite o endereço e o código que aparecem lá.',
        typeLogin:
          'No computador, entre na sua conta, abra Servidor e banco de dados e ligue o Acesso pelo celular. Depois, digite o endereço e os códigos que aparecem lá.',
      },
      messages: {
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
      },
    },
    inventory: {
      duplicate: (name: string) =>
        `Um item novo começa com os dados de ${name}, sem os códigos e com o estoque zerado. Nada é salvo até você tocar em Salvar.`,
      fileFailed: 'Não foi possível abrir o arquivo. Tente de novo.',
      settleConflicts: 'Resolver conflitos',
      shareTemplate: 'Compartilhar modelo',
      vehiclesHint: 'Sem modelo, a peça serve em qualquer modelo da marca.',
      mercadoLivreHint:
        'Para copiar na planilha baixada do Anunciador em massa, na sua conta de vendedor. No celular vai só o CSV dos anúncios; as fotos vêm no Exportar Peças do computador. Marcas sem estoque ou abaixo de R$ 8,00 ficam de fora.',
    },
    localNetwork: {
      allow: 'Permitir acesso',
      blocked:
        'O acesso à rede local está bloqueado para o APC, e sem ele o APC não chega ao servidor. Libere-o nas configurações do Android, em Permissões > Dispositivos próximos.',
      denied: 'Sem acesso à rede local, o APC não chega ao servidor. Toque de novo e permita o acesso aos dispositivos próximos.',
      missing: 'O APC não tem acesso à rede local, por onde chega ao servidor no computador de casa.',
      settings: 'Abrir configurações',
      why: 'O servidor fica no computador de casa, na mesma rede Wi-Fi: para chegar até ele, o Android vai pedir que o APC acesse os dispositivos próximos.',
    },
    login: { connectHint: 'Leia o QR Code do computador', connectOther: 'Conectar a outro servidor' },
    notificationChannel: 'Notificações do APC',
    session: {
      expired: 'Sua sessão expirou. Leia o código do computador de novo.',
      kept: 'As alterações feitas no celular continuam guardadas e vão para o servidor quando você entrar.',
      removed: 'Este celular foi removido no computador. Leia o código do computador para pedir acesso de novo.',
    },
    sync: {
      blocked: 'Sem acesso à rede',
      changes: (count: number) => (count === 1 ? '1 alteração' : `${count} alterações`),
      conflicts: (count: number) => (count === 1 ? '1 conflito a resolver' : `${count} conflitos a resolver`),
      done: 'Estoque sincronizado com o servidor.',
      failed: 'Não foi possível sincronizar: o servidor não respondeu. Confira se o celular está no Wi-Fi de casa e se o computador está ligado.',
      last: (when: { today: boolean; day: string; time: string }) => `Última sincronização ${when.today ? 'hoje' : `em ${when.day}`} às ${when.time}`,
      never: 'Ainda não sincronizado com o servidor',
      offline: 'Sem conexão',
      syncing: 'Sincronizando…',
      waiting: (changes: string) => `${changes} a enviar`,
    },
    update: {
      browser: 'Na primeira vez, o Android pede para permitir que o navegador instale apps desconhecidos.',
      later: 'Agora não',
      text: 'Atualizar baixa a versão nova pelo navegador. Abra o arquivo baixado para instalá-la por cima deste app.',
      title: (version: string) => `Nova versão ${version} disponível`,
      update: 'Atualizar',
    },
    userMenu: {
      connect: 'Conectar ao servidor',
      noLock: 'Este celular não tem bloqueio de tela. Defina uma digital, o rosto ou um PIN para proteger o estoque guardado nele.',
      security: 'Segurança',
      setLock: 'Definir bloqueio de tela',
      sync: 'Sincronização',
      syncNow: 'Sincronizar agora',
    },
  },
  {
    appLock: {
      locked: 'Inventory locked',
      subtitle: "Use the phone's fingerprint, face or screen lock to open the inventory.",
      title: 'Unlock APC',
      unlock: 'Unlock',
      why: "This phone's inventory is protected by its screen lock.",
    },
    components: {
      closeFilters: 'Close filters',
      closeMenu: 'Close menu',
      highlighted: 'highlighted',
      moveLeft: 'Move left',
      moveRight: 'Move right',
      toggleNode: (open, node) => `${open ? 'Close' : 'Open'} ${node}`,
    },
    conflicts: {
      none: 'No conflicts to settle.',
      onComputer: 'On the computer',
      onPhone: 'On the phone',
      text: 'These changes made on the phone conflict with what changed on the computer. Choose what to keep in each one.',
      title: 'Conflicts with the computer',
    },
    connect: {
      back: 'Back',
      camera: 'Read the code with the camera',
      connect: 'Connect',
      readQr: 'Read QR code',
      title: 'Connect to the server',
      typeIn: 'Type it in',
      waiting: 'Waiting for authorization',
      intro: {
        scan: 'On the computer, open Server and database and turn on Phone access. Then point the camera at the code that shows there.',
        scanLogin:
          'On the computer, log into your account, open Server and database and turn on Phone access. Then point the camera at the code that shows there.',
        type: 'On the computer, open Server and database and turn on Phone access. Then type the address and the code that show there.',
        typeLogin:
          'On the computer, log into your account, open Server and database and turn on Phone access. Then type the address and the codes that show there.',
      },
      messages: {
        address: 'Type the address the computer shows, such as 192.168.0.10:3000.',
        blocked: "The camera is blocked for APC. Allow it in Android's settings, or tap Type it in.",
        cameraFailed: "The camera didn't open. Tap Type it in to type the address and the code.",
        code: 'The code has 43 letters, numbers, - and _, as the computer shows it.',
        deviceRefused: "This phone wasn't authorized on the computer. Read the code again to ask once more.",
        entry: 'The entry code has 8 letters and numbers, as the computer shows it.',
        noEntry: "This code doesn't carry the entry code. Update APC on the computer and read the code again.",
        notApc: "This code isn't APC's. Use the one in Server and database, on the computer.",
        unreachable:
          "The server didn't answer. Check that the phone is on the home Wi-Fi, that Phone access is on on the computer and that the code is the one it shows now.",
      },
    },
    inventory: {
      duplicate: (name) => `A new item starts with the data of ${name}, without the codes and with no stock. Nothing is saved until you tap Save.`,
      fileFailed: "The file couldn't be opened. Try again.",
      settleConflicts: 'Settle conflicts',
      shareTemplate: 'Share template',
      vehiclesHint: 'With no model, the part fits any model of the brand.',
      mercadoLivreHint:
        "To copy into the spreadsheet downloaded from the bulk lister, in your seller account. The phone sends only the listings' CSV; the photos come with the computer's Export parts. Brands with no stock or under R$ 8.00 are left out.",
    },
    localNetwork: {
      allow: 'Allow access',
      blocked: "Local network access is blocked for APC, and without it APC can't reach the server. Allow it in Android's settings, under Permissions > Nearby devices.",
      denied: "Without local network access, APC can't reach the server. Tap again and allow access to nearby devices.",
      missing: 'APC has no local network access, which is how it reaches the server on the home computer.',
      settings: 'Open settings',
      why: 'The server is on the home computer, on the same Wi-Fi: to reach it, Android will ask for APC to reach nearby devices.',
    },
    login: { connectHint: "Read the computer's QR code", connectOther: 'Connect to another server' },
    notificationChannel: 'APC notifications',
    session: {
      expired: "Your session expired. Read the computer's code again.",
      kept: 'The changes made on the phone stay kept and go to the server when you log in.',
      removed: "This phone was removed on the computer. Read the computer's code to ask for access again.",
    },
    sync: {
      blocked: 'No network access',
      changes: (count) => (count === 1 ? '1 change' : `${count} changes`),
      conflicts: (count) => (count === 1 ? '1 conflict to settle' : `${count} conflicts to settle`),
      done: 'Inventory synced with the server.',
      failed: "Couldn't sync: the server didn't answer. Check that the phone is on the home Wi-Fi and that the computer is on.",
      last: (when) => `Last synced ${when.today ? 'today' : `on ${when.day}`} at ${when.time}`,
      never: 'Not synced with the server yet',
      offline: 'No connection',
      syncing: 'Syncing…',
      waiting: (changes) => `${changes} to send`,
    },
    update: {
      browser: 'The first time, Android asks to let the browser install unknown apps.',
      later: 'Not now',
      text: 'Update downloads the new version through the browser. Open the downloaded file to install it over this app.',
      title: (version) => `New version ${version} available`,
      update: 'Update',
    },
    userMenu: {
      connect: 'Connect to the server',
      noLock: "This phone has no screen lock. Set a fingerprint, face or PIN to protect the inventory kept on it.",
      security: 'Security',
      setLock: 'Set a screen lock',
      sync: 'Sync',
      syncNow: 'Sync now',
    },
  },
);
