import { useState } from 'react';
import {
  CATALOG_FAILED,
  catalogAddUnder,
  catalogEditRequest,
  catalogNodePath,
  catalogSheetRequest,
  changeCatalog,
  type Catalog,
  type CatalogEditing,
  type CatalogEngineInput,
  type CatalogNode,
  type CatalogSheetEditing,
  type CatalogValues,
} from '@apc/domain/catalog';
import { apiUrl } from '../../app/api';
import { useToast } from '../../components/Toast';

// The Catalog's editing, the same as the web's: what is being added or renamed and why it couldn't
// be saved, the engine sheet being filled in, the node whose deletion is being confirmed, and the changes themselves,
// each sent to the API and answered with the whole catalog, which the owner takes. A name or year another node has is
// said under the field; any other failure, in a toast.

type CatalogEditingOptions = {
  /** Takes the catalog a change answered. */
  onChanged: (catalog: Catalog) => void;
  /** Called with a catalog where a brand was just added, last in the rail. */
  onBrandAdded?: (catalog: Catalog) => void;
  /** Called with a catalog where an engine was just added under a year, and the year's id. */
  onEngineAdded?: (catalog: Catalog, yearId: string) => void;
};

/**
 * Keeps the Catalog's editing and sends its changes.
 * @param options What to do with the catalog after a change.
 * @returns What is being edited, and the ways to start, save and give up on each edit.
 */
export function useCatalogEditing({ onChanged, onBrandAdded, onEngineAdded }: CatalogEditingOptions) {
  const toast = useToast();
  const [editing, setEditing] = useState<CatalogEditing | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<CatalogNode>();
  const [sheet, setSheet] = useState<CatalogSheetEditing | null>(null);

  /**
   * Sends a change of the catalog and takes the catalog it answers, or says why it couldn't be made.
   * @param method The change's method.
   * @param path Its path.
   * @param body What it sends.
   * @param taken What to say under the field when the API refuses a name or year another node has.
   * @returns The catalog after the change, or null when it wasn't made.
   */
  const change = async (method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: object, taken?: string): Promise<Catalog | null> => {
    setSaving(true);
    const result = await changeCatalog(apiUrl(), method, path, body);
    setSaving(false);
    if (result === 'taken') {
      setError(taken ?? CATALOG_FAILED);
      return null;
    }
    if (!result) {
      toast.error(CATALOG_FAILED);
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
    sheet,
    edit,
    editSheet,
    /** Asks to confirm deleting a node, or gives up on it. */
    askRemove: setRemoving,
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
      const { method, path, taken } = catalogEditRequest(editing);
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
        toast.success(`“${removing.label}” saiu do catálogo.`);
        setRemoving(undefined);
      }
    },
  };
}
