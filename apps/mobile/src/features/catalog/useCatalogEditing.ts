import { useState } from 'react';
import {
  CATALOG_BRANDS_PATH,
  CATALOG_FAILED,
  CATALOG_NEEDS_SERVER,
  CATALOG_IN_USE,
  catalogAddUnder,
  catalogEditRequest,
  ENGINE_CLIPBOARD,
  engineCopyRequest,
  catalogNodePath,
  catalogSheetRequest,
  changeCatalog,
  type Catalog,
  type CatalogBrand,
  type CatalogEditing,
  type CatalogEngineInput,
  type CatalogNode,
  type CatalogSheetEditing,
  type CatalogValues,
} from '@apc/domain/catalog';
import { apiUrl } from '../../app/api';
import { useToast } from '../../components/Toast';
import { useLocale } from '../../app/locale';
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts';

// The Catalog's editing, the same as the web's: what is being added or renamed and why it couldn't
// be saved, the engine sheet being filled in, the node or brand whose deletion is being confirmed, and the changes themselves,
// each sent to the API and answered with the whole catalog, which the owner takes. A name or year another node has is
// said under the field; any other failure, in a toast, which says the catalog needs the server while it can't be
// reached.

type CatalogEditingOptions = {
  /** Takes the catalog a change answered. */
  onChanged: (catalog: Catalog) => void;
  /** Called with a catalog where a brand was just added, last in the rail. */
  onBrandAdded?: (catalog: Catalog) => void;
  /** Called with a catalog where an engine was just added under a year, and the year's id. */
  onEngineAdded?: (catalog: Catalog, yearId: string) => void;
  /** Called with a catalog where a brand was just deleted. */
  onBrandRemoved?: (catalog: Catalog) => void;
  /** Whether the server couldn't be reached at the last sync, which a change that fails then says. */
  offline?: boolean;
};

/**
 * Keeps the Catalog's editing and sends its changes.
 * @param options What to do with the catalog after a change.
 * @returns What is being edited, and the ways to start, save and give up on each edit.
 */
export function useCatalogEditing({ onChanged, onBrandAdded, onEngineAdded, onBrandRemoved, offline = false }: CatalogEditingOptions) {
  const { locale } = useLocale();
  const toast = useToast();
  const [editing, setEditing] = useState<CatalogEditing | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<CatalogNode>();
  const [removingBrand, setRemovingBrand] = useState<CatalogBrand>();
  const [sheet, setSheet] = useState<CatalogSheetEditing | null>(null);
  // The engine copied, to paste into a period, until another is copied.
  const [copied, setCopied] = useState<CatalogNode>();

  /**
   * Sends a change of the catalog and takes the catalog it answers, or says why it couldn't be made.
   * @param method The change's method.
   * @param path Its path.
   * @param body What it sends.
   * @param taken What to say under the field when the API refuses a name or year another node has; a delete leaves it
   * out, and a refusal then says in a toast that an item of the stock uses what was deleted.
   * @returns The catalog after the change, or null when it wasn't made.
   */
  const change = async (method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: object, taken?: string): Promise<Catalog | null> => {
    setSaving(true);
    const result = await changeCatalog(apiUrl(), method, path, locale, body);
    setSaving(false);
    if (result === 'inUse') {
      toast.error(CATALOG_IN_USE[locale]);
      return null;
    }
    if (result === 'taken') {
      setError(taken ?? CATALOG_FAILED[locale]);
      return null;
    }
    if (!result) {
      toast.error(offline ? CATALOG_NEEDS_SERVER[locale] : CATALOG_FAILED[locale]);
      return null;
    }
    onChanged(result);
    return result;
  };

  /** Starts adding or renaming something, in place of anything else being edited. */
  const edit = (next: CatalogEditing | null) => {
    setEditing(next);
    setError(undefined);
    setSheet(null);
  };

  /** Opens an engine's sheet as a form, a new engine's or one's own, in place of anything else being edited. */
  const editSheet = (next: CatalogSheetEditing | null) => {
    setSheet(next);
    setEditing(null);
  };

  return {
    editing,
    error,
    saving,
    removing,
    removingBrand,
    sheet,
    copied,
    edit,
    /** Copies an engine, with its sheet, to paste into a period; it says so. */
    copyEngine: (engine: CatalogNode) => {
      setCopied(engine);
      toast.info(ENGINE_CLIPBOARD[locale].copied(engine.label));
    },
    /** Adds a copy of the engine copied, with its sheet, at the end of a period's engines, opened as a new engine is; it says so. */
    pasteEngine: async (period: CatalogNode) => {
      if (!copied) {
        return;
      }
      const { method, path, body } = engineCopyRequest(copied, period);
      const changed = await change(method, path, body);
      if (changed) {
        toast.success(ENGINE_CLIPBOARD[locale].pasted(copied.label, period.label));
        onEngineAdded?.(changed, period.id);
      }
    },
    editSheet,
    /** Asks to confirm deleting a node, or gives up on it. */
    askRemove: setRemoving,
    /** Asks to confirm deleting a brand from the catalog, or gives up on it. */
    askRemoveBrand: setRemovingBrand,
    /** Deletes the brand whose deletion was confirmed, with its models' trees; its vehicle brand stays in the lists. */
    removeBrand: async () => {
      if (!removingBrand) {
        return;
      }
      const changed = await change('DELETE', `${CATALOG_BRANDS_PATH}/${removingBrand.id}`);
      if (changed) {
        toast.success(CATALOG_SCREEN_TEXTS[locale].left(removingBrand.name));
        setRemovingBrand(undefined);
        onBrandRemoved?.(changed);
      }
    },
    /** Starts adding the level under a node: a node of the tree, or a year's new engine's sheet. */
    addUnder: (node: CatalogNode) => {
      const next = catalogAddUnder(node);
      if ('sheet' in next) {
        editSheet(next.sheet);
      } else {
        edit(next.editing);
      }
    },
    /** Saves what is being added or renamed. */
    save: async (values: CatalogValues) => {
      if (!editing) {
        return;
      }
      const { method, path, taken } = catalogEditRequest(editing, locale);
      const changed = await change(method, path, values, taken);
      if (changed) {
        setEditing(null);
        if (editing.kind === 'add' && editing.level === 'brand') {
          onBrandAdded?.(changed);
        }
      }
    },
    /** Saves the engine sheet being filled in: adds the new engine, or saves the engine's sheet again. */
    saveSheet: async (values: CatalogEngineInput) => {
      if (!sheet) {
        return;
      }
      const { method, path } = catalogSheetRequest(sheet);
      const changed = await change(method, path, values);
      if (changed) {
        setSheet(null);
        if (sheet.kind === 'add') {
          onEngineAdded?.(changed, sheet.year.id);
        }
      }
    },
    /** Moves a node up or down among its siblings. */
    move: (node: CatalogNode, direction: 'up' | 'down') => change('POST', `${catalogNodePath(node)}/move`, { direction }),
    /** Deletes the node whose deletion was confirmed, with what is under it. */
    remove: async () => {
      if (!removing) {
        return;
      }
      if (await change('DELETE', catalogNodePath(removing))) {
        toast.success(CATALOG_SCREEN_TEXTS[locale].left(removing.label));
        setRemoving(undefined);
      }
    },
  };
}
