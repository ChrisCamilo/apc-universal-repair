import { catalog } from '@apc/domain/locale'

// The texts only the web app writes, which the phone has no screen for: the About dialog, dragging photos in, the
// Inventory's columns menu and the import's rows, the Catalog's row buttons on a wide screen, the notifications'
// settings button and the demo. The texts both apps write live in @apc/domain's catalogs; the desktop app's screens in
// features/desktop/desktopTexts.ts.

/** The web app's own labels, hints and screen-reader names. */
export const WEB_TEXTS = catalog(
  {
    about: {
      allVersions: 'Ver todas as versões no GitHub',
      noNotes: 'Esta versão não tem notas.',
      title: 'Sobre esta versão',
    },
    catalog: {
      moveDown: (node: string) => `Mover ${node} para baixo`,
      moveUp: (node: string) => `Mover ${node} para cima`,
      searchBrand: 'Procure marca',
      yearsOf: (period: string) => `Mudar os anos de ${period}`,
    },
    columns: { restore: 'Restaurar padrão', title: 'Colunas da tabela', trigger: 'Colunas' },
    demo: {
      github: 'Ver no GitHub',
      notice: 'Modo demonstração: os dados são de exemplo, ficam só neste navegador e voltam ao início ao recarregar.',
      unavailable: 'Funcionalidade não disponível na demo.',
    },
    imageUpload: {
      dragMore: (photos: string) => `Arraste mais ${photos} ou clique para escolher`,
      dragUpTo: (photos: string) => `Arraste até ${photos} ou clique para escolher`,
      hint: 'JPG, PNG ou WebP, até 3 MB cada. A primeira vira a capa na lista.',
    },
    import: {
      rows: 'Linhas do arquivo',
      template: 'Baixar modelo',
    },
    notificationSettings: 'Configurações das notificações',
  },
  {
    about: {
      allVersions: 'See every version on GitHub',
      noNotes: 'This version has no notes.',
      title: 'About this version',
    },
    catalog: {
      moveDown: (node) => `Move ${node} down`,
      moveUp: (node) => `Move ${node} up`,
      searchBrand: 'Search brand',
      yearsOf: (period) => `Change the years of ${period}`,
    },
    columns: { restore: 'Restore default', title: 'Table columns', trigger: 'Columns' },
    demo: {
      github: 'See on GitHub',
      notice: 'Demo mode: the data is sample data, stays only in this browser and starts over when you reload.',
      unavailable: "This isn't available in the demo.",
    },
    imageUpload: {
      dragMore: (photos) => `Drag ${photos} more or click to choose`,
      dragUpTo: (photos) => `Drag up to ${photos} or click to choose`,
      hint: 'JPG, PNG or WebP, up to 3 MB each. The first one is the cover in the list.',
    },
    import: {
      rows: "The file's lines",
      template: 'Download template',
    },
    notificationSettings: 'Notification settings',
  },
)
