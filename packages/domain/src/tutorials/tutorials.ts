import { INVENTORY_TUTORIAL_PARTS, INVENTORY_TUTORIALS, inventoryTutorialPartSteps, type InventoryTutorialId } from "../inventory/inventoryTutorial.ts";
import { DASHBOARD_TEXTS } from "../platform/locale/appTexts.ts";
import { catalog, type Locale } from "../platform/locale/locale.ts";

// The apps' tutorials, by feature, which the user menu's Tutoriais lists: each one's feature, its kind, the apps it shows
// in and its texts. A guided tour is done on the screen, step by step, or with "Fazer por mim"; an explanation only
// points at the screen and explains. A feature is a tab, which a tutorial opens before it starts. The Inventory's guided
// tour is three tutorials, one per part (see inventoryTutorial.ts).

/** Where a tutorial shows: the web app in a browser, the desktop app, or the phone app. */
export const TUTORIAL_PLATFORMS = ["web", "desktop", "phone"] as const;

/** A tutorial, as its tab knows it. */
export type TutorialId = InventoryTutorialId;
/** The tab a tutorial is about, which the dialog groups it under. */
export type TutorialFeature = "inventory";
/** How a tutorial teaches: done on the screen, or only pointed at and explained. */
export type TutorialKind = "explanation" | "tour";
/** An app a tutorial shows in. */
export type TutorialPlatform = (typeof TUTORIAL_PLATFORMS)[number];
/** A tutorial: its tab, its kind, the apps it shows in and how many steps it has. */
export type Tutorial = {
  id: TutorialId;
  feature: TutorialFeature;
  kind: TutorialKind;
  platforms: readonly TutorialPlatform[];
  steps: number;
};
/** A feature's tutorials, as a section of the dialog: its name and its tutorials, in order. */
export type TutorialSection = { feature: TutorialFeature; title: string; tutorials: Tutorial[] };

/** Every tutorial, by feature, in the order the dialog lists them. */
export const TUTORIALS: readonly Tutorial[] = INVENTORY_TUTORIALS.map((id, index) => ({
  id,
  feature: "inventory",
  kind: "tour",
  platforms: TUTORIAL_PLATFORMS,
  steps: inventoryTutorialPartSteps(index + 1),
}));

/** The dialog's texts and each tutorial's one-line description. */
export const TUTORIAL_TEXTS = catalog(
  {
    title: "Tutoriais",
    intro: "Os tours guiados você faz na própria tela, passo a passo, ou com Fazer por mim. As explicações só mostram onde fica cada coisa.",
    back: "Voltar",
    count: (count: number) => (count === 1 ? "1 tutorial" : `${count} tutoriais`),
    steps: (count: number) => (count === 1 ? "1 passo" : `${count} passos`),
    kinds: { explanation: "Explicação", tour: "Tour guiado" } as Record<TutorialKind, string>,
    descriptions: {
      "inventory-add": "Cadastre uma peça de teste, com código, veículo, estoque e valor.",
      "inventory-search": "Ache a peça de teste pela busca e pelos filtros.",
      "inventory-edit": "Edite a peça de teste até ela ficar baixa e esgotada, e depois exclua.",
    } as Record<TutorialId, string>,
  },
  {
    title: "Tutorials",
    intro: "Guided tours are done on the screen itself, step by step, or with Do it for me. Explanations only show where each thing is.",
    back: "Back",
    count: (count) => (count === 1 ? "1 tutorial" : `${count} tutorials`),
    steps: (count) => (count === 1 ? "1 step" : `${count} steps`),
    kinds: { explanation: "Explanation", tour: "Guided tour" },
    descriptions: {
      "inventory-add": "Add a test part, with its code, vehicle, stock and price.",
      "inventory-search": "Find the test part with the search and the filters.",
      "inventory-edit": "Edit the test part until it is low and out of stock, then delete it.",
    },
  },
);

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
  return features.map((feature) => ({
    feature,
    title: DASHBOARD_TEXTS[locale].tabs[feature],
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
  return INVENTORY_TUTORIAL_PARTS[locale][INVENTORY_TUTORIALS.indexOf(id)];
}
