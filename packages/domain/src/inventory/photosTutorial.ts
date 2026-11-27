import { catalog, type Locale } from "../platform/locale/locale.ts";
import { isTestItem, type TutorialStep } from "./inventoryTutorial.ts";
import type { Item } from "./items.ts";

// The guided tour of a brand's photos, shared by web and mobile, the same way as the Inventory tutorial (see
// inventoryTutorial.ts): it opens the test item, which its tab makes before it starts, unlocks the edit, adds two photos
// to its brand, removes the first, so the second becomes the cover, and saves. Each platform describes its screen and
// the actions "Fazer por mim" takes: adding two sample photos the app carries, removing the first photo and saving the
// photos the form holds; the steps here say when each one is done and where to go back when the user leaves one. The
// tab deletes the test item, and with it its photos' files, when the tour ends or is skipped.

/** The tutorial, as the user menu's Tutoriais lists it. */
export const PHOTOS_TUTORIAL = "inventory-photos";
/** How many photos the tour adds to the test item's brand. */
export const PHOTOS_TUTORIAL_ADDED = 2;
/** The file names of the sample photos "Fazer por mim" adds, in order. */
export const TUTORIAL_SAMPLE_PHOTOS = ["tutorial-photo-1.jpg", "tutorial-photo-2.jpg"] as const;
/** The title, text and part of each step, and what a phone's step says instead, where it names the phone's layout. */
const STEP_TEXTS = catalog<{
  title: string;
  steps: Record<PhotosTutorialStepId, { title: string; text: string }>;
  phone: Partial<Record<PhotosTutorialStepId, string>>;
}>(
  {
    title: "Fotos de uma marca",
    steps: {
      open: { title: "Abra o item de teste", text: "Clique no item de teste para ver os detalhes dele." },
      unlock: { title: "Libere a edição", text: "Clique em Editar para mudar as fotos da marca." },
      add: {
        title: "Adicione duas fotos",
        text: "Arraste duas fotos para o campo de fotos da marca, ou clique nele e escolha duas. Fazer por mim usa duas fotos de exemplo.",
      },
      remove: { title: "Tire a primeira", text: "A primeira foto é a capa. Clique no × dela: a segunda passa a ser a capa." },
      save: { title: "Salve as fotos", text: "Clique em Salvar alterações. As fotos vão junto com o item." },
      end: {
        title: "Pronto!",
        text: "A foto que ficou é a capa da marca, a primeira nos detalhes. O item de teste e as fotos dele saem do estoque quando o tutorial termina.",
      },
    },
    phone: {
      open: "Toque no item de teste para ver os detalhes dele.",
      unlock: "Toque em Editar para mudar as fotos da marca.",
      add: "Toque em Galeria e escolha duas fotos. Fazer por mim usa duas fotos de exemplo.",
      remove: "A primeira foto é a capa. Toque no × dela: a segunda passa a ser a capa.",
      save: "Toque em Salvar alterações. As fotos vão junto com o item.",
    },
  },
  {
    title: "A brand's photos",
    steps: {
      open: { title: "Open the test item", text: "Click the test item to see its details." },
      unlock: { title: "Unlock editing", text: "Click Edit to change the brand's photos." },
      add: {
        title: "Add two photos",
        text: "Drag two photos onto the brand's photo field, or click it and choose two. Do it for me uses two sample photos.",
      },
      remove: { title: "Take out the first", text: "The first photo is the cover. Click its ×: the second becomes the cover." },
      save: { title: "Save the photos", text: "Click Save changes. The photos go with the item." },
      end: {
        title: "Done!",
        text: "The photo left is the brand's cover, the first in the details. The test item and its photos leave the stock when the tutorial ends.",
      },
    },
    phone: {
      open: "Tap the test item to see its details.",
      unlock: "Tap Edit to change the brand's photos.",
      add: "Tap Gallery and choose two photos. Do it for me uses two sample photos.",
      remove: "The first photo is the cover. Tap its ×: the second becomes the cover.",
      save: "Tap Save changes. The photos go with the item.",
    },
  },
);

/** The steps of the tour. */
export type PhotosTutorialStepId = "open" | "unlock" | "add" | "remove" | "save" | "end";
/** A part of the screen a step points at: the test item's row (or card), and its form's parts. */
export type PhotosTutorialTarget = "row" | "form-edit" | "form-photos" | "photo-remove" | "form-save";
/** The Inventory tab as the tour sees it, read again on every check, and what it does for the user. */
export type PhotosTutorialScreen<Target> = {
  /** The item form while it is open: the item it is on, whether it shows the details, and how many photos its first brand holds. */
  form: { item?: Item; viewing: boolean; photos: number } | null;
  /** Every item in stock. */
  items: readonly Item[];
  /** Whether a change "Fazer por mim" or the user made is still on its way to the list; no step goes back meanwhile. */
  busy: boolean;
  /** Whether the tab has the phone layout. */
  phone: boolean;
  /** Finds a part of the screen; the row is the test item's, the form's parts its first brand's. */
  target: (name: PhotosTutorialTarget) => Target | null;
  /** Opens the item form on an item, its details or the edit. */
  openForm: (item: Item, details: boolean) => void;
  /** Adds the sample photos to the first brand's photos in the form open on the edit. */
  addSamplePhotos: () => void;
  /** Removes the first brand's first photo in the form open on the edit. */
  removeFirstPhoto: () => void;
  /** Saves the photos the form holds for the item's first brand, then closes the form and loads the list again. */
  savePhotos: () => void;
};

/**
 * Names the tour, as the dialog and its card do.
 * @param locale The language.
 * @returns E.g. "Fotos de uma marca".
 */
export function photosTutorialTitle(locale: Locale): string {
  return STEP_TEXTS[locale].title;
}

/**
 * Counts the tour's steps, as the tutorials' list says.
 * @returns How many steps it has.
 */
export function photosTutorialStepCount(): number {
  return Object.keys(STEP_TEXTS["pt-BR"].steps).length;
}

/**
 * Lists the tour's steps for a screen: each with its texts, target, check, the step to go back to and what "Fazer por
 * mim" does. The texts follow the screen's layout as it is when they are listed.
 * @param screen Reads the screen as it is now.
 * @param locale The language of the texts.
 * @returns The steps in order, every one but "Pronto!" in part 1.
 */
export function photosTutorialSteps<Target>(screen: () => PhotosTutorialScreen<Target>, locale: Locale): TutorialStep<Target>[] {
  /** The test item, while it is in stock. */
  const testItem = () => screen().items.find(isTestItem);
  /** Whether the form is open on the test item, on the edit when `viewing` is false. */
  const onTestItem = (viewing: boolean) => {
    const { form } = screen();
    return form !== null && isTestItem(form.item) && form.viewing === viewing;
  };
  /** How many photos the form holds, none while it is closed. */
  const held = () => screen().form?.photos ?? 0;
  /** Whether the test item's brand was saved with the one photo left. */
  const saved = () => testItem()?.brands[0].photos.length === 1;
  /** Goes back to the start of the edit when the form closes. */
  const reopen = () => (screen().form ? null : "open");

  const bindings: Record<PhotosTutorialStepId, Omit<TutorialStep<Target>, "id" | "title" | "text" | "part">> = {
    open: {
      target: () => screen().target("row"),
      done: () => onTestItem(true) || onTestItem(false),
      auto: () => {
        const item = testItem();
        if (item) {
          screen().openForm(item, true);
        }
      },
    },
    unlock: {
      target: () => screen().target("form-edit"),
      done: () => onTestItem(false),
      auto: () => {
        const item = testItem();
        if (item) {
          screen().openForm(item, false);
        }
      },
      lost: reopen,
    },
    add: {
      target: () => screen().target("form-photos"),
      done: () => onTestItem(false) && held() >= PHOTOS_TUTORIAL_ADDED,
      auto: () => screen().addSamplePhotos(),
      lost: reopen,
    },
    remove: {
      target: () => screen().target("photo-remove"),
      done: () => onTestItem(false) && held() === PHOTOS_TUTORIAL_ADDED - 1,
      auto: () => screen().removeFirstPhoto(),
      lost: () => (!screen().form ? "open" : held() === 0 ? "add" : null),
    },
    save: {
      target: () => screen().target("form-save"),
      done: () => saved() && screen().form === null,
      auto: () => screen().savePhotos(),
      lost: () => (screen().form || saved() ? null : "open"),
    },
    end: {},
  };

  const texts = STEP_TEXTS[locale];
  const phone = screen().phone;
  return (Object.keys(bindings) as PhotosTutorialStepId[]).map((id) => {
    const { lost, ...binding } = bindings[id];
    const { title, text } = texts.steps[id];
    return {
      id,
      title,
      text: (phone && texts.phone[id]) || text,
      ...(id !== "end" && { part: 1 }),
      ...binding,
      ...(lost && { lost: () => (screen().busy ? null : lost()) }),
    };
  });
}
