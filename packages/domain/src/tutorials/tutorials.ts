import { INVENTORY_TUTORIAL_PARTS, INVENTORY_TUTORIALS, inventoryTutorialPartSteps, type InventoryTutorialId } from "../inventory/inventoryTutorial.ts";
import { DASHBOARD_TEXTS } from "../platform/locale/appTexts.ts";
import { catalog, type Locale } from "../platform/locale/locale.ts";

// The apps' tutorials, by feature, which the user menu's Tutoriais lists: each one's feature, its kind, the apps it shows
// in and its texts. A guided tour is done on the screen, step by step, or with "Fazer por mim"; an explanation only
// points at the screen and explains, one to three steps with Next. A tutorial on a tab's feature opens the tab before
// it starts. The Inventory's guided tour is three tutorials, one per part (see inventoryTutorial.ts); an explanation's
// steps point at the parts of the screen its targets name, which each app finds its own way (data-tour on the web, a
// tourTarget ref on the phone), the card sitting in the middle of the screen for a step with no target or one not on
// screen.

/** Where a tutorial shows: the web app in a browser, the desktop app, or the phone app. */
export const TUTORIAL_PLATFORMS = ["web", "desktop", "phone"] as const;

/**
 * Every explanation: its feature, the apps it shows in and the part of the screen each step points at, null for one
 * that points at nothing.
 */
export const EXPLANATIONS = [
  { id: "inventory-photos", feature: "inventory", platforms: TUTORIAL_PLATFORMS, targets: ["new-item", "items"] },
  { id: "inventory-lists", feature: "inventory", platforms: TUTORIAL_PLATFORMS, targets: ["more-actions", null] },
  { id: "inventory-import", feature: "inventory", platforms: TUTORIAL_PLATFORMS, targets: ["more-actions", null] },
  { id: "inventory-mercado-livre", feature: "inventory", platforms: TUTORIAL_PLATFORMS, targets: ["more-actions", null] },
  { id: "inventory-low-stock", feature: "inventory", platforms: TUTORIAL_PLATFORMS, targets: ["status", "items"] },
  { id: "catalog-browse", feature: "catalog", platforms: TUTORIAL_PLATFORMS, targets: ["catalog-brands", "catalog-search"] },
  { id: "catalog-tree", feature: "catalog", platforms: TUTORIAL_PLATFORMS, targets: ["catalog-models", null] },
  { id: "catalog-sheet", feature: "catalog", platforms: TUTORIAL_PLATFORMS, targets: ["catalog-sheet", null] },
  { id: "catalog-parts", feature: "catalog", platforms: TUTORIAL_PLATFORMS, targets: ["catalog-sheet", null] },
  { id: "notifications-bell", feature: "notifications", platforms: TUTORIAL_PLATFORMS, targets: ["bell", "bell"] },
  { id: "server-pairing", feature: "server", platforms: ["desktop"], targets: ["user-menu", null] },
  { id: "server-devices", feature: "server", platforms: ["desktop"], targets: [null, "user-menu"] },
  { id: "offline-copy", feature: "offline", platforms: ["phone"], targets: ["items", "sync"] },
  { id: "offline-conflict", feature: "offline", platforms: ["phone"], targets: ["sync", null] },
] as const;

/** An explanation, as the Dashboard runs it. */
export type ExplanationId = (typeof EXPLANATIONS)[number]["id"];
/** A tutorial, as its tab or the Dashboard knows it. */
export type TutorialId = InventoryTutorialId | ExplanationId;
/** What a tutorial is about, which the dialog groups it under: a tab, or a part of the apps beside the tabs. */
export type TutorialFeature = "inventory" | "catalog" | "notifications" | "server" | "offline";
/** How a tutorial teaches: done on the screen, or only pointed at and explained. */
export type TutorialKind = "explanation" | "tour";
/** An app a tutorial shows in. */
export type TutorialPlatform = (typeof TUTORIAL_PLATFORMS)[number];
/** A tutorial: its feature, the tab it opens if any, its kind, the apps it shows in and how many steps it has. */
export type Tutorial = {
  id: TutorialId;
  feature: TutorialFeature;
  tab?: "inventory" | "catalog";
  kind: TutorialKind;
  platforms: readonly TutorialPlatform[];
  steps: number;
};
/** A feature's tutorials, as a section of the dialog: its name and its tutorials, in order. */
export type TutorialSection = { feature: TutorialFeature; title: string; tutorials: Tutorial[] };
/** An explanation's step: what it points at, by name, its title and its text. */
export type ExplanationStep = { id: string; target: string | null; title: string; text: string };

// The tab each feature opens: the offline copy is the Inventory's.
const FEATURE_TABS: Record<TutorialFeature, Tutorial["tab"]> = {
  inventory: "inventory",
  catalog: "catalog",
  notifications: undefined,
  server: undefined,
  offline: "inventory",
};

/** Every tutorial, by feature, in the order the dialog lists them. */
export const TUTORIALS: readonly Tutorial[] = [
  ...INVENTORY_TUTORIALS.map((id, index): Tutorial => ({
    id,
    feature: "inventory",
    tab: "inventory",
    kind: "tour",
    platforms: TUTORIAL_PLATFORMS,
    steps: inventoryTutorialPartSteps(index + 1),
  })),
  ...EXPLANATIONS.map(({ id, feature, platforms, targets }): Tutorial => ({
    id,
    feature,
    tab: FEATURE_TABS[feature],
    kind: "explanation",
    platforms,
    steps: targets.length,
  })),
];

/** An explanation's texts: its name and each step's title and text. */
type ExplanationTexts = { title: string; steps: readonly { title: string; text: string }[] };

/** The dialog's texts, the features beside the tabs, each tutorial's one-line description and the explanations' steps. */
export const TUTORIAL_TEXTS = catalog(
  {
    title: "Tutoriais",
    intro: "Os tours guiados você faz na própria tela, passo a passo, ou com Fazer por mim. As explicações só mostram onde fica cada coisa.",
    back: "Voltar",
    count: (count: number) => (count === 1 ? "1 tutorial" : `${count} tutoriais`),
    steps: (count: number) => (count === 1 ? "1 passo" : `${count} passos`),
    kinds: { explanation: "Explicação", tour: "Tour guiado" } as Record<TutorialKind, string>,
    features: { notifications: "Notificações", server: "Servidor", offline: "Modo offline" },
    descriptions: {
      "inventory-add": "Cadastre uma peça de teste, com código, veículo, estoque e valor.",
      "inventory-search": "Ache a peça de teste pela busca e pelos filtros.",
      "inventory-edit": "Edite a peça de teste até ela ficar baixa e esgotada, e depois exclua.",
      "inventory-photos": "Onde ficam as fotos de cada marca de peça de um item.",
      "inventory-lists": "Renomeie e junte categorias, marcas de peça e modelos de veículo.",
      "inventory-import": "Cadastre muitas peças de uma vez a partir de uma planilha.",
      "inventory-mercado-livre": "Gere os anúncios das peças para o Anunciador em massa.",
      "inventory-low-stock": "Como o estoque mostra as peças que estão acabando.",
      "catalog-browse": "Passe de uma marca para os modelos dela e procure no Catálogo.",
      "catalog-tree": "Monte as gerações, versões, períodos e motores de um modelo.",
      "catalog-sheet": "Veja e edite a ficha de um motor.",
      "catalog-parts": "Veja quais peças do estoque servem num veículo.",
      "notifications-bell": "Onde ficam as notificações e os avisos de peças acabando.",
      "server-pairing": "Conecte o app do celular a este computador com o QR code.",
      "server-devices": "Decida quais aparelhos entram na conta aberta neste computador.",
      "offline-copy": "Use o estoque longe do servidor de casa.",
      "offline-conflict": "O que fazer quando o celular e o computador mudaram o mesmo item.",
    } as Record<TutorialId, string>,
    explanations: {
      "inventory-photos": {
        title: "As fotos de uma marca",
        steps: [
          {
            title: "No formulário do item",
            text: "Cada marca de peça do item tem as próprias fotos, até 3. Adicione ao cadastrar ou editar o item, ou reaproveite as de outra peça, achada pelo código, em Usar fotos de outra peça.",
          },
          { title: "Nos detalhes", text: "Abra um item da lista para ver as fotos de cada marca em tamanho grande." },
        ],
      },
      "inventory-lists": {
        title: "As listas",
        steps: [
          {
            title: "Gerenciar listas",
            text: "Em Mais ações, Gerenciar listas abre as categorias, as marcas de peça e os modelos de veículo que os itens usam, cada nome com quantos itens o usam.",
          },
          {
            title: "Renomear e juntar",
            text: "Renomeie um nome, e os itens passam a usar o novo. Juntar une dois nomes num só, levando os itens junto. Excluir só vale para um nome que nenhum item usa.",
          },
        ],
      },
      "inventory-import": {
        title: "Importar um CSV",
        steps: [
          {
            title: "Importar Peças",
            text: "Em Mais ações, Importar Peças recebe um arquivo CSV, com uma linha por marca de peça e as marcas de um item juntas pela coluna item.",
          },
          {
            title: "Conferir antes",
            text: "Antes de importar, a lista mostra quantas linhas estão prontas e quais têm erro, e por quê. Exportar Peças gera um arquivo no mesmo formato, bom de usar como modelo.",
          },
        ],
      },
      "inventory-mercado-livre": {
        title: "Exportar para o Mercado Livre",
        steps: [
          {
            title: "Exportar Peças",
            text: "Em Mais ações, Exportar Peças tem Exportar para o Mercado Livre, que gera um anúncio por marca de peça com estoque.",
          },
          {
            title: "No Mercado Livre",
            text: "No computador sai um zip com a planilha dos anúncios, para copiar no Anunciador em massa, e as fotos nomeadas pelo código, para o Gestor de fotos. O celular compartilha só a planilha.",
          },
        ],
      },
      "inventory-low-stock": {
        title: "Um item com estoque baixo",
        steps: [
          { title: "Estoque baixo e Esgotado", text: "Esses filtros mostram só as peças no estoque mínimo ou abaixo dele, ou só as que acabaram." },
          {
            title: "Na lista",
            text: "As peças com estoque baixo e as esgotadas aparecem destacadas por cor. O estoque mínimo de cada peça fica no formulário dela, e chegar nele gera um aviso no sino.",
          },
        ],
      },
      "catalog-browse": {
        title: "Marcas e modelos",
        steps: [
          { title: "As marcas", text: "Escolha uma marca para ver os modelos dela. Só com peças deixa só os modelos em que alguma peça do estoque serve." },
          { title: "A busca", text: "Procure um modelo pelo nome, ou uma peça do estoque pelo código, para ver onde ela serve." },
        ],
      },
      "catalog-tree": {
        title: "A árvore de um modelo",
        steps: [
          { title: "Os níveis", text: "Cada modelo abre em gerações, cada geração em versões, cada versão em períodos de anos e cada período em motores." },
          {
            title: "Editar no lugar",
            text: "O + de cada nível adiciona o próximo, e cada linha se renomeia ou se exclui ali mesmo. Copiar motor e Colar motor, ou Ctrl+C e Ctrl+V, levam um motor para outro período.",
          },
        ],
      },
      "catalog-sheet": {
        title: "A ficha de um motor",
        steps: [
          { title: "A ficha", text: "Escolha um motor na árvore para ver a ficha dele: cilindrada, cilindros, tração e um resumo." },
          { title: "Editar a ficha", text: "Editar ficha abre esses campos para mudar. Um motor novo, adicionado num período, já começa pela ficha." },
        ],
      },
      "catalog-parts": {
        title: "As peças de um veículo",
        steps: [
          { title: "Peças que servem", text: "Escolha uma versão ou um período na árvore: junto da ficha aparecem as peças do estoque que servem nele." },
          { title: "Abrir no Estoque", text: "Abra uma dessas peças no Estoque, ou veja todas lá, já filtradas por esse veículo." },
        ],
      },
      "notifications-bell": {
        title: "O sino e os avisos de estoque baixo",
        steps: [
          {
            title: "O sino",
            text: "O sino guarda as últimas notificações, e o número nele diz quantas você ainda não leu. No menu dele também se ajusta quanto tempo cada aviso fica na tela.",
          },
          { title: "Estoque baixo", text: "Quando uma peça chega ao estoque mínimo ou fica abaixo dele, um aviso chega aqui, uma vez enquanto ela continua baixa." },
        ],
      },
      "server-pairing": {
        title: "Parear um celular",
        steps: [
          {
            title: "Acesso pelo celular",
            text: "No menu do usuário, Servidor e banco de dados tem Acesso pelo celular: ligue para o celular alcançar o servidor na rede de casa.",
          },
          {
            title: "O QR code",
            text: "Com o acesso ligado, aparece um QR code, que vale por 5 minutos. No celular, toque em Ler QR Code e aponte a câmera para ele, ou digite o endereço e os códigos.",
          },
        ],
      },
      "server-devices": {
        title: "Autorizar aparelhos",
        steps: [
          {
            title: "Autorizar este dispositivo?",
            text: "Quando um celular ou navegador novo entra na conta, este computador pergunta se ele pode entrar. Só entra o que você autorizar.",
          },
          {
            title: "Dispositivos",
            text: "No menu do usuário, Dispositivos lista os aparelhos autorizados e quando entraram pela última vez. Renomeie um, ou remova para que ele precise ser autorizado de novo.",
          },
        ],
      },
      "offline-copy": {
        title: "Trabalhar offline",
        steps: [
          {
            title: "A cópia do estoque",
            text: "O celular guarda uma cópia do estoque e das fotos. Longe do servidor, ela continua aqui, e um aviso acima da lista diz de quando ela é.",
          },
          {
            title: "Mudanças esperando",
            text: "O que você muda aparece na hora e espera no celular, e o aviso diz quantas mudanças esperam. Elas vão sozinhas quando o servidor volta, ou na hora, ao puxar a lista para baixo.",
          },
        ],
      },
      "offline-conflict": {
        title: "Resolver um conflito",
        steps: [
          {
            title: "Um conflito",
            text: "Quando o computador mudou o mesmo item que você mudou no celular, a mudança espera, e o aviso acima da lista mostra Resolver conflitos.",
          },
          { title: "Escolher um lado", text: "Cada conflito mostra o valor do computador e o do celular: escolha qual fica, e a mudança sincroniza. Fechar deixa o resto para depois." },
        ],
      },
    } as Record<ExplanationId, ExplanationTexts>,
  },
  {
    title: "Tutorials",
    intro: "Guided tours are done on the screen itself, step by step, or with Do it for me. Explanations only show where each thing is.",
    back: "Back",
    count: (count) => (count === 1 ? "1 tutorial" : `${count} tutorials`),
    steps: (count) => (count === 1 ? "1 step" : `${count} steps`),
    kinds: { explanation: "Explanation", tour: "Guided tour" },
    features: { notifications: "Notifications", server: "Server", offline: "Offline mode" },
    descriptions: {
      "inventory-add": "Add a test part, with its code, vehicle, stock and price.",
      "inventory-search": "Find the test part with the search and the filters.",
      "inventory-edit": "Edit the test part until it is low and out of stock, then delete it.",
      "inventory-photos": "Where the photos of each part brand of an item are.",
      "inventory-lists": "Rename and join categories, part brands and vehicle models.",
      "inventory-import": "Add many parts at once from a spreadsheet.",
      "inventory-mercado-livre": "Make the parts' listings for the Bulk lister.",
      "inventory-low-stock": "How the inventory shows the parts running out.",
      "catalog-browse": "Go from a brand to its models and search the Catalog.",
      "catalog-tree": "Build a model's generations, versions, periods and engines.",
      "catalog-sheet": "See and edit an engine's sheet.",
      "catalog-parts": "See which parts in stock fit a vehicle.",
      "notifications-bell": "Where the notifications and the warnings of parts running out are.",
      "server-pairing": "Connect the phone app to this computer with the QR code.",
      "server-devices": "Decide which devices get into the account open on this computer.",
      "offline-copy": "Use the inventory away from the home server.",
      "offline-conflict": "What to do when the phone and the computer changed the same item.",
    },
    explanations: {
      "inventory-photos": {
        title: "A brand's photos",
        steps: [
          {
            title: "In the item form",
            text: "Each part brand of the item has its own photos, up to 3. Add them when adding or editing the item, or reuse another part's, found by its code, in Use photos of another part.",
          },
          { title: "In the details", text: "Open an item from the list to see each brand's photos full size." },
        ],
      },
      "inventory-lists": {
        title: "The lists",
        steps: [
          {
            title: "Manage lists",
            text: "In More actions, Manage lists opens the categories, part brands and vehicle models the items use, each name with how many items use it.",
          },
          {
            title: "Rename and join",
            text: "Rename a name, and the items use the new one. Join turns two names into one, taking their items along. Delete only works for a name no item uses.",
          },
        ],
      },
      "inventory-import": {
        title: "Importing a CSV",
        steps: [
          {
            title: "Import parts",
            text: "In More actions, Import parts takes a CSV file, with a row per part brand and an item's brands kept together by the item column.",
          },
          {
            title: "Check first",
            text: "Before importing, the list shows how many rows are ready and which have errors, and why. Export parts makes a file in the same format, handy as a template.",
          },
        ],
      },
      "inventory-mercado-livre": {
        title: "Exporting for Mercado Livre",
        steps: [
          {
            title: "Export parts",
            text: "In More actions, Export parts has Export to Mercado Livre, which makes a listing per part brand in stock.",
          },
          {
            title: "On Mercado Livre",
            text: "The computer gets a zip with the listings' sheet, to copy into the Bulk lister, and the photos named by code, for the Photo manager. The phone shares the sheet only.",
          },
        ],
      },
      "inventory-low-stock": {
        title: "A low-stock item",
        steps: [
          { title: "Low stock and Out of stock", text: "These filters show only the parts at their minimum stock or below it, or only the ones that ran out." },
          {
            title: "In the list",
            text: "Low and out-of-stock parts stand out by their color. Each part's minimum stock is in its form, and reaching it sends a warning to the bell.",
          },
        ],
      },
      "catalog-browse": {
        title: "Brands and models",
        steps: [
          { title: "The brands", text: "Choose a brand to see its models. Only with parts keeps only the models some part in stock fits." },
          { title: "The search", text: "Search a model by name, or a part in stock by its code, to see where it fits." },
        ],
      },
      "catalog-tree": {
        title: "A model's tree",
        steps: [
          { title: "The levels", text: "Each model opens into generations, each generation into versions, each version into year periods and each period into engines." },
          {
            title: "Edit in place",
            text: "Each level's + adds the next one, and each row is renamed or deleted right there. Copy engine and Paste engine, or Ctrl+C and Ctrl+V, take an engine to another period.",
          },
        ],
      },
      "catalog-sheet": {
        title: "An engine's sheet",
        steps: [
          { title: "The sheet", text: "Choose an engine in the tree to see its sheet: displacement, cylinders, drive and a summary." },
          { title: "Edit the sheet", text: "Edit sheet opens these fields to change. A new engine, added to a period, starts with its sheet." },
        ],
      },
      "catalog-parts": {
        title: "A vehicle's parts",
        steps: [
          { title: "Parts that fit", text: "Choose a version or a period in the tree: the parts in stock that fit it show by its sheet." },
          { title: "Open in the Inventory", text: "Open one of these parts in the Inventory, or see them all there, already filtered by this vehicle." },
        ],
      },
      "notifications-bell": {
        title: "The bell and low-stock warnings",
        steps: [
          {
            title: "The bell",
            text: "The bell keeps the latest notifications, and its number says how many you haven't read yet. Its menu also sets how long each toast stays on screen.",
          },
          { title: "Low stock", text: "When a part reaches its minimum stock or goes below it, a warning comes here, once while it stays low." },
        ],
      },
      "server-pairing": {
        title: "Pairing a phone",
        steps: [
          {
            title: "Phone access",
            text: "In the user menu, Server and database has Phone access: turn it on for the phone to reach the server on the home network.",
          },
          {
            title: "The QR code",
            text: "With access on, a QR code shows, good for 5 minutes. On the phone, tap Read QR code and point the camera at it, or type the address and the codes.",
          },
        ],
      },
      "server-devices": {
        title: "Authorizing devices",
        steps: [
          {
            title: "Authorize this device?",
            text: "When a new phone or browser logs into the account, this computer asks whether it may come in. Only what you authorize gets in.",
          },
          {
            title: "Devices",
            text: "In the user menu, Devices lists the authorized devices and when they last logged in. Rename one, or remove it so it has to be authorized again.",
          },
        ],
      },
      "offline-copy": {
        title: "Working offline",
        steps: [
          {
            title: "The inventory's copy",
            text: "The phone keeps a copy of the inventory and its photos. Away from the server, it stays here, and a notice above the list says how old it is.",
          },
          {
            title: "Changes waiting",
            text: "What you change shows at once and waits on the phone, and the notice says how many changes wait. They go by themselves when the server is back, or right away when you pull the list down.",
          },
        ],
      },
      "offline-conflict": {
        title: "Settling a conflict",
        steps: [
          {
            title: "A conflict",
            text: "When the computer changed the same item you changed on the phone, the change waits, and the notice above the list shows Settle conflicts.",
          },
          { title: "Pick a side", text: "Each conflict shows the computer's value and the phone's: pick the one to keep, and the change syncs. Close leaves the rest for later." },
        ],
      },
    },
  },
);

/**
 * Tells whether a tutorial is an explanation, which the Dashboard runs, rather than a tour its tab runs.
 * @param id The tutorial.
 * @returns True for an explanation.
 */
export function isExplanation(id: TutorialId): id is ExplanationId {
  return EXPLANATIONS.some((explanation) => explanation.id === id);
}

/**
 * Lists an explanation's steps: each one's target, by name, and its texts.
 * @param id The explanation.
 * @param locale The language of the texts.
 * @returns The steps, in order.
 */
export function explanationSteps(id: ExplanationId, locale: Locale): ExplanationStep[] {
  const { targets } = EXPLANATIONS.find((explanation) => explanation.id === id)!;
  return TUTORIAL_TEXTS[locale].explanations[id].steps.map((step, index) => ({ id: `${id}-${index + 1}`, target: targets[index], ...step }));
}

/**
 * Lists the dialog's sections for an app: each feature with its tutorials that show there, in order; a feature with none
 * there is left out.
 * @param platform The app the dialog is in.
 * @param locale The language of the features' names.
 * @returns The sections.
 */
export function tutorialSections(platform: TutorialPlatform, locale: Locale): TutorialSection[] {
  const shown = TUTORIALS.filter((tutorial) => tutorial.platforms.includes(platform));
  const features = [...new Set(shown.map((tutorial) => tutorial.feature))];
  const names: Record<TutorialFeature, string> = { ...DASHBOARD_TEXTS[locale].tabs, ...TUTORIAL_TEXTS[locale].features };
  return features.map((feature) => ({
    feature,
    title: names[feature],
    tutorials: shown.filter((tutorial) => tutorial.feature === feature),
  }));
}

/**
 * Names a tutorial, as the dialog and its tour's card do.
 * @param id The tutorial.
 * @param locale The language.
 * @returns E.g. "Cadastrar um item".
 */
export function tutorialTitle(id: TutorialId, locale: Locale): string {
  return isExplanation(id) ? TUTORIAL_TEXTS[locale].explanations[id].title : INVENTORY_TUTORIAL_PARTS[locale][INVENTORY_TUTORIALS.indexOf(id)];
}
